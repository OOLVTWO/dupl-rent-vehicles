'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getWhatsAppShareUrl, getWaGatewayConfig, sendWhatsAppGateway } from '@/lib/countryCodes';
import '@/styles/sharp-system.css';
import SharpButton from '@/components/fleet/SharpButton';
import ThemeToggle from '@/components/fleet/ThemeToggle';

// Matches the default business profile set on the fleet homepage.
const OWNER_PHONE = '+62 812-3962-7764';
const OWNER_NAME = 'Demo Rental Preview';
const OWNER_ADDRESS = 'Sample Address, Bali, Indonesia';
const OWNER_LOGO = '/images/logoCompany.png';

function formatRupiah(amount) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount || 0);
}

function formatEnDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
}

function calculateEstimate(vehicle, startDate, endDate) {
  if (!vehicle || !startDate || !endDate) return null;
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return null;

  const durationDays = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
  const dailyRate = Number(vehicle.rate_per_day) || 0;
  const weeklyRate = Number(vehicle.rate_per_week) || 0;
  const monthlyRate = Number(vehicle.rate_per_month) || 0;

  const dailyTotal = durationDays * dailyRate;
  let bestGross = dailyTotal;
  let tierUsed = 'Daily Rate';

  if (weeklyRate > 0) {
    const mixCost = (Math.floor(durationDays / 7) * weeklyRate) + ((durationDays % 7) * dailyRate);
    const flatCost = Math.ceil(durationDays / 7) * weeklyRate;
    const bestWeekly = Math.min(mixCost, flatCost);
    if (bestWeekly < bestGross) { bestGross = bestWeekly; tierUsed = 'Weekly Package'; }
  }

  if (monthlyRate > 0) {
    const months = Math.floor(durationDays / 30);
    const remDays = durationDays % 30;
    const mixCost = (months * monthlyRate) + (Math.floor(remDays / 7) * (weeklyRate || dailyRate * 7)) + ((remDays % 7) * dailyRate);
    const flatCost = Math.max(1, Math.ceil(durationDays / 30)) * monthlyRate;
    const bestMonthly = Math.min(mixCost, flatCost);
    if (bestMonthly < bestGross) { bestGross = bestMonthly; tierUsed = 'Monthly Package'; }
  }

  return { durationDays, total: bestGross, tierUsed };
}

function BrandHeader({ theme, onToggleTheme }) {
  return (
    <header style={{ background: 'var(--sharp-surface)', borderBottom: '1px solid var(--sharp-line)', position: 'sticky', top: 0, zIndex: 100, padding: '16px 20px' }}>
      <div style={{ maxWidth: '620px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
        <Link href="/fleet" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', minWidth: 0, flex: '1 1 auto' }}>
          <img src={OWNER_LOGO} alt={`${OWNER_NAME} Logo`} style={{ height: '36px', width: 'auto', objectFit: 'contain', flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '15px', fontWeight: 900, color: 'var(--sharp-ink)', letterSpacing: '-0.4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {OWNER_NAME}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--sharp-muted)', marginTop: '1px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              <i className="fa-solid fa-location-dot" style={{ color: 'var(--sharp-accent)', flexShrink: 0 }}></i>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{OWNER_ADDRESS}</span>
            </div>
          </div>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
          <Link
            href="/fleet"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              fontSize: '12px', fontWeight: 700, color: 'var(--sharp-muted)', textDecoration: 'none', whiteSpace: 'nowrap',
            }}
          >
            <i className="fa-solid fa-arrow-left"></i> Back
          </Link>
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        </div>
      </div>
    </header>
  );
}

function BookingPageInner() {
  const searchParams = useSearchParams();
  const vehicleId = searchParams.get('vehicleId') || '';
  const startDate = searchParams.get('start') || '';
  const endDate = searchParams.get('end') || '';

  const [theme, setTheme] = useState('light');
  useEffect(() => {
    try {
      const saved = localStorage.getItem('boss_rent_fleet_theme');
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved === 'dark') setTheme('dark');
    } catch {
      // ignore
    }
  }, []);
  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem('boss_rent_fleet_theme', next); } catch { /* ignore */ }
      return next;
    });
  };

  const [vehicle, setVehicle] = useState(null);
  const [loadingVehicle, setLoadingVehicle] = useState(true);
  const [step, setStep] = useState('form');
  const [form, setForm] = useState({ name: '', phone: '', address: '', fulfillment: 'pickup' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  useEffect(() => {
    Promise.resolve().then(async () => {
      if (!vehicleId) { setLoadingVehicle(false); return; }
      try {
        const supabase = createClient();
        const { data } = await supabase.from('vehicles').select('*').eq('id', vehicleId).maybeSingle();
        setVehicle(data || null);
      } catch {
        setVehicle(null);
      }
      setLoadingVehicle(false);
    });
  }, [vehicleId]);

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const est = vehicle ? calculateEstimate(vehicle, startDate, endDate) : null;
  const days = est ? est.durationDays : 1;
  const price = est ? est.total : Number(vehicle?.rate_per_day || 0);

  const submitBooking = async (e) => {
    e.preventDefault();
    if (!vehicle) return;
    if (!form.name.trim() || !form.phone.trim()) {
      setError('Nama dan nomor telepon wajib diisi.');
      return;
    }
    if (!startDate || !endDate) {
      setError('Tanggal sewa tidak ditemukan. Silakan kembali ke halaman utama dan pilih tanggal dulu.');
      return;
    }
    if (form.fulfillment === 'delivery' && !form.address.trim()) {
      setError('Alamat wajib diisi untuk pengantaran (delivery).');
      return;
    }

    setSubmitting(true);
    setError('');

    const payload = {
      vehicle_id: vehicle.id || null,
      vehicle_name: vehicle.name,
      vehicle_category: vehicle.category || null,
      customer_name: form.name.trim(),
      customer_phone: form.phone.trim(),
      customer_address: form.address.trim() || null,
      fulfillment_method: form.fulfillment,
      start_date: startDate,
      end_date: endDate,
      duration_days: days,
      estimated_price: price,
      status: 'pending',
    };

    try {
      const supabase = createClient();
      // No .select() here on purpose — anonymous visitors may INSERT but may
      // not read bookings back (RLS also gates the RETURNING clause), so we
      // just confirm there's no error and render the confirmation from what
      // we already have client-side.
      const { error: insertError } = await supabase.from('bookings').insert([payload]);
      if (insertError) {
        console.error('Booking insert error:', insertError.message);
        setError('Gagal mengirim booking. Silakan coba lagi.');
        setSubmitting(false);
        return;
      }
      setConfirmedBooking(payload);
      setStep('confirmed');
      setSubmitting(false);
    } catch {
      setError('Gagal terhubung ke server. Periksa koneksi internet.');
      setSubmitting(false);
    }
  };

  const notifyOwnerViaWhatsApp = () => {
    const b = confirmedBooking;
    if (!b) return;
    const methodLabel = b.fulfillment_method === 'delivery'
      ? `Delivery ke alamat: ${b.customer_address || '-'}`
      : 'Ambil sendiri di toko (Pererenan / Canggu)';

    const msg = `🔔 *NEW BOOKING CONFIRMATION* — ${OWNER_NAME}\n\n👤 *Nama:* ${b.customer_name}\n📞 *Telepon:* ${b.customer_phone}\n🏍️ *Motor:* ${b.vehicle_name}\n📅 *Tanggal:* ${formatEnDate(b.start_date)} - ${formatEnDate(b.end_date)} (${b.duration_days} hari)\n📦 *Metode:* ${methodLabel}\n💰 *Estimasi Harga:* ${formatRupiah(b.estimated_price)}\n\n✅ Booking ini sudah otomatis tercatat di Admin Panel (menu Booking Confirmation).`;

    const gateway = getWaGatewayConfig();
    if (gateway.enabled) {
      sendWhatsAppGateway(OWNER_PHONE, msg).then(res => {
        if (!res.success && res.url) window.open(res.url, '_blank');
      });
    } else {
      window.open(getWhatsAppShareUrl(OWNER_PHONE, msg), '_blank');
    }
  };

  return (
    <div className={`sharp-page ${theme === 'dark' ? 'sharp-page--dark' : ''}`} style={{ minHeight: '100vh', paddingBottom: '60px' }}>
      <BrandHeader theme={theme} onToggleTheme={toggleTheme} />

      <div style={{ maxWidth: '620px', margin: '0 auto', padding: '20px' }}>
        {loadingVehicle ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--sharp-muted)' }}>
            <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '22px', marginBottom: '10px' }}></i>
            <p>Loading...</p>
          </div>
        ) : !vehicle ? (
          <div className="sharp-card" style={{ padding: '40px 28px', textAlign: 'center' }}>
            <i className="fa-solid fa-circle-exclamation" style={{ fontSize: '28px', color: 'var(--sharp-muted)', marginBottom: '12px' }}></i>
            <h2 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 8px 0' }}>Vehicle not found</h2>
            <p style={{ fontSize: '13px', color: 'var(--sharp-muted)', marginBottom: '20px' }}>
              This scooter may no longer be available. Please head back and pick another one.
            </p>
            <SharpButton href="/fleet" variant="dark">Back to Home</SharpButton>
          </div>
        ) : (
          <div className="sharp-card" style={{ padding: '28px' }}>
            {step === 'form' && (
              <>
                <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--sharp-accent)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                  Booking Confirmation
                </div>
                <h1 style={{ fontSize: '22px', fontWeight: 900, color: 'var(--sharp-ink)', margin: '0 0 4px 0' }}>
                  {vehicle.name}
                </h1>
                <p style={{ fontSize: '13px', color: 'var(--sharp-muted)', margin: '0 0 6px 0' }}>
                  {formatEnDate(startDate)} — {formatEnDate(endDate)} ({days} day{days > 1 ? 's' : ''})
                </p>
                <p style={{ fontSize: '15px', fontWeight: 800, color: 'var(--sharp-accent)', margin: '0 0 20px 0' }}>
                  Estimated total: {formatRupiah(price)}
                </p>

                <form onSubmit={submitBooking}>
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, color: 'var(--sharp-muted)', marginBottom: '6px' }}>
                      Full Name *
                    </label>
                    <input
                      type="text"
                      className="sharp-input"
                      style={{ width: '100%' }}
                      value={form.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      placeholder="Nama lengkap"
                      required
                    />
                  </div>

                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, color: 'var(--sharp-muted)', marginBottom: '6px' }}>
                      Phone / WhatsApp *
                    </label>
                    <input
                      type="tel"
                      className="sharp-input"
                      style={{ width: '100%' }}
                      value={form.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      placeholder="08xx-xxxx-xxxx"
                      required
                    />
                  </div>

                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, color: 'var(--sharp-muted)', marginBottom: '6px' }}>
                      Fulfillment
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                      {[
                        { key: 'pickup', label: 'Ambil di Toko', icon: 'fa-solid fa-store' },
                        { key: 'delivery', label: 'Delivery', icon: 'fa-solid fa-truck-fast' },
                      ].map(opt => (
                        <button
                          type="button"
                          key={opt.key}
                          onClick={() => handleChange('fulfillment', opt.key)}
                          style={{
                            padding: '12px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                            border: form.fulfillment === opt.key ? '2px solid var(--sharp-accent)' : '1px solid var(--sharp-line)',
                            background: form.fulfillment === opt.key ? 'rgba(184, 112, 63, 0.08)' : 'var(--sharp-surface)',
                            color: 'var(--sharp-ink)', fontSize: '12.5px', fontWeight: 700,
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                          }}
                        >
                          <i className={opt.icon} style={{ fontSize: '16px', color: form.fulfillment === opt.key ? 'var(--sharp-accent)' : 'var(--sharp-muted)' }}></i>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginBottom: '18px' }}>
                    <label style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, color: 'var(--sharp-muted)', marginBottom: '6px' }}>
                      {form.fulfillment === 'delivery' ? 'Delivery Address *' : 'Address (optional)'}
                    </label>
                    <textarea
                      className="sharp-input"
                      style={{ width: '100%', resize: 'vertical', minHeight: '64px' }}
                      value={form.address}
                      onChange={(e) => handleChange('address', e.target.value)}
                      placeholder={form.fulfillment === 'delivery' ? 'Villa / hotel name & full address' : 'Optional'}
                      required={form.fulfillment === 'delivery'}
                    />
                  </div>

                  {error && (
                    <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444', borderRadius: 'var(--radius-md)', padding: '10px 12px', fontSize: '12.5px', marginBottom: '14px' }}>
                      <i className="fa-solid fa-circle-exclamation" style={{ marginRight: '6px' }}></i>{error}
                    </div>
                  )}

                  <SharpButton type="submit" variant="accent" block disabled={submitting}>
                    {submitting ? (
                      <><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>Submitting...</>
                    ) : (
                      'Confirm Booking'
                    )}
                  </SharpButton>
                </form>
              </>
            )}

            {step === 'confirmed' && confirmedBooking && (
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: '64px', height: '64px', borderRadius: 'var(--radius-full)', background: 'rgba(34,197,94,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto', fontSize: '28px', color: '#22C55E',
                }}>
                  <i className="fa-solid fa-check"></i>
                </div>
                <h1 style={{ fontSize: '20px', fontWeight: 900, color: 'var(--sharp-ink)', margin: '0 0 6px 0' }}>Booking Confirmed!</h1>
                <p style={{ fontSize: '13px', color: 'var(--sharp-muted)', margin: '0 0 20px 0' }}>
                  Your request has been sent to our system. Notify us on WhatsApp to speed things up.
                </p>

                <div style={{ background: 'var(--sharp-bg)', border: '1px solid var(--sharp-line)', borderRadius: 'var(--radius-md)', padding: '16px', textAlign: 'left', fontSize: '12.5px', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div><i className="fa-solid fa-motorcycle" style={{ width: '18px', color: 'var(--sharp-accent)' }}></i> {confirmedBooking.vehicle_name}</div>
                  <div><i className="fa-solid fa-calendar-days" style={{ width: '18px', color: 'var(--sharp-accent)' }}></i> {formatEnDate(confirmedBooking.start_date)} — {formatEnDate(confirmedBooking.end_date)} ({confirmedBooking.duration_days} day{confirmedBooking.duration_days > 1 ? 's' : ''})</div>
                  <div><i className={`fa-solid ${confirmedBooking.fulfillment_method === 'delivery' ? 'fa-truck-fast' : 'fa-store'}`} style={{ width: '18px', color: 'var(--sharp-accent)' }}></i> {confirmedBooking.fulfillment_method === 'delivery' ? 'Delivery' : 'Pickup at store'}</div>
                  <div><i className="fa-solid fa-wallet" style={{ width: '18px', color: 'var(--sharp-accent)' }}></i> Est. {formatRupiah(confirmedBooking.estimated_price)}</div>
                </div>

                <SharpButton variant="whatsapp" block icon="fa-brands fa-whatsapp" onClick={notifyOwnerViaWhatsApp}>
                  Kirim ke WhatsApp
                </SharpButton>
                <div style={{ marginTop: '14px' }}>
                  <SharpButton href="/fleet" variant="outline" block>
                    Back to Home
                  </SharpButton>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function BookingPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh' }} />}>
      <BookingPageInner />
    </Suspense>
  );
}
