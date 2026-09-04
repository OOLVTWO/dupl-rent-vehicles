'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { formatRupiah, getLocalDateStr } from '@/lib/finance';
import { splitVehicleName } from '@/lib/bookingCode';
import PaymentSummaryCell from '@/components/shared/PaymentSummaryCell';
import { getWhatsAppShareUrl } from '@/lib/countryCodes';
import VehicleCombobox from '@/components/shared/VehicleCombobox';
import CountryCodePicker from '@/components/shared/CountryCodePicker';
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

function EditBookingModal({ booking, onClose, onSaved, vehicles, deliveryZones, drivers }) {
  const [form, setForm] = useState({
    customer_name: booking.customer_name || '',
    customer_phone: booking.customer_phone || '',
    customer_id_number: booking.customer_id_number || '',
    customer_address: booking.customer_address || '',
    vehicle_id: booking.vehicle_id || '',
    payment_method: booking.payment_method || 'cash',
    payment_status: booking.payment_status || 'unpaid',
    dp_amount: booking.dp_amount || '',
    start_date: booking.start_date || '',
    end_date: booking.end_date || '',
    estimated_price: booking.estimated_price || 0,
  });
  const [fulfillment, setFulfillment] = useState(booking.fulfillment_method || 'pickup');
  const [selectedZoneId, setSelectedZoneId] = useState(booking.delivery_zone_id || '');
  const [assignedDriverId, setAssignedDriverId] = useState(booking.assigned_driver_id || '');
  const [countryCode, setCountryCode] = useState(() => {
    if (booking.customer_phone) {
      const parts = booking.customer_phone.trim().split(' ');
      if (parts.length > 1 && parts[0].startsWith('+')) return parts[0];
    }
    return '+62';
  });
  const [phoneNumber, setPhoneNumber] = useState(() => {
    if (booking.customer_phone) {
      const parts = booking.customer_phone.trim().split(' ');
      if (parts.length > 1 && parts[0].startsWith('+')) return parts.slice(1).join(' ');
      return booking.customer_phone;
    }
    return '';
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
    if (!form.vehicle_id) {
      setError('Motor wajib dipilih.');
      return;
    }
    if (fulfillment === 'delivery' && !selectedZoneId) {
      setError('Zona delivery wajib dipilih.');
      return;
    }
    if (form.payment_status === 'down_payment' && !String(form.dp_amount).trim()) {
      setError('Jumlah DP yang sudah dibayar wajib diisi.');
      return;
    }
    setSaving(true);
    setError('');
    const zoneObj = deliveryZones.find(z => z.id === selectedZoneId);
    const driverObj = drivers.find(d => d.id === assignedDriverId);
    const vehicleObj = vehicles.find(v => v.id === form.vehicle_id);
    try {
      const res = await fetch(`/api/bookings/${booking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          vehicle_name: vehicleObj?.name || booking.vehicle_name,
          vehicle_category: vehicleObj?.category || booking.vehicle_category || null,
          fulfillment_method: fulfillment,
          delivery_zone_id: fulfillment === 'delivery' ? (zoneObj?.id || null) : null,
          delivery_zone_name: fulfillment === 'delivery' ? (zoneObj?.zone_label || null) : null,
          delivery_fee: fulfillment === 'delivery' ? Number(zoneObj?.fee) || 0 : 0,
          assigned_driver_id: fulfillment === 'delivery' ? (driverObj?.id || null) : null,
          assigned_driver_name: fulfillment === 'delivery' ? (driverObj?.full_name || null) : null,
          dp_amount: form.payment_status === 'down_payment' ? Number(form.dp_amount) || 0 : 0,
        }),
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
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-title">Edit Booking</div>
            <div className="modal-subtitle">{booking.booking_code ? `Kode: ${booking.booking_code}` : booking.vehicle_name}</div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">Nama Customer <span className="required">*</span></label>
            <input
              type="text"
              className="form-control"
              value={form.customer_name}
              onChange={(e) => handleChange('customer_name', e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">No. KTP / Paspor / SIM</label>
            <input
              type="text"
              className="form-control"
              value={form.customer_id_number}
              onChange={(e) => handleChange('customer_id_number', e.target.value)}
              placeholder="Nomor identitas"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Nomor WhatsApp <span className="required">*</span></label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'nowrap' }}>
              <CountryCodePicker
                value={countryCode}
                onChange={(newCode) => {
                  setCountryCode(newCode);
                  handleChange('customer_phone', `${newCode} ${phoneNumber}`);
                }}
              />
              <input
                type="tel"
                className="form-control"
                style={{ flex: 1, minWidth: 0 }}
                placeholder="812345678"
                value={phoneNumber}
                onChange={(e) => {
                  const newNum = e.target.value;
                  setPhoneNumber(newNum);
                  handleChange('customer_phone', `${countryCode} ${newNum}`);
                }}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Tanggal Mulai <span className="required">*</span></label>
              <input
                type="date"
                className="form-control"
                value={form.start_date}
                onChange={(e) => handleChange('start_date', e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Tanggal Selesai <span className="required">*</span></label>
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
            <label className="form-label">Alamat / Villa / Hotel</label>
            <textarea
              className="form-control"
              rows={2}
              value={form.customer_address}
              onChange={(e) => handleChange('customer_address', e.target.value)}
              style={{ resize: 'vertical' }}
            />
          </div>

          {/* ── Ambil di Toko / Diantar — sama seperti form Tambah Transaksi ── */}
          <div className="form-group">
            <label className="form-label">Ambil di Toko atau Diantar? <span className="required">*</span></label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: fulfillment === 'delivery' ? '12px' : 0 }}>
              <button
                type="button"
                onClick={() => setFulfillment('pickup')}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                  padding: '11px', borderRadius: '10px', cursor: 'pointer', fontWeight: 700, fontSize: '13px',
                  border: fulfillment === 'pickup' ? '2px solid var(--brand-primary)' : '1px solid var(--bg-border)',
                  background: fulfillment === 'pickup' ? 'rgba(37,99,235,0.1)' : 'transparent',
                  color: fulfillment === 'pickup' ? 'var(--brand-primary-light)' : 'var(--text-secondary)',
                }}
              >
                <i className="fa-solid fa-shop"></i> Ambil di Toko
              </button>
              <button
                type="button"
                onClick={() => setFulfillment('delivery')}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                  padding: '11px', borderRadius: '10px', cursor: 'pointer', fontWeight: 700, fontSize: '13px',
                  border: fulfillment === 'delivery' ? '2px solid var(--brand-primary)' : '1px solid var(--bg-border)',
                  background: fulfillment === 'delivery' ? 'rgba(37,99,235,0.1)' : 'transparent',
                  color: fulfillment === 'delivery' ? 'var(--brand-primary-light)' : 'var(--text-secondary)',
                }}
              >
                <i className="fa-solid fa-truck-fast"></i> Diantar
              </button>
            </div>

            {fulfillment === 'delivery' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {deliveryZones.map(z => (
                  <button
                    key={z.id}
                    type="button"
                    onClick={() => setSelectedZoneId(z.id)}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px',
                      padding: '12px 14px', borderRadius: '10px', cursor: 'pointer', textAlign: 'left',
                      border: selectedZoneId === z.id ? `2px solid ${z.color}` : '1px solid var(--bg-border)',
                      background: selectedZoneId === z.id ? `${z.color}15` : 'transparent',
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: z.color, flexShrink: 0 }}></span>
                      {z.zone_label}
                    </span>
                    <span style={{ fontSize: '12.5px', fontWeight: 700, color: Number(z.fee) > 0 ? '#F59E0B' : '#22C55E', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {Number(z.fee) > 0 ? formatRupiah(z.fee) : 'Gratis'}
                    </span>
                  </button>
                ))}
                {deliveryZones.length === 0 && (
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Belum ada zona delivery diatur. Cek di Pengaturan.</p>
                )}

                <div style={{ marginTop: '4px' }}>
                  <label className="form-label" htmlFor="edit-booking-driver">Tugaskan Driver</label>
                  <select
                    id="edit-booking-driver"
                    className="form-control"
                    value={assignedDriverId}
                    onChange={(e) => setAssignedDriverId(e.target.value)}
                  >
                    <option value="">Belum ditugaskan</option>
                    {drivers.map(d => (
                      <option key={d.id} value={d.id}>{d.full_name}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* ── Pilih Motor ── */}
          <VehicleCombobox
            vehicles={vehicles.filter(v => v.status === 'available' || v.id === booking.vehicle_id)}
            value={form.vehicle_id}
            onChange={(id) => handleChange('vehicle_id', id)}
          />

          <div className="form-group">
            <label className="form-label">Metode Bayar</label>
            <select
              className="form-control"
              value={form.payment_method}
              onChange={(e) => handleChange('payment_method', e.target.value)}
            >
              <option value="cash">Cash</option>
              <option value="transfer">Bank Transfer</option>
              <option value="qris">QRIS</option>
              <option value="card">Kartu (EDC)</option>
            </select>
          </div>

          {/* ── Status Pembayaran ── */}
          <div className="form-group">
            <label className="form-label">Status Pembayaran <span className="required">*</span></label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              <button type="button" onClick={() => handleChange('payment_status', 'paid')}
                style={{ padding: '11px 6px', borderRadius: '10px', border: `2px solid ${form.payment_status === 'paid' ? '#22C55E' : 'var(--bg-border)'}`, background: form.payment_status === 'paid' ? 'rgba(34,197,94,0.15)' : 'var(--bg-elevated)', color: form.payment_status === 'paid' ? '#22C55E' : 'var(--text-secondary)', fontWeight: 700, fontSize: '12px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                <i className="fa-solid fa-circle-check"></i> Lunas
              </button>
              <button type="button" onClick={() => handleChange('payment_status', 'down_payment')}
                style={{ padding: '11px 6px', borderRadius: '10px', border: `2px solid ${form.payment_status === 'down_payment' ? '#3B82F6' : 'var(--bg-border)'}`, background: form.payment_status === 'down_payment' ? 'rgba(59,130,246,0.15)' : 'var(--bg-elevated)', color: form.payment_status === 'down_payment' ? '#3B82F6' : 'var(--text-secondary)', fontWeight: 700, fontSize: '12px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                <i className="fa-solid fa-coins"></i> Down Payment
              </button>
              <button type="button" onClick={() => handleChange('payment_status', 'unpaid')}
                style={{ padding: '11px 6px', borderRadius: '10px', border: `2px solid ${form.payment_status === 'unpaid' ? '#F59E0B' : 'var(--bg-border)'}`, background: form.payment_status === 'unpaid' ? 'rgba(245,158,11,0.15)' : 'var(--bg-elevated)', color: form.payment_status === 'unpaid' ? '#F59E0B' : 'var(--text-secondary)', fontWeight: 700, fontSize: '12px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                <i className="fa-solid fa-clock"></i> Belum Bayar
              </button>
            </div>
            {form.payment_status === 'down_payment' && (
              <div style={{ marginTop: '10px' }}>
                <label className="form-label" htmlFor="edit-booking-dp">Jumlah DP yang sudah dibayar (Rp) <span className="required">*</span></label>
                <input
                  id="edit-booking-dp"
                  type="number"
                  min="0"
                  className="form-control"
                  placeholder="e.g. 300000"
                  value={form.dp_amount}
                  onChange={(e) => handleChange('dp_amount', e.target.value)}
                  required
                />
                {Number(form.estimated_price) > 0 && form.dp_amount && (
                  <div style={{ marginTop: '8px', padding: '8px 12px', background: 'rgba(59,130,246,0.08)', borderRadius: '8px', border: '1px solid rgba(59,130,246,0.3)', fontSize: '12px', color: '#3B82F6', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                    <span>Sisa yang harus dilunasi:</span>
                    <strong style={{ whiteSpace: 'nowrap' }}>{formatRupiah(Math.max(0, Number(form.estimated_price) - Number(form.dp_amount || 0)))}</strong>
                  </div>
                )}
              </div>
            )}
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
  const [paymentStatus, setPaymentStatus] = useState(booking.payment_status || 'unpaid');
  const [dpAmount, setDpAmount] = useState(booking.payment_status === 'down_payment' ? String(booking.dp_amount || '') : '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleConfirm = async (e) => {
    e.preventDefault();
    if (!booking.vehicle_id) {
      setError('Booking ini tidak punya data motor (vehicle_id kosong) — tidak bisa dibuatkan transaksi. Coba edit booking-nya dulu untuk pilih motor.');
      return;
    }
    if (paymentStatus === 'down_payment' && !String(dpAmount).trim()) {
      setError('Jumlah DP yang sudah dibayar wajib diisi.');
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
          renter_id_number: contract?.customer_id_number || booking.customer_id_number || null,
          customer_image_url: contract?.passport_photo_url || null,
          handover_image_url: contract?.customer_vehicle_photo_url || null,
          fulfillment_method: booking.fulfillment_method || null,
          delivery_zone_id: booking.delivery_zone_id || null,
          delivery_zone_name: booking.delivery_zone_name || null,
          delivery_fee: booking.delivery_fee || 0,
          assigned_driver_id: booking.assigned_driver_id || null,
          assigned_driver_name: booking.assigned_driver_name || null,
          start_date: booking.start_date,
          end_date: booking.end_date,
          deposit: Number(deposit) || 0,
          km_start: Number(kmStart) || 0,
          total_price: Number(booking.estimated_price) || 0,
          payment_method: paymentMethod,
          payment_status: paymentStatus,
          dp_amount: paymentStatus === 'down_payment' ? Number(dpAmount) || 0 : 0,
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {[
                { key: 'paid', label: 'Lunas', icon: 'fa-solid fa-circle-check', color: '#22C55E' },
                { key: 'down_payment', label: 'Down Payment', icon: 'fa-solid fa-coins', color: '#3B82F6' },
                { key: 'unpaid', label: 'Belum Bayar', icon: 'fa-solid fa-clock', color: '#F59E0B' },
              ].map(opt => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setPaymentStatus(opt.key)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '5px',
                    padding: '11px 6px', borderRadius: '10px', cursor: 'pointer', fontWeight: 700, fontSize: '12px',
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
            {paymentStatus === 'down_payment' && (
              <div style={{ marginTop: '10px' }}>
                <label className="form-label" htmlFor="confirm-tx-dp">Jumlah DP yang sudah dibayar (Rp) <span className="required">*</span></label>
                <input
                  id="confirm-tx-dp"
                  type="number"
                  min="0"
                  className="form-control"
                  placeholder="e.g. 300000"
                  value={dpAmount}
                  onChange={(e) => setDpAmount(e.target.value)}
                  required
                />
                {Number(booking.estimated_price) > 0 && dpAmount && (
                  <div style={{ marginTop: '8px', padding: '8px 12px', background: 'rgba(59,130,246,0.08)', borderRadius: '8px', border: '1px solid rgba(59,130,246,0.3)', fontSize: '12px', color: '#3B82F6', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                    <span>Sisa yang harus dilunasi:</span>
                    <strong style={{ whiteSpace: 'nowrap' }}>{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(Math.max(0, Number(booking.estimated_price) - Number(dpAmount || 0)))}</strong>
                  </div>
                )}
              </div>
            )}
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
  const [searchQuery, setSearchQuery] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const [editingBooking, setEditingBooking] = useState(null);
  const [confirmTxBooking, setConfirmTxBooking] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [deliveryZones, setDeliveryZones] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [directTxDeliveries, setDirectTxDeliveries] = useState([]);
  const [txByBookingId, setTxByBookingId] = useState(new Map());
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
    try {
      const res = await fetch('/api/transactions');
      const data = await res.json().catch(() => []);
      if (res.ok) {
        const list = Array.isArray(data) ? data : [];
        setDirectTxDeliveries(list.filter(t => t.assigned_driver_id && t.fulfillment_method === 'delivery'));
        const map = new Map();
        list.forEach(t => { if (t.booking_id) map.set(t.booking_id, t); });
        setTxByBookingId(map);
      }
    } catch { /* ignore */ }
    try {
      const res = await fetch('/api/delivery-zones');
      const data = await res.json().catch(() => []);
      if (res.ok) setDeliveryZones(Array.isArray(data) ? data : []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (role === 'admin') Promise.resolve().then(fetchDrivers);
  }, [role, fetchDrivers]);

  // Berapa delivery yang sudah ditugaskan ke tiap driver bulan ini — biar
  // pemerataan jelas kelihatan saat admin memilih siapa yang jalan. Ini
  // gabungan dari 2 sumber: booking yang delivery, DAN transaksi langsung
  // yang delivery (dari mode "Transaksi Sekarang" di halaman Transaksi).
  const deliveryCountThisMonth = (driverId) => {
    const now = new Date();
    const inThisMonth = (dateStr) => {
      const d = new Date(dateStr);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    };
    const fromBookings = bookings.filter(b =>
      b.assigned_driver_id === driverId && b.fulfillment_method === 'delivery' && inThisMonth(b.created_at)
    ).length;
    const fromDirectTx = directTxDeliveries.filter(t =>
      t.assigned_driver_id === driverId && inThisMonth(t.created_at)
    ).length;
    return fromBookings + fromDirectTx;
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
    try {
      const vRes = await fetch('/api/vehicles');
      const vData = await vRes.json().catch(() => []);
      if (vRes.ok) setVehicles(Array.isArray(vData) ? vData : []);
    } catch { /* ignore */ }
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
    const assignedDriver = drivers.find(d => d.id === b.assigned_driver_id);
    const driverLine = b.fulfillment_method === 'delivery' && b.assigned_driver_name
      ? `\n🧑‍✈️ *Your Driver:* ${b.assigned_driver_name}${assignedDriver?.phone ? ` (WA: ${assignedDriver.phone})` : ''}`
      : '';

    const msg = `Hi ${b.customer_name}! 🛵\n\nGreat news — your booking with ${BUSINESS_NAME} is *confirmed*! ✅\n\n🔖 *Booking Code:* ${b.booking_code || '-'}\n🏍️ *Scooter:* ${b.vehicle_name}\n📅 *Dates:* ${formatDate(b.start_date)} - ${formatDate(b.end_date)} (${b.duration_days} day${b.duration_days > 1 ? 's' : ''})\n${methodLine}${driverLine}\n💳 *Payment:* ${PAYMENT_META[b.payment_method]?.label || 'Cash'}\n💰 *Total:* ${formatRupiah(b.estimated_price)}\n\n${b.fulfillment_method === 'delivery' ? 'Our driver will contact you shortly before arrival.' : 'Please come to our shop at your scheduled pickup time.'}\n\nThank you for choosing us, see you soon! 🙏`;

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

  const filtered = (tab === 'all' ? bookings : bookings.filter(b => b.status === tab))
    .filter(b => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        b.customer_name?.toLowerCase().includes(q) ||
        b.customer_phone?.toLowerCase().includes(q) ||
        b.vehicle_name?.toLowerCase().includes(q) ||
        b.id?.toLowerCase().includes(q)
      );
    });

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

      <div style={{ display: 'flex', gap: '10px', marginBottom: '18px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 240px', minWidth: '220px' }}>
          <input
            type="text"
            className="form-control"
            placeholder="Cari nama, WA, motor, atau ID booking..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '36px' }}
          />
          <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none', fontSize: '13px' }}></i>
        </div>
        <div style={{ maxWidth: '220px', flex: '1 1 180px' }}>
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
                  <th>Kode Booking</th>
                  <th>Customer</th>
                  <th>Merk Motor</th>
                  <th>Nama Motor</th>
                  <th>Plat Motor</th>
                  <th>Atribut Tambahan</th>
                  <th>Tanggal Sewa</th>
                  <th>Metode Pengambilan</th>
                  <th>Metode Pembayaran</th>
                  <th>Status Pembayaran</th>
                  <th>Driver</th>
                  <th>Status Kontrak</th>
                  <th>Status Delivery</th>
                  <th>Status</th>
                  <th>Ringkasan Pembayaran</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => {
                  const meta = STATUS_META[b.status] || STATUS_META.pending;
                  const waUrl = getWhatsAppShareUrl(
                    b.customer_phone,
                    `Hi ${b.customer_name}, regarding your booking for ${b.vehicle_name} (${formatDate(b.start_date)} - ${formatDate(b.end_date)}) —`
                  );
                  return (
                    <tr key={b.id}>
                      <td data-label="Kode Booking" style={{ fontWeight: 800, color: '#8B5CF6', fontSize: '13px', letterSpacing: '0.5px' }}>{b.booking_code || '-'}</td>
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
                          {b.customer_id_number && (
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              <i className="fa-solid fa-id-card" style={{ marginRight: '4px' }}></i>{b.customer_id_number}
                            </div>
                          )}
                        </div>
                      </td>
                      <td data-label="Merk Motor">
                        <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{splitVehicleName(b.vehicle_name).brand}</strong>
                      </td>
                      <td data-label="Nama Motor">
                        <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{splitVehicleName(b.vehicle_name).model}</span>
                      </td>
                      <td data-label="Plat Motor">
                        {(() => {
                          const veh = vehicles.find(v => v.id === b.vehicle_id);
                          return veh?.plate_number ? (
                            <strong style={{ fontSize: '13px', color: 'var(--brand-primary-light)' }}>{veh.plate_number}</strong>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>—</span>
                          );
                        })()}
                      </td>
                      <td data-label="Atribut Tambahan" data-label-align="left">
                        {(b.selected_attributes || []).length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            {b.selected_attributes.map((a, i) => (
                              <span key={i} style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                                <i className="fa-solid fa-check" style={{ color: '#22C55E', fontSize: '9px', marginRight: '5px' }}></i>
                                {a.name}{Number(a.price) > 0 ? ` (+${formatRupiah(a.price)})` : ''}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>—</span>
                        )}
                      </td>
                      <td data-label="Tanggal Sewa" data-label-align="left" style={{ fontSize: '13px' }}>
                        {formatDate(b.start_date)} — {formatDate(b.end_date)}
                        <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{b.duration_days} hari</div>
                      </td>
                      <td data-label="Metode Pengambilan" data-label-align="left">
                        <span className="badge" style={{ background: b.fulfillment_method === 'delivery' ? 'rgba(59,130,246,0.15)' : 'rgba(148,163,184,0.2)', color: b.fulfillment_method === 'delivery' ? '#3B82F6' : '#94A3B8', border: `1px solid ${b.fulfillment_method === 'delivery' ? '#3B82F6' : '#94A3B8'}` }}>
                          <i className={`fa-solid ${b.fulfillment_method === 'delivery' ? 'fa-truck-fast' : 'fa-store'}`} style={{ marginRight: '4px' }}></i>
                          {b.fulfillment_method === 'delivery' ? 'Delivery' : 'Pickup'}
                        </span>
                      </td>
                      <td data-label="Metode Pembayaran" data-label-align="left">
                        <span className="badge badge-muted">
                          <i className={PAYMENT_META[b.payment_method]?.icon || 'fa-solid fa-money-bill-wave'} style={{ marginRight: '4px' }}></i>
                          {PAYMENT_META[b.payment_method]?.label || 'Cash'}
                        </span>
                      </td>
                      <td data-label="Status Pembayaran" data-label-align="left">
                        {(() => {
                          const syncedStatus = (txByBookingId.get(b.id)?.payment_status) || b.payment_status || 'unpaid';
                          if (syncedStatus === 'paid') {
                            return (
                              <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#22C55E', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                <i className="fa-solid fa-circle-check" style={{ fontSize: '10px' }}></i>Lunas
                              </span>
                            );
                          }
                          if (syncedStatus === 'down_payment') {
                            return (
                              <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#3B82F6', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                <i className="fa-solid fa-coins" style={{ fontSize: '10px' }}></i>DP
                              </span>
                            );
                          }
                          return (
                            <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#F59E0B', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                              <i className="fa-solid fa-clock" style={{ fontSize: '10px' }}></i>Belum Bayar
                            </span>
                          );
                        })()}
                      </td>
                      <td data-label="Driver" data-label-align="left">
                        {b.fulfillment_method !== 'delivery' ? (
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>— (pickup)</span>
                        ) : role === 'admin' ? (
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
                      </td>
                      <td data-label="Status Kontrak" data-label-align="left">
                        {b.fulfillment_method === 'delivery' && b.assigned_driver_id ? (
                          contractsByBookingId.has(b.id) ? (
                            <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#8B5CF6', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                              <i className="fa-solid fa-file-signature"></i> Kontrak sudah dibuat
                            </span>
                          ) : (role === 'driver' && myUserId === b.assigned_driver_id) ? (
                            b.start_date > getLocalDateStr() ? (
                              <span
                                title={`Baru bisa dipencet mulai ${new Date(b.start_date).toLocaleDateString('id-ID')}`}
                                style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                              >
                                <i className="fa-solid fa-lock"></i> Belum bisa — aktif {new Date(b.start_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                              </span>
                            ) : (
                              <Link
                                href={`/contracts/new?bookingId=${b.id}`}
                                style={{
                                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                                  fontSize: '12px', fontWeight: 800, padding: '8px 14px',
                                  background: '#8B5CF6', color: '#fff', borderRadius: 'var(--radius-md)', textDecoration: 'none',
                                }}
                              >
                                <i className="fa-solid fa-file-signature"></i> Buat Kontrak Dulu
                              </Link>
                            )
                          ) : (
                            <span style={{ fontSize: '11.5px', color: '#94A3B8', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                              <i className="fa-solid fa-hourglass-half"></i> Menunggu driver
                            </span>
                          )
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>—</span>
                        )}
                      </td>
                      <td data-label="Status Delivery" data-label-align="left">
                        {b.fulfillment_method === 'delivery' && b.assigned_driver_id ? (
                          b.delivered_at ? (
                            <span style={{ fontSize: '11.5px', color: '#22C55E', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                              <i className="fa-solid fa-circle-check"></i>
                              Delivered {new Date(b.delivered_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          ) : (role === 'driver' && myUserId === b.assigned_driver_id) ? (
                            contractsByBookingId.has(b.id) ? (
                              <button
                                type="button"
                                disabled={busyId === b.id}
                                onClick={() => confirmDelivery(b.id)}
                                style={{
                                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                  fontSize: '12px', fontWeight: 800, padding: '8px 14px', width: '100%', maxWidth: '175px',
                                  background: 'linear-gradient(135deg, #22C55E, #16A34A)', color: '#fff', border: 'none',
                                  borderRadius: 'var(--radius-full, 999px)', cursor: busyId === b.id ? 'wait' : 'pointer',
                                  boxShadow: '0 2px 8px rgba(34,197,94,0.3)', letterSpacing: '0.1px',
                                  opacity: busyId === b.id ? 0.7 : 1, transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                                }}
                              >
                                {busyId === b.id ? (
                                  <><i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '12px' }}></i> Processing...</>
                                ) : (
                                  <>
                                    <span style={{ width: '15px', height: '15px', borderRadius: '50%', background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                      <i className="fa-solid fa-check" style={{ fontSize: '9px' }}></i>
                                    </span>
                                    Confirm Delivered
                                  </>
                                )}
                              </button>
                            ) : (
                              <span
                                title="Isi kontrak dulu sebelum bisa confirm delivered"
                                style={{
                                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                  fontSize: '11.5px', fontWeight: 700, padding: '9px 14px', width: '100%', maxWidth: '200px',
                                  background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px dashed var(--bg-border)', borderRadius: 'var(--radius-md)',
                                }}
                              >
                                <i className="fa-solid fa-lock"></i> Isi kontrak dulu
                              </span>
                            )
                          ) : (
                            <span style={{ fontSize: '11.5px', color: '#94A3B8' }}>Belum di-delivery</span>
                          )
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>—</span>
                        )}
                      </td>
                      <td data-label="Status">
                        <span className="badge" style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.color}` }}>
                          {meta.label}
                        </span>
                      </td>
                      <td data-label="Ringkasan Pembayaran" data-label-align="left">
                        <PaymentSummaryCell
                          status={(txByBookingId.get(b.id)?.payment_status) || b.payment_status || 'unpaid'}
                          total={(txByBookingId.get(b.id)?.total_price) || b.estimated_price}
                          dp={(txByBookingId.get(b.id)?.dp_amount) ?? b.dp_amount}
                          discount={txByBookingId.get(b.id)?.discount}
                          deposit={txByBookingId.get(b.id)?.deposit}
                        />
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
          vehicles={vehicles}
          deliveryZones={deliveryZones}
          drivers={drivers}
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
