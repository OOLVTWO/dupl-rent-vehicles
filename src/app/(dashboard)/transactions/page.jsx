'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useRole } from '@/lib/RoleContext';
import VehicleCombobox from '@/components/shared/VehicleCombobox';
import CustomerPickerCombobox from '@/components/shared/CustomerPickerCombobox';
import { getPaymentMethodMeta } from '@/lib/paymentMethods';
import { COUNTRY_CODES, getWhatsAppShareUrl, generateInvoiceText, getFlagImageUrl } from '@/lib/countryCodes';
import { createClient } from '@/lib/supabase/client';
import { fetchCustomers, upsertCustomer } from '@/lib/customers';
import { getLocalDateStr } from '@/lib/finance';
import { sharePdfToWhatsApp } from '@/lib/shareFile';


function formatRupiah(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount || 0);
}

// ===== SEARCHABLE COUNTRY CODE PICKER WITH FLAG CDN =====
function CountryCodePicker({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const currentCountry = COUNTRY_CODES.find(c => c.code === value) || COUNTRY_CODES[0];

  const filtered = COUNTRY_CODES.filter(c =>
    c.country.toLowerCase().includes(search.toLowerCase()) ||
    c.code.includes(search)
  );

  return (
    <div style={{ position: 'relative', width: '108px', flexShrink: 0 }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="form-control"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '4px',
          fontWeight: 600,
          cursor: 'pointer',
          padding: '8px 8px',
          background: 'var(--bg-elevated)',
          borderColor: 'var(--bg-border)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0 }}>
          <img
            src={getFlagImageUrl(currentCountry.iso)}
            alt={currentCountry.country}
            style={{ width: '18px', height: '13px', borderRadius: '2px', objectFit: 'cover', flexShrink: 0 }}
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <span style={{ fontSize: '13px', whiteSpace: 'nowrap' }}>{currentCountry.code}</span>
        </div>
        <i className={`fa-solid fa-chevron-${isOpen ? 'up' : 'down'}`} style={{ fontSize: '10px', color: 'var(--text-muted)', flexShrink: 0 }}></i>
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          left: 0,
          width: '270px',
          maxHeight: '280px',
          background: '#0F172A',
          border: '1px solid var(--brand-primary)',
          borderRadius: '10px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
          zIndex: 9999,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ padding: '8px', borderBottom: '1px solid var(--bg-border)' }}>
            <input
              type="text"
              className="form-control"
              placeholder="Cari 221 negara / kode..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
              style={{ fontSize: '12px', padding: '6px 10px' }}
            />
          </div>

          <div style={{ overflowY: 'auto', flex: 1, padding: '4px' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '12px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
                Tidak ditemukan
              </div>
            ) : (
              filtered.map(c => {
                const isSelected = c.code === value;
                return (
                  <div
                    key={`${c.iso}-${c.code}`}
                    onClick={() => {
                      onChange(c.code);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(37, 99, 235, 0.15)' : 'transparent',
                      color: isSelected ? 'var(--brand-primary-light)' : 'var(--text-primary)',
                      fontSize: '12px',
                      fontWeight: isSelected ? 700 : 500
                    }}
                  >
                    <img
                      src={getFlagImageUrl(c.iso)}
                      alt={c.country}
                      style={{ width: '20px', height: '14px', borderRadius: '2px', objectFit: 'cover' }}
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    <strong style={{ minWidth: '42px' }}>{c.code}</strong>
                    <span style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.country}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ===== SMART PRICE RECOMMENDATION PANEL =====
function SmartPriceRecommendationPanel({ vehicle, startDate, endDate, selectedOptionId, onSelectOption }) {
  if (!vehicle || !startDate || !endDate) return null;

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return null;

  const durationDays = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
  const dailyRate = Number(vehicle.rate_per_day) || 0;
  const weeklyRate = Number(vehicle.rate_per_week) || 0;
  const monthlyRate = Number(vehicle.rate_per_month) || 0;

  // Option 1: Daily Rate
  const dailyTotal = durationDays * dailyRate;

  // Option 2: Weekly Hybrid Rate
  let weeklyOption = null;
  if (weeklyRate > 0) {
    const weeks = Math.floor(durationDays / 7);
    const remDays = durationDays % 7;
    const mixCost = (weeks * weeklyRate) + (remDays * dailyRate);
    const fullWeeksCeil = Math.ceil(durationDays / 7);
    const flatWeeklyCost = fullWeeksCeil * weeklyRate;

    const bestWeeklyCost = Math.min(mixCost, flatWeeklyCost);
    const isFlatCheaper = flatWeeklyCost < mixCost;

    weeklyOption = {
      id: 'weekly',
      name: 'Weekly Rate Tier',
      badge: 'BEST VALUE (7+ DAYS)',
      total: bestWeeklyCost,
      savings: dailyTotal - bestWeeklyCost,
      detail: isFlatCheaper
        ? `${fullWeeksCeil} full week(s) @ ${formatRupiah(weeklyRate)}`
        : weeks > 0
          ? `${weeks} week(s) @ ${formatRupiah(weeklyRate)}${remDays > 0 ? ` + ${remDays} day(s) @ ${formatRupiah(dailyRate)}` : ''}`
          : `${remDays} day(s) @ ${formatRupiah(dailyRate)}`
    };
  }

  // Option 3: Monthly Hybrid Rate
  let monthlyOption = null;
  if (monthlyRate > 0) {
    const months = Math.floor(durationDays / 30);
    const remDaysMonth = durationDays % 30;
    const remWeeks = Math.floor(remDaysMonth / 7);
    const remDaysFinal = remDaysMonth % 7;

    const effWeekly = weeklyRate > 0 ? weeklyRate : (dailyRate * 7);
    const mixMonthCost = (months * monthlyRate) + (remWeeks * effWeekly) + (remDaysFinal * dailyRate);

    const fullMonthsCeil = Math.max(1, Math.ceil(durationDays / 30));
    const flatMonthCost = fullMonthsCeil * monthlyRate;

    const bestMonthCost = Math.min(mixMonthCost, flatMonthCost);
    const isFlatMonthCheaper = flatMonthCost < mixMonthCost;

    monthlyOption = {
      id: 'monthly',
      name: 'Monthly Rate Tier',
      badge: 'LONG TERM (30+ DAYS)',
      total: bestMonthCost,
      savings: dailyTotal - bestMonthCost,
      detail: isFlatMonthCheaper
        ? `${fullMonthsCeil} full month(s) @ ${formatRupiah(monthlyRate)}`
        : months > 0
          ? `${months} month(s) @ ${formatRupiah(monthlyRate)}${remDaysMonth > 0 ? ` + extra ${remDaysMonth} day(s)` : ''}`
          : `1 month rate @ ${formatRupiah(monthlyRate)}`
    };
  }

  const options = [
    {
      id: 'daily',
      name: 'Standard Daily',
      badge: 'DAILY RATE',
      total: dailyTotal,
      savings: 0,
      detail: `${durationDays} day(s) × ${formatRupiah(dailyRate)}/day`
    }
  ];

  if (weeklyOption) options.push(weeklyOption);
  if (monthlyOption) options.push(monthlyOption);

  // Find lowest price option
  let recommendedId = 'daily';
  let minTotal = dailyTotal;
  options.forEach(opt => {
    if (opt.total < minTotal) {
      minTotal = opt.total;
      recommendedId = opt.id;
    }
  });

  const activeOptionId = selectedOptionId || recommendedId;

  return (
    <div className="smart-calc-panel" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--bg-border)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
      <div className="smart-calc-header" style={{ marginBottom: '12px' }}>
        <div className="smart-calc-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>
          <i className="fa-solid fa-wand-magic-sparkles" style={{ color: 'var(--brand-primary)' }}></i>
          <span>Smart Price Calculator</span>
          <span className="smart-calc-days" style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'var(--bg-hover)', padding: '2px 8px', borderRadius: '12px' }}>{durationDays} Days Duration</span>
        </div>
      </div>

      <div className="smart-calc-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
        {options.map(opt => {
          const isRec = opt.id === recommendedId;
          const isSelected = activeOptionId === opt.id;

          return (
            <div
              key={opt.id}
              className={`smart-calc-card`}
              onClick={() => onSelectOption(opt.id, opt.total)}
              style={{
                background: isSelected ? 'rgba(37, 99, 235, 0.1)' : 'var(--bg-elevated)',
                border: `1px solid ${isSelected ? 'var(--brand-primary)' : 'var(--bg-border)'}`,
                borderRadius: '8px',
                padding: '12px',
                cursor: 'pointer',
                position: 'relative',
                textAlign: 'center'
              }}
            >
              {isRec && (
                <div className="rec-ribbon" style={{ fontSize: '9px', fontWeight: 800, color: '#fff', background: 'var(--brand-primary)', padding: '2px 6px', borderRadius: '4px', marginBottom: '6px', display: 'inline-block' }}>
                  <i className="fa-solid fa-crown" style={{ marginRight: '4px' }}></i> Recommended
                </div>
              )}
              <div className="smart-card-name" style={{ fontWeight: 600, fontSize: '12px' }}>{opt.name}</div>
              <div className="smart-card-price" style={{ fontWeight: 800, fontSize: '16px', color: 'var(--brand-primary-light)', margin: '4px 0' }}>{formatRupiah(opt.total)}</div>
              <div className="smart-card-detail" style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '8px' }}>{opt.detail}</div>
              {opt.savings > 0 && (
                <div className="smart-card-savings" style={{ fontSize: '10px', color: '#22C55E', fontWeight: 700 }}>
                  Saves {formatRupiah(opt.savings)}!
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ===== TRANSACTION MODAL =====
// ===== TRANSACTION MODAL =====
// Ganti seluruh function TransactionModal dari baris 9568 sampai 10170
// (dari "function TransactionModal" sampai "}" penutupnya, sebelum "// ===== MODAL KIRIM INVOICE WHATSAPP =====")

function TransactionModal({ isOpen, onClose, onSubmit, onBookingSaved, vehicles, editData }) {
  const [recordType, setRecordType] = useState(''); // '' | 'transaction' | 'booking'
  const [fulfillment, setFulfillment] = useState(''); // '' | 'pickup' | 'delivery'
  const [deliveryZones, setDeliveryZones] = useState([]);
  const [selectedZoneId, setSelectedZoneId] = useState('');
  const [drivers, setDrivers] = useState([]);
  const [assignedDriverId, setAssignedDriverId] = useState('');
  const [bookingSaving, setBookingSaving] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [form, setForm] = useState({
    vehicle_id: '',
    renter_name: '',
    renter_phone: '',
    renter_id_number: '',
    renter_address: '',
    start_date: '',
    end_date: '',
    deposit: '',
    discount: '',
    customer_image_url: '',
    handover_image_url: '',
    km_start: '',
    payment_method: 'cash',
    payment_status: 'paid',
    dp_amount: '',
    status: 'active',
    notes: '',
  });

  const [countryCode, setCountryCode] = useState('+62');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [totalPrice, setTotalPrice] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Reset Jenis Pencatatan tiap kali modal dibuka fresh buat entry baru —
  // pola resmi "adjust state during render" (bukan setState sinkron di
  // dalam effect, yang bisa memicu cascading render).
  const [prevOpenKey, setPrevOpenKey] = useState(null);
  const openKey = isOpen && !editData ? 'new' : null;
  if (openKey !== prevOpenKey) {
    setPrevOpenKey(openKey);
    if (openKey === 'new') {
      setRecordType('');
      setFulfillment('');
      setSelectedZoneId('');
      setAssignedDriverId('');
    }
  }

  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/delivery-zones')
      .then(r => r.ok ? r.json() : [])
      .then(data => setDeliveryZones(Array.isArray(data) ? data : []))
      .catch(() => setDeliveryZones([]));
    fetch('/api/staff')
      .then(r => r.ok ? r.json() : [])
      .then(data => setDrivers((Array.isArray(data) ? data : []).filter(s => s.role === 'driver')))
      .catch(() => setDrivers([]));
  }, [isOpen]);

  // ── Kalkulasi harga otomatis: pilih kombinasi termurah daily/weekly/monthly ──
  const calcBestPrice = (vehicle, startDate, endDate) => {
    if (!vehicle || !startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start) || isNaN(end) || end < start) return 0;

    const days   = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
    const daily  = Number(vehicle.rate_per_day)   || 0;
    const weekly = Number(vehicle.rate_per_week)  || 0;
    const monthly= Number(vehicle.rate_per_month) || 0;

    let best = days * daily;

    if (weekly > 0) {
      const mix  = Math.floor(days / 7) * weekly + (days % 7) * daily;
      const flat = Math.ceil(days / 7) * weekly;
      best = Math.min(best, mix, flat);
    }

    if (monthly > 0) {
      const months   = Math.floor(days / 30);
      const remDays  = days % 30;
      const effWeek  = weekly > 0 ? weekly : daily * 7;
      const mix2     = months * monthly + Math.floor(remDays / 7) * effWeek + (remDays % 7) * daily;
      const flat2    = Math.ceil(days / 30) * monthly;
      best = Math.min(best, mix2, flat2);
    }

    return best;
  };

  const handleSelectCustomer = (cust) => {
    setForm(prev => ({
      ...prev,
      renter_name: cust.name || prev.renter_name,
      renter_phone: cust.phone || prev.renter_phone,
      renter_id_number: cust.id_number || prev.renter_id_number,
      renter_address: cust.address || prev.renter_address,
      customer_image_url: cust.customer_image_url || prev.customer_image_url,
    }));

    if (cust.phone) {
      const parts = cust.phone.trim().split(' ');
      if (parts.length > 1 && parts[0].startsWith('+')) {
        setCountryCode(parts[0]);
        setPhoneNumber(parts.slice(1).join(' '));
      } else {
        setCountryCode('+62');
        setPhoneNumber(cust.phone);
      }
    }
  };

  useEffect(() => {
    Promise.resolve().then(() => {
      if (!isOpen) return;
      if (editData) {
        setForm({
          vehicle_id: editData.vehicle_id || '',
          renter_name: editData.renter_name || '',
          renter_phone: editData.renter_phone || '',
          renter_id_number: editData.renter_id_number || '',
          renter_address: editData.renter_address || '',
          start_date: editData.start_date || '',
          end_date: editData.end_date || '',
          deposit: editData.deposit || '',
          discount: editData.discount || '',
          customer_image_url: editData.customer_image_url || '',
          handover_image_url: editData.handover_image_url || '',
          km_start: editData.km_start || '',
          payment_method: editData.payment_method || 'cash',
          payment_status: editData.payment_status || 'paid',
          dp_amount: editData.dp_amount || '',
          status: editData.status || 'active',
          notes: editData.notes || '',
        });
        setTotalPrice(editData.total_price || 0);
        setShowOptional(false);

        if (editData.renter_phone) {
          const parts = editData.renter_phone.trim().split(' ');
          if (parts.length > 1 && parts[0].startsWith('+')) {
            setCountryCode(parts[0]);
            setPhoneNumber(parts.slice(1).join(' '));
          } else {
            setCountryCode('+62');
            setPhoneNumber(editData.renter_phone);
          }
        } else {
          setCountryCode('+62');
          setPhoneNumber('');
        }
      } else {
        setForm({
          vehicle_id: '',
          renter_name: '',
          renter_phone: '+62 ',
          renter_id_number: '',
          renter_address: '',
          start_date: getLocalDateStr(),
          end_date: '',
          deposit: '',
          discount: '',
          customer_image_url: '',
          handover_image_url: '',
          km_start: '',
          payment_method: 'cash',
          payment_status: 'paid',
          dp_amount: '',
          status: 'active',
          notes: '',
        });
        setCountryCode('+62');
        setPhoneNumber('');
        setTotalPrice(0);
        setShowOptional(false);
      }
    });
  }, [editData, isOpen]);

  // ── Recalculate harga saat motor / tanggal / diskon berubah ──
  const priceKey = [form.vehicle_id, form.start_date, form.end_date, form.discount, vehicles.length].join('|');
  const [prevPriceKey, setPrevPriceKey] = useState(null);
  if (priceKey !== prevPriceKey) {
    setPrevPriceKey(priceKey);
    if (form.vehicle_id && form.start_date && form.end_date) {
      const vehicle = vehicles.find(v => v.id === form.vehicle_id);
      if (vehicle) {
        const gross = calcBestPrice(vehicle, form.start_date, form.end_date);
        const disc  = parseFloat(form.discount) || 0;
        setTotalPrice(Math.max(0, gross - disc));

        // Auto-fill KM awal dari data motor jika belum diisi
        if (!form.km_start && vehicle.current_km) {
          setForm(prev => ({ ...prev, km_start: vehicle.current_km }));
        }
      }
    } else {
      setTotalPrice(0);
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!editData && !recordType) {
      alert('Silakan pilih dulu: Transaksi Langsung atau Booking (Reservasi).');
      return;
    }
    if (!editData && !fulfillment) {
      alert('Silakan pilih dulu: Ambil di Toko atau Diantar.');
      return;
    }
    const cleanVehicleId = (form.vehicle_id || '').trim();
    if (!cleanVehicleId) {
      alert('Silakan pilih unit motor terlebih dahulu!');
      return;
    }
    if (!form.renter_address.trim()) {
      alert('Alamat / Villa wajib diisi.');
      return;
    }
    if (!form.renter_id_number.trim()) {
      alert('No. KTP / Paspor / SIM wajib diisi — biar nanti ngisi form kontraknya lebih sedikit.');
      return;
    }
    if (form.payment_status === 'down_payment' && !String(form.dp_amount).trim()) {
      alert('Jumlah DP yang sudah dibayar wajib diisi.');
      return;
    }
    if (!editData && recordType === 'booking') {
      if (fulfillment === 'delivery' && !selectedZoneId) {
        alert('Silakan pilih zona delivery terlebih dahulu!');
        return;
      }
      if (fulfillment === 'delivery' && !form.renter_address.trim()) {
        alert('Alamat wajib diisi untuk delivery.');
        return;
      }
    }
    if (!editData && recordType === 'transaction' && fulfillment === 'delivery') {
      if (!selectedZoneId) {
        alert('Silakan pilih zona delivery terlebih dahulu!');
        return;
      }
      if (!assignedDriverId) {
        alert('Silakan tugaskan driver terlebih dahulu untuk transaksi delivery ini.');
        return;
      }
    }
    setShowConfirm(true);
  };

  const handleConfirmSave = async () => {
    const cleanVehicleId = (form.vehicle_id || '').trim();
    setShowConfirm(false);

    if (!editData && recordType === 'booking') {
      setBookingSaving(true);
      setBookingError('');
      const vehicleObj = vehicles.find(v => v.id === cleanVehicleId);
      const zoneObj = deliveryZones.find(z => z.id === selectedZoneId);
      try {
        const supabase = createClient();
        const { error } = await supabase.from('bookings').insert([{
          vehicle_id: cleanVehicleId,
          vehicle_name: vehicleObj?.name || '',
          vehicle_category: vehicleObj?.category || null,
          customer_name: form.renter_name.trim(),
          customer_phone: form.renter_phone.trim(),
          customer_address: form.renter_address.trim() || null,
          fulfillment_method: fulfillment,
          payment_method: form.payment_method,
          payment_status: form.payment_status,
          dp_amount: form.payment_status === 'down_payment' ? Number(form.dp_amount) || 0 : 0,
          delivery_zone_id: fulfillment === 'delivery' ? (zoneObj?.id || null) : null,
          delivery_zone_name: fulfillment === 'delivery' ? (zoneObj?.zone_label || null) : null,
          delivery_fee: fulfillment === 'delivery' ? Number(zoneObj?.fee) || 0 : 0,
          start_date: form.start_date,
          end_date: form.end_date,
          duration_days: Math.max(1, Math.ceil((new Date(form.end_date) - new Date(form.start_date)) / 86400000)),
          estimated_price: totalPrice,
          status: 'pending',
        }]);
        if (error) throw error;
        setBookingSuccess(true);
        onBookingSaved?.();
      } catch (err) {
        setBookingError(err?.message || 'Gagal menyimpan booking.');
      }
      setBookingSaving(false);
      return;
    }

    setLoading(true);
    const selectedDriver = drivers.find(d => d.id === assignedDriverId);
    const selectedZoneObj = deliveryZones.find(z => z.id === selectedZoneId);

    // Transaksi sekarang tapi mau diantar (misalnya walk-in ke toko hari
    // ini, tapi minta diantar sore ini ke lokasi lain) — JANGAN langsung
    // bikin Transaksi aktif, karena itu bakal nge-trigger Tracking Sewa
    // ngitung mundur padahal motornya belum beneran diserahterimakan.
    // Cukup bikin Booking-nya aja (status langsung 'confirmed', driver
    // udah ke-assign) — Transaksinya baru dibuat nanti pas driver beneran
    // confirm delivery, lewat alur Konfirmasi Transaksi yang udah ada.
    if (!editData && recordType === 'transaction' && fulfillment === 'delivery' && selectedDriver) {
      setBookingSaving(true);
      setBookingError('');
      try {
        const supabase = createClient();
        const vehicleObj = vehicles.find(v => v.id === cleanVehicleId);
        const { error: bookingErr } = await supabase.from('bookings').insert([{
          vehicle_id: cleanVehicleId,
          vehicle_name: vehicleObj?.name || '',
          vehicle_category: vehicleObj?.category || null,
          customer_name: form.renter_name.trim(),
          customer_phone: form.renter_phone.trim(),
          customer_address: form.renter_address.trim() || null,
          fulfillment_method: 'delivery',
          payment_method: form.payment_method,
          payment_status: form.payment_status,
          dp_amount: form.payment_status === 'down_payment' ? Number(form.dp_amount) || 0 : 0,
          delivery_zone_id: selectedZoneObj?.id || null,
          delivery_zone_name: selectedZoneObj?.zone_label || null,
          delivery_fee: Number(selectedZoneObj?.fee) || 0,
          start_date: form.start_date,
          end_date: form.end_date,
          duration_days: Math.max(1, Math.ceil((new Date(form.end_date) - new Date(form.start_date)) / 86400000)),
          estimated_price: totalPrice,
          status: 'confirmed',
          assigned_driver_id: selectedDriver.id,
          assigned_driver_name: selectedDriver.full_name,
        }]);
        if (bookingErr) throw bookingErr;
        setBookingSuccess(true);
        onBookingSaved?.();
      } catch (err) {
        setBookingError(err?.message || 'Gagal menyimpan booking.');
      }
      setBookingSaving(false);
      setLoading(false);
      return;
    }

    const extraFields = (!editData && recordType === 'transaction') ? {
      fulfillment_method: fulfillment,
    } : {};

    await onSubmit({ ...form, ...extraFields, vehicle_id: cleanVehicleId, total_price: totalPrice });
    setLoading(false);
  };

  if (!isOpen) return null;

  const availableVehicles = vehicles.filter(v =>
    v.status === 'available' || (editData && v.id === editData.vehicle_id)
  );
  const noVehiclesAvailable = availableVehicles.length === 0;
  const selectedVehicleObj = vehicles.find(v => v.id === form.vehicle_id);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-title">
              {editData ? (
                <><i className="fa-solid fa-pen-to-square" style={{ marginRight: '6px' }}></i> Edit Transaksi</>
              ) : (
                <><i className="fa-solid fa-plus" style={{ marginRight: '6px' }}></i> Transaksi Baru</>
              )}
            </div>
            <div className="modal-subtitle">Isi data penyewaan motor & customer</div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>

          {/* ── Auto-fill Customer ── */}
          {!editData && (
            <CustomerPickerCombobox onSelectCustomer={handleSelectCustomer} />
          )}

          {/* ── Jenis Pencatatan: Transaksi langsung atau Booking (reservasi tanggal lain) ── */}
          {!editData && (
            <div className="form-group">
              <label className="form-label">Jenis Pencatatan <span className="required">*</span></label>
              <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: 0, marginBottom: '10px' }}>Pilih salah satu sebelum lanjut.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setRecordType('transaction')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '14px', textAlign: 'left', width: '100%',
                    padding: '16px', borderRadius: '12px', cursor: 'pointer', fontWeight: 700,
                    border: recordType === 'transaction' ? '2px solid var(--brand-primary)' : '1.5px solid var(--bg-border)',
                    background: recordType === 'transaction' ? 'rgba(37,99,235,0.1)' : 'transparent',
                    color: recordType === 'transaction' ? 'var(--brand-primary-light)' : 'var(--text-secondary)',
                  }}
                >
                  <div style={{
                    width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
                    border: `2px solid ${recordType === 'transaction' ? 'var(--brand-primary)' : 'var(--bg-border)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {recordType === 'transaction' && <div style={{ width: '11px', height: '11px', borderRadius: '50%', background: 'var(--brand-primary)' }} />}
                  </div>
                  <i className="fa-solid fa-key" style={{ fontSize: '20px', flexShrink: 0 }}></i>
                  <div>
                    <div style={{ fontSize: '14.5px' }}>Transaksi Langsung</div>
                    <div style={{ fontSize: '11.5px', fontWeight: 500, opacity: 0.8 }}>Sewa dimulai sekarang, motor langsung &quot;Disewa&quot;</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setRecordType('booking')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '14px', textAlign: 'left', width: '100%',
                    padding: '16px', borderRadius: '12px', cursor: 'pointer', fontWeight: 700,
                    border: recordType === 'booking' ? '2px solid #8B5CF6' : '1.5px solid var(--bg-border)',
                    background: recordType === 'booking' ? 'rgba(139,92,246,0.1)' : 'transparent',
                    color: recordType === 'booking' ? '#8B5CF6' : 'var(--text-secondary)',
                  }}
                >
                  <div style={{
                    width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
                    border: `2px solid ${recordType === 'booking' ? '#8B5CF6' : 'var(--bg-border)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {recordType === 'booking' && <div style={{ width: '11px', height: '11px', borderRadius: '50%', background: '#8B5CF6' }} />}
                  </div>
                  <i className="fa-solid fa-calendar-plus" style={{ fontSize: '20px', flexShrink: 0 }}></i>
                  <div>
                    <div style={{ fontSize: '14.5px' }}>Booking (Reservasi)</div>
                    <div style={{ fontSize: '11.5px', fontWeight: 500, opacity: 0.8 }}>Untuk tanggal lain / nanti, motor tetap tersedia</div>
                  </div>
                </button>
              </div>
              {recordType === 'booking' && (
                <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '8px', marginBottom: 0 }}>
                  Masuk ke Booking Confirmation (status Pending) — motor tetap kelihatan tersedia sampai booking-nya dikonfirmasi.
                </p>
              )}
            </div>
          )}

          {/* ── Ambil di Toko / Diantar — selalu tampil, nggak nunggu Jenis Pencatatan dipilih dulu ── */}
          {!editData && (
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
                </div>
              )}

              {recordType === 'transaction' && fulfillment === 'delivery' && (
                <div style={{ marginTop: '12px' }}>
                  <label className="form-label" htmlFor="tx-assigned-driver">Tugaskan Driver <span className="required">*</span></label>
                  <select
                    id="tx-assigned-driver"
                    className="form-control"
                    value={assignedDriverId}
                    onChange={(e) => setAssignedDriverId(e.target.value)}
                  >
                    <option value="">Belum ditugaskan</option>
                    {drivers.map(d => (
                      <option key={d.id} value={d.id}>{d.full_name}</option>
                    ))}
                  </select>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', marginBottom: 0 }}>
                    Transaksi langsung nggak lewat Booking Confirmation, jadi driver-nya ditugaskan di sini.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── Pilih Motor ── */}
          {noVehiclesAvailable && !editData ? (
            <div style={{ padding: '16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: '12px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#EF4444' }}>
              <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: '18px', flexShrink: 0 }}></i>
              <div>
                <strong>Semua motor sedang disewa atau dalam perawatan.</strong>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Selesaikan transaksi aktif terlebih dahulu, atau ubah status motor di halaman Kendaraan.
                </div>
              </div>
            </div>
          ) : (
            <VehicleCombobox
              vehicles={availableVehicles}
              value={form.vehicle_id}
              onChange={(id) => setForm(prev => ({ ...prev, vehicle_id: (id || '').trim() }))}
            />
          )}

          {/* ── Nama Penyewa ── */}
          <div className="form-group">
            <label className="form-label" htmlFor="tx-name">
              <i className="fa-solid fa-user" style={{ marginRight: '6px' }}></i> Nama Penyewa <span className="required">*</span>
            </label>
            <input id="tx-name" name="renter_name" type="text" className="form-control" placeholder="Nama lengkap penyewa" value={form.renter_name} onChange={handleChange} required />
          </div>

          {/* ── Nomor Passport / KTP / SIM ── */}
          <div className="form-group">
            <label className="form-label" htmlFor="tx-id-num">
              <i className="fa-solid fa-id-card" style={{ marginRight: '6px' }}></i> No. KTP / Paspor / SIM <span className="required">*</span>
            </label>
            <input id="tx-id-num" name="renter_id_number" type="text" className="form-control" placeholder="Nomor identitas" value={form.renter_id_number} onChange={handleChange} required />
          </div>

          {/* ── No. WhatsApp ── */}
          <div className="form-group">
            <label className="form-label" htmlFor="tx-phone">
              <i className="fa-solid fa-globe" style={{ marginRight: '6px' }}></i> No. WhatsApp <span className="required">*</span>
            </label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'nowrap' }}>
              <CountryCodePicker
                value={countryCode}
                onChange={(newCode) => {
                  setCountryCode(newCode);
                  setForm(prev => ({ ...prev, renter_phone: `${newCode} ${phoneNumber}` }));
                }}
              />
              <input
                id="tx-phone"
                name="phone_number"
                type="tel"
                className="form-control"
                style={{ flex: 1, minWidth: 0 }}
                placeholder="812345678"
                value={phoneNumber}
                onChange={e => {
                  const newNum = e.target.value;
                  setPhoneNumber(newNum);
                  setForm(prev => ({ ...prev, renter_phone: `${countryCode} ${newNum}` }));
                }}
                required
              />
            </div>
          </div>

          {/* ── Tanggal Mulai & Selesai ── */}
          <div className="form-row cols-2">
            <div className="form-group">
              <label className="form-label" htmlFor="tx-start">
                <i className="fa-solid fa-calendar-plus" style={{ marginRight: '6px' }}></i> Tanggal Mulai <span className="required">*</span>
              </label>
              <input id="tx-start" name="start_date" type="date" className="form-control" value={form.start_date} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="tx-end">
                <i className="fa-solid fa-calendar-check" style={{ marginRight: '6px' }}></i> Tanggal Selesai <span className="required">*</span>
              </label>
              <input id="tx-end" name="end_date" type="date" className="form-control" value={form.end_date} onChange={handleChange} min={form.start_date} required />
            </div>
          </div>

          {/* ── Alamat / Villa / Hotel ── */}
          <div className="form-group">
            <label className="form-label" htmlFor="tx-address">
              <i className="fa-solid fa-location-dot" style={{ marginRight: '6px', color: 'var(--brand-primary)' }}></i> Alamat / Villa / Hotel <span className="required">*</span>
            </label>
            <input id="tx-address" name="renter_address" type="text" className="form-control" placeholder="e.g. Villa Bamboo, Jl. Pererenan" value={form.renter_address || ''} onChange={handleChange} required />
          </div>

          {/* ── Metode Pembayaran ── */}
          <div className="form-group">
            <label className="form-label" htmlFor="tx-payment">
              <i className="fa-solid fa-credit-card" style={{ marginRight: '6px' }}></i> Metode Bayar
            </label>
            <select id="tx-payment" name="payment_method" className="form-control" value={form.payment_method} onChange={handleChange}>
              <option value="cash">Cash</option>
              <option value="transfer">Bank Transfer</option>
              <option value="qris">QRIS</option>
              <option value="card">Kartu (EDC)</option>
            </select>
          </div>

               {/* ── Status Pembayaran ── */}
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label">
              <i className="fa-solid fa-money-bill-wave" style={{ marginRight: '6px', color: '#22C55E' }}></i>
              Status Pembayaran <span className="required">*</span>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              <button type="button" onClick={() => setForm(prev => ({ ...prev, payment_status: 'paid' }))}
                style={{ padding: '11px 6px', borderRadius: '10px', border: `2px solid ${form.payment_status === 'paid' ? '#22C55E' : 'var(--bg-border)'}`, background: form.payment_status === 'paid' ? 'rgba(34,197,94,0.15)' : 'var(--bg-elevated)', color: form.payment_status === 'paid' ? '#22C55E' : 'var(--text-secondary)', fontWeight: 700, fontSize: '12px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                <i className="fa-solid fa-circle-check"></i> Lunas
              </button>
              <button type="button" onClick={() => setForm(prev => ({ ...prev, payment_status: 'down_payment' }))}
                style={{ padding: '11px 6px', borderRadius: '10px', border: `2px solid ${form.payment_status === 'down_payment' ? '#3B82F6' : 'var(--bg-border)'}`, background: form.payment_status === 'down_payment' ? 'rgba(59,130,246,0.15)' : 'var(--bg-elevated)', color: form.payment_status === 'down_payment' ? '#3B82F6' : 'var(--text-secondary)', fontWeight: 700, fontSize: '12px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                <i className="fa-solid fa-coins"></i> Down Payment
              </button>
              <button type="button" onClick={() => setForm(prev => ({ ...prev, payment_status: 'unpaid' }))}
                style={{ padding: '11px 6px', borderRadius: '10px', border: `2px solid ${form.payment_status === 'unpaid' ? '#F59E0B' : 'var(--bg-border)'}`, background: form.payment_status === 'unpaid' ? 'rgba(245,158,11,0.15)' : 'var(--bg-elevated)', color: form.payment_status === 'unpaid' ? '#F59E0B' : 'var(--text-secondary)', fontWeight: 700, fontSize: '12px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                <i className="fa-solid fa-clock"></i> Belum Bayar
              </button>
            </div>
            {form.payment_status === 'down_payment' && (
              <div className="form-group" style={{ marginTop: '10px', marginBottom: 0 }}>
                <label className="form-label" htmlFor="tx-dp-amount">Jumlah DP yang sudah dibayar (Rp) <span className="required">*</span></label>
                <input
                  id="tx-dp-amount"
                  name="dp_amount"
                  type="number"
                  min="0"
                  className="form-control"
                  placeholder="e.g. 300000"
                  value={form.dp_amount}
                  onChange={handleChange}
                  required
                />
                {totalPrice > 0 && form.dp_amount && (
                  <div style={{ marginTop: '8px', padding: '8px 12px', background: 'rgba(59,130,246,0.08)', borderRadius: '8px', border: '1px solid rgba(59,130,246,0.3)', fontSize: '12px', color: '#3B82F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                    <span>Sisa yang harus dilunasi:</span>
                    <strong style={{ whiteSpace: 'nowrap' }}>{formatRupiah(Math.max(0, totalPrice - Number(form.dp_amount || 0)))}</strong>
                  </div>
                )}
              </div>
            )}
            {form.payment_status === 'unpaid' && (
              <div style={{ marginTop: '8px', padding: '8px 12px', background: 'rgba(245,158,11,0.08)', borderRadius: '8px', border: '1px solid rgba(245,158,11,0.3)', fontSize: '12px', color: '#F59E0B', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                <i className="fa-solid fa-triangle-exclamation" style={{ flexShrink: 0, marginTop: '2px' }}></i>
                <span>Motor tetap tidak tersedia. Pembayaran <strong>belum masuk</strong> ke laporan pendapatan.</span>
              </div>
            )}
          </div>

          {/* ── Deposit & Diskon ── */}
          <div className="form-row cols-2">
            <div className="form-group">
              <label className="form-label" htmlFor="tx-deposit">
                <i className="fa-solid fa-vault" style={{ marginRight: '6px' }}></i> Deposit (Rp)
              </label>
              <input id="tx-deposit" name="deposit" type="number" className="form-control" placeholder="0" value={form.deposit} onChange={handleChange} min="0" style={{ MozAppearance: 'textfield' }} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="tx-discount">
                <i className="fa-solid fa-tags" style={{ marginRight: '6px' }}></i> Diskon (Rp)
              </label>
              <input id="tx-discount" name="discount" type="number" className="form-control" placeholder="0" value={form.discount} onChange={handleChange} min="0" style={{ MozAppearance: 'textfield' }} />
            </div>
          </div>

          {/* ── Info harga otomatis (muncul setelah motor + tanggal dipilih) ── */}
          {totalPrice > 0 && (
            <div style={{ padding: '14px 16px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: '10px', marginBottom: '16px' }}>
              <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px', marginBottom: '6px' }}>
                <i className="fa-solid fa-calculator" style={{ color: '#22C55E' }}></i>
                Harga Terbaik Otomatis
                {form.discount > 0 && <span style={{ fontSize: '11px', color: '#F59E0B' }}>(sudah potong diskon)</span>}
              </div>
              <strong style={{ display: 'block', fontSize: '22px', color: '#22C55E', letterSpacing: '-0.5px', whiteSpace: 'nowrap' }}>
                {formatRupiah(totalPrice)}
              </strong>
            </div>
          )}

          {/* ── KM Awal Odometer ── */}
          <div className="form-group">
            <label className="form-label" htmlFor="tx-km-start">
              <i className="fa-solid fa-gauge-high" style={{ marginRight: '6px' }}></i> KM Awal Odometer
            </label>
            <input
              id="tx-km-start"
              name="km_start"
              type="number"
              className="form-control"
              placeholder="e.g. 18500"
              value={form.km_start}
              onChange={handleChange}
              min="0"
              style={{ MozAppearance: 'textfield' }}
            />
          </div>

          {/* ── Catatan ── */}
          <div className="form-group">
            <label className="form-label" htmlFor="tx-notes">
              <i className="fa-regular fa-note-sticky" style={{ marginRight: '6px' }}></i> Catatan Tambahan
            </label>
            <textarea id="tx-notes" name="notes" className="form-control" rows={2} placeholder="Catatan khusus, permintaan khusus, dll..." value={form.notes} onChange={handleChange} style={{ resize: 'vertical' }} />
          </div>

          {!editData && recordType === 'transaction' && form.start_date && form.start_date > getLocalDateStr() && (
            <div className="alert alert-warning" style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12.5px' }}>
              <i className="fa-solid fa-triangle-exclamation" style={{ marginTop: '2px' }}></i>
              <span>
                Tanggal mulai ini masih di masa depan, tapi mode-nya masih &quot;Transaksi Langsung&quot; — tombol simpan
                <strong> dinonaktifkan dulu</strong> karena nggak sesuai flow (Transaksi Langsung cuma buat sewa yang mulai hari ini).
                Ganti ke mode <strong>Booking (Reservasi)</strong> di atas buat tanggal nanti.
              </span>
            </div>
          )}

          {/* ── Footer ── */}
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Batal</button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || bookingSaving || (!editData && recordType === 'transaction' && form.start_date && form.start_date > getLocalDateStr())}
            >
              {(loading || bookingSaving) ? (
                <><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '4px' }}></i> Menyimpan...</>
              ) : !editData && recordType === 'booking' ? (
                <><i className="fa-solid fa-calendar-plus" style={{ marginRight: '4px' }}></i> Simpan Booking</>
              ) : !editData && recordType === 'transaction' && fulfillment === 'delivery' && assignedDriverId ? (
                <><i className="fa-solid fa-motorcycle" style={{ marginRight: '4px' }}></i> Tugaskan Driver</>
              ) : (
                <><i className="fa-solid fa-floppy-disk" style={{ marginRight: '4px' }}></i> Simpan Transaksi</>
              )}
            </button>
          </div>

        </form>

        {/* ── Modal Konfirmasi Simpan ── */}
        {showConfirm && (
          <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={() => setShowConfirm(false)}>
            <div className="modal modal-sm" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
              <div className="modal-header" style={{ borderBottom: '1px solid var(--bg-border)', paddingBottom: '16px' }}>
                <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '16px', fontWeight: 800 }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i className="fa-solid fa-floppy-disk" style={{ color: '#6366F1', fontSize: '16px' }}></i>
                  </div>
                  {editData ? 'Konfirmasi Perubahan' : recordType === 'booking' ? 'Konfirmasi Booking Baru' : 'Konfirmasi Transaksi Baru'}
                </div>
                <button className="modal-close" onClick={() => setShowConfirm(false)}>✕</button>
              </div>

              <div style={{ padding: '20px 0 4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: 'var(--bg-elevated)', borderRadius: '10px', border: '1px solid var(--bg-border)', marginBottom: '16px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bg-card-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i className="fa-solid fa-user" style={{ color: 'var(--brand-primary)', fontSize: '16px' }}></i>
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>{form.renter_name || '—'}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      <i className="fa-solid fa-motorcycle" style={{ marginRight: '5px', fontSize: '11px' }}></i>
                      {vehicles.find(v => v.id === (form.vehicle_id || '').trim())?.name || '—'}
                      {totalPrice > 0 && (
                        <span style={{ marginLeft: '8px', color: '#22C55E', fontWeight: 700 }}>· {formatRupiah(totalPrice)}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ padding: '12px 14px', background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: '8px', marginBottom: '8px' }}>
                  <p style={{ fontSize: '13.5px', color: 'var(--text-primary)', margin: 0, lineHeight: 1.6 }}>
                    {editData ? 'Simpan perubahan data transaksi ini?' : recordType === 'booking' ? 'Simpan sebagai Booking (Pending) di Booking Confirmation?' : 'Tambahkan transaksi baru ini ke sistem?'}
                  </p>
                </div>

                <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', margin: '8px 0 0', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <i className="fa-solid fa-circle-info" style={{ fontSize: '11px' }}></i>
                  Data akan langsung tersimpan ke database.
                </p>
              </div>

              <div className="modal-footer" style={{ marginTop: '20px' }}>
                <button className="btn btn-secondary" onClick={() => setShowConfirm(false)}>Batal</button>
                <button className="btn btn-primary" onClick={handleConfirmSave}
                  style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-solid fa-floppy-disk"></i>
                  {editData ? 'Ya, Simpan Perubahan' : recordType === 'booking' ? 'Ya, Simpan Booking' : 'Ya, Tambah Transaksi'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Booking Berhasil Disimpan ── */}
        {bookingSuccess && (
          <div className="modal-overlay" style={{ zIndex: 1100 }}>
            <div className="modal modal-sm" style={{ maxWidth: '400px', textAlign: 'center', padding: '32px 24px' }}>
              <div style={{
                width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(139,92,246,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto', fontSize: '26px', color: '#8B5CF6',
              }}>
                <i className="fa-solid fa-check"></i>
              </div>
              <h3 style={{ margin: '0 0 6px 0', fontSize: '17px' }}>
                {recordType === 'transaction' ? 'Driver Ditugaskan!' : 'Booking Tersimpan!'}
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '22px' }}>
                {recordType === 'transaction' ? (
                  <>Reservasi untuk <strong>{form.renter_name}</strong> masuk ke Booking Confirmation dengan status Confirmed dan driver udah ditugaskan. Transaksinya (dan hitungan mundur Tracking Sewa) baru mulai begitu driver konfirmasi udah delivery — biar nggak mulai duluan sebelum motornya beneran diterima customer.</>
                ) : (
                  <>Reservasi untuk <strong>{form.renter_name}</strong> masuk ke Booking Confirmation dengan status Pending — juga langsung kelihatan di list Transaksi ini (ditandai ungu). Motor tetap kelihatan tersedia sampai booking-nya dikonfirmasi.</>
                )}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <Link href="/bookings" className="btn btn-primary" style={{ textDecoration: 'none' }}>
                  <i className="fa-solid fa-arrow-right" style={{ marginRight: '6px' }}></i> Buka Booking Confirmation
                </Link>
                <button className="btn btn-secondary" onClick={onClose}>Tutup</button>
              </div>
            </div>
          </div>
        )}

        {bookingError && (
          <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={() => setBookingError('')}>
            <div className="modal modal-sm" onClick={e => e.stopPropagation()} style={{ maxWidth: '380px' }}>
              <div className="modal-header">
                <div className="modal-title">Gagal Menyimpan Booking</div>
                <button className="modal-close" onClick={() => setBookingError('')}>✕</button>
              </div>
              <div className="alert alert-danger" style={{ margin: 0 }}>{bookingError}</div>
              <div className="modal-footer" style={{ marginTop: '16px' }}>
                <button className="btn btn-secondary" onClick={() => setBookingError('')}>Tutup</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


// ===== MODAL KIRIM INVOICE WHATSAPP =====
function WhatsAppInvoiceModal({ isOpen, onClose, tx, vehicle }) {
  const [customMsg, setCustomMsg] = useState('');
  const [copied, setCopied] = useState(false);
  const [contract, setContract] = useState(null);
  const [loadingContract, setLoadingContract] = useState(false);
  const [sharingPdf, setSharingPdf] = useState(false);

  const paymentMeta = getPaymentMethodMeta(tx?.payment_method);

  // Generate pesan invoice + cari kontrak terhubung saat modal dibuka —
  // pola resmi React "adjust state during render".
  const [prevInvoiceKey, setPrevInvoiceKey] = useState(null);
  const invoiceKey = isOpen && tx ? tx.id : null;
  if (invoiceKey !== prevInvoiceKey) {
    setPrevInvoiceKey(invoiceKey);
    if (invoiceKey) {
      setCustomMsg(generateInvoiceText(tx, vehicle, paymentMeta));
      setContract(null);
      setLoadingContract(true);
      const supabase = createClient();
      // Kontrak bisa nyambung lewat transaction_id (dibuat setelah
      // transaksi ada) ATAU booking_id (dibuat driver sebelum admin bikin
      // transaksinya) — cek dua-duanya.
      const orFilter = tx.booking_id
        ? `transaction_id.eq.${tx.id},booking_id.eq.${tx.booking_id}`
        : `transaction_id.eq.${tx.id}`;
      supabase.from('contracts').select('id').or(orFilter).maybeSingle()
        .then(({ data }) => {
          setContract(data);
          setLoadingContract(false);
        });
    }
  }

  if (!isOpen || !tx) return null;

  const waUrl = getWhatsAppShareUrl(tx.renter_phone, customMsg);

  const handleCopy = () => {
    navigator.clipboard.writeText(customMsg);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSharePdf = async () => {
    if (!contract) return;
    setSharingPdf(true);
    await sharePdfToWhatsApp(
      `/api/contracts/${contract.id}/pdf`,
      `invoice-${tx.renter_name}.pdf`,
      tx.renter_phone,
      `Hi ${tx.renter_name}, here's your rental invoice — please hold on a moment, the PDF file will follow shortly 🙏`,
      'Rental Invoice',
      `Rental invoice for ${tx.renter_name} — Demo Rental Preview`
    );
    setSharingPdf(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fa-brands fa-whatsapp" style={{ color: '#25D366', fontSize: '20px' }}></i>
              Kirim Invoice ke Customer
            </div>
            <div className="modal-subtitle">
              Penyewa: <strong>{tx.renter_name}</strong> ({tx.renter_phone})
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="form-group">
          <label className="form-label">
            <i className="fa-solid fa-pen-to-square" style={{ marginRight: '6px' }}></i> Text Invoice (Dapat Diedit):
          </label>
          <textarea
            className="form-control"
            rows={10}
            value={customMsg}
            onChange={e => setCustomMsg(e.target.value)}
            style={{ fontFamily: 'monospace', fontSize: '12.5px', lineHeight: 1.5, resize: 'vertical' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <button className="btn btn-secondary" onClick={handleCopy} style={{ flex: 1 }}>
            <i className={`fa-solid ${copied ? 'fa-check' : 'fa-copy'}`} style={{ marginRight: '6px' }}></i>
            {copied ? 'Tercopy!' : 'Copy Text'}
          </button>
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-success"
            style={{ textDecoration: 'none', background: '#25D366', borderColor: '#25D366', color: '#fff', flex: 1, textAlign: 'center' }}
          >
            <i className="fa-brands fa-whatsapp" style={{ marginRight: '6px', fontSize: '16px' }}></i>
            Kirim Pesan Text
          </a>
        </div>

        <div style={{ borderTop: '1px solid var(--bg-border)', paddingTop: '16px' }}>
          <label className="form-label" style={{ marginBottom: '4px', display: 'block' }}>
            <i className="fa-solid fa-file-pdf" style={{ marginRight: '6px' }}></i> Invoice PDF (1 halaman, foto &amp; TTD kontrak)
          </label>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 0, marginBottom: '10px' }}>
            Chat WA customer akan kebuka duluan, lalu HP minta pilih aplikasi buat lampirin PDF-nya (pilih WhatsApp) — langkah ini normal, browser tidak bisa auto-attach file tanpa persetujuan.
          </p>
          {loadingContract ? (
            <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
              <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '6px' }}></i> Mengecek kontrak terhubung...
            </div>
          ) : contract ? (
            <button
              type="button"
              className="btn btn-primary"
              disabled={sharingPdf}
              onClick={handleSharePdf}
              style={{ width: '100%' }}
            >
              {sharingPdf ? (
                <><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '6px' }}></i> Menyiapkan PDF...</>
              ) : (
                <><i className="fa-brands fa-whatsapp" style={{ marginRight: '6px' }}></i> Kirim PDF Invoice ke Customer</>
              )}
            </button>
          ) : (
            <div style={{ fontSize: '12.5px', color: '#F59E0B', background: 'rgba(245,158,11,0.1)', padding: '10px 14px', borderRadius: '10px' }}>
              <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '6px' }}></i>
              Transaksi ini belum punya kontrak terhubung, jadi PDF-nya belum bisa dibuat (butuh foto &amp; TTD dari kontrak).
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ===== MODAL COMPLETE / FINISH TRANSACTION =====
function CompleteModal({ isOpen, onClose, onConfirm, tx }) {
  const [kmEnd, setKmEnd] = useState('');
  const [damageFee, setDamageFee] = useState('');
  const [issuesReported, setIssuesReported] = useState('');
  const [loading, setLoading] = useState(false);

  // Prefill form saat modal dibuka — pola resmi React
  // "adjust state during render" (menggantikan useEffect + setState sinkron)
  const [prevCompleteKey, setPrevCompleteKey] = useState(null);
  const completeKey = isOpen && tx ? tx.id : null;
  if (completeKey !== prevCompleteKey) {
    setPrevCompleteKey(completeKey);
    if (completeKey) {
      setKmEnd(tx.km_end || tx.km_start || '');
      setDamageFee(tx.damage_fee || '');
      setIssuesReported(tx.issues_reported || '');
    }
  }

  if (!isOpen || !tx) return null;

  const deposit = Number(tx.deposit) || 0;
  const dmgFee = Number(damageFee) || 0;
  const refundAmount = Math.max(0, deposit - dmgFee);
  const totalKmDriven = (Number(kmEnd) || 0) - (Number(tx.km_start) || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onConfirm(tx.id, {
      vehicle_id: tx.vehicle_id,
      km_end: Number(kmEnd) || tx.km_start || 0,
      damage_fee: dmgFee,
      issues_reported: issuesReported,
    });
    setLoading(false);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-md" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-title">
              <i className="fa-solid fa-flag-checkered" style={{ marginRight: '6px', color: '#22C55E' }}></i>
              Selesaikan Transaksi & Pengembalian Deposit
            </div>
            <div className="modal-subtitle">Customer: <strong>{tx.renter_name}</strong> | Motor: <strong>{tx.vehicles?.name} ({tx.vehicles?.plate_number})</strong></div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="comp-km">
              <i className="fa-solid fa-gauge-high" style={{ marginRight: '6px' }}></i> KM Akhir Odometer Kendaraan <span className="required">*</span>
            </label>
            <input
              id="comp-km"
              type="number"
              className="form-control"
              placeholder="e.g. 19200"
              value={kmEnd}
              onChange={e => setKmEnd(e.target.value)}
              min={tx.km_start || 0}
              required
            />
            {totalKmDriven > 0 && (
              <div style={{ fontSize: '11px', color: 'var(--brand-primary-light)', marginTop: '4px' }}>
                <i className="fa-solid fa-route" style={{ marginRight: '4px' }}></i>
                Total jarak tempuh selama sewa: <strong>+{totalKmDriven.toLocaleString('id-ID')} KM</strong>
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="comp-damage">
              <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '6px' }}></i> Denda Kerusakan / Keterlambatan (Rp)
            </label>
            <input
              id="comp-damage"
              type="number"
              className="form-control"
              placeholder="0 (Potong dari deposit)"
              value={damageFee}
              onChange={e => setDamageFee(e.target.value)}
              min="0"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="comp-issues">
              <i className="fa-solid fa-robot" style={{ marginRight: '6px' }}></i> Keluhan / Kendala Kendaraan (Untuk AI Diagnostic)
            </label>
            <textarea
              id="comp-issues"
              className="form-control"
              rows={2}
              placeholder="e.g. Rem agak blong, bodi kanan lecet, oli mesin minta ganti..."
              value={issuesReported}
              onChange={e => setIssuesReported(e.target.value)}
              style={{ resize: 'vertical' }}
            />
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              *Catatan keluhan akan otomatis dianalisis oleh engine <strong>AI Maintenance & Diagnostic</strong>.
            </div>
          </div>

          <div className="alert alert-info" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Deposit Jaminan Awal:</span>
              <strong>{formatRupiah(deposit)}</strong>
            </div>
            {dmgFee > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#EF4444' }}>
                <span>Dipotong Denda / Kerusakan:</span>
                <strong>-{formatRupiah(dmgFee)}</strong>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '6px', fontSize: '15px', fontWeight: 800, color: '#22C55E' }}>
              <span>Deposit Yang Dikembalikan Ke Customer:</span>
              <span>{formatRupiah(refundAmount)}</span>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Batal</button>
            <button type="submit" className="btn btn-success" disabled={loading}>
              {loading ? (
                <><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '4px' }}></i> Menyimpan...</>
              ) : (
                <><i className="fa-solid fa-check" style={{ marginRight: '4px' }}></i> Selesaikan Transaksi</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ===== MODAL KONFIRMASI TANDAI LUNAS =====
function ConfirmLunasModal({ isOpen, onClose, onConfirm, tx }) {
  if (!isOpen || !tx) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-sm" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px' }}>
        <div className="modal-header" style={{ borderBottom: '1px solid var(--bg-border)', paddingBottom: '16px' }}>
          <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '16px', fontWeight: 800 }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(34,197,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className="fa-solid fa-money-bill-wave" style={{ color: '#22C55E', fontSize: '16px' }}></i>
            </div>
            Konfirmasi Pembayaran Lunas
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div style={{ padding: '20px 0 4px' }}>
          {/* Info penyewa */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: 'var(--bg-elevated)', borderRadius: '10px', border: '1px solid var(--bg-border)', marginBottom: '16px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bg-card-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className="fa-solid fa-user" style={{ color: 'var(--brand-primary)', fontSize: '16px' }}></i>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>{tx.renter_name}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                <i className="fa-solid fa-motorcycle" style={{ marginRight: '5px', fontSize: '11px' }}></i>
                {tx.vehicles?.name || '-'} · {tx.vehicles?.plate_number || '-'}
              </div>
            </div>
          </div>

          {/* Pesan konfirmasi */}
          <div style={{ padding: '12px 14px', background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: '8px', marginBottom: '8px' }}>
            <p style={{ fontSize: '13.5px', color: 'var(--text-primary)', margin: 0, lineHeight: 1.6 }}>
              Tandai transaksi ini sebagai <strong style={{ color: '#22C55E' }}>LUNAS</strong>? Pembayaran akan langsung masuk ke laporan pendapatan.
            </p>
          </div>

          <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', margin: '8px 0 0', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <i className="fa-solid fa-circle-info" style={{ fontSize: '11px' }}></i>
            Tindakan ini tidak dapat dibatalkan secara otomatis.
          </p>
        </div>

        <div className="modal-footer" style={{ marginTop: '20px' }}>
          <button className="btn btn-secondary" onClick={onClose}>Batal</button>
          <button
            className="btn btn-success"
            onClick={() => { onConfirm(tx); onClose(); }}
            style={{ background: '#22C55E', borderColor: '#22C55E', color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <i className="fa-solid fa-circle-check"></i> Ya, Tandai Lunas
          </button>
        </div>
      </div>
    </div>
  );
}


// ===== TOAST NOTIFIKASI SUKSES LUNAS =====
function LunasSuccessToast({ isOpen, onClose, renterName }) {
  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(onClose, 3500);
      return () => clearTimeout(t);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', bottom: '28px', right: '28px', zIndex: 9999,
      display: 'flex', alignItems: 'center', gap: '14px',
      padding: '14px 20px',
      background: 'linear-gradient(135deg, #064e3b, #065f46)',
      border: '1px solid rgba(34,197,94,0.45)',
      borderRadius: '14px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.35), 0 0 0 1px rgba(34,197,94,0.15)',
      minWidth: '300px', maxWidth: '380px',
      animation: 'toastSlideIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
    }}>
      <style>{`
        @keyframes toastSlideIn {
          from { opacity: 0; transform: translateX(60px) scale(0.9); }
          to   { opacity: 1; transform: translateX(0) scale(1); }
        }
      `}</style>

      {/* Icon */}
      <div style={{
        width: '42px', height: '42px', borderRadius: '50%',
        background: 'rgba(34,197,94,0.2)', border: '2px solid rgba(34,197,94,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <i className="fa-solid fa-circle-check" style={{ color: '#4ade80', fontSize: '20px' }}></i>
      </div>

      {/* Text */}
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 800, fontSize: '14px', color: '#f0fdf4', letterSpacing: '-0.2px' }}>
          Pembayaran Dikonfirmasi! 🎉
        </div>
        <div style={{ fontSize: '12px', color: '#86efac', marginTop: '2px' }}>
          Transaksi <strong style={{ color: '#f0fdf4' }}>{renterName}</strong> sudah lunas & masuk ke laporan pendapatan.
        </div>
      </div>

      {/* Close */}
      <button
        onClick={onClose}
        style={{ background: 'none', border: 'none', color: '#86efac', cursor: 'pointer', fontSize: '16px', padding: '4px', lineHeight: 1, flexShrink: 0 }}
      >
        <i className="fa-solid fa-xmark"></i>
      </button>
    </div>
  );
}



// ===== TOAST NOTIFIKASI SUKSES SIMPAN TRANSAKSI =====
function SaveSuccessToast({ isOpen, onClose, isEdit, renterName }) {
  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(onClose, 3500);
      return () => clearTimeout(t);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', bottom: '28px', right: '28px', zIndex: 9999,
      display: 'flex', alignItems: 'center', gap: '14px',
      padding: '14px 20px',
      background: 'linear-gradient(135deg, #1e1b4b, #312e81)',
      border: '1px solid rgba(99,102,241,0.45)',
      borderRadius: '14px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.35), 0 0 0 1px rgba(99,102,241,0.15)',
      minWidth: '300px', maxWidth: '380px',
      animation: 'toastSlideIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
    }}>
      <div style={{
        width: '42px', height: '42px', borderRadius: '50%',
        background: 'rgba(99,102,241,0.2)', border: '2px solid rgba(99,102,241,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <i className="fa-solid fa-floppy-disk" style={{ color: '#a5b4fc', fontSize: '18px' }}></i>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 800, fontSize: '14px', color: '#eef2ff', letterSpacing: '-0.2px' }}>
          {isEdit ? 'Transaksi Diperbarui! ✏️' : 'Transaksi Tersimpan! 🎉'}
        </div>
        <div style={{ fontSize: '12px', color: '#a5b4fc', marginTop: '2px' }}>
          Data <strong style={{ color: '#eef2ff' }}>{renterName}</strong> berhasil {isEdit ? 'diperbarui' : 'ditambahkan'} ke sistem.
        </div>
      </div>
      <button
        onClick={onClose}
        style={{ background: 'none', border: 'none', color: '#a5b4fc', cursor: 'pointer', fontSize: '16px', padding: '4px', lineHeight: 1, flexShrink: 0 }}
      >
        <i className="fa-solid fa-xmark"></i>
      </button>
    </div>
  );
}

// ===== TOAST NOTIFIKASI ERROR =====
function ErrorToast({ isOpen, onClose, message }) {
  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(onClose, 4000);
      return () => clearTimeout(t);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', bottom: '28px', right: '28px', zIndex: 9999,
      display: 'flex', alignItems: 'center', gap: '14px',
      padding: '14px 20px',
      background: 'linear-gradient(135deg, #450a0a, #7f1d1d)',
      border: '1px solid rgba(239,68,68,0.45)',
      borderRadius: '14px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.35), 0 0 0 1px rgba(239,68,68,0.15)',
      minWidth: '300px', maxWidth: '400px',
      animation: 'toastSlideIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
    }}>
      <div style={{
        width: '42px', height: '42px', borderRadius: '50%',
        background: 'rgba(239,68,68,0.2)', border: '2px solid rgba(239,68,68,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <i className="fa-solid fa-circle-exclamation" style={{ color: '#fca5a5', fontSize: '20px' }}></i>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 800, fontSize: '14px', color: '#fee2e2', letterSpacing: '-0.2px' }}>
          Gagal Menyimpan ⚠️
        </div>
        <div style={{ fontSize: '12px', color: '#fca5a5', marginTop: '2px' }}>
          {message}
        </div>
      </div>
      <button
        onClick={onClose}
        style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', fontSize: '16px', padding: '4px', lineHeight: 1, flexShrink: 0 }}
      >
        <i className="fa-solid fa-xmark"></i>
      </button>
    </div>
  );
}



function SuccessModal({ isOpen, onClose, message }) {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-sm" onClick={e => e.stopPropagation()} style={{ textAlign: 'center', padding: '32px 24px' }}>
        <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(34, 197, 94, 0.2)', color: '#22C55E', fontSize: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <i className="fa-solid fa-circle-check"></i>
        </div>
        <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)' }}>Transaksi Selesai!</h3>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>{message}</p>
        <button className="btn btn-primary btn-block" onClick={onClose}>
          Selesai / Tutup
        </button>
      </div>
    </div>
  );
}

function ConfirmDeleteModal({ isOpen, onClose, onConfirm }) {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title"><i className="fa-solid fa-trash-can" style={{ marginRight: '6px' }}></i> Hapus Transaksi?</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          Transaksi akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.
        </p>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Batal</button>
          <button className="btn btn-danger" onClick={() => { onConfirm(); onClose(); }}>Hapus Permanen</button>
        </div>
      </div>
    </div>
  );
}

// ===== MAIN TRANSACTIONS PAGE =====
function TransactionsPageInner() {
  const role = useRole();
  const searchParams = useSearchParams();
  const [transactions, setTransactions] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [sourceBookingId, setSourceBookingId] = useState(null);
  const [completeModal, setCompleteModal] = useState({ open: false, tx: null });
  const [waModal, setWaModal] = useState({ open: false, tx: null });
  const [deleteModal, setDeleteModal] = useState({ open: false, txId: null });
  const [successModal, setSuccessModal] = useState({ open: false, message: '' });
  const [lunasModal, setLunasModal] = useState({ open: false, tx: null });
  const [lunasToast, setLunasToast] = useState({ open: false, renterName: '' });
  const [saveToast, setSaveToast] = useState({ open: false, isEdit: false, renterName: '' });
  const [errorToast, setErrorToast] = useState({ open: false, message: '' });
  const [contractedIds, setContractedIds] = useState(new Set());
  const [bookingDriverMap, setBookingDriverMap] = useState({});
  const [pendingBookingRows, setPendingBookingRows] = useState([]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    let txList = null;
    let vList = null;

    // Jalur utama: API route. Jika gagal (401/500/network) → fallback LANGSUNG
    // ke Supabase (sama seperti halaman Ketersediaan/Tracking) supaya data
    // transaksi & motor TIDAK pernah tampak "hilang".
    try {
      const [txRes, vRes] = await Promise.all([
        fetch('/api/transactions'),
        fetch('/api/vehicles'),
      ]);
      const txData = txRes.ok ? await txRes.json() : null;
      const vData = vRes.ok ? await vRes.json() : null;
      if (Array.isArray(txData)) txList = txData;
      if (Array.isArray(vData)) vList = vData;
      if (txList === null || vList === null) {
        console.warn('API /api/transactions|/api/vehicles gagal — fallback ke Supabase langsung.');
      }
    } catch (err) {
      console.error('Fetch via API error:', err);
    }

    if (txList === null || vList === null) {
      try {
        const supabase = createClient();
        if (txList === null) {
          let txQ = await supabase
            .from('transactions')
            .select('*, vehicles(id, name, plate_number, rate_per_day)')
            .order('created_at', { ascending: false });
          if (txQ.error) {
            // Relasi/kolom bermasalah → ambil polos lalu gabung manual
            const txPlain = await supabase.from('transactions').select('*').order('created_at', { ascending: false });
            const vehAll = await supabase.from('vehicles').select('*');
            const vehMap = (vehAll.data || []).reduce((m, v) => { m[v.id] = v; return m; }, {});
            txList = (txPlain.data || []).map(t => ({ ...t, vehicles: vehMap[t.vehicle_id] || null }));
          } else {
            txList = txQ.data || [];
          }
        }
        if (vList === null) {
          const vQ = await supabase.from('vehicles').select('*').order('created_at', { ascending: false });
          vList = vQ.error ? [] : (vQ.data || []);
        }
      } catch (err) {
        console.error('Fetch via Supabase error:', err);
        if (txList === null) txList = [];
        if (vList === null) vList = [];
      }
    }

    setTransactions(txList);
    setVehicles(vList);

    // Cek transaksi mana yang udah punya kontrak terhubung (via
    // transaction_id ATAU booking_id-nya) — biar tombol "Buat Kontrak"
    // nggak nampilin CTA yang sama walau kontraknya udah ada.
    try {
      const cRes = await fetch('/api/contracts');
      const cData = cRes.ok ? await cRes.json() : [];
      if (Array.isArray(cData)) {
        const ids = new Set();
        cData.forEach(c => {
          if (c.transaction_id) ids.add(c.transaction_id);
          if (c.booking_id) ids.add(c.booking_id);
        });
        setContractedIds(ids);
      }
    } catch { /* ignore */ }

    // Info driver yang nganter (kalau transaksi ini berasal dari booking
    // delivery yang sudah di-assign ke driver tertentu). Sekalian identifikasi
    // booking pending/confirmed yang BELUM punya transaksi — ini juga
    // ditampilkan di list Transaksi (status "Booking"), biar tamu walk-in
    // yang dicatat sebagai reservasi tetap kelihatan di sini, nggak cuma di
    // Booking Confirmation aja.
    try {
      const bRes = await fetch('/api/bookings');
      const bData = bRes.ok ? await bRes.json() : [];
      if (Array.isArray(bData)) {
        const map = {};
        bData.forEach(b => { if (b.assigned_driver_name) map[b.id] = b.assigned_driver_name; });
        setBookingDriverMap(map);

        const txBookingIds = new Set((txList || []).map(t => t.booking_id).filter(Boolean));
        const pending = bData.filter(b => ['pending', 'confirmed'].includes(b.status) && !txBookingIds.has(b.id));
        setPendingBookingRows(pending);
      }
    } catch { /* ignore */ }

    setLoading(false);
  }, []);

  useEffect(() => { Promise.resolve().then(fetchAll); }, [fetchAll]);

  useEffect(() => {
    const bookingId = searchParams.get('bookingId');
    if (!bookingId) return;
    Promise.resolve().then(async () => {
      try {
        const supabase = createClient();
        const { data: booking } = await supabase.from('bookings').select('*').eq('id', bookingId).maybeSingle();
        if (!booking) return;
        setSourceBookingId(bookingId);
        setEditData({
          vehicle_id: booking.vehicle_id || '',
          renter_name: booking.customer_name || '',
          renter_phone: booking.customer_phone || '',
          renter_address: booking.customer_address || '',
          start_date: booking.start_date || '',
          end_date: booking.end_date || '',
          payment_method: booking.payment_method || 'cash',
        });
        setShowModal(true);
      } catch { /* ignore, admin can still fill the form manually */ }
    });
  }, [searchParams]);

const handleSubmit = async (formData) => {
    const isEdit = !!editData?.id;
    const url = isEdit ? `/api/transactions/${editData.id}` : '/api/transactions';
    const method = isEdit ? 'PUT' : 'POST';

    // Kalau transaksi ini dibuat dari booking (prefill), tautkan & tandai
    // booking-nya selesai supaya tidak dibuatkan transaksi dobel.
    if (!isEdit && sourceBookingId) {
      formData = { ...formData, booking_id: sourceBookingId };
    }

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });

    if (res.ok) {
      // Auto-upsert ke Customer Master Database
      try {
        await upsertCustomer(createClient(), {
          name: formData.renter_name,
          phone: formData.renter_phone,
          id_number: formData.renter_id_number,
          address: formData.renter_address,
          customer_image_url: formData.customer_image_url,
        });
      } catch { /* ignore */ }

      if (!isEdit && sourceBookingId) {
        setSourceBookingId(null);
      }

      setShowModal(false);
      setEditData(null);
      fetchAll();
      setSaveToast({ open: true, isEdit, renterName: formData.renter_name });
    } else {
      const err = await res.json();
      setErrorToast({ open: true, message: err.error || 'Terjadi kesalahan, coba lagi.' });
    }
  };

  const handleComplete = async (txId, completeData) => {
    const { vehicle_id, km_end, damage_fee, issues_reported } = completeData;

    // 1. Update Transaction status to 'completed'
    const txRes = await fetch(`/api/transactions/${txId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'completed',
        km_end,
        damage_fee,
        issues_reported,
      }),
    });

    // 2. Update Vehicle odometer & set status back to 'available'
    if (vehicle_id && km_end > 0) {
      await fetch(`/api/vehicles/${vehicle_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_km: km_end,
          status: 'available',
        }),
      });
    }

    if (txRes.ok) {
      const tx = transactions.find(t => t.id === txId);
      const deposit = Number(tx?.deposit) || 0;
      const refund = Math.max(0, deposit - Number(damage_fee));
      setSuccessModal({
        open: true,
        message: `Transaksi telah diselesaikan! Odometer motor diperbarui ke ${km_end.toLocaleString('id-ID')} KM. Deposit sebesar ${formatRupiah(refund)} dikembalikan ke customer.`
      });
      fetchAll();
    } else {
      alert('Gagal menyelesaikan transaksi.');
    }
  };

  const handleDelete = async (id) => {
    const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
    if (res.ok) {
      fetchAll();
    } else {
      alert('Gagal menghapus transaksi.');
    }
  };

  const handleTandaiLunas = async (tx) => {
  await fetch(`/api/transactions/${tx.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ payment_status: 'paid' }),
  });
  setLunasToast({ open: true, renterName: tx.renter_name });
  fetchAll();
};

  const filtered = transactions.filter(tx => {
    const matchSearch =
      tx.renter_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.renter_phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.vehicles?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.vehicles?.plate_number?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && tx.status === 'active' && tx.payment_status === 'paid') ||
      (statusFilter === 'belum_bayar' && tx.status === 'active' && tx.payment_status === 'unpaid') ||
      (statusFilter === 'down_payment' && tx.status === 'active' && tx.payment_status === 'down_payment') ||
      (statusFilter !== 'active' && statusFilter !== 'belum_bayar' && statusFilter !== 'down_payment' && tx.status === statusFilter);
    return matchSearch && matchStatus;
  });

  // Booking pending/confirmed (belum jadi transaksi) tetap ditampilkan di
  // sini juga, biar walk-in yang dicatat lewat mode "Booking" nggak
  // "hilang" dari daftar utama — cuma muncul waktu filter status "Semua".
  const filteredBookingRows = statusFilter === 'all'
    ? pendingBookingRows.filter(b =>
        b.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.customer_phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.vehicle_name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <span><i className="fa-solid fa-file-invoice-dollar" style={{ marginRight: '8px' }}></i> Kelola Transaksi Sewa</span>
            {statusFilter !== 'all' && (
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#F59E0B', background: 'rgba(245,158,11,0.12)', padding: '3px 10px', borderRadius: 'var(--radius-full, 999px)', border: '1px solid rgba(245,158,11,0.4)' }}>
                <i className="fa-solid fa-filter" style={{ marginRight: '5px' }}></i>
                Filter aktif: {{ active: 'Sewa Aktif', down_payment: 'Down Payment', belum_bayar: 'Belum Bayar', completed: 'Selesai', cancelled: 'Dibatalkan' }[statusFilter] || statusFilter}
              </span>
            )}
          </h2>
          <p>Catat transaksi penyewaan motor, kirim invoice WhatsApp, dan kelola deposit jaminan</p>
        </div>
      </div>

      <div className="page-actions">
        <div className="filter-bar">
          <div className="search-bar">
            <span className="search-bar-icon"><i className="fa-solid fa-magnifying-glass"></i></span>
            <input
              type="text"
              className="form-control"
              placeholder="Cari penyewa, no HP, atau nama/plat motor..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <select
            className="form-control filter-select"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="all">Semua Status</option>
            <option value="active">Sewa Aktif</option>
            <option value="down_payment">Down Payment</option>
            <option value="belum_bayar">Belum Bayar</option>
            <option value="completed">Selesai</option>
            <option value="cancelled">Dibatalkan</option>
          </select>
        </div>
        <button
          id="btn-add-transaction"
          className="btn btn-primary"
          onClick={() => { setEditData(null); setShowModal(true); }}
        >
          <i className="fa-solid fa-plus" style={{ marginRight: '6px' }}></i> Transaksi Baru
        </button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrapper">
          {loading ? (
            <div className="table-empty"><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '8px' }}></i> Memuat data...</div>
          ) : filtered.length === 0 ? (
            <div className="table-empty">
              <div className="table-empty-icon"><i className="fa-solid fa-file-invoice"></i></div>
              <p>Tidak ada transaksi ditemukan</p>
            </div>
          ) : (
            <table className="table table--stack-mobile">
              <thead>
                <tr>
                  <th>Kode</th>
                  <th>Customer</th>
                  <th>Motor</th>
                  <th>Mulai / Selesai</th>
                  <th>KM Odometer</th>
                  <th>Total</th>
                  <th>Diskon</th>
                  <th>Denda / Deposit</th>
                  <th>Status Motor</th>
                  <th>Status Pembayaran</th>
                  <th>Metode Pembayaran</th>
                  <th>ID Referensi</th>
                  <th>Kontrak</th>
                  <th>Driver</th>
                  <th>Zona Delivery</th>
                  <th>Ringkasan Pembayaran</th>
                  <th>Catatan</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookingRows.map((b, idx) => (
                  <tr key={`booking-${b.id}`} style={{ background: 'rgba(139,92,246,0.04)' }}>
                    <td data-label="Kode" style={{ fontWeight: 800, color: '#8B5CF6', fontSize: '13px', letterSpacing: '0.5px' }}>{b.booking_code || `B${idx + 1}`}</td>
                    <td data-label="Customer" data-label-align="left">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{b.customer_name}</strong>
                        <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                          <i className="fa-solid fa-phone" style={{ marginRight: '4px', fontSize: '10px' }}></i>{b.customer_phone}
                        </span>
                      </div>
                    </td>
                    <td data-label="Motor" data-label-align="left">
                      <strong style={{ fontSize: '13.5px', color: 'var(--text-primary)' }}>{b.vehicle_name || '-'}</strong>
                    </td>
                    <td data-label="Mulai / Selesai" data-label-align="left">
                      <div style={{ fontSize: '12px', color: 'var(--text-primary)' }}>
                        {new Date(b.start_date).toLocaleDateString('id-ID')} — {new Date(b.end_date).toLocaleDateString('id-ID')}
                      </div>
                    </td>
                    <td data-label="KM Odometer" style={{ color: 'var(--text-muted)', fontSize: '12px' }}>—</td>
                    <td data-label="Total">
                      <strong style={{ fontSize: '13px', color: '#8B5CF6' }}>{formatRupiah(b.estimated_price)}</strong>
                    </td>
                    <td data-label="Diskon" style={{ color: 'var(--text-muted)', fontSize: '12px' }}>—</td>
                    <td data-label="Denda / Deposit" style={{ color: 'var(--text-muted)', fontSize: '12px' }}>—</td>
                    <td data-label="Status Motor" style={{ verticalAlign: 'middle' }}>
                      <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#8B5CF6', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <i className="fa-solid fa-calendar-days" style={{ fontSize: '10px' }}></i>
                        Booking ({b.status === 'confirmed' ? 'Confirmed' : 'Pending'})
                      </span>
                    </td>
                    <td data-label="Status Pembayaran">
                      {b.payment_status === 'paid' && (
                        <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#22C55E', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          <i className="fa-solid fa-circle-check" style={{ fontSize: '10px' }}></i>Lunas
                        </span>
                      )}
                      {b.payment_status === 'down_payment' && (
                        <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#3B82F6', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          <i className="fa-solid fa-coins" style={{ fontSize: '10px' }}></i>DP {formatRupiah(b.dp_amount)}
                        </span>
                      )}
                      {(!b.payment_status || b.payment_status === 'unpaid') && (
                        <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#F59E0B', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          <i className="fa-solid fa-clock" style={{ fontSize: '10px' }}></i>Belum Bayar
                        </span>
                      )}
                    </td>
                    <td data-label="Metode Pembayaran">
                      <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <i className={getPaymentMethodMeta(b.payment_method).icon} style={{ fontSize: '10px' }}></i>
                        {getPaymentMethodMeta(b.payment_method).label}
                      </span>
                    </td>
                    <td data-label="ID Referensi" style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                      <div>Booking: {b.id.slice(0, 8)}</div>
                    </td>
                    <td data-label="Kontrak" style={{ color: 'var(--text-muted)', fontSize: '12px' }}>—</td>
                    <td data-label="Driver" data-label-align="left">
                      {b.assigned_driver_name ? (
                        <span style={{ fontSize: '11.5px', color: '#3B82F6', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          <i className="fa-solid fa-motorcycle"></i> {b.assigned_driver_name}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>—</span>
                      )}
                    </td>
                    <td data-label="Zona Delivery" data-label-align="left">
                      {b.delivery_zone_name ? (() => {
                        const zoneColor = b.delivery_zone_name.includes('Hijau') ? '#22C55E' : b.delivery_zone_name.includes('Biru') ? '#3B82F6' : b.delivery_zone_name.includes('Kuning') ? '#F59E0B' : '#94A3B8';
                        return (
                          <span style={{ fontSize: '11.5px', fontWeight: 700, color: zoneColor, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: zoneColor, flexShrink: 0 }}></span>
                            {b.delivery_zone_name}
                          </span>
                        );
                      })() : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>—</span>
                      )}
                    </td>
                    <td data-label="Ringkasan Pembayaran" data-label-align="left" style={{ color: 'var(--text-muted)', fontSize: '12px' }}>—</td>
                    <td data-label="Catatan" style={{ color: 'var(--text-muted)', fontSize: '12px' }}>—</td>
                    <td data-label="Aksi" data-label-align="left">
                      <Link href="/bookings" className="btn btn-sm" style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid #8B5CF6', color: '#8B5CF6', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <i className="fa-solid fa-arrow-right"></i> Kelola di Booking
                      </Link>
                    </td>
                  </tr>
                ))}
                {filtered.map((tx, idx) => (
                  <tr key={tx.id}>
                    <td data-label="Kode" style={{ fontWeight: 800, color: 'var(--brand-primary-light)', fontSize: '13px', letterSpacing: '0.5px' }}>{tx.transaction_code || `#${idx + 1}`}</td>
                    <td data-label="Customer" data-label-align="left">
                      <div className="tx-customer-cell">
                        <div style={{ display: 'flex', position: 'relative', flexShrink: 0 }}>
                          <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'var(--bg-card-hover)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--bg-border)' }}>
                            {tx.customer_image_url ? (
                              <img src={tx.customer_image_url} alt={tx.renter_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} title="Foto KTP/SIM Penyewa" />
                            ) : (
                              <i className="fa-solid fa-user" style={{ fontSize: '16px', color: 'var(--brand-primary)' }}></i>
                            )}
                          </div>
                          {tx.handover_image_url && (
                            <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#3B82F6', overflow: 'hidden', position: 'absolute', bottom: '-2px', right: '-4px', border: '2px solid #0F172A' }} title="Foto Serah Terima Motor">
                              <img src={tx.handover_image_url} alt="Serah Terima" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0, width: '100%' }}>
                          <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{tx.renter_name}</strong>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}><i className="fa-solid fa-phone" style={{ marginRight: '4px', fontSize: '10px' }}></i>{tx.renter_phone}</span>
                            {tx.payment_method && (
                              <span className="tx-info-pill" style={{ color: getPaymentMethodMeta(tx.payment_method).color, borderColor: `${getPaymentMethodMeta(tx.payment_method).color}40`, background: `${getPaymentMethodMeta(tx.payment_method).color}15` }}>
                                <i className={getPaymentMethodMeta(tx.payment_method).icon} style={{ fontSize: '10px' }}></i>
                                {getPaymentMethodMeta(tx.payment_method).label}
                              </span>
                            )}
                          </div>
                          {tx.renter_address && (
                            <div style={{ fontSize: '11px', color: 'var(--brand-primary-light)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }} title={tx.renter_address}>
                              <i className="fa-solid fa-location-dot" style={{ marginRight: '4px' }}></i>
                              {tx.renter_address}
                            </div>
                          )}
                          {tx.renter_id_number && (
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              <i className="fa-solid fa-id-card" style={{ marginRight: '4px' }}></i>
                              {tx.renter_id_number}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td data-label="Motor" data-label-align="left">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <strong style={{ fontSize: '13.5px', color: 'var(--text-primary)', lineHeight: 1.35 }}>
                          {tx.vehicles?.name || '-'}
                        </strong>
                        <div>
                          <span className="tx-info-pill" style={{ color: 'var(--brand-primary-light)', borderColor: 'rgba(37, 99, 235, 0.35)', background: 'rgba(37, 99, 235, 0.12)', padding: '4px 10px' }}>
                            <i className="fa-solid fa-motorcycle" style={{ fontSize: '11px', marginRight: '6px' }}></i>
                            {tx.vehicles?.plate_number || '-'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td data-label="Mulai / Selesai" data-label-align="left">
                      <div className="tx-date-cell">
                        <div style={{ fontSize: '12px', color: 'var(--text-primary)' }}>
                          <i className="fa-solid fa-calendar-plus" style={{ marginRight: '6px', fontSize: '11px', color: '#22C55E' }}></i>
                          {new Date(tx.start_date).toLocaleDateString('id-ID')}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-primary)' }}>
                          <i className="fa-solid fa-calendar-check" style={{ marginRight: '6px', fontSize: '11px', color: '#3B82F6' }}></i>
                          {new Date(tx.end_date).toLocaleDateString('id-ID')}
                        </div>
                        <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: 600 }}>
                          Durasi: {tx.duration_days} Hari
                        </div>
                      </div>
                    </td>
                    <td data-label="KM Odometer">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '12px' }}>
                        <div>Start: <strong>{tx.km_start ? `${tx.km_start} KM` : '-'}</strong></div>
                        <div>End: <strong>{tx.km_end ? `${tx.km_end} KM` : '-'}</strong></div>
                      </div>
                    </td>
                    <td data-label="Total">
                      <strong style={{ fontSize: '14px', color: '#22C55E' }}>{formatRupiah(tx.total_price)}</strong>
                    </td>
                    <td data-label="Diskon">
                      {tx.discount > 0 ? (
                        <span className="tx-info-pill" style={{ color: '#F59E0B', borderColor: 'rgba(245, 158, 11, 0.3)', background: 'rgba(245, 158, 11, 0.1)' }}>
                          -{formatRupiah(tx.discount)}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>—</span>
                      )}
                    </td>
                    <td data-label="Denda / Deposit">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '12px' }}>
                        <div>Dep: <strong>{formatRupiah(tx.deposit)}</strong></div>
                        {tx.damage_fee > 0 && (
                          <div>
                            <span className="tx-info-pill" style={{ color: '#EF4444', borderColor: 'rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.1)' }}>
                              Denda: +{formatRupiah(tx.damage_fee)}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td data-label="Status Motor" style={{ verticalAlign: 'middle' }}>
                      {(() => {
                        const map = { active: { icon: 'fa-solid fa-bolt', label: 'Sewa Aktif', color: '#3B82F6' }, completed: { icon: 'fa-solid fa-circle-check', label: 'Selesai', color: '#22C55E' }, cancelled: { icon: 'fa-solid fa-circle-xmark', label: 'Dibatalkan', color: '#EF4444' } };
                        const m = map[tx.status] || map.active;
                        return (
                          <span style={{ fontSize: '11.5px', fontWeight: 700, color: m.color, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                            <i className={m.icon} style={{ fontSize: '10px' }}></i>{m.label}
                          </span>
                        );
                      })()}
                    </td>
                    <td data-label="Status Pembayaran" style={{ verticalAlign: 'middle' }}>
                      {tx.payment_status === 'paid' && (
                        <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#22C55E', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          <i className="fa-solid fa-circle-check" style={{ fontSize: '10px' }}></i>Lunas
                        </span>
                      )}
                      {tx.payment_status === 'down_payment' && (
                        <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#3B82F6', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          <i className="fa-solid fa-coins" style={{ fontSize: '10px' }}></i>DP {formatRupiah(tx.dp_amount)}
                        </span>
                      )}
                      {tx.payment_status === 'unpaid' && (
                        <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#F59E0B', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          <i className="fa-solid fa-clock" style={{ fontSize: '10px' }}></i>Belum Bayar
                        </span>
                      )}
                    </td>
                    <td data-label="Metode Pembayaran" style={{ verticalAlign: 'middle' }}>
                      <span style={{ fontSize: '11.5px', color: getPaymentMethodMeta(tx.payment_method).color, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <i className={getPaymentMethodMeta(tx.payment_method).icon} style={{ fontSize: '10px' }}></i>
                        {getPaymentMethodMeta(tx.payment_method).label}
                      </span>
                    </td>
                    <td data-label="ID Referensi" style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontFamily: 'monospace', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <div>Transaksi: {tx.id.slice(0, 8)}</div>
                        {tx.booking_id && <div>Booking: {tx.booking_id.slice(0, 8)}</div>}
                      </div>
                    </td>
                    <td data-label="Kontrak" data-label-align="left" style={{ verticalAlign: 'middle' }}>
                      {(contractedIds.has(tx.id) || (tx.booking_id && contractedIds.has(tx.booking_id))) ? (
                        <span style={{ fontSize: '11.5px', color: '#8B5CF6', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          <i className="fa-solid fa-file-signature"></i> Sudah TTD
                        </span>
                      ) : (
                        <Link
                          href={`/contracts/new?transactionId=${tx.id}`}
                          style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '5px', textDecoration: 'underline' }}
                        >
                          <i className="fa-solid fa-file-pen"></i> Belum ada kontrak
                        </Link>
                      )}
                    </td>
                    <td data-label="Driver" data-label-align="left" style={{ verticalAlign: 'middle' }}>
                      {(tx.assigned_driver_name || (tx.booking_id && bookingDriverMap[tx.booking_id])) ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <span style={{ fontSize: '11.5px', color: '#3B82F6', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                            <i className="fa-solid fa-motorcycle"></i> {tx.assigned_driver_name || bookingDriverMap[tx.booking_id]}
                          </span>
                          {Number(tx.delivery_fee) > 0 && (
                            <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                              <i className="fa-solid fa-truck-fast" style={{ marginRight: '4px' }}></i>
                              Ongkos antar: {formatRupiah(tx.delivery_fee)}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>—</span>
                      )}
                    </td>
                    <td data-label="Zona Delivery" data-label-align="left" style={{ verticalAlign: 'middle' }}>
                      {tx.delivery_zone_name ? (() => {
                        const zoneColor = tx.delivery_zone_name.includes('Hijau') ? '#22C55E' : tx.delivery_zone_name.includes('Biru') ? '#3B82F6' : tx.delivery_zone_name.includes('Kuning') ? '#F59E0B' : '#94A3B8';
                        return (
                          <span style={{ fontSize: '11.5px', fontWeight: 700, color: zoneColor, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: zoneColor, flexShrink: 0 }}></span>
                            {tx.delivery_zone_name}
                          </span>
                        );
                      })() : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>—</span>
                      )}
                    </td>
                    <td data-label="Ringkasan Pembayaran" data-label-align="left" style={{ verticalAlign: 'middle' }}>
                      {tx.payment_status === 'down_payment' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            Total Sewa: <strong style={{ color: 'var(--text-primary)' }}>{formatRupiah(tx.total_price)}</strong>
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            Sudah DP: <strong style={{ color: '#3B82F6' }}>{formatRupiah(tx.dp_amount)}</strong>
                          </div>
                          <div style={{ fontSize: '13px', color: '#F59E0B', fontWeight: 800, marginTop: '2px' }}>
                            Total yang harus dibayar: {formatRupiah(Math.max(0, Number(tx.total_price || 0) - Number(tx.dp_amount || 0)))}
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>—</span>
                      )}
                    </td>
                    <td data-label="Catatan" data-label-align="left" style={{ verticalAlign: 'middle' }}>
                      {tx.notes ? (
                        <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)', overflowWrap: 'anywhere' }}>{tx.notes}</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>—</span>
                      )}
                    </td>
                    <td data-label="Aksi" data-label-align="left" style={{ verticalAlign: 'middle' }}>
                      <div className="tx-actions-cell">
                        {/* WhatsApp Invoice Button */}
                        <button
                          className="btn btn-success btn-sm"
                          title="Kirim Invoice WhatsApp"
                          style={{ background: '#25D366', borderColor: '#25D366', color: '#fff', padding: '7px 10px' }}
                          onClick={() => setWaModal({ open: true, tx })}
                        >
                          <i className="fa-brands fa-whatsapp"></i>
                        </button>

                        {/* Tandai Lunas button for unpaid/DP active transactions */}
                        {role === 'admin' && tx.status === 'active' && (tx.payment_status === 'unpaid' || tx.payment_status === 'down_payment') && (
                        <button
                        className="btn btn-sm"
                        title="Tandai Lunas — Masukkan ke Pendapatan"
                        style={{ padding: '7px 10px', background: 'rgba(34,197,94,0.15)', border: '1px solid #22C55E', color: '#22C55E', fontWeight: 700 }}
                        onClick={() => setLunasModal({ open: true, tx })}
                      >
                        <i className="fa-solid fa-money-bill-wave"></i>
                      </button>
                    )}

                        {role === 'admin' && tx.status === 'active' && (
                          <button
                            className="btn btn-success btn-sm"
                            title="Tandai Selesai & Penyesuaian Deposit"
                            style={{ padding: '7px 10px' }}
                            onClick={() => setCompleteModal({ open: true, tx })}
                          >
                            <i className="fa-solid fa-check"></i>
                          </button>
                        )}
                        {role === 'admin' && (
                          <>
                            <button
                              className="btn btn-secondary btn-sm"
                              title="Edit Transaksi"
                              style={{ padding: '7px 10px' }}
                              onClick={() => { setEditData(tx); setShowModal(true); }}
                            >
                              <i className="fa-solid fa-pen-to-square"></i>
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              title="Hapus Transaksi"
                              style={{ padding: '7px 10px' }}
                              onClick={() => setDeleteModal({ open: true, txId: tx.id })}
                            >
                              <i className="fa-solid fa-trash-can"></i>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>



      
      {/* Modals */}
      <TransactionModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditData(null); setSourceBookingId(null); }}
        onSubmit={handleSubmit}
        onBookingSaved={fetchAll}
        vehicles={vehicles}
        editData={editData}
      />

      <WhatsAppInvoiceModal
        isOpen={waModal.open}
        onClose={() => setWaModal({ open: false, tx: null })}
        tx={waModal.tx}
        vehicle={waModal.tx?.vehicles}
      />

      <CompleteModal
        isOpen={completeModal.open}
        onClose={() => setCompleteModal({ open: false, tx: null })}
        onConfirm={handleComplete}
        tx={completeModal.tx}
      />

      <SuccessModal
        isOpen={successModal.open}
        onClose={() => setSuccessModal({ open: false, message: '' })}
        message={successModal.message}
      />

      <ConfirmLunasModal
      isOpen={lunasModal.open}
      onClose={() => setLunasModal({ open: false, tx: null })}
      onConfirm={handleTandaiLunas}
      tx={lunasModal.tx}
    />
    
    <LunasSuccessToast
      isOpen={lunasToast.open}
      onClose={() => setLunasToast({ open: false, renterName: '' })}
      renterName={lunasToast.renterName}
    />

      <SaveSuccessToast
  isOpen={saveToast.open}
  onClose={() => setSaveToast({ open: false, isEdit: false, renterName: '' })}
  isEdit={saveToast.isEdit}
  renterName={saveToast.renterName}
/>

<ErrorToast
  isOpen={errorToast.open}
  onClose={() => setErrorToast({ open: false, message: '' })}
  message={errorToast.message}
/>

      <ConfirmDeleteModal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, txId: null })}
        onConfirm={() => handleDelete(deleteModal.txId)}
      />
    </div>
  );
}

export default function TransactionsPage() {
  return (
    <Suspense fallback={<div className="page-content" />}>
      <TransactionsPageInner />
    </Suspense>
  );
}
