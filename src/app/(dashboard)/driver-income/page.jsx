'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatRupiah } from '@/lib/finance';

function formatDate(d) {
  if (!d) return '-';
  try {
    return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return d;
  }
}

const CATEGORY_META = {
  delivery_fee:  { label: 'Ongkos Delivery', icon: 'fa-solid fa-truck-fast', color: '#3B82F6' },
  staff_income:  { label: 'Gaji / Bonus', icon: 'fa-solid fa-sack-dollar', color: '#22C55E' },
};

export default function DriverIncomePage() {
  const [loading, setLoading] = useState(true);
  const [income, setIncome] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from('expenses')
        .select('*')
        .eq('type', 'income')
        .eq('staff_id', user.id)
        .order('expense_date', { ascending: false });
      setIncome(data || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { Promise.resolve().then(load); }, [load]);

  const totalPaid = income.filter(i => i.payment_status === 'paid').reduce((s, i) => s + Number(i.amount || 0), 0);
  const totalUnpaid = income.filter(i => i.payment_status !== 'paid').reduce((s, i) => s + Number(i.amount || 0), 0);

  return (
    <div className="page-content">
      <div className="page-header-row" style={{ marginBottom: '18px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>History Pendapatan</h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
          Ongkos delivery otomatis tercatat di sini, plus gaji/bonus yang diinput admin.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '20px' }}>
        <div className="card" style={{ padding: '16px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Sudah Dibayar</div>
          <div style={{ fontSize: '19px', fontWeight: 800, color: '#22C55E' }}>{formatRupiah(totalPaid)}</div>
        </div>
        <div className="card" style={{ padding: '16px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Belum Dibayar</div>
          <div style={{ fontSize: '19px', fontWeight: 800, color: '#F59E0B' }}>{formatRupiah(totalUnpaid)}</div>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrapper">
          {loading ? (
            <div className="table-empty"><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '8px' }}></i> Memuat data...</div>
          ) : income.length === 0 ? (
            <div className="table-empty">
              <div className="table-empty-icon"><i className="fa-solid fa-sack-dollar"></i></div>
              <p>Belum ada riwayat pendapatan.</p>
            </div>
          ) : (
            <table className="table table--stack-mobile">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Keterangan</th>
                  <th>Jumlah</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {income.map((item) => {
                  const meta = CATEGORY_META[item.category] || { label: 'Lainnya', icon: 'fa-solid fa-circle-dollar-to-slot', color: 'var(--text-muted)' };
                  return (
                    <tr key={item.id}>
                      <td data-label="Tanggal" style={{ fontSize: '12.5px' }}>{formatDate(item.expense_date)}</td>
                      <td data-label="Keterangan" data-label-align="left">
                        <div style={{ fontWeight: 700, fontSize: '13px' }}>{item.title}</div>
                        <span className="badge badge-muted" style={{ marginTop: '4px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          <i className={meta.icon} style={{ color: meta.color }}></i>{meta.label}
                        </span>
                      </td>
                      <td data-label="Jumlah" style={{ fontWeight: 800, color: '#22C55E' }}>{formatRupiah(item.amount)}</td>
                      <td data-label="Status">
                        <span className="badge" style={{
                          background: item.payment_status === 'paid' ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)',
                          color: item.payment_status === 'paid' ? '#22C55E' : '#F59E0B',
                          border: `1px solid ${item.payment_status === 'paid' ? '#22C55E' : '#F59E0B'}`,
                        }}>
                          {item.payment_status === 'paid' ? 'Sudah Dibayar' : 'Belum Dibayar'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
