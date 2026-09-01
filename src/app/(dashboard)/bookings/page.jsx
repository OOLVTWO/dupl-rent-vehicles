'use client';

import { useState, useEffect, useCallback } from 'react';
import { formatRupiah } from '@/lib/finance';
import { getWhatsAppShareUrl } from '@/lib/countryCodes';

const STATUS_META = {
  pending:   { label: 'Pending',   color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)' },
  confirmed: { label: 'Confirmed', color: '#22C55E', bg: 'rgba(34, 197, 94, 0.15)' },
  cancelled: { label: 'Cancelled', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)' },
  completed: { label: 'Completed', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.15)' },
};

const TABS = [
  { key: 'all', label: 'Semua' },
  { key: 'pending', label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

function formatDate(d) {
  if (!d) return '-';
  try {
    return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return d;
  }
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/bookings');
      const data = await res.json().catch(() => []);
      if (!res.ok) {
        setError(data.error || 'Gagal memuat data booking.');
        setBookings([]);
      } else {
        setBookings(Array.isArray(data) ? data : []);
      }
    } catch {
      setError('Gagal terhubung ke server.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    Promise.resolve().then(fetchBookings);
    const interval = setInterval(fetchBookings, 45000);
    return () => clearInterval(interval);
  }, [fetchBookings]);

  const updateStatus = async (id, status) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const updated = await res.json();
        setBookings(prev => prev.map(b => (b.id === id ? updated : b)));
      }
    } catch {
      /* ignore, list stays stale — next poll will resync */
    }
    setBusyId(null);
  };

  const deleteBooking = async (id) => {
    if (!confirm('Hapus booking ini secara permanen?')) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/bookings/${id}`, { method: 'DELETE' });
      if (res.ok) setBookings(prev => prev.filter(b => b.id !== id));
    } catch {
      /* ignore */
    }
    setBusyId(null);
  };

  const filtered = tab === 'all' ? bookings : bookings.filter(b => b.status === tab);
  const counts = bookings.reduce((acc, b) => {
    acc[b.status] = (acc[b.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="page-content">
      <div className="page-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '18px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>Booking Confirmation</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Booking masuk dari form &quot;Book via WhatsApp&quot; di website publik (/fleet)
          </p>
        </div>
        <button className="btn btn-secondary" onClick={fetchBookings} disabled={loading}>
          <i className={`fa-solid fa-rotate ${loading ? 'fa-spin' : ''}`} style={{ marginRight: '6px' }}></i> Refresh
        </button>
      </div>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
        {TABS.map(t => (
          <button
            key={t.key}
            className="btn"
            onClick={() => setTab(t.key)}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 700,
              borderRadius: 'var(--radius-full, 999px)',
              border: tab === t.key ? '1px solid var(--brand-primary)' : '1px solid var(--bg-border)',
              background: tab === t.key ? 'var(--brand-primary)' : 'transparent',
              color: tab === t.key ? '#fff' : 'var(--text-secondary)',
            }}
          >
            {t.label}{t.key !== 'all' && counts[t.key] ? ` (${counts[t.key]})` : ''}
          </button>
        ))}
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '16px' }}>
          <i className="fa-solid fa-circle-exclamation" style={{ marginRight: '6px' }}></i> {error}
        </div>
      )}

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrapper">
          {loading ? (
            <div className="table-empty"><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '8px' }}></i> Memuat data...</div>
          ) : filtered.length === 0 ? (
            <div className="table-empty">
              <div className="table-empty-icon"><i className="fa-solid fa-inbox"></i></div>
              <p>Belum ada booking {tab !== 'all' ? `dengan status "${STATUS_META[tab]?.label}"` : 'masuk'}</p>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Motor</th>
                  <th>Tanggal Sewa</th>
                  <th>Metode</th>
                  <th>Estimasi</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => {
                  const meta = STATUS_META[b.status] || STATUS_META.pending;
                  const waUrl = getWhatsAppShareUrl(
                    b.customer_phone,
                    `Halo ${b.customer_name}, terkait booking ${b.vehicle_name} (${formatDate(b.start_date)} - ${formatDate(b.end_date)}) —`
                  );
                  return (
                    <tr key={b.id}>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{b.customer_name}</strong>
                          <a href={waUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11.5px', color: 'var(--brand-primary-light, #25D366)' }}>
                            <i className="fa-brands fa-whatsapp" style={{ marginRight: '4px' }}></i>{b.customer_phone}
                          </a>
                          {b.customer_address && (
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={b.customer_address}>
                              <i className="fa-solid fa-location-dot" style={{ marginRight: '4px' }}></i>{b.customer_address}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, fontSize: '13px' }}>{b.vehicle_name}</div>
                        {b.vehicle_category && <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{b.vehicle_category}</div>}
                      </td>
                      <td style={{ fontSize: '12.5px' }}>
                        {formatDate(b.start_date)} — {formatDate(b.end_date)}
                        <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{b.duration_days} hari</div>
                      </td>
                      <td>
                        <span className="badge" style={{ background: b.fulfillment_method === 'delivery' ? 'rgba(59,130,246,0.15)' : 'rgba(148,163,184,0.2)', color: b.fulfillment_method === 'delivery' ? '#3B82F6' : '#94A3B8', border: `1px solid ${b.fulfillment_method === 'delivery' ? '#3B82F6' : '#94A3B8'}` }}>
                          <i className={`fa-solid ${b.fulfillment_method === 'delivery' ? 'fa-truck-fast' : 'fa-store'}`} style={{ marginRight: '4px' }}></i>
                          {b.fulfillment_method === 'delivery' ? 'Delivery' : 'Ambil di Toko'}
                        </span>
                      </td>
                      <td style={{ fontWeight: 800, fontSize: '13px' }}>{formatRupiah(b.estimated_price)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <select
                            value={b.status}
                            disabled={busyId === b.id}
                            onChange={(e) => updateStatus(b.id, e.target.value)}
                            className="form-control"
                            style={{
                              width: 'auto', padding: '6px 10px', fontSize: '12px', fontWeight: 700,
                              color: meta.color, borderColor: meta.color, background: meta.bg,
                            }}
                          >
                            {Object.entries(STATUS_META).map(([key, m]) => (
                              <option key={key} value={key}>{m.label}</option>
                            ))}
                          </select>
                          <button
                            className="btn btn-sm"
                            disabled={busyId === b.id}
                            onClick={() => deleteBooking(b.id)}
                            style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--bg-border)' }}
                            title="Hapus"
                          >
                            <i className="fa-solid fa-trash"></i>
                          </button>
                        </div>
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
