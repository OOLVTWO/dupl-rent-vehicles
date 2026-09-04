'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { compressImage } from '@/lib/imageCompressor';
import SignaturePad from '@/components/contracts/SignaturePad';
import { useRole } from '@/lib/RoleContext';

function formatDate(d) {
  if (!d) return '-';
  try {
    return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return d;
  }
}

function PhotoField({ label, hint, value, onChange }) {
  const [uploading, setUploading] = useState(false);
  const inputId = `photo-${label.replace(/\s+/g, '-').toLowerCase()}`;

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const dataUrl = await compressImage(file, 1000, 0.82);
      onChange(dataUrl);
    } catch (err) {
      alert(err.message || 'Failed to process photo.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="form-group" style={{ marginBottom: 0 }}>
      <label className="form-label">{label}</label>
      {hint && <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '0 0 8px 0' }}>{hint}</p>}
      {value ? (
        <div style={{ position: 'relative', width: '100%' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt={label} style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '10px', border: '1px solid var(--bg-border)' }} />
          <button
            type="button"
            onClick={() => onChange('')}
            style={{
              position: 'absolute', top: '8px', right: '8px', width: '26px', height: '26px', borderRadius: '50%',
              background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', cursor: 'pointer',
            }}
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
      ) : (
        <label
          htmlFor={inputId}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px',
            border: '2px dashed var(--bg-border)', borderRadius: '10px', padding: '18px 12px', cursor: 'pointer',
            color: 'var(--text-muted)', width: '100%', height: '140px',
          }}
        >
          {uploading ? (
            <><i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '18px' }}></i> Processing...</>
          ) : (
            <>
              <i className="fa-solid fa-camera" style={{ fontSize: '18px' }}></i>
              <span style={{ fontSize: '12px', fontWeight: 600, textAlign: 'center' }}>Take / Upload Photo</span>
            </>
          )}
          <input id={inputId} type="file" accept="image/*" capture="environment" onChange={handleFile} style={{ display: 'none' }} />
        </label>
      )}
    </div>
  );
}

function RecapRow({ icon, label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '9px 0', borderBottom: '1px dashed var(--bg-border)' }}>
      <i className={icon} style={{ width: '16px', color: 'var(--brand-primary)', marginTop: '2px', fontSize: '12px' }}></i>
      <div>
        <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</div>
        <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)' }}>{value || '-'}</div>
      </div>
    </div>
  );
}

function NewContractInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const role = useRole();
  const [user, setUser] = useState(null);
  useEffect(() => {
    Promise.resolve().then(async () => {
      const supabase = createClient();
      const { data: { user: u } } = await supabase.auth.getUser();
      setUser(u);
    });
  }, []);
  const transactionId = searchParams.get('transactionId') || '';
  const vehicleIdParam = searchParams.get('vehicleId') || '';
  const bookingId = searchParams.get('bookingId') || '';
  // Baik dari Booking maupun dari Transaksi, data customer/motor/tanggal
  // udah pasti diketahui — jadi keduanya pakai tampilan ringkasan read-only
  // yang sama, bukan form kosong yang bisa nyasar pilih motor lain.
  const isFromBooking = !!bookingId;
  const isFromTransaction = !!transactionId;
  const isPrefilled = isFromBooking || isFromTransaction;

  const [vehicles, setVehicles] = useState([]);
  const [loadingContext, setLoadingContext] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [createdContract, setCreatedContract] = useState(null);

  const [form, setForm] = useState({
    vehicle_id: vehicleIdParam,
    vehicle_label: '',
    customer_name: '',
    customer_id_number: '',
    customer_phone: '',
    customer_address: '',
    start_date: '',
    end_date: '',
    notes: '',
  });
  const [passportPhoto, setPassportPhoto] = useState('');
  const [vehiclePhoto, setVehiclePhoto] = useState('');
  const [signature, setSignature] = useState('');
  const [needsContractItems, setNeedsContractItems] = useState([]);
  const [pickerLoading, setPickerLoading] = useState(true);

  // Prefill dari Transaksi atau Booking — kalau dari booking, data diri &
  // detail sewa sudah pasti lengkap, jadi driver tinggal isi yang belum
  // ada: no. KTP/Passport, 2 foto, dan tanda tangan.
  useEffect(() => {
    Promise.resolve().then(async () => {
      const supabase = createClient();
      const { data: vData } = await supabase.from('vehicles').select('id, name, plate_number, category, image_url, rate_per_day, status').order('name');
      setVehicles(vData || []);

      if (transactionId) {
        const { data: tx } = await supabase.from('transactions').select('*, vehicles(name, plate_number)').eq('id', transactionId).maybeSingle();
        if (tx) {
          setForm(prev => ({
            ...prev,
            vehicle_id: tx.vehicle_id || prev.vehicle_id,
            vehicle_label: tx.vehicles ? `${tx.vehicles.name}${tx.vehicles.plate_number ? ' — ' + tx.vehicles.plate_number : ''}` : '',
            customer_name: tx.renter_name || '',
            customer_phone: tx.renter_phone || '',
            customer_address: tx.renter_address || '',
            customer_id_number: tx.renter_id_number || '',
            start_date: tx.start_date || '',
            end_date: tx.end_date || '',
          }));
        }
      } else if (bookingId) {
        const { data: booking } = await supabase.from('bookings').select('*').eq('id', bookingId).maybeSingle();
        if (booking) {
          setForm(prev => ({
            ...prev,
            vehicle_id: booking.vehicle_id || prev.vehicle_id,
            vehicle_label: booking.vehicle_name || '',
            customer_name: booking.customer_name || '',
            customer_phone: booking.customer_phone || '',
            customer_address: booking.customer_address || '',
            customer_id_number: booking.customer_id_number || '',
            start_date: booking.start_date || '',
            end_date: booking.end_date || '',
          }));
        }
      }
      setLoadingContext(false);
    });
  }, [transactionId, bookingId]);

  // Mode "picker": nggak ada transactionId/bookingId di URL — berarti
  // orang baru masuk ke Kontrak dari menu, belum milih siapa. Tampilkan
  // daftar transaksi aktif & booking confirmed yang BELUM ada kontraknya,
  // biar milih dari situ dulu — bukan form kosong isi manual dari nol.
  useEffect(() => {
    if (transactionId || bookingId) return;
    Promise.resolve().then(async () => {
      const supabase = createClient();
      const [{ data: activeTx }, { data: confirmedBookings }, { data: contractedTx }, { data: contractedBookings }] = await Promise.all([
        supabase.from('transactions').select('id, renter_name, renter_phone, start_date, end_date, vehicles(name, plate_number)').eq('status', 'active').order('created_at', { ascending: false }),
        supabase.from('bookings').select('id, customer_name, customer_phone, start_date, end_date, vehicle_name, fulfillment_method, assigned_driver_id').eq('status', 'confirmed').order('created_at', { ascending: false }),
        supabase.from('contracts').select('transaction_id').not('transaction_id', 'is', null),
        supabase.from('contracts').select('booking_id').not('booking_id', 'is', null),
      ]);
      const doneTx = new Set((contractedTx || []).map(c => c.transaction_id));
      const doneBooking = new Set((contractedBookings || []).map(c => c.booking_id));

      const txItems = (activeTx || [])
        .filter(t => !doneTx.has(t.id))
        .map(t => ({
          kind: 'transaction', id: t.id,
          customer_name: t.renter_name, customer_phone: t.renter_phone,
          vehicle_label: t.vehicles ? `${t.vehicles.name}${t.vehicles.plate_number ? ' — ' + t.vehicles.plate_number : ''}` : '-',
          start_date: t.start_date, end_date: t.end_date,
        }));
      const bookingItems = (confirmedBookings || [])
        .filter(b => !doneBooking.has(b.id))
        .filter(b => role !== 'driver' || b.assigned_driver_id === user?.id) // driver cuma lihat yg ditugaskan ke dia
        .map(b => ({
          kind: 'booking', id: b.id,
          customer_name: b.customer_name, customer_phone: b.customer_phone,
          vehicle_label: b.vehicle_name || '-',
          start_date: b.start_date, end_date: b.end_date,
          fulfillment_method: b.fulfillment_method,
        }));

      setNeedsContractItems([...bookingItems, ...txItems]);
      setPickerLoading(false);
    });
  }, [transactionId, bookingId, role, user?.id]);

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.customer_name.trim()) { setError('Customer name is required.'); return; }
    if (!form.start_date || !form.end_date) { setError('Start and end dates are required.'); return; }
    if (!signature) { setError('Customer signature is required.'); return; }

    setSubmitting(true);
    setError('');

    const selectedVehicle = vehicles.find(v => v.id === form.vehicle_id);
    const vehicleName = form.vehicle_label || (selectedVehicle ? `${selectedVehicle.name}${selectedVehicle.plate_number ? ' — ' + selectedVehicle.plate_number : ''}` : null);

    try {
      const res = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaction_id: transactionId || null,
          booking_id: bookingId || null,
          vehicle_id: form.vehicle_id || null,
          vehicle_name: vehicleName,
          customer_name: form.customer_name.trim(),
          customer_id_number: form.customer_id_number.trim() || null,
          customer_phone: form.customer_phone.trim() || null,
          customer_address: form.customer_address.trim() || null,
          start_date: form.start_date,
          end_date: form.end_date,
          notes: form.notes.trim() || null,
          passport_photo_url: passportPhoto || null,
          customer_vehicle_photo_url: vehiclePhoto || null,
          signature_url: signature,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Gagal menyimpan kontrak.');
        setSubmitting(false);
        return;
      }
      setCreatedContract(data);
      setSuccess(true);
    } catch {
      setError('Gagal terhubung ke server.');
    }
    setSubmitting(false);
  };

  // Mode picker: belum milih transaksi/booking mana yang mau dibikinin
  // kontrak. Tampilin daftar yang butuh kontrak, bukan form kosong.
  if (!transactionId && !bookingId && !success) {
    return (
      <div className="page-content">
        <div className="page-header">
          <h1><i className="fa-solid fa-file-signature" style={{ marginRight: '10px', color: 'var(--brand-primary)' }}></i>Kontrak</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
            Pilih customer yang sudah transaksi/booking tapi belum tanda tangan kontrak.
          </p>
        </div>

        {pickerLoading ? (
          <div className="table-empty"><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>Memuat...</div>
        ) : needsContractItems.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
            <i className="fa-solid fa-circle-check" style={{ fontSize: '32px', color: '#22C55E', marginBottom: '12px' }}></i>
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>Semua transaksi & booking aktif sudah ada kontraknya. 🎉</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {needsContractItems.map(item => (
              <button
                key={`${item.kind}-${item.id}`}
                type="button"
                onClick={() => router.push(item.kind === 'booking' ? `/contracts/new?bookingId=${item.id}` : `/contracts/new?transactionId=${item.id}`)}
                className="card"
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px',
                  textAlign: 'left', cursor: 'pointer', width: '100%', border: '1px solid var(--bg-border)',
                }}
              >
                <div>
                  <div style={{ fontWeight: 800, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {item.customer_name || 'Tanpa nama'}
                    <span style={{
                      fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px',
                      background: item.kind === 'booking' ? 'rgba(139,92,246,0.15)' : 'rgba(37,99,235,0.15)',
                      color: item.kind === 'booking' ? '#8B5CF6' : 'var(--brand-primary-light)',
                    }}>
                      {item.kind === 'booking' ? 'Booking' : 'Transaksi'}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px' }}>
                    <i className="fa-solid fa-motorcycle" style={{ marginRight: '5px' }}></i>{item.vehicle_label}
                    {' · '}{formatDate(item.start_date)} — {formatDate(item.end_date)}
                  </div>
                  {item.customer_phone && (
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      <i className="fa-solid fa-phone" style={{ marginRight: '5px' }}></i>{item.customer_phone}
                    </div>
                  )}
                </div>
                <i className="fa-solid fa-chevron-right" style={{ color: 'var(--text-muted)', flexShrink: 0 }}></i>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (success) {
    return (
      <div className="page-content">
        <div className="card" style={{ maxWidth: '440px', margin: '32px auto', padding: '32px 26px', textAlign: 'center' }}>
          <div style={{
            width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(34,197,94,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto', fontSize: '26px', color: '#22C55E',
          }}>
            <i className="fa-solid fa-check"></i>
          </div>
          <h2 style={{ margin: '0 0 6px 0', fontSize: '19px' }}>Kontrak Tersimpan!</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '26px' }}>
            Kontrak sewa untuk <strong>{form.customer_name}</strong> sudah tercatat lengkap dengan tanda tangan &amp; foto.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

            <button
              type="button"
              className="btn btn-primary"
              onClick={() => router.push('/contracts/new')}
            >
              <i className="fa-solid fa-list" style={{ marginRight: '6px' }}></i> Kembali ke Kontrak
            </button>

            {isFromBooking ? (
              <button className="btn btn-secondary" onClick={() => router.push('/dashboard')}>
                <i className="fa-solid fa-house" style={{ marginRight: '6px' }}></i> Kembali ke Halaman Utama
              </button>
            ) : isFromTransaction ? (
              <button className="btn btn-secondary" onClick={() => router.push('/transactions')}>
                <i className="fa-solid fa-arrow-left" style={{ marginRight: '6px' }}></i> Kembali ke Transaksi
              </button>
            ) : (
              <button className="btn btn-secondary" onClick={() => router.push('/contracts')}>
                <i className="fa-solid fa-list" style={{ marginRight: '6px' }}></i> Lihat Laporan Kontrak
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="page-header-row" style={{ marginBottom: '18px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>Kontrak</h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
          {isPrefilled
            ? `Data ${isFromBooking ? 'booking' : 'transaksi'} sudah otomatis terisi — tinggal lengkapi no. ID, foto, dan tanda tangan customer.`
            : 'Isi data diri customer, ambil foto, lalu minta customer tanda tangan langsung di layar ini.'}
        </p>
      </div>

      {loadingContext ? (
        <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
          <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '8px' }}></i> Loading...
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="card" style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 800, marginTop: 0, marginBottom: '4px' }}>
              <i className="fa-solid fa-clipboard-check" style={{ marginRight: '8px', color: 'var(--brand-primary)' }}></i>
              {isFromBooking ? 'Booking' : 'Transaction'} Summary
            </h3>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 0, marginBottom: '10px' }}>Automatically filled from your {isFromBooking ? 'booking' : 'transaction'} data — no need to re-enter.</p>
            <RecapRow icon="fa-solid fa-user" label="Customer Name" value={form.customer_name} />
            <RecapRow icon="fa-solid fa-phone" label="Phone / WhatsApp" value={form.customer_phone} />
            <RecapRow icon="fa-solid fa-location-dot" label="Address" value={form.customer_address} />
            <RecapRow icon="fa-solid fa-motorcycle" label="Vehicle" value={form.vehicle_label} />
            <RecapRow icon="fa-solid fa-calendar-days" label="Rental Period" value={`${formatDate(form.start_date)} — ${formatDate(form.end_date)}`} />
          </div>

          <div className="card" style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 800, marginTop: 0 }}>
              <i className="fa-solid fa-id-card-clip" style={{ marginRight: '8px', color: 'var(--brand-primary)' }}></i>
              ID Number
            </h3>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">ID Card / Passport Number</label>
              <input type="text" className="form-control" value={form.customer_id_number} onChange={(e) => handleChange('customer_id_number', e.target.value)} placeholder="Type exactly as shown on ID / Passport" />
            </div>
          </div>

          <div className="card" style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 800, marginTop: 0 }}>
              <i className="fa-solid fa-camera-retro" style={{ marginRight: '8px', color: 'var(--brand-primary)' }}></i>
              Photo Documentation
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
              <PhotoField label="Passport / ID Photo" hint="Make sure the name & number are clearly readable." value={passportPhoto} onChange={setPassportPhoto} />
              <PhotoField label="Customer + Vehicle Photo" hint="Customer standing next to the rented vehicle." value={vehiclePhoto} onChange={setVehiclePhoto} />
            </div>
          </div>

          <div className="card" style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 800, marginTop: 0 }}>
              <i className="fa-solid fa-file-signature" style={{ marginRight: '8px', color: 'var(--brand-primary)' }}></i>
              Customer Signature *
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 0 }}>
              Hand this screen to the customer to sign as confirmation they agree to the rental contract.
            </p>
            <SignaturePad onChange={setSignature} />
          </div>

          {!isPrefilled && (
            <div className="card" style={{ marginBottom: '16px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Notes (optional)</label>
                <textarea className="form-control" rows={2} value={form.notes} onChange={(e) => handleChange('notes', e.target.value)} style={{ resize: 'vertical' }} />
              </div>
            </div>
          )}

          {error && (
            <div className="alert alert-danger" style={{ marginBottom: '16px' }}>
              <i className="fa-solid fa-circle-exclamation" style={{ marginRight: '6px' }}></i>{error}
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={submitting}>
            {submitting ? (
              <><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>Saving Contract...</>
            ) : (
              <><i className="fa-solid fa-check" style={{ marginRight: '8px' }}></i>Save Contract</>
            )}
          </button>
        </form>
      )}
    </div>
  );
}

export default function NewContractPage() {
  return (
    <Suspense fallback={<div className="page-content" />}>
      <NewContractInner />
    </Suspense>
  );
}
