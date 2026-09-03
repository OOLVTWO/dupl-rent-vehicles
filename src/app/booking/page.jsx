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

const PAYMENT_METHOD_META = {
  cash:     { label: 'Cash', icon: 'fa-solid fa-money-bill-wave' },
  transfer: { label: 'Bank Transfer', icon: 'fa-solid fa-building-columns' },
  qris:     { label: 'QRIS', icon: 'fa-solid fa-qrcode' },
  card:     { label: 'Card', icon: 'fa-solid fa-credit-card' },
};

// Zona dikelola admin dalam Bahasa Indonesia ("Zona Biru", dst), tapi
// halaman booking ini customer-facing (Inggris) — terjemahkan buat tampilan.
const ZONE_LABEL_EN = {
  'Zona Hijau': 'Green Zone',
  'Zona Biru': 'Blue Zone',
  'Zona Kuning': 'Yellow Zone',
};
function zoneLabelEn(label) {
  return ZONE_LABEL_EN[label] || label || '';
}

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
  const [form, setForm] = useState({ name: '', phone: '', address: '', fulfillment: 'pickup', payment_method: 'cash', delivery_zone_id: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [confirmedBooking, setConfirmedBooking] = useState(null);
  const [deliveryZones, setDeliveryZones] = useState([]);
  const [showMapModal, setShowMapModal] = useState(false);

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

  useEffect(() => {
    Promise.resolve().then(async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.from('delivery_zones').select('*').order('sort_order', { ascending: true });
        setDeliveryZones(data || []);
      } catch {
        setDeliveryZones([]);
      }
    });
  }, []);

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const est = vehicle ? calculateEstimate(vehicle, startDate, endDate) : null;
  const days = est ? est.durationDays : 1;
  const price = est ? est.total : Number(vehicle?.rate_per_day || 0);
  const selectedZone = deliveryZones.find(z => z.id === form.delivery_zone_id) || null;
  const deliveryFee = form.fulfillment === 'delivery' && selectedZone ? Number(selectedZone.fee) : 0;
  const grandTotal = price + deliveryFee;

  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [reviewPayload, setReviewPayload] = useState(null);

  const proceedToReview = (e) => {
    e.preventDefault();
    if (!vehicle) return;
    if (!form.name.trim() || !form.phone.trim()) {
      setError('Name and phone number are required.');
      return;
    }
    if (!startDate || !endDate) {
      setError('Rental dates not found. Please go back to the homepage and select your dates first.');
      return;
    }
    if (form.fulfillment === 'delivery' && !form.address.trim()) {
      setError('Address is required for delivery.');
      return;
    }
    if (form.fulfillment === 'delivery' && !selectedZone) {
      setError('Please select a delivery area.');
      return;
    }

    setError('');
    setReviewPayload({
      vehicle_id: vehicle.id || null,
      vehicle_name: vehicle.name,
      vehicle_category: vehicle.category || null,
      customer_name: form.name.trim(),
      customer_phone: form.phone.trim(),
      customer_address: form.address.trim() || null,
      fulfillment_method: form.fulfillment,
      payment_method: form.payment_method,
      delivery_zone_id: selectedZone?.id || null,
      delivery_zone_name: selectedZone ? zoneLabelEn(selectedZone.zone_label) : null,
      delivery_fee: deliveryFee,
      start_date: startDate,
      end_date: endDate,
      duration_days: days,
      estimated_price: grandTotal,
      status: 'pending',
    });
    setAgreedToTerms(false);
    setStep('review');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submitBooking = async () => {
    if (!reviewPayload || !agreedToTerms) return;
    setSubmitting(true);
    setError('');
    try {
      const supabase = createClient();
      // No .select() here on purpose — anonymous visitors may INSERT but may
      // not read bookings back (RLS also gates the RETURNING clause), so we
      // just confirm there's no error and render the confirmation from what
      // we already have client-side.
      const { error: insertError } = await supabase.from('bookings').insert([reviewPayload]);
      if (insertError) {
        console.error('Booking insert error:', insertError.message);
        setError('Failed to submit booking. Please try again.');
        setSubmitting(false);
        return;
      }
      setConfirmedBooking(reviewPayload);
      setStep('confirmed');
      setSubmitting(false);
    } catch {
      setError('Failed to connect to the server. Please check your internet connection.');
      setSubmitting(false);
    }
  };

  const notifyOwnerViaWhatsApp = () => {
    const b = confirmedBooking;
    if (!b) return;
    const methodLabel = b.fulfillment_method === 'delivery'
      ? `Delivery (${b.delivery_zone_name || '-'}) to: ${b.customer_address || '-'}`
      : 'Self pickup at your shop (Pererenan / Canggu)';
    const paymentLabel = PAYMENT_METHOD_META[b.payment_method]?.label || 'Cash';
    const paymentNote = b.payment_method === 'card' ? ' (please bring the card machine)' : '';
    const deliveryFeeLine = b.fulfillment_method === 'delivery' && b.delivery_fee > 0
      ? `\n🛵 *Delivery Fee:* ${formatRupiah(b.delivery_fee)}`
      : '';

    const msg = `Hi ${OWNER_NAME}! 👋 I'd like to confirm my scooter booking:\n\n👤 *Name:* ${b.customer_name}\n📞 *Phone:* ${b.customer_phone}\n🏍️ *Scooter:* ${b.vehicle_name}\n📅 *Dates:* ${formatEnDate(b.start_date)} - ${formatEnDate(b.end_date)} (${b.duration_days} day${b.duration_days > 1 ? 's' : ''})\n📦 *Method:* ${methodLabel}${deliveryFeeLine}\n💳 *Payment:* ${paymentLabel}${paymentNote}\n💰 *Estimated Total:* ${formatRupiah(b.estimated_price)}\n\nLooking forward to hearing from you, thank you! 🙏`;

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
                <p style={{ fontSize: '15px', fontWeight: 800, color: 'var(--sharp-accent)', margin: '0 0 4px 0' }}>
                  Estimated total: {formatRupiah(grandTotal)}
                </p>
                {deliveryFee > 0 && (
                  <p style={{ fontSize: '11.5px', color: 'var(--sharp-muted)', margin: '0 0 16px 0' }}>
                    ({formatRupiah(price)} rental + {formatRupiah(deliveryFee)} delivery fee)
                  </p>
                )}
                {deliveryFee === 0 && <div style={{ marginBottom: '16px' }} />}

                <form onSubmit={proceedToReview}>
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
                        { key: 'pickup', label: 'Self Pickup', icon: 'fa-solid fa-store' },
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

                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, color: 'var(--sharp-muted)', marginBottom: '6px' }}>
                      Payment Method
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '10px' }}>
                      {[
                        { key: 'cash', label: 'Cash', icon: 'fa-solid fa-money-bill-wave' },
                        { key: 'transfer', label: 'Bank Transfer', icon: 'fa-solid fa-building-columns' },
                        { key: 'qris', label: 'QRIS', icon: 'fa-solid fa-qrcode' },
                        { key: 'card', label: 'Card', icon: 'fa-solid fa-credit-card' },
                      ].map(opt => (
                        <button
                          type="button"
                          key={opt.key}
                          onClick={() => handleChange('payment_method', opt.key)}
                          style={{
                            padding: '12px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                            border: form.payment_method === opt.key ? '2px solid var(--sharp-accent)' : '1px solid var(--sharp-line)',
                            background: form.payment_method === opt.key ? 'rgba(184, 112, 63, 0.08)' : 'var(--sharp-surface)',
                            color: 'var(--sharp-ink)', fontSize: '12px', fontWeight: 700,
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                          }}
                        >
                          <i className={opt.icon} style={{ fontSize: '16px', color: form.payment_method === opt.key ? 'var(--sharp-accent)' : 'var(--sharp-muted)' }}></i>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    <div style={{ marginTop: '10px', padding: '10px 12px', borderRadius: 'var(--radius-md)', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.25)', fontSize: '12px', color: 'var(--sharp-ink)', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <i className="fa-solid fa-circle-info" style={{ color: '#3B82F6', marginTop: '2px' }}></i>
                      <span>
                        Payment is collected in person when our driver arrives with your scooter.
                        {form.payment_method === 'card' && ' Our driver will bring a portable card machine (EDC) for card payment.'}
                      </span>
                    </div>
                  </div>

                  {form.fulfillment === 'delivery' && (
                    <div style={{ marginBottom: '14px' }}>
                      <label style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, color: 'var(--sharp-muted)', marginBottom: '6px' }}>
                        Delivery Area *
                      </label>
                      <p style={{ fontSize: '11.5px', color: 'var(--sharp-muted)', margin: '0 0 8px 0' }}>
                        Our shop is on Sunset Road, Kuta. Please pick the zone closest to your actual location so the delivery fee is accurate — double-check before confirming.
                      </p>
                      {deliveryZones.length === 0 ? (
                        <p style={{ fontSize: '12px', color: 'var(--sharp-muted)' }}>Loading areas...</p>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                          {deliveryZones.map(zone => (
                            <button
                              type="button"
                              key={zone.id}
                              onClick={() => handleChange('delivery_zone_id', zone.id)}
                              style={{
                                padding: '12px', borderRadius: 'var(--radius-md)', cursor: 'pointer', textAlign: 'left',
                                border: form.delivery_zone_id === zone.id ? `2px solid ${zone.color}` : '1px solid var(--sharp-line)',
                                background: form.delivery_zone_id === zone.id ? `${zone.color}18` : 'var(--sharp-surface)',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: zone.color, flexShrink: 0 }}></span>
                                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--sharp-muted)' }}>{zoneLabelEn(zone.zone_label)}</span>
                              </div>
                              <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--sharp-ink)' }}>{zone.name}</div>
                              <div style={{ fontSize: '12px', color: 'var(--sharp-accent)', fontWeight: 700 }}>{formatRupiah(zone.fee)}</div>
                            </button>
                          ))}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowMapModal(true)}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '14px',
                          width: '100%', background: 'var(--sharp-accent)', border: 'none', borderRadius: 'var(--radius-md)',
                          padding: '13px 16px', fontSize: '14px', fontWeight: 800, color: '#fff', cursor: 'pointer',
                        }}
                      >
                        <i className="fa-solid fa-map-location-dot" style={{ fontSize: '16px' }}></i> View Zone Map
                      </button>
                      {selectedZone && (
                        <div style={{
                          marginTop: '10px', padding: '12px 14px', borderRadius: 'var(--radius-md)',
                          background: `${selectedZone.color}12`, border: `1px solid ${selectedZone.color}`,
                        }}>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--sharp-ink)', marginBottom: '4px' }}>
                            <i className="fa-solid fa-truck-fast" style={{ marginRight: '6px', color: selectedZone.color }}></i>
                            Delivery fee ({zoneLabelEn(selectedZone.zone_label)})
                          </div>
                          <div style={{ fontSize: '20px', fontWeight: 900, color: selectedZone.color, whiteSpace: 'nowrap' }}>
                            {selectedZone.fee > 0 ? formatRupiah(selectedZone.fee) : 'FREE'}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {showMapModal && (
                    <div
                      onClick={() => setShowMapModal(false)}
                      style={{
                        position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.75)', zIndex: 300,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
                      }}
                    >
                      <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px', width: '100%', position: 'relative' }}>
                        <button
                          type="button"
                          onClick={() => setShowMapModal(false)}
                          aria-label="Close"
                          style={{
                            position: 'absolute', top: '-14px', right: '-8px', width: '34px', height: '34px', borderRadius: '50%',
                            background: '#fff', border: '1px solid var(--sharp-line)', color: 'var(--sharp-ink)', fontSize: '14px', cursor: 'pointer',
                          }}
                        >
                          <i className="fa-solid fa-xmark"></i>
                        </button>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src="/images/delivery-zone-map.webp"
                          alt="Delivery zone map — Green: Kerobokan/Seminyak/Legian/Kuta, Blue: Canggu/Uluwatu/Sanur & surrounding coastal areas, Yellow: Ubud"
                          style={{ width: '100%', borderRadius: 'var(--radius-md)', background: '#fff' }}
                        />
                      </div>
                    </div>
                  )}

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
                    Review Booking
                  </SharpButton>
                </form>
              </>
            )}

            {step === 'review' && reviewPayload && (
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--sharp-ink)', margin: '0 0 4px 0' }}>
                  Review Your Booking
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--sharp-muted)', margin: '0 0 18px 0' }}>
                  Please check everything below before confirming.
                </p>

                {/* ── Summary Card ── */}
                <div style={{ background: 'var(--sharp-surface)', border: '1px solid var(--sharp-line)', borderRadius: 'var(--radius-md)', padding: '16px', marginBottom: '18px' }}>
                  {[
                    ['Vehicle', reviewPayload.vehicle_name],
                    ['Renter', reviewPayload.customer_name],
                    ['WhatsApp', reviewPayload.customer_phone],
                    ['Rental Period', `${new Date(reviewPayload.start_date).toLocaleDateString('en-GB')} — ${new Date(reviewPayload.end_date).toLocaleDateString('en-GB')} (${reviewPayload.duration_days} day${reviewPayload.duration_days > 1 ? 's' : ''})`],
                    ['Fulfillment', reviewPayload.fulfillment_method === 'delivery' ? `Delivery (${reviewPayload.delivery_zone_name || '-'})` : 'Self Pickup at Shop'],
                    ...(reviewPayload.fulfillment_method === 'delivery' ? [['Delivery Address', reviewPayload.customer_address]] : []),
                    ['Payment Method', PAYMENT_METHOD_META[reviewPayload.payment_method]?.label || 'Cash'],
                  ].map(([label, value]) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '8px 0', borderBottom: '1px dashed var(--sharp-line)', fontSize: '13px' }}>
                      <span style={{ color: 'var(--sharp-muted)', flexShrink: 0 }}>{label}</span>
                      <span style={{ color: 'var(--sharp-ink)', fontWeight: 700, textAlign: 'right' }}>{value || '-'}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', paddingTop: '12px', fontSize: '15px' }}>
                    <span style={{ color: 'var(--sharp-ink)', fontWeight: 800 }}>Total Estimated</span>
                    <span style={{ color: 'var(--sharp-accent)', fontWeight: 900 }}>{formatRupiah(reviewPayload.estimated_price)}</span>
                  </div>
                </div>

                {/* ── Terms & Conditions ── */}
                <div style={{ marginBottom: '14px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--sharp-ink)', margin: '0 0 8px 0' }}>
                    Terms &amp; Conditions
                  </h3>
                  <div style={{
                    background: 'var(--sharp-surface)', border: '1px solid var(--sharp-line)', borderRadius: 'var(--radius-md)',
                    padding: '14px 16px', maxHeight: '220px', overflowY: 'auto', fontSize: '12px', color: 'var(--sharp-muted)', lineHeight: 1.7,
                  }}>
                    <ol style={{ margin: 0, paddingLeft: '18px' }}>
                      <li>The renter must be at least 18 years old and hold a valid ID/passport and a valid motorbike driving license (SIM or International Driving Permit) at the time of vehicle handover.</li>
                      <li>A valid ID/passport will be shown and photographed as part of the rental agreement, kept on file for the duration of the rental only.</li>
                      <li>The renter is fully responsible for any loss, damage, or theft of the vehicle during the rental period, including damage caused by accidents, misuse, or negligence.</li>
                      <li>A security deposit may be requested and will be refunded upon return of the vehicle in its original condition, minus any applicable damage, fuel, or late fees.</li>
                      <li>The vehicle must be returned with the same fuel level as at pickup, or a refueling fee will apply.</li>
                      <li>Helmets are provided and must be worn at all times while riding, in compliance with Indonesian traffic law. Traffic violations, tickets, or fines incurred during the rental are the renter&apos;s sole responsibility.</li>
                      <li>Late returns beyond the agreed end date/time may incur additional daily charges.</li>
                      <li>This rental does not include third-party liability or medical insurance unless explicitly stated. Renters are encouraged to have their own travel/health insurance.</li>
                      <li>Demo Rental Preview reserves the right to refuse or cancel a booking in case of suspected fraudulent information or unavailability of the requested vehicle.</li>
                      <li>By submitting this booking, the renter confirms that all information provided is accurate and agrees to the terms above.</li>
                    </ol>
                  </div>
                </div>

                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', marginBottom: '18px', fontSize: '12.5px', color: 'var(--sharp-ink)' }}>
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    style={{ width: '18px', height: '18px', marginTop: '1px', flexShrink: 0, cursor: 'pointer' }}
                  />
                  <span>I have read and agree to the Terms &amp; Conditions above, and confirm that the information I provided is accurate.</span>
                </label>

                {error && (
                  <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444', borderRadius: 'var(--radius-md)', padding: '10px 12px', fontSize: '12.5px', marginBottom: '14px' }}>
                    <i className="fa-solid fa-circle-exclamation" style={{ marginRight: '6px' }}></i>{error}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '10px' }}>
                  <SharpButton type="button" variant="outline" onClick={() => setStep('form')} disabled={submitting}>
                    Back
                  </SharpButton>
                  <div style={{ flex: 1 }}>
                    <SharpButton type="button" variant="accent" block disabled={submitting || !agreedToTerms} onClick={submitBooking}>
                      {submitting ? (
                        <><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>Submitting...</>
                      ) : (
                        'Confirm Booking'
                      )}
                    </SharpButton>
                  </div>
                </div>
              </div>
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
                  <div><i className={`fa-solid ${confirmedBooking.fulfillment_method === 'delivery' ? 'fa-truck-fast' : 'fa-store'}`} style={{ width: '18px', color: 'var(--sharp-accent)' }}></i> {confirmedBooking.fulfillment_method === 'delivery' ? `Delivery — ${confirmedBooking.delivery_zone_name || ''}` : 'Self Pickup'}</div>
                  <div><i className={PAYMENT_METHOD_META[confirmedBooking.payment_method]?.icon || 'fa-solid fa-wallet'} style={{ width: '18px', color: 'var(--sharp-accent)' }}></i> {PAYMENT_METHOD_META[confirmedBooking.payment_method]?.label || 'Cash'}{confirmedBooking.payment_method === 'card' && <span style={{ color: 'var(--sharp-muted)' }}> — driver will bring an EDC machine</span>}</div>
                  <div><i className="fa-solid fa-wallet" style={{ width: '18px', color: 'var(--sharp-accent)' }}></i> Est. {formatRupiah(confirmedBooking.estimated_price)}</div>
                </div>

                <SharpButton variant="whatsapp" block icon="fa-brands fa-whatsapp" onClick={notifyOwnerViaWhatsApp}>
                  Notify via WhatsApp
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
