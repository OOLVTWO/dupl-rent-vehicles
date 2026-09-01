'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { formatRupiah } from '@/lib/finance';
import { getWhatsAppShareUrl } from '@/lib/countryCodes';
import { useRole } from '@/lib/RoleContext';

const STATUS_META = {
  pending:   { label: 'Pending',   color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)' },
  confirmed: { label: 'Confirmed', color: '#22C55E', bg: 'rgba(34, 197, 94, 0.15)' },
  cancelled: { label: 'Cancelled', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)' },
  completed: { label: 'Completed', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.15)' },
};

const VALID_BOOKING_TABS = ['all', 'pending', 'confirmed', 'completed', 'cancelled'];

const TABS = [
  { key: 'all', label: 'Semua' },
  { key: 'pending', label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

// Reads ?tab= so the sidebar "Booking Confirmation" dropdown links land on
// the right filter. Split out because useSearchParams() requires a
// Suspense boundary.
function TabFromQuery({ onTab }) {
  const searchParams = useSearchParams();
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && VALID_BOOKING_TABS.includes(tab)) onTab(tab);
  }, [searchParams, onTab]);
  return null;
}

function formatDate(d) {
  if (!d) return '-';
  try {
    return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return d;
  }
}

function ActionBtn({ active, color, icon, title, onClick, disabled }) {
  return (
    <button
      type="button"
      className="btn btn-sm"
      disabled={disabled}
      onClick={onClick}
      title={title}
      style={{
        background: active ? color : 'transparent',
        color: active ? '#fff' : color,
        border: `1px solid ${color}`,
        width: '30px', height: '30px', padding: 0,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <i className={icon}></i>
    </button>
  );
}

function EditBookingModal({ booking, onClose, onSaved }) {
  const [form, setForm] = useState({
    customer_name: booking.customer_name || '',
    customer_phone: booking.customer_phone || '',
    customer_address: booking.customer_address || '',
    fulfillment_method: booking.fulfillment_method || 'pickup',
    start_date: booking.start_date || '',
    end_date: booking.end_date || '',
    estimated_price: booking.estimated_price || 0,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.customer_name.trim() || !form.customer_phone.trim()) {
      setError('Nama dan nomor telepon wajib diisi.');
      return;
    }
    if (!form.start_date || !form.end_date) {
      setError('Tanggal mulai dan selesai wajib diisi.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/bookings/${booking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Gagal menyimpan perubahan.');
        setSaving(false);
        return;
      }
      onSaved(data);
    } catch {
      setError('Gagal terhubung ke server.');
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Edit Booking</div>
          <div className="modal-subtitle">{booking.vehicle_name}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">Nama Customer</label>
            <input
              type="text"
              className="form-control"
              value={form.customer_name}
              onChange={(e) => handleChange('customer_name', e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Nomor Telepon</label>
            <input
              type="tel"
              className="form-control"
              value={form.customer_phone}
              onChange={(e) => handleChange('customer_phone', e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Alamat</label>
            <textarea
              className="form-control"
              rows={2}
              value={form.customer_address}
              onChange={(e) => handleChange('customer_address', e.target.value)}
              style={{ resize: 'vertical' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Metode</label>
            <select
              className="form-control"
              value={form.fulfillment_method}
              onChange={(e) => handleChange('fulfillment_method', e.target.value)}
            >
              <option value="pickup">Ambil di Toko</option>
              <option value="delivery">Delivery</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Tanggal Mulai</label>
              <input
                type="date"
                className="form-control"
                value={form.start_date}
                onChange={(e) => handleChange('start_date', e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Tanggal Selesai</label>
              <input
                type="date"
                className="form-control"
                min={form.start_date}
                value={form.end_date}
                onChange={(e) => handleChange('end_date', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Estimasi Harga (Rp)</label>
            <input
              type="number"
              min="0"
              className="form-control"
              value={form.estimated_price}
              onChange={(e) => handleChange('estimated_price', e.target.value)}
            />
          </div>

          {error && (
            <div className="alert alert-danger" style={{ marginBottom: '12px' }}>
              <i className="fa-solid fa-circle-exclamation" style={{ marginRight: '6px' }}></i>{error}
            </div>
          )}

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Batal</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '6px' }}></i>Menyimpan...</> : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function BookingsPageInner() {
  const role = useRole();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const [editingBooking, setEditingBooking] = useState(null);

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

  const handleEditSaved = (updated) => {
    setBookings(prev => prev.map(b => (b.id === updated.id ? updated : b)));
    setEditingBooking(null);
  };

  const filtered = tab === 'all' ? bookings : bookings.filter(b => b.status === tab);

  return (
    <div className="page-content">
      <TabFromQuery onTab={setTab} />
      <div className="page-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '18px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            Booking Confirmation
            <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--brand-primary)', background: 'var(--brand-primary-bg, rgba(59,130,246,0.12))', padding: '3px 10px', borderRadius: 'var(--radius-full, 999px)' }}>
              {TABS.find(t => t.key === tab)?.label || 'Semua'}
            </span>
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Booking masuk dari form &quot;Book Now&quot; di website publik (/fleet) — ganti filter status lewat menu sidebar
          </p>
        </div>
        <button className="btn btn-secondary" onClick={fetchBookings} disabled={loading}>
          <i className={`fa-solid fa-rotate ${loading ? 'fa-spin' : ''}`} style={{ marginRight: '6px' }}></i> Refresh
        </button>
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
            <table className="table table--stack-mobile">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Motor</th>
                  <th>Tanggal Sewa</th>
                  <th>Metode</th>
                  <th>Estimasi</th>
                  <th>Status</th>
                  <th>Aksi</th>
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
                      <td data-label="Customer" data-label-align="left">
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
                      <td data-label="Motor">
                        <div style={{ fontWeight: 700, fontSize: '13px' }}>{b.vehicle_name}</div>
                        {b.vehicle_category && <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{b.vehicle_category}</div>}
                      </td>
                      <td data-label="Tanggal Sewa" style={{ fontSize: '12.5px' }}>
                        {formatDate(b.start_date)} — {formatDate(b.end_date)}
                        <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{b.duration_days} hari</div>
                      </td>
                      <td data-label="Metode">
                        <span className="badge" style={{ background: b.fulfillment_method === 'delivery' ? 'rgba(59,130,246,0.15)' : 'rgba(148,163,184,0.2)', color: b.fulfillment_method === 'delivery' ? '#3B82F6' : '#94A3B8', border: `1px solid ${b.fulfillment_method === 'delivery' ? '#3B82F6' : '#94A3B8'}` }}>
                          <i className={`fa-solid ${b.fulfillment_method === 'delivery' ? 'fa-truck-fast' : 'fa-store'}`} style={{ marginRight: '4px' }}></i>
                          {b.fulfillment_method === 'delivery' ? 'Delivery' : 'Ambil di Toko'}
                        </span>
                      </td>
                      <td data-label="Estimasi" style={{ fontWeight: 800, fontSize: '13px' }}>{formatRupiah(b.estimated_price)}</td>
                      <td data-label="Status">
                        <span className="badge" style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.color}` }}>
                          {meta.label}
                        </span>
                      </td>
                      <td data-label="Aksi" data-label-align="left">
                        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                          {role === 'admin' ? (
                            <>
                              <ActionBtn
                                active={b.status === 'confirmed'}
                                color="#22C55E"
                                icon="fa-solid fa-check"
                                title="Confirm"
                                disabled={busyId === b.id}
                                onClick={() => updateStatus(b.id, 'confirmed')}
                              />
                              <ActionBtn
                                active={b.status === 'cancelled'}
                                color="#EF4444"
                                icon="fa-solid fa-xmark"
                                title="Tolak / Cancel"
                                disabled={busyId === b.id}
                                onClick={() => updateStatus(b.id, 'cancelled')}
                              />
                              <ActionBtn
                                active={b.status === 'completed'}
                                color="#3B82F6"
                                icon="fa-solid fa-flag-checkered"
                                title="Selesai"
                                disabled={busyId === b.id}
                                onClick={() => updateStatus(b.id, 'completed')}
                              />
                              <ActionBtn
                                active={false}
                                color="#94A3B8"
                                icon="fa-solid fa-pen"
                                title="Edit nama / tanggal / detail booking"
                                disabled={busyId === b.id}
                                onClick={() => setEditingBooking(b)}
                              />
                              <ActionBtn
                                active={false}
                                color="#64748B"
                                icon="fa-solid fa-trash"
                                title="Hapus"
                                disabled={busyId === b.id}
                                onClick={() => deleteBooking(b.id)}
                              />
                            </>
                          ) : (
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              <i className="fa-solid fa-lock" style={{ marginRight: '4px' }}></i>Lihat saja
                            </span>
                          )}
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

      {editingBooking && (
        <EditBookingModal
          booking={editingBooking}
          onClose={() => setEditingBooking(null)}
          onSaved={handleEditSaved}
        />
      )}
    </div>
  );
}

export default function BookingsPage() {
  return (
    <Suspense fallback={null}>
      <BookingsPageInner />
    </Suspense>
  );
}
