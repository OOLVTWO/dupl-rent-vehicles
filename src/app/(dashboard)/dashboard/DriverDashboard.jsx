'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { calcFinancialSummary, formatRupiah, getLocalMonthStr } from '@/lib/finance';

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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {upcomingDeliveries.map(b => (
              <div key={b.id} style={{ border: '1px solid var(--bg-border)', borderRadius: '10px', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '13.5px' }}>{b.customer_name} — {b.vehicle_name}</div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                    <i className="fa-solid fa-location-dot" style={{ marginRight: '4px' }}></i>{b.delivery_zone_name || '-'} · {b.customer_address || '-'}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 800, color: '#8B5CF6', fontSize: '13px', marginBottom: '4px' }}>{formatRupiah(b.delivery_fee)}</div>
                  {b.delivered_at ? (
                    <span style={{ fontSize: '10.5px', color: '#22C55E', fontWeight: 700 }}>
                      <i className="fa-solid fa-circle-check" style={{ marginRight: '4px' }}></i>Delivered
                    </span>
                  ) : b.status === 'confirmed' ? (
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => confirmDelivery(b.id)}
                      style={{ fontSize: '11px', fontWeight: 700, padding: '5px 10px', background: 'rgba(34,197,94,0.12)', color: '#22C55E', border: '1px solid #22C55E' }}
                    >
                      <i className="fa-solid fa-check" style={{ marginRight: '4px' }}></i>Confirm Delivered
                    </button>
                  ) : (
                    <span className="badge" style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B', border: '1px solid #F59E0B' }}>
                      Pending
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
