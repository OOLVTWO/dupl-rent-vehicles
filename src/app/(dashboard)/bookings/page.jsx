'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { formatRupiah } from '@/lib/finance';
import { getWhatsAppShareUrl } from '@/lib/countryCodes';
import { useRole } from '@/lib/RoleContext';
import { createClient } from '@/lib/supabase/client';

const BUSINESS_NAME = 'Demo Rental Preview';

const PAYMENT_META = {
  cash:     { label: 'Cash', icon: 'fa-solid fa-money-bill-wave' },
  transfer: { label: 'Transfer', icon: 'fa-solid fa-building-columns' },
  qris:     { label: 'QRIS', icon: 'fa-solid fa-qrcode' },
  card:     { label: 'Card (EDC)', icon: 'fa-solid fa-credit-card' },
};

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
    payment_method: booking.payment_method || 'cash',
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

          <div className="form-group">
            <label className="form-label">Metode Pembayaran</label>
            <select
              className="form-control"
              value={form.payment_method}
              onChange={(e) => handleChange('payment_method', e.target.value)}
            >
              <option value="cash">Cash</option>
              <option value="transfer">Bank Transfer</option>
              <option value="qris">QRIS</option>
              <option value="card">Card (bawa EDC)</option>
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

// Metode pembayaran di sini SAMA PERSIS dengan pilihan di form booking
// publik (/fleet) — cash/transfer/qris/card — biar konsisten dan otomatis
// nyambung tanpa perlu pemetaan/konversi.
const BOOKING_PAYMENT_LABEL = { cash: 'Cash', transfer: 'Bank Transfer', qris: 'QRIS', card: 'Kartu (EDC)' };

function ConfirmTransactionModal({ booking, contract, onClose, onConfirmed }) {
  const [deposit, setDeposit] = useState('');
  const [kmStart, setKmStart] = useState('');
  const [paymentMethod, setPaymentMethod] = useState(booking.payment_method || 'cash');
  const [paymentStatus, setPaymentStatus] = useState('paid');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleConfirm = async (e) => {
    e.preventDefault();
    if (!booking.vehicle_id) {
      setError('Booking ini tidak punya data motor (vehicle_id kosong) — tidak bisa dibuatkan transaksi. Coba edit booking-nya dulu untuk pilih motor.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: booking.id,
          vehicle_id: booking.vehicle_id,
          renter_name: booking.customer_name,
          renter_phone: booking.customer_phone,
          renter_address: booking.customer_address,
          renter_id_number: contract?.customer_id_number || null,
          customer_image_url: contract?.passport_photo_url || null,
          handover_image_url: contract?.customer_vehicle_photo_url || null,
          start_date: booking.start_date,
          end_date: booking.end_date,
          deposit: Number(deposit) || 0,
          km_start: Number(kmStart) || 0,
          total_price: Number(booking.estimated_price) || 0,
          payment_method: paymentMethod,
          payment_status: paymentStatus,
          status: 'active',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Gagal konfirmasi transaksi.');
        setSaving(false);
        return;
      }
      onConfirmed();
    } catch {
      setError('Gagal terhubung ke server.');
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-title">Konfirmasi Transaksi</div>
            <div className="modal-subtitle">Data booking &amp; kontrak sudah otomatis dipakai — tinggal lengkapi ini</div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div style={{ background: 'var(--bg-elevated)', borderRadius: '12px', padding: '14px 16px', marginBottom: '20px', border: '1px solid var(--bg-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <div style={{
              width: '38px', height: '38px', borderRadius: '10px', flexShrink: 0,
              background: 'var(--brand-primary-bg, rgba(59,130,246,0.12))', color: 'var(--brand-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px',
            }}>
              <i className="fa-solid fa-motorcycle"></i>
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--text-primary)' }}>{booking.customer_name}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{booking.vehicle_name}</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', fontSize: '12.5px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
              <i className="fa-solid fa-phone" style={{ width: '14px', color: 'var(--text-muted)' }}></i> {booking.customer_phone}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
              <i className="fa-solid fa-calendar-days" style={{ width: '14px', color: 'var(--text-muted)' }}></i>
              {formatDate(booking.start_date)} — {formatDate(booking.end_date)}
            </div>
            {contract?.customer_id_number && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                <i className="fa-solid fa-id-card" style={{ width: '14px', color: 'var(--text-muted)' }}></i> {contract.customer_id_number}
              </div>
            )}
            {booking.payment_method && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                <i className="fa-solid fa-wallet" style={{ width: '14px', color: 'var(--text-muted)' }}></i>
                Dipilih saat booking: <strong style={{ color: 'var(--text-primary)' }}>{BOOKING_PAYMENT_LABEL[booking.payment_method] || booking.payment_method}</strong>
              </div>
            )}
          </div>

          {!contract && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', color: '#F59E0B', marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed var(--bg-border)', fontSize: '12px' }}>
              <i className="fa-solid fa-triangle-exclamation" style={{ marginTop: '2px' }}></i>
              <span>Belum ada kontrak terhubung — no. ID customer tidak terisi otomatis.</span>
            </div>
          )}
        </div>

        <form onSubmit={handleConfirm} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Deposit (Rp)</label>
              <input type="number" min="0" className="form-control" value={deposit} onChange={(e) => setDeposit(e.target.value)} placeholder="0" />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">KM Awal</label>
              <input type="number" min="0" className="form-control" value={kmStart} onChange={(e) => setKmStart(e.target.value)} placeholder="0" />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ marginBottom: '8px' }}>Metode Pembayaran</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px' }}>
              {Object.entries(PAYMENT_META).map(([key, meta]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPaymentMethod(key)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                    padding: '12px 8px', borderRadius: '10px', cursor: 'pointer', fontSize: '12px', fontWeight: 700,
                    border: paymentMethod === key ? '2px solid var(--brand-primary)' : '1px solid var(--bg-border)',
                    background: paymentMethod === key ? 'rgba(37,99,235,0.1)' : 'transparent',
                    color: paymentMethod === key ? 'var(--brand-primary-light)' : 'var(--text-secondary)',
                  }}
                >
                  <i className={meta.icon} style={{ fontSize: '16px' }}></i>
                  {meta.label}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ marginBottom: '8px' }}>Status Pembayaran</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {[
                { key: 'paid', label: 'Sudah Lunas', icon: 'fa-solid fa-circle-check', color: '#22C55E' },
                { key: 'unpaid', label: 'Belum Bayar', icon: 'fa-solid fa-clock', color: '#F59E0B' },
              ].map(opt => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setPaymentStatus(opt.key)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                    padding: '12px', borderRadius: '10px', cursor: 'pointer', fontWeight: 700, fontSize: '13px',
                    border: paymentStatus === opt.key ? `2px solid ${opt.color}` : '1px solid var(--bg-border)',
                    background: paymentStatus === opt.key ? `${opt.color}18` : 'transparent',
                    color: paymentStatus === opt.key ? opt.color : 'var(--text-secondary)',
                  }}
                >
                  <i className={opt.icon}></i>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="alert alert-danger" style={{ marginBottom: 0 }}>
              <i className="fa-solid fa-circle-exclamation" style={{ marginRight: '6px' }}></i>{error}
            </div>
          )}

          <div className="modal-footer" style={{ marginTop: '2px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Batal</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '6px' }}></i>Menyimpan...</> : <><i className="fa-solid fa-check" style={{ marginRight: '6px' }}></i>Konfirmasi Transaksi</>}
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
  const [confirmTxBooking, setConfirmTxBooking] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [myUserId, setMyUserId] = useState(null);
  const [contractsByBookingId, setContractsByBookingId] = useState(new Map());

  useEffect(() => {
    Promise.resolve().then(async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        setMyUserId(user?.id || null);
      } catch { /* ignore */ }
    });
  }, []);

  const fetchContracts = useCallback(async () => {
    try {
      const res = await fetch('/api/contracts');
      const data = await res.json().catch(() => []);
      if (res.ok) {
        const map = new Map();
        (Array.isArray(data) ? data : []).forEach(c => { if (c.booking_id) map.set(c.booking_id, c); });
        setContractsByBookingId(map);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { Promise.resolve().then(fetchContracts); }, [fetchContracts]);


  const fetchDrivers = useCallback(async () => {
    try {
      const res = await fetch('/api/staff');
      const data = await res.json().catch(() => []);
      if (res.ok) setDrivers((Array.isArray(data) ? data : []).filter(s => s.role === 'driver'));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (role === 'admin') Promise.resolve().then(fetchDrivers);
  }, [role, fetchDrivers]);

  // Berapa delivery yang sudah ditugaskan ke tiap driver bulan ini — biar
  // pemerataan jelas kelihatan saat admin memilih siapa yang jalan.
  const deliveryCountThisMonth = (driverId) => {
    const now = new Date();
    return bookings.filter(b => {
      if (b.assigned_driver_id !== driverId || b.fulfillment_method !== 'delivery') return false;
      const d = new Date(b.created_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
  };

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

  const assignDriver = async (id, driverId) => {
    const driver = drivers.find(d => d.id === driverId);
    setBusyId(id);
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigned_driver_id: driverId || null, assigned_driver_name: driver?.full_name || null }),
      });
      if (res.ok) {
        const updated = await res.json();
        setBookings(prev => prev.map(b => (b.id === id ? updated : b)));
      }
    } catch {
      /* ignore */
    }
    setBusyId(null);
  };

  const confirmDelivery = async (id) => {
    if (!confirm('Konfirmasi motor sudah sampai & diserahkan ke customer?')) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'confirm_delivery' }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setBookings(prev => prev.map(b => (b.id === id ? data : b)));
      } else {
        alert(data.error || 'Gagal konfirmasi delivery.');
      }
    } catch {
      alert('Gagal terhubung ke server.');
    }
    setBusyId(null);
  };

  const sendBookingConfirmationToCustomer = (b) => {
    const methodLine = b.fulfillment_method === 'delivery'
      ? `📦 *Method:* Delivery (${b.delivery_zone_name || '-'}) to ${b.customer_address || 'your address'}`
      : '📦 *Method:* Self pickup at our shop (Pererenan / Canggu)';
    const driverLine = b.fulfillment_method === 'delivery' && b.assigned_driver_name
      ? `\n🧑‍✈️ *Your Driver:* ${b.assigned_driver_name}`
      : '';

    const msg = `Hi ${b.customer_name}! 🛵\n\nGreat news — your booking with ${BUSINESS_NAME} is *confirmed*! ✅\n\n🏍️ *Scooter:* ${b.vehicle_name}\n📅 *Dates:* ${formatDate(b.start_date)} - ${formatDate(b.end_date)} (${b.duration_days} day${b.duration_days > 1 ? 's' : ''})\n${methodLine}${driverLine}\n💳 *Payment:* ${PAYMENT_META[b.payment_method]?.label || 'Cash'}\n💰 *Total:* ${formatRupiah(b.estimated_price)}\n\n${b.fulfillment_method === 'delivery' ? 'Our driver will contact you shortly before arrival.' : 'Please come to our shop at your scheduled pickup time.'}\n\nThank you for choosing us, see you soon! 🙏`;

    window.open(getWhatsAppShareUrl(b.customer_phone, msg), '_blank');
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
    fetchBookings();
  };

  const filtered = tab === 'all' ? bookings : bookings.filter(b => b.status === tab);

  return (
    <div className="page-content">
      <TabFromQuery onTab={setTab} />
      <div className="page-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '18px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            Booking
            <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--brand-primary)', background: 'var(--brand-primary-bg, rgba(59,130,246,0.12))', padding: '3px 10px', borderRadius: 'var(--radius-full, 999px)' }}>
              {TABS.find(t => t.key === tab)?.label || 'Semua'}
            </span>
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Booking masuk dari form &quot;Book Now&quot; di website publik (/fleet)
          </p>
        </div>
        <button className="btn btn-secondary" onClick={fetchBookings} disabled={loading}>
          <i className={`fa-solid fa-rotate ${loading ? 'fa-spin' : ''}`} style={{ marginRight: '6px' }}></i> Refresh
        </button>
      </div>

      <div style={{ marginBottom: '18px', maxWidth: '260px' }}>
        <select
          className="form-control"
          value={tab}
          onChange={(e) => setTab(e.target.value)}
        >
          {TABS.map(t => (
            <option key={t.key} value={t.key}>{t.label}</option>
          ))}
        </select>
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
                  <th>Driver</th>
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
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', width: '100%', minWidth: 0 }}>
                          <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{b.customer_name}</strong>
                          <a href={waUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11.5px', color: 'var(--brand-primary-light, #25D366)' }}>
                            <i className="fa-brands fa-whatsapp" style={{ marginRight: '4px' }}></i>{b.customer_phone}
                          </a>
                          {b.customer_address && (
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={b.customer_address}>
                              <i className="fa-solid fa-location-dot" style={{ marginRight: '4px' }}></i>{b.customer_address}
                            </div>
                          )}
                        </div>
                      </td>
                      <td data-label="Motor">
                        <div style={{ fontWeight: 700, fontSize: '13px' }}>{b.vehicle_name}</div>
                        {b.vehicle_category && <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{b.vehicle_category}</div>}
                      </td>
                      <td data-label="Tanggal Sewa" data-label-align="left" style={{ fontSize: '13px' }}>
                        {formatDate(b.start_date)} — {formatDate(b.end_date)}
                        <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{b.duration_days} hari</div>
                      </td>
                      <td data-label="Metode" data-label-align="left">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <span className="badge" style={{ background: b.fulfillment_method === 'delivery' ? 'rgba(59,130,246,0.15)' : 'rgba(148,163,184,0.2)', color: b.fulfillment_method === 'delivery' ? '#3B82F6' : '#94A3B8', border: `1px solid ${b.fulfillment_method === 'delivery' ? '#3B82F6' : '#94A3B8'}` }}>
                            <i className={`fa-solid ${b.fulfillment_method === 'delivery' ? 'fa-truck-fast' : 'fa-store'}`} style={{ marginRight: '4px' }}></i>
                            {b.fulfillment_method === 'delivery' ? 'Delivery' : 'Pickup'}
                          </span>
                          <span className="badge badge-muted">
                            <i className={PAYMENT_META[b.payment_method]?.icon || 'fa-solid fa-money-bill-wave'} style={{ marginRight: '4px' }}></i>
                            {PAYMENT_META[b.payment_method]?.label || 'Cash'}
                          </span>
                        </div>
                      </td>
                      <td data-label="Estimasi" style={{ fontWeight: 800, fontSize: '13px' }}>{formatRupiah(b.estimated_price)}</td>
                      <td data-label="Driver" data-label-align="left">
                        {b.fulfillment_method !== 'delivery' ? (
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>— (pickup)</span>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {b.delivery_zone_name && (
                              <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                                <i className="fa-solid fa-location-dot" style={{ marginRight: '3px' }}></i>{b.delivery_zone_name} · {formatRupiah(b.delivery_fee)}
                              </span>
                            )}
                            {role === 'admin' ? (
                              <div style={{ position: 'relative', display: 'inline-block', maxWidth: '100%' }}>
                                <select
                                  value={b.assigned_driver_id || ''}
                                  disabled={busyId === b.id}
                                  onChange={(e) => assignDriver(b.id, e.target.value)}
                                  style={{
                                    fontSize: '11.5px', fontWeight: 700, padding: '5px 26px 5px 10px',
                                    width: 'fit-content', maxWidth: '100%', height: 'auto',
                                    borderRadius: 'var(--radius-full, 999px)',
                                    border: `1px solid ${b.assigned_driver_id ? '#8B5CF6' : 'var(--bg-border)'}`,
                                    background: b.assigned_driver_id ? 'rgba(139,92,246,0.12)' : 'var(--bg-elevated)',
                                    color: b.assigned_driver_id ? '#8B5CF6' : 'var(--text-secondary)',
                                    appearance: 'none',
                                    backgroundImage: 'none',
                                    cursor: 'pointer',
                                  }}
                                >
                                  <option value="">Belum ditugaskan</option>
                                  {drivers.map(d => (
                                    <option key={d.id} value={d.id}>
                                      {d.full_name} ({deliveryCountThisMonth(d.id)}x)
                                    </option>
                                  ))}
                                </select>
                                <i className="fa-solid fa-chevron-down" style={{
                                  position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                                  fontSize: '9px', color: b.assigned_driver_id ? '#8B5CF6' : 'var(--text-muted)', pointerEvents: 'none',
                                }}></i>
                              </div>
                            ) : b.assigned_driver_name ? (
                              <span className="badge" style={{ background: 'rgba(139,92,246,0.15)', color: '#8B5CF6', border: '1px solid #8B5CF6' }}>
                                <i className="fa-solid fa-motorcycle" style={{ marginRight: '4px' }}></i>{b.assigned_driver_name}
                              </span>
                            ) : (
                              <span className="badge badge-muted"><i className="fa-solid fa-hourglass-half" style={{ marginRight: '4px' }}></i>Belum ditugaskan</span>
                            )}

                            {b.assigned_driver_id && (
                              b.delivered_at ? (
                                <span style={{ fontSize: '10.5px', color: '#22C55E', fontWeight: 700 }}>
                                  <i className="fa-solid fa-circle-check" style={{ marginRight: '4px' }}></i>
                                  Delivered {new Date(b.delivered_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                </span>
                              ) : (role === 'driver' && myUserId === b.assigned_driver_id) && (
                                contractsByBookingId.has(b.id) ? (
                                  <button
                                    type="button"
                                    disabled={busyId === b.id}
                                    onClick={() => confirmDelivery(b.id)}
                                    style={{
                                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                      fontSize: '12.5px', fontWeight: 800, padding: '10px 14px', width: '100%', maxWidth: '220px',
                                      background: '#22C55E', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                                    }}
                                  >
                                    <i className="fa-solid fa-circle-check" style={{ fontSize: '15px' }}></i>CONFIRM DELIVERED
                                  </button>
                                ) : (
                                  <Link
                                    href={`/contracts/new?bookingId=${b.id}`}
                                    style={{
                                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                      fontSize: '12px', fontWeight: 800, padding: '10px 14px', width: '100%', maxWidth: '220px',
                                      background: '#8B5CF6', color: '#fff', borderRadius: 'var(--radius-md)', textDecoration: 'none',
                                    }}
                                  >
                                    <i className="fa-solid fa-file-signature"></i> Buat Kontrak Dulu
                                  </Link>
                                )
                              )
                            )}
                            {b.assigned_driver_id && role === 'admin' && !b.delivered_at && (
                              <span style={{ fontSize: '10.5px', color: contractsByBookingId.has(b.id) ? '#8B5CF6' : '#94A3B8' }}>
                                <i className={`fa-solid ${contractsByBookingId.has(b.id) ? 'fa-file-signature' : 'fa-hourglass-half'}`} style={{ marginRight: '4px' }}></i>
                                {contractsByBookingId.has(b.id) ? 'Kontrak sudah dibuat' : 'Menunggu driver'}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td data-label="Status">
                        <span className="badge" style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.color}` }}>
                          {meta.label}
                        </span>
                      </td>
                      <td data-label="Aksi" data-label-align="left">
                        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                          {role === 'admin' && b.status === 'confirmed' && (b.fulfillment_method !== 'delivery' || b.delivered_at) && (
                            <button
                              type="button"
                              onClick={() => setConfirmTxBooking(b)}
                              title="Konfirmasi Transaksi dari booking ini"
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: '5px',
                                fontSize: '11px', fontWeight: 800, padding: '7px 10px',
                                background: 'rgba(37,99,235,0.12)', color: 'var(--brand-primary-light, #3B82F6)',
                                border: '1px solid var(--brand-primary-light, #3B82F6)', borderRadius: 'var(--radius-md)',
                                cursor: 'pointer',
                              }}
                            >
                              <i className="fa-solid fa-file-invoice-dollar"></i> Konfirmasi Transaksi
                            </button>
                          )}
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
                              {b.status === 'confirmed' && (b.fulfillment_method !== 'delivery' || b.assigned_driver_id) && (
                                <ActionBtn
                                  active={false}
                                  color="#25D366"
                                  icon="fa-brands fa-whatsapp"
                                  title="Kirim Booking Confirmation ke Customer (WA)"
                                  disabled={busyId === b.id}
                                  onClick={() => sendBookingConfirmationToCustomer(b)}
                                />
                              )}
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

      {confirmTxBooking && (
        <ConfirmTransactionModal
          booking={confirmTxBooking}
          contract={contractsByBookingId.get(confirmTxBooking.id) || null}
          onClose={() => setConfirmTxBooking(null)}
          onConfirmed={() => {
            setConfirmTxBooking(null);
            fetchBookings();
            fetchContracts();
          }}
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
