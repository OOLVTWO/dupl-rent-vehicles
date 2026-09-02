'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { calcFinancialSummary, formatRupiah, getLocalMonthStr, getLocalDateStr } from '@/lib/finance';

function StatBox({ icon, label, value, color }) {
  return (
    <div className="card" style={{ padding: '18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
      <div style={{
        width: '46px', height: '46px', borderRadius: '12px', flexShrink: 0,
        background: `${color}18`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
      }}>
        <i className={icon}></i>
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</div>
        <div style={{ fontSize: '19px', fontWeight: 800, color: 'var(--text-primary)' }}>{value}</div>
      </div>
    </div>
  );
}

export default function DriverDashboard({ fullName }) {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [myDeliveries, setMyDeliveries] = useState([]);
  const [allBookings, setAllBookings] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      const month = getLocalMonthStr();
      const [{ data: txData }, { data: expData }, bookingsRes] = await Promise.all([
        supabase.from('transactions').select('*').gte('created_at', `${month}-01`),
        supabase.from('expenses').select('*').gte('expense_date', `${month}-01`),
        fetch('/api/bookings').then(r => r.json()).catch(() => []),
      ]);

      setTransactions(txData || []);
      setExpenses(expData || []);

      const mine = (Array.isArray(bookingsRes) ? bookingsRes : [])
        .filter(b => b.fulfillment_method === 'delivery' && b.assigned_driver_id === user?.id);
      setMyDeliveries(mine);
      setAllBookings(Array.isArray(bookingsRes) ? bookingsRes : []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { Promise.resolve().then(load); }, [load]);

  const confirmDelivery = async (id) => {
    if (!confirm('Konfirmasi motor sudah sampai & diserahkan ke customer?')) return;
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'confirm_delivery' }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMyDeliveries(prev => prev.map(b => (b.id === id ? data : b)));
      } else {
        alert(data.error || 'Gagal konfirmasi delivery.');
      }
    } catch {
      alert('Gagal terhubung ke server.');
    }
  };

  const summary = calcFinancialSummary({ transactions, expenses, vehicles: [] });
  const thisMonthDeliveries = myDeliveries.filter(b => {
    const d = new Date(b.created_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const deliveryEarnings = thisMonthDeliveries.reduce((s, b) => s + Number(b.delivery_fee || 0), 0);
  const upcomingDeliveries = myDeliveries.filter(b => ['pending', 'confirmed'].includes(b.status));
  const todaysDeliveries = myDeliveries.filter(b => b.status === 'confirmed' && b.start_date === getLocalDateStr() && !b.delivered_at);
  const activeBookings = allBookings
    .filter(b => b.status === 'pending' || b.status === 'confirmed')
    .sort((a, b) => (a.start_date || '').localeCompare(b.start_date || ''));

  if (loading) {
    return (
      <div className="page-content">
        <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
          <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '8px' }}></i> Memuat dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="page-header-row" style={{ marginBottom: '18px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>Halo, {fullName || 'Driver'} 👋</h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
          Ringkasan bulan ini — {new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
        </p>
      </div>

      {todaysDeliveries.length > 0 && (
        <Link
          href="/bookings?tab=confirmed"
          style={{
            display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none',
            background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.4)',
            borderRadius: '12px', padding: '14px 16px', marginBottom: '20px',
          }}
        >
          <div style={{
            width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(245,158,11,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <i className="fa-solid fa-bell" style={{ color: '#F59E0B', fontSize: '16px' }}></i>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: '13.5px', color: '#F59E0B' }}>
              {todaysDeliveries.length} delivery kamu hari ini!
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
              Jangan lupa Confirm Delivered setelah motor sampai.
            </div>
          </div>
          <i className="fa-solid fa-chevron-right" style={{ color: '#F59E0B' }}></i>
        </Link>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '10px', marginBottom: '20px' }}>
        {[
          { href: '/transactions', icon: 'fa-solid fa-plus', label: 'Tambah Transaksi', color: '#3B82F6' },
          { href: '/expenses', icon: 'fa-solid fa-wallet', label: 'Kelola Pengeluaran', color: '#22C55E' },
          { href: '/contracts/new', icon: 'fa-solid fa-file-signature', label: 'Buat Kontrak', color: '#8B5CF6' },
        ].map(action => (
          <Link
            key={action.href}
            href={action.href}
            className="card"
            style={{
              padding: '16px 12px', textAlign: 'center', textDecoration: 'none',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
            }}
          >
            <div style={{
              width: '38px', height: '38px', borderRadius: '10px', background: `${action.color}18`, color: action.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px',
            }}>
              <i className={action.icon}></i>
            </div>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>{action.label}</span>
          </Link>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '20px' }}>
        <StatBox icon="fa-solid fa-sack-dollar" label="Pemasukan Bulan Ini" value={formatRupiah(summary.totalRevenue)} color="#22C55E" />
        <StatBox icon="fa-solid fa-money-bill-transfer" label="Pengeluaran Bulan Ini" value={formatRupiah(summary.totalExpenses)} color="#EF4444" />
        <StatBox icon="fa-solid fa-motorcycle" label="Delivery Kamu Bulan Ini" value={`${thisMonthDeliveries.length}x`} color="#3B82F6" />
        <StatBox icon="fa-solid fa-hand-holding-dollar" label="Uang Delivery Kamu" value={formatRupiah(deliveryEarnings)} color="#8B5CF6" />
      </div>

      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800 }}>
            <i className="fa-solid fa-truck-fast" style={{ marginRight: '8px', color: 'var(--brand-primary)' }}></i>
            Delivery Yang Ditugaskan Ke Kamu
          </h3>
          <Link href="/bookings" className="btn btn-secondary btn-sm">Lihat Semua Booking</Link>
        </div>

        {upcomingDeliveries.length === 0 ? (
          <div className="table-empty">
            <div className="table-empty-icon"><i className="fa-solid fa-mug-hot"></i></div>
            <p>Belum ada delivery yang ditugaskan ke kamu saat ini.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {upcomingDeliveries.map(b => (
              <div key={b.id} style={{
                border: b.status === 'confirmed' && !b.delivered_at ? '2px solid #22C55E' : '1px solid var(--bg-border)',
                borderRadius: '12px', overflow: 'hidden',
              }}>
                <div style={{ padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '13.5px' }}>{b.customer_name} — {b.vehicle_name}</div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                      <i className="fa-solid fa-location-dot" style={{ marginRight: '4px' }}></i>{b.delivery_zone_name || '-'} · {b.customer_address || '-'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, color: '#8B5CF6', fontSize: '13px' }}>{formatRupiah(b.delivery_fee)}</div>
                    {!b.delivered_at && (
                      <span className="badge" style={{ background: b.status === 'confirmed' ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)', color: b.status === 'confirmed' ? '#22C55E' : '#F59E0B', border: `1px solid ${b.status === 'confirmed' ? '#22C55E' : '#F59E0B'}`, marginTop: '2px' }}>
                        {b.status === 'confirmed' ? 'Ready To Deliver' : 'Pending Admin'}
                      </span>
                    )}
                  </div>
                </div>

                {b.delivered_at ? (
                  <div style={{ padding: '12px 14px', background: 'rgba(34,197,94,0.1)', borderTop: '1px solid rgba(34,197,94,0.3)', color: '#22C55E', fontWeight: 800, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="fa-solid fa-circle-check" style={{ fontSize: '16px' }}></i>
                    Delivered — {new Date(b.delivered_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                ) : b.status === 'confirmed' ? (
                  <button
                    type="button"
                    onClick={() => confirmDelivery(b.id)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                      width: '100%', padding: '16px', fontSize: '15px', fontWeight: 900,
                      background: '#22C55E', color: '#fff', border: 'none', cursor: 'pointer',
                    }}
                  >
                    <i className="fa-solid fa-circle-check" style={{ fontSize: '20px' }}></i>
                    CONFIRM DELIVERED
                  </button>
                ) : (
                  <div style={{ padding: '10px 14px', background: 'rgba(245,158,11,0.08)', borderTop: '1px solid rgba(245,158,11,0.25)', color: '#F59E0B', fontSize: '11.5px' }}>
                    <i className="fa-solid fa-hourglass-half" style={{ marginRight: '6px' }}></i>
                    Waiting for admin to confirm this booking first.
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800 }}>
            <i className="fa-solid fa-motorcycle" style={{ marginRight: '8px', color: 'var(--brand-primary)' }}></i>
            Motor yang Sudah Di-booking
          </h3>
          <Link href="/bookings" className="btn btn-secondary btn-sm">Lihat Semua</Link>
        </div>

        {activeBookings.length === 0 ? (
          <div className="table-empty" style={{ padding: '32px 16px' }}>
            <div className="table-empty-icon"><i className="fa-solid fa-inbox"></i></div>
            <p>Belum ada booking aktif saat ini.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table table--stack-mobile" style={{ minWidth: '620px' }}>
              <thead>
                <tr>
                  <th>Motor</th>
                  <th>Customer</th>
                  <th>Tanggal Sewa</th>
                  <th>Metode</th>
                  <th>Driver</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {activeBookings.slice(0, 8).map((b) => (
                  <tr key={b.id}>
                    <td data-label="Motor" data-label-align="left">
                      <div style={{ fontWeight: 700, fontSize: '13px' }}>{b.vehicle_name || '\u2014'}</div>
                    </td>
                    <td data-label="Customer" data-label-align="left">
                      <div style={{ fontSize: '13px', fontWeight: 600 }}>{b.customer_name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{b.customer_phone}</div>
                    </td>
                    <td data-label="Tanggal Sewa" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {b.start_date} &rarr; {b.end_date}
                    </td>
                    <td data-label="Metode">
                      <span className="badge" style={{ background: b.fulfillment_method === 'delivery' ? 'rgba(59,130,246,0.15)' : 'rgba(148,163,184,0.2)', color: b.fulfillment_method === 'delivery' ? '#3B82F6' : '#94A3B8', border: `1px solid ${b.fulfillment_method === 'delivery' ? '#3B82F6' : '#94A3B8'}` }}>
                        {b.fulfillment_method === 'delivery' ? 'Delivery' : 'Pickup'}
                      </span>
                    </td>
                    <td data-label="Driver" style={{ fontSize: '12px' }}>
                      {b.fulfillment_method === 'delivery' ? (b.assigned_driver_name || <span style={{ color: '#F59E0B' }}>Belum ada</span>) : '\u2014'}
                    </td>
                    <td data-label="Status">
                      <span className="badge" style={{
                        background: b.status === 'confirmed' ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)',
                        color: b.status === 'confirmed' ? '#22C55E' : '#F59E0B',
                        border: `1px solid ${b.status === 'confirmed' ? '#22C55E' : '#F59E0B'}`,
                      }}>
                        {b.status === 'confirmed' ? 'Confirmed' : 'Pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
