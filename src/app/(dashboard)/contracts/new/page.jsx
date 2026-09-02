'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { compressImage } from '@/lib/imageCompressor';
import SignaturePad from '@/components/contracts/SignaturePad';
import VehicleCombobox from '@/components/shared/VehicleCombobox';
import { sharePdfFile } from '@/lib/shareFile';

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
      alert(err.message || 'Gagal memproses foto.');
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
            <><i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '18px' }}></i> Memproses...</>
          ) : (
            <>
              <i className="fa-solid fa-camera" style={{ fontSize: '18px' }}></i>
              <span style={{ fontSize: '12px', fontWeight: 600, textAlign: 'center' }}>Ambil / Upload Foto</span>
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
  const transactionId = searchParams.get('transactionId') || '';
  const vehicleIdParam = searchParams.get('vehicleId') || '';
  const bookingId = searchParams.get('bookingId') || '';
  const isFromBooking = !!bookingId;

  const [vehicles, setVehicles] = useState([]);
  const [loadingContext, setLoadingContext] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [createdContract, setCreatedContract] = useState(null);
  const [sharing, setSharing] = useState(false);

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

  // Prefill dari Transaksi atau Booking — kalau dari booking, data diri &
  // detail sewa sudah pasti lengkap, jadi driver tinggal isi yang belum
  // ada: no. KTP/Passport, 2 foto, dan tanda tangan.
  useEffect(() => {
    Promise.resolve().then(async () => {
      const supabase = createClient();
      const { data: vData } = await supabase.from('vehicles').select('id, name, plate_number, category, image_url, rate_per_day').order('name');
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
            start_date: booking.start_date || '',
            end_date: booking.end_date || '',
          }));
        }
      }
      setLoadingContext(false);
    });
  }, [transactionId, bookingId]);

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.customer_name.trim()) { setError('Nama customer wajib diisi.'); return; }
    if (!form.start_date || !form.end_date) { setError('Tanggal mulai dan selesai wajib diisi.'); return; }
    if (!signature) { setError('Tanda tangan customer wajib diisi.'); return; }

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
            {createdContract?.id && (
              <button
                type="button"
                className="btn btn-primary"
                disabled={sharing}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onClick={async () => {
                  setSharing(true);
                  await sharePdfFile(
                    `/api/contracts/${createdContract.id}/pdf`,
                    `contract-${form.customer_name}.pdf`,
                    'Kontrak Sewa',
                    `Kontrak sewa untuk ${form.customer_name} — Demo Rental Preview`
                  );
                  setSharing(false);
                }}
              >
                {sharing ? (
                  <><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '6px' }}></i> Menyiapkan PDF...</>
                ) : (
                  <><i className="fa-brands fa-whatsapp" style={{ marginRight: '6px' }}></i> Kirim PDF ke Customer</>
                )}
              </button>
            )}

            {isFromBooking ? (
              <button className="btn btn-secondary" onClick={() => router.push('/bookings?tab=confirmed')}>
                <i className="fa-solid fa-arrow-left" style={{ marginRight: '6px' }}></i> Kembali ke Booking Confirmation
              </button>
            ) : (
              <button className="btn btn-secondary" onClick={() => router.push('/contracts')}>
                <i className="fa-solid fa-list" style={{ marginRight: '6px' }}></i> Lihat Laporan Kontrak
              </button>
            )}
          </div>

          <button
            style={{ marginTop: '18px', background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '12px', textDecoration: 'underline', cursor: 'pointer' }}
            onClick={() => {
              setForm({ vehicle_id: '', vehicle_label: '', customer_name: '', customer_id_number: '', customer_phone: '', customer_address: '', start_date: '', end_date: '', notes: '' });
              setPassportPhoto(''); setVehiclePhoto(''); setSignature(''); setSuccess(false); setCreatedContract(null);
            }}
          >
            Buat kontrak lain
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="page-header-row" style={{ marginBottom: '18px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>Buat Kontrak Baru</h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
          {isFromBooking
            ? 'Data booking sudah otomatis terisi — tinggal lengkapi no. ID, foto, dan tanda tangan customer.'
            : 'Isi data diri customer, ambil foto, lalu minta customer tanda tangan langsung di layar ini.'}
        </p>
      </div>

      {loadingContext ? (
        <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
          <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '8px' }}></i> Memuat data...
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          {isFromBooking ? (
            <div className="card" style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 800, marginTop: 0, marginBottom: '4px' }}>
                <i className="fa-solid fa-clipboard-check" style={{ marginRight: '8px', color: 'var(--brand-primary)' }}></i>
                Ringkasan Booking
              </h3>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 0, marginBottom: '10px' }}>Otomatis dari data booking, tidak perlu diisi ulang.</p>
              <RecapRow icon="fa-solid fa-user" label="Nama Customer" value={form.customer_name} />
              <RecapRow icon="fa-solid fa-phone" label="Telepon / WhatsApp" value={form.customer_phone} />
              <RecapRow icon="fa-solid fa-location-dot" label="Alamat" value={form.customer_address} />
              <RecapRow icon="fa-solid fa-motorcycle" label="Motor" value={form.vehicle_label} />
              <RecapRow icon="fa-solid fa-calendar-days" label="Tanggal Sewa" value={`${formatDate(form.start_date)} — ${formatDate(form.end_date)}`} />
            </div>
          ) : (
            <>
              <div className="card" style={{ marginBottom: '16px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 800, marginTop: 0, marginBottom: '18px' }}>
                  <i className="fa-solid fa-id-card" style={{ marginRight: '8px', color: 'var(--brand-primary)' }}></i>
                  Data Diri Customer
                </h3>
                <div className="form-group">
                  <label className="form-label">Nama Lengkap *</label>
                  <input type="text" className="form-control" value={form.customer_name} onChange={(e) => handleChange('customer_name', e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Nomor Telepon / WhatsApp</label>
                  <input type="tel" className="form-control" value={form.customer_phone} onChange={(e) => handleChange('customer_phone', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Alamat (di Bali / domisili)</label>
                  <textarea className="form-control" rows={2} value={form.customer_address} onChange={(e) => handleChange('customer_address', e.target.value)} style={{ resize: 'vertical' }} />
                </div>
              </div>

              <div className="card" style={{ marginBottom: '16px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 800, marginTop: 0 }}>
                  <i className="fa-solid fa-motorcycle" style={{ marginRight: '8px', color: 'var(--brand-primary)' }}></i>
                  Detail Sewa
                </h3>
                <VehicleCombobox vehicles={vehicles} value={form.vehicle_id} onChange={(id) => handleChange('vehicle_id', id)} required={false} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Tanggal Mulai *</label>
                    <input type="date" className="form-control" value={form.start_date} onChange={(e) => handleChange('start_date', e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tanggal Selesai *</label>
                    <input type="date" className="form-control" min={form.start_date} value={form.end_date} onChange={(e) => handleChange('end_date', e.target.value)} required />
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="card" style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 800, marginTop: 0 }}>
              <i className="fa-solid fa-id-card-clip" style={{ marginRight: '8px', color: 'var(--brand-primary)' }}></i>
              Nomor Identitas
            </h3>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Nomor KTP / Passport</label>
              <input type="text" className="form-control" value={form.customer_id_number} onChange={(e) => handleChange('customer_id_number', e.target.value)} placeholder="Ketik sesuai KTP / Passport customer" />
            </div>
          </div>

          <div className="card" style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 800, marginTop: 0 }}>
              <i className="fa-solid fa-camera-retro" style={{ marginRight: '8px', color: 'var(--brand-primary)' }}></i>
              Dokumentasi Foto
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
              <PhotoField label="Foto Passport / KTP" hint="Pastikan nama & nomor terbaca jelas." value={passportPhoto} onChange={setPassportPhoto} />
              <PhotoField label="Foto Customer + Motor" hint="Customer berdiri di samping motor yang disewa." value={vehiclePhoto} onChange={setVehiclePhoto} />
            </div>
          </div>

          <div className="card" style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 800, marginTop: 0 }}>
              <i className="fa-solid fa-file-signature" style={{ marginRight: '8px', color: 'var(--brand-primary)' }}></i>
              Tanda Tangan Customer *
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 0 }}>
              Serahkan layar ini ke customer untuk tanda tangan sebagai bukti persetujuan kontrak sewa.
            </p>
            <SignaturePad onChange={setSignature} />
          </div>

          {!isFromBooking && (
            <div className="card" style={{ marginBottom: '16px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Catatan (opsional)</label>
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
              <><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>Menyimpan Kontrak...</>
            ) : (
              <><i className="fa-solid fa-check" style={{ marginRight: '8px' }}></i>Simpan Kontrak</>
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
