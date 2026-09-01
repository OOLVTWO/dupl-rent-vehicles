'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRole } from '@/lib/RoleContext';
import { compressImage } from '@/lib/imageCompressor';
import { getPaymentMethods, getPaymentMethodMeta } from '@/lib/paymentMethods';
import { COUNTRY_CODES, getWhatsAppShareUrl, generateInvoiceText, getFlagImageUrl } from '@/lib/countryCodes';
import { createClient } from '@/lib/supabase/client';
import { fetchCustomers, upsertCustomer } from '@/lib/customers';
import { getLocalDateStr } from '@/lib/finance';


function formatRupiah(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount || 0);
}

const statusBadge = (status, paymentStatus) => {
  // If active but unpaid, show special badge
  if (status === 'active' && paymentStatus === 'unpaid') {
    return (
      <span className="tx-status-pill" style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B', borderColor: 'rgba(245,158,11,0.4)' }}>
        <i className="fa-solid fa-clock" style={{ fontSize: '11px' }}></i> Belum Bayar
      </span>
    );
  }
  const map = {
    active: (
      <span className="tx-status-pill active">
        <i className="fa-solid fa-bolt" style={{ fontSize: '11px' }}></i> Sewa Aktif
      </span>
    ),
    completed: (
      <span className="tx-status-pill completed">
        <i className="fa-solid fa-circle-check" style={{ fontSize: '11px' }}></i> Selesai
      </span>
    ),
    cancelled: (
      <span className="tx-status-pill cancelled">
        <i className="fa-solid fa-circle-xmark" style={{ fontSize: '11px' }}></i> Dibatalkan
      </span>
    ),
  };
  return map[status] || <span className="tx-status-pill">{status}</span>;
};

const BRANDS = [
  { key: 'honda',    label: 'Honda',          icon: 'fa-solid fa-motorcycle', color: '#EF4444' },
  { key: 'yamaha',   label: 'Yamaha',          icon: 'fa-solid fa-motorcycle', color: '#3B82F6' },
  { key: 'suzuki',   label: 'Suzuki',          icon: 'fa-solid fa-motorcycle', color: '#F59E0B' },
  { key: 'kawasaki', label: 'Kawasaki',        icon: 'fa-solid fa-motorcycle', color: '#22C55E' },
  { key: 'vespa',    label: 'Vespa / Piaggio', icon: 'fa-solid fa-person-biking', color: '#8B5CF6' },
  { key: 'other',    label: 'Merek Lain',      icon: 'fa-solid fa-circle-question', color: '#9898B0' },
];

// ===== BRAND-FIRST VEHICLE PICKER =====
function VehicleCombobox({ vehicles, value, onChange }) {
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [query, setQuery] = useState('');

  const selected = vehicles.find(v => v.id === value);

  // FIX: Motor tanpa category ditampilkan di bucket 'other' bukan default 'honda',
  // supaya tidak tersembunyi dan user tetap bisa memilihnya.
  const getVehicleCategory = (v) => (v.category && v.category.trim() !== '') ? v.category : 'other';

  // Adjust state saat render (pola resmi React) — menggantikan useEffect
  const [prevSelectedId, setPrevSelectedId] = useState(null);
  const selectedId = selected?.id ?? null;
  if (selectedId !== prevSelectedId) {
    setPrevSelectedId(selectedId);
    if (selected && !selectedBrand) {
      setSelectedBrand(getVehicleCategory(selected));
    }
  }

  const brandVehicles = selectedBrand
    ? vehicles.filter(v => getVehicleCategory(v) === selectedBrand)
    : [];

  const filteredVehicles = brandVehicles.filter(v => {
    const q = query.toLowerCase();
    return !q || v.name.toLowerCase().includes(q) || v.plate_number.toLowerCase().includes(q);
  });

  const brandMeta = (key) => BRANDS.find(b => b.key === key) || BRANDS[BRANDS.length - 1];

  const handleBrandSelect = (key) => {
    setSelectedBrand(key);
    setQuery('');
    if (value) {
      const currentVehicle = vehicles.find(v => v.id === value);
      // FIX: gunakan getVehicleCategory agar konsisten dengan filter di atas
      if (currentVehicle && getVehicleCategory(currentVehicle) !== key) {
        onChange('');
      }
    }
  };

  const handleVehicleSelect = (id) => {
    onChange(id);
    setQuery('');
  };

  return (
    <div className="form-group">
      <label className="form-label">
        <i className="fa-solid fa-motorcycle" style={{ marginRight: '6px' }}></i>
        Pilih Kendaraan Motor <span className="required">*</span>
      </label>

      {/* STEP 1: Brand Filter Buttons */}
      <div style={{ marginBottom: '10px' }}>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '6px' }}>
          Langkah 1 — Pilih Merek Motor
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {BRANDS.map(brand => {
            const count = vehicles.filter(v => getVehicleCategory(v) === brand.key).length;
            const isActive = selectedBrand === brand.key;
            return (
              <button
                key={brand.key}
                type="button"
                onClick={() => handleBrandSelect(brand.key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: isActive ? 700 : 500,
                  border: `1px solid ${isActive ? brand.color : 'var(--bg-border)'}`,
                  background: isActive ? `${brand.color}22` : 'var(--bg-elevated)',
                  color: isActive ? brand.color : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <i className={brand.icon} style={{ fontSize: '12px' }}></i>
                {brand.label}
                {count > 0 && (
                  <span style={{
                    background: isActive ? brand.color : 'var(--bg-hover)',
                    color: isActive ? '#fff' : 'var(--text-muted)',
                    borderRadius: '20px',
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '1px 6px',
                    minWidth: '18px',
                    textAlign: 'center'
                  }}>{count}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* STEP 2: Motor List under selected brand */}
      {selectedBrand && (
        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '8px' }}>
            <i className="fa-solid fa-list" style={{ marginRight: '4px' }}></i>
            Langkah 2 — Pilih Motor {brandMeta(selectedBrand).label}
            {' '}({brandVehicles.length} unit tersedia)
          </div>

          {brandVehicles.length > 3 && (
            <div style={{ position: 'relative', marginBottom: '8px' }}>
              <input
                type="text"
                className="form-control"
                placeholder="Cari nama atau plat nomor..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                style={{ paddingLeft: '36px', fontSize: '13px' }}
              />
              <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none', fontSize: '12px' }}></i>
            </div>
          )}

          {filteredVehicles.length === 0 ? (
            <div style={{
              padding: '20px',
              textAlign: 'center',
              background: 'var(--bg-elevated)',
              borderRadius: '10px',
              border: '1px dashed var(--bg-border)',
              fontSize: '13px',
              color: 'var(--text-muted)'
            }}>
              <i className="fa-solid fa-motorcycle" style={{ fontSize: '24px', display: 'block', marginBottom: '6px', opacity: 0.4 }}></i>
              {brandVehicles.length === 0
                ? `Belum ada motor ${brandMeta(selectedBrand).label} yang tersedia untuk disewa.`
                : 'Tidak ada motor yang cocok dengan pencarian.'}
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '8px',
              maxHeight: '220px',
              overflowY: 'auto',
              paddingRight: '4px'
            }}>
              {filteredVehicles.map(v => {
                const isSelected = value === v.id;
                return (
                  <div
                    key={v.id}
                    onClick={() => handleVehicleSelect(v.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: `1.5px solid ${isSelected ? 'var(--brand-primary)' : 'var(--bg-border)'}`,
                      background: isSelected ? 'rgba(37, 99, 235, 0.12)' : 'var(--bg-elevated)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '6px',
                      background: 'var(--bg-hover)', overflow: 'hidden', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      {v.image_url ? (
                        <img src={v.image_url} alt={v.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => e.target.style.display = 'none'} />
                      ) : (
                        <i className="fa-solid fa-motorcycle" style={{ fontSize: '16px', color: 'var(--brand-primary)' }}></i>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: isSelected ? 700 : 600, fontSize: '13px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {v.name}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        <span style={{ color: 'var(--brand-primary-light)', fontWeight: 600 }}>{v.plate_number}</span> • {formatRupiah(v.rate_per_day)}/hr
                      </div>
                    </div>
                    {isSelected && (
                      <i className="fa-solid fa-circle-check" style={{ color: 'var(--brand-primary)', fontSize: '16px', flexShrink: 0 }}></i>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Show currently selected motor badge if brand not picked yet */}
      {selected && !selectedBrand && (
        <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
          Terpilih: <strong>{selected.name} ({selected.plate_number})</strong>
        </div>
      )}
    </div>
  );
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
    <div style={{ position: 'relative', width: '160px', flexShrink: 0 }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="form-control"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '6px',
          fontWeight: 600,
          cursor: 'pointer',
          padding: '8px 12px',
          background: 'var(--bg-elevated)',
          borderColor: 'var(--bg-border)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img
            src={getFlagImageUrl(currentCountry.iso)}
            alt={currentCountry.country}
            style={{ width: '20px', height: '14px', borderRadius: '2px', objectFit: 'cover' }}
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <span>{currentCountry.code}</span>
        </div>
        <i className={`fa-solid fa-chevron-${isOpen ? 'up' : 'down'}`} style={{ fontSize: '11px', color: 'var(--text-muted)' }}></i>
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

// ===== SEARCHABLE REGISTERED CUSTOMER PICKER COMBOBOX =====
function CustomerPickerCombobox({ onSelectCustomer }) {
  const [customers, setCustomers] = useState([]);
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedCust, setSelectedCust] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const supabase = createClient();
        const data = await fetchCustomers(supabase);
        setCustomers(data || []);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    }
    load();
  }, []);

  const filtered = customers.filter(c => {
    const q = query.toLowerCase();
    return !q ||
      c.name.toLowerCase().includes(q) ||
      (c.phone && c.phone.toLowerCase().includes(q)) ||
      (c.id_number && c.id_number.toLowerCase().includes(q));
  });

  const handlePick = (cust) => {
    setSelectedCust(cust);
    onSelectCustomer(cust);
    setQuery('');
    setIsOpen(false);
  };

  return (
    <div style={{ marginBottom: '16px', background: 'rgba(37, 99, 235, 0.06)', border: '1px solid rgba(37, 99, 235, 0.25)', borderRadius: '12px', padding: '12px' }}>
      <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--brand-primary-light)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span><i className="fa-solid fa-users" style={{ marginRight: '6px' }}></i> Auto-Fill Customer Terdaftar</span>
        <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 500 }}>{customers.length} customer tersimpan</span>
      </div>

      <div style={{ position: 'relative' }}>
        <input
          type="text"
          className="form-control"
          placeholder="Cari nama, WA, atau KTP customer pernah menyewa untuk auto-fill..."
          value={query}
          onChange={e => { setQuery(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          style={{ fontSize: '13px', paddingLeft: '36px', background: 'var(--bg-elevated)' }}
        />
        <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '13px' }}></i>

        {isOpen && (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 998 }} onClick={() => setIsOpen(false)}></div>
            <div className="autofill-dropdown-list" style={{
              position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
              maxHeight: '220px', overflowY: 'auto', background: 'var(--bg-card)',
              border: '1.5px solid var(--brand-primary)', borderRadius: '10px',
              zIndex: 999, boxShadow: '0 12px 35px rgba(0,0,0,0.35)', padding: '6px'
            }}>
              {loading ? (
                <div style={{ padding: '12px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>Memuat data customer...</div>
              ) : filtered.length === 0 ? (
                <div style={{ padding: '12px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
                  Tidak ada customer cocok. Isi nama manual di bawah untuk customer baru.
                </div>
              ) : (
                filtered.map(c => (
                  <div
                    key={c.id}
                    onClick={() => handlePick(c)}
                    style={{
                      padding: '8px 12px', borderRadius: '8px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      marginBottom: '4px', background: 'var(--bg-elevated)', transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-hover)', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {c.customer_image_url ? (
                          <img src={c.customer_image_url} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <i className="fa-solid fa-user" style={{ fontSize: '14px', color: 'var(--brand-primary)' }}></i>
                        )}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {c.name}
                          {(c.total_rentals || 0) > 1 && (
                            <span style={{ fontSize: '9px', background: 'rgba(59, 130, 246, 0.2)', color: '#60A5FA', padding: '1px 6px', borderRadius: '10px', fontWeight: 700 }}>
                              <i className="fa-solid fa-crown" style={{ marginRight: '2px' }}></i> Loyal ({c.total_rentals}x)
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          WA: <span style={{ color: '#22C55E' }}>{c.phone}</span> {c.id_number ? `• KTP: ${c.id_number}` : ''}
                        </div>
                      </div>
                    </div>

                    <button type="button" className="btn btn-secondary btn-sm" style={{ fontSize: '11px', padding: '4px 10px' }}>
                      Pilih Auto-Fill
                    </button>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {selectedCust && (
        <div style={{ marginTop: '8px', fontSize: '12px', color: '#22C55E', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span><i className="fa-solid fa-circle-check" style={{ marginRight: '6px' }}></i> Terpilih: <strong>{selectedCust.name}</strong> ({selectedCust.phone})</span>
          <button type="button" onClick={() => setSelectedCust(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '11px', textDecoration: 'underline' }}>Reset</button>
        </div>
      )}
    </div>
  );
}

// ===== TRANSACTION MODAL =====
// ===== TRANSACTION MODAL =====
// Ganti seluruh function TransactionModal dari baris 9568 sampai 10170
// (dari "function TransactionModal" sampai "}" penutupnya, sebelum "// ===== MODAL KIRIM INVOICE WHATSAPP =====")

function TransactionModal({ isOpen, onClose, onSubmit, vehicles, editData }) {
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
    status: 'active',
    notes: '',
  });

  const [countryCode, setCountryCode] = useState('+62');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [totalPrice, setTotalPrice] = useState(0);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showOptional, setShowOptional] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

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

  const handleImageFile = async (e, fieldName = 'customer_image_url') => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const compressedDataUrl = await compressImage(file, { maxWidth: 1000, maxHeight: 1000, quality: 0.82 });
      setForm(prev => ({ ...prev, [fieldName]: compressedDataUrl }));
    } catch (err) {
      alert(err.message || 'Gagal memproses gambar.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanVehicleId = (form.vehicle_id || '').trim();
    if (!cleanVehicleId) {
      alert('Silakan pilih unit motor terlebih dahulu!');
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirmSave = async () => {
    const cleanVehicleId = (form.vehicle_id || '').trim();
    setShowConfirm(false);
    setLoading(true);
    await onSubmit({ ...form, vehicle_id: cleanVehicleId, total_price: totalPrice });
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

          {/* ── Nama & No. HP ── */}
          <div className="form-row cols-2">
            <div className="form-group">
              <label className="form-label" htmlFor="tx-name">
                <i className="fa-solid fa-user" style={{ marginRight: '6px' }}></i> Nama Penyewa <span className="required">*</span>
              </label>
              <input id="tx-name" name="renter_name" type="text" className="form-control" placeholder="Nama lengkap penyewa" value={form.renter_name} onChange={handleChange} required />
            </div>
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
          </div>

          {/* ── Tanggal Mulai, Selesai & KM Awal ── */}
          <div className="form-row cols-3">
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
          </div>

          {/* ── Alamat ── */}
          <div className="form-group">
            <label className="form-label" htmlFor="tx-address">
              <i className="fa-solid fa-location-dot" style={{ marginRight: '6px', color: 'var(--brand-primary)' }}></i> Alamat / Villa / Hotel
            </label>
            <input id="tx-address" name="renter_address" type="text" className="form-control" placeholder="e.g. Villa Bamboo, Jl. Pererenan" value={form.renter_address || ''} onChange={handleChange} />
          </div>

               {/* ── Status Pembayaran ── */}
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label">
              <i className="fa-solid fa-money-bill-wave" style={{ marginRight: '6px', color: '#22C55E' }}></i>
              Status Pembayaran <span className="required">*</span>
            </label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" onClick={() => setForm(prev => ({ ...prev, payment_status: 'paid' }))}
                style={{ flex: 1, padding: '12px 16px', borderRadius: '10px', border: `2px solid ${form.payment_status !== 'unpaid' ? '#22C55E' : 'var(--bg-border)'}`, background: form.payment_status !== 'unpaid' ? 'rgba(34,197,94,0.15)' : 'var(--bg-elevated)', color: form.payment_status !== 'unpaid' ? '#22C55E' : 'var(--text-secondary)', fontWeight: 700, fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <i className="fa-solid fa-circle-check"></i> Lunas / Paid
              </button>
              <button type="button" onClick={() => setForm(prev => ({ ...prev, payment_status: 'unpaid' }))}
                style={{ flex: 1, padding: '12px 16px', borderRadius: '10px', border: `2px solid ${form.payment_status === 'unpaid' ? '#F59E0B' : 'var(--bg-border)'}`, background: form.payment_status === 'unpaid' ? 'rgba(245,158,11,0.15)' : 'var(--bg-elevated)', color: form.payment_status === 'unpaid' ? '#F59E0B' : 'var(--text-secondary)', fontWeight: 700, fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <i className="fa-solid fa-clock"></i> Belum Bayar
              </button>
            </div>
            {form.payment_status === 'unpaid' && (
              <div style={{ marginTop: '8px', padding: '8px 12px', background: 'rgba(245,158,11,0.08)', borderRadius: '8px', border: '1px solid rgba(245,158,11,0.3)', fontSize: '12px', color: '#F59E0B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <i className="fa-solid fa-triangle-exclamation"></i>
                Motor tetap tidak tersedia. Pembayaran <strong>belum masuk</strong> ke laporan pendapatan.
              </div>
            )}
          </div>

          {/* ── Info harga otomatis (muncul setelah motor + tanggal dipilih) ── */}
          {totalPrice > 0 && (
            <div style={{ padding: '12px 16px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: '10px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <i className="fa-solid fa-calculator" style={{ color: '#22C55E' }}></i>
                Harga Terbaik Otomatis
                {form.discount > 0 && <span style={{ fontSize: '11px', color: '#F59E0B' }}>(sudah potong diskon)</span>}
              </div>
              <strong style={{ fontSize: '20px', color: '#22C55E', letterSpacing: '-0.5px' }}>
                {formatRupiah(totalPrice)}
              </strong>
            </div>
          )}

          {/* ── Diskon | Deposit | Metode Bayar ── */}
          <div className="form-row cols-3">
            <div className="form-group">
              <label className="form-label" htmlFor="tx-discount">
                <i className="fa-solid fa-tags" style={{ marginRight: '6px' }}></i> Diskon (Rp)
              </label>
              <input id="tx-discount" name="discount" type="number" className="form-control" placeholder="0" value={form.discount} onChange={handleChange} min="0" style={{ MozAppearance: 'textfield' }} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="tx-deposit">
                <i className="fa-solid fa-vault" style={{ marginRight: '6px' }}></i> Deposit (Rp)
              </label>
              <input id="tx-deposit" name="deposit" type="number" className="form-control" placeholder="0" value={form.deposit} onChange={handleChange} min="0" style={{ MozAppearance: 'textfield' }} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="tx-payment">
                <i className="fa-solid fa-credit-card" style={{ marginRight: '6px' }}></i> Metode Bayar
              </label>
              <select id="tx-payment" name="payment_method" className="form-control" value={form.payment_method} onChange={handleChange}>
                {getPaymentMethods().filter(m => m.active).map(m => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>
          
     
          {/* ── Catatan ── */}
          <div className="form-group">
            <label className="form-label" htmlFor="tx-notes">
              <i className="fa-regular fa-note-sticky" style={{ marginRight: '6px' }}></i> Catatan Tambahan
            </label>
            <textarea id="tx-notes" name="notes" className="form-control" rows={2} placeholder="Catatan khusus, permintaan khusus, dll..." value={form.notes} onChange={handleChange} style={{ resize: 'vertical' }} />
          </div>

          {/* ── Toggle Data Opsional ── */}
          <button
            type="button"
            onClick={() => setShowOptional(prev => !prev)}
            style={{ width: '100%', padding: '10px', background: 'var(--bg-elevated)', border: '1px dashed var(--bg-border)', borderRadius: '10px', color: 'var(--text-muted)', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}
          >
            <i className={`fa-solid fa-chevron-${showOptional ? 'up' : 'down'}`} style={{ fontSize: '11px' }}></i>
            {showOptional ? 'Sembunyikan Data Opsional' : 'Data Opsional: No. KTP & Foto Dokumentasi'}
          </button>

          {/* ── Data Opsional (collapsed) ── */}
          {showOptional && (
            <div style={{ padding: '16px', background: 'var(--bg-elevated)', borderRadius: '10px', border: '1px solid var(--bg-border)', marginBottom: '12px' }}>

              {/* No. KTP */}
              <div className="form-group">
                <label className="form-label" htmlFor="tx-id-num">
                  <i className="fa-solid fa-id-card" style={{ marginRight: '6px' }}></i> No. KTP / Paspor / SIM
                </label>
                <input id="tx-id-num" name="renter_id_number" type="text" className="form-control" placeholder="Nomor identitas" value={form.renter_id_number} onChange={handleChange} />
              </div>

              {/* Dual Photo Upload */}
              <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--brand-primary-light)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-camera-retro"></i> Upload Dokumentasi Foto (Opsional)
              </div>
              <div className="form-row cols-2" style={{ gap: '14px' }}>
                {/* Foto KTP */}
                <div className="form-group mb-0">
                  <label className="form-label" style={{ fontSize: '12px' }}>
                    <i className="fa-solid fa-id-card" style={{ marginRight: '6px', color: 'var(--brand-primary)' }}></i> Foto KTP / Paspor / SIM
                  </label>
                  {form.customer_image_url ? (
                    <div style={{ position: 'relative', width: '100%', height: '120px', borderRadius: '10px', overflow: 'hidden', border: '2px solid #22C55E' }}>
                      <img src={form.customer_image_url} alt="KTP" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button type="button" onClick={() => setForm(p => ({ ...p, customer_image_url: '' }))}
                        style={{ position: 'absolute', top: '6px', right: '6px', background: 'rgba(239,68,68,0.9)', color: '#FFF', border: 'none', borderRadius: '50%', width: '26px', height: '26px', cursor: 'pointer', fontWeight: 800, fontSize: '12px' }}>✕</button>
                      <span style={{ position: 'absolute', bottom: '6px', left: '6px', background: 'rgba(15,23,42,0.9)', color: '#22C55E', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 800 }}>✓ Foto Dimuat</span>
                    </div>
                  ) : (
                    <div>
                      <input type="file" accept="image/*" id="tx-id-photo-input" onChange={(e) => handleImageFile(e, 'customer_image_url')} style={{ display: 'none' }} />
                      <label htmlFor="tx-id-photo-input" className="custom-file-btn"
                        style={{ height: '100px', flexDirection: 'column', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed var(--brand-primary)', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', cursor: 'pointer', padding: '12px', textAlign: 'center' }}>
                        <i className="fa-solid fa-cloud-arrow-up" style={{ fontSize: '22px', color: 'var(--brand-primary)' }}></i>
                        <span style={{ fontSize: '11px', fontWeight: 700, marginTop: '6px' }}>Upload Foto KTP / Paspor</span>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Klik / Ambil dari Kamera</span>
                      </label>
                    </div>
                  )}
                </div>

                {/* Foto Handover */}
                <div className="form-group mb-0">
                  <label className="form-label" style={{ fontSize: '12px' }}>
                    <i className="fa-solid fa-motorcycle" style={{ marginRight: '6px', color: '#3B82F6' }}></i> Foto Orang + Motor (Handover)
                  </label>
                  {form.handover_image_url ? (
                    <div style={{ position: 'relative', width: '100%', height: '120px', borderRadius: '10px', overflow: 'hidden', border: '2px solid #3B82F6' }}>
                      <img src={form.handover_image_url} alt="Handover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button type="button" onClick={() => setForm(p => ({ ...p, handover_image_url: '' }))}
                        style={{ position: 'absolute', top: '6px', right: '6px', background: 'rgba(239,68,68,0.9)', color: '#FFF', border: 'none', borderRadius: '50%', width: '26px', height: '26px', cursor: 'pointer', fontWeight: 800, fontSize: '12px' }}>✕</button>
                      <span style={{ position: 'absolute', bottom: '6px', left: '6px', background: 'rgba(15,23,42,0.9)', color: '#3B82F6', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 800 }}>✓ Foto Dimuat</span>
                    </div>
                  ) : (
                    <div>
                      <input type="file" accept="image/*" id="tx-handover-photo-input" onChange={(e) => handleImageFile(e, 'handover_image_url')} style={{ display: 'none' }} />
                      <label htmlFor="tx-handover-photo-input" className="custom-file-btn"
                        style={{ height: '100px', flexDirection: 'column', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed #3B82F6', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', cursor: 'pointer', padding: '12px', textAlign: 'center' }}>
                        <i className="fa-solid fa-camera" style={{ fontSize: '22px', color: '#3B82F6' }}></i>
                        <span style={{ fontSize: '11px', fontWeight: 700, marginTop: '6px' }}>Foto Serah Terima</span>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Dokumentasi Orang + Motor</span>
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {uploading && (
                <div style={{ fontSize: '11px', color: 'var(--brand-primary-light)', marginTop: '8px', textAlign: 'center' }}>
                  <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '4px' }}></i> Mengompresi gambar...
                </div>
              )}
            </div>
          )}

          {/* ── Footer ── */}
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Batal</button>
            <button type="submit" className="btn btn-primary" disabled={loading || uploading}>
              {loading ? (
                <><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '4px' }}></i> Menyimpan...</>
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
                  {editData ? 'Konfirmasi Perubahan' : 'Konfirmasi Transaksi Baru'}
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
                    {editData ? 'Simpan perubahan data transaksi ini?' : 'Tambahkan transaksi baru ini ke sistem?'}
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
                  {editData ? 'Ya, Simpan Perubahan' : 'Ya, Tambah Transaksi'}
                </button>
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
  const [activeTab, setActiveTab] = useState('text');
  const [customMsg, setCustomMsg] = useState('');
  const [copied, setCopied] = useState(false);

  const paymentMeta = getPaymentMethodMeta(tx?.payment_method);

  // Generate pesan invoice saat modal dibuka — pola resmi React
  // "adjust state during render" (menggantikan useEffect + setState sinkron)
  const [prevInvoiceKey, setPrevInvoiceKey] = useState(null);
  const invoiceKey = isOpen && tx ? tx.id : null;
  if (invoiceKey !== prevInvoiceKey) {
    setPrevInvoiceKey(invoiceKey);
    if (invoiceKey) {
      setCustomMsg(generateInvoiceText(tx, vehicle, paymentMeta));
    }
  }

  if (!isOpen || !tx) return null;

  const waUrl = getWhatsAppShareUrl(tx.renter_phone, customMsg);

  const handleCopy = () => {
    navigator.clipboard.writeText(customMsg);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fa-brands fa-whatsapp" style={{ color: '#25D366', fontSize: '20px' }}></i>
              Kirim Invoice WhatsApp & Pesan Customer
            </div>
            <div className="modal-subtitle">
              Penyewa: <strong>{tx.renter_name}</strong> ({tx.renter_phone})
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Tab Selector */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <button
            className={`btn btn-${activeTab === 'text' ? 'primary' : 'secondary'} btn-sm`}
            onClick={() => setActiveTab('text')}
          >
            <i className="fa-brands fa-whatsapp" style={{ marginRight: '6px' }}></i> Format Text WA
          </button>
          <button
            className={`btn btn-${activeTab === 'visual' ? 'primary' : 'secondary'} btn-sm`}
            onClick={() => setActiveTab('visual')}
          >
            <i className="fa-solid fa-file-invoice" style={{ marginRight: '6px' }}></i> Kartu Invoice Gambar / Print
          </button>
        </div>

        {activeTab === 'text' ? (
          <div>
            <div className="form-group">
              <label className="form-label">
                <i className="fa-solid fa-pen-to-square" style={{ marginRight: '6px' }}></i> Text Invoice Formal (Dapat Diedit):
              </label>
              <textarea
                className="form-control"
                rows={12}
                value={customMsg}
                onChange={e => setCustomMsg(e.target.value)}
                style={{ fontFamily: 'monospace', fontSize: '12.5px', lineHeight: 1.5, resize: 'vertical' }}
              />
            </div>

            <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
              <button className="btn btn-secondary" onClick={handleCopy}>
                <i className={`fa-solid ${copied ? 'fa-check' : 'fa-copy'}`} style={{ marginRight: '6px' }}></i>
                {copied ? 'Tercopy!' : 'Copy Text Invoice'}
              </button>
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-success"
                style={{ textDecoration: 'none', background: '#25D366', borderColor: '#25D366', color: '#fff' }}
              >
                <i className="fa-brands fa-whatsapp" style={{ marginRight: '6px', fontSize: '16px' }}></i>
                Buka WhatsApp & Kirim Pesan
              </a>
            </div>
          </div>
        ) : (
          /* VISUAL INVOICE CARD FOR PRINT / IMAGE SHARE */
          <div>
            <div id="visual-invoice-card" style={{
              background: '#0F172A',
              border: '1px solid var(--bg-border)',
              borderRadius: '16px',
              padding: '24px',
              color: '#F8FAFC',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
            }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '16px', marginBottom: '20px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '20px', fontWeight: 800, color: 'var(--brand-primary-light)' }}>
                    <i className="fa-solid fa-motorcycle"></i>
                    DEMO RENTAL PREVIEW
                  </div>
                  <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
                    Jl. Pantai Pererenan, Canggu, Badung, Bali • WA: +62 812-3456-7890
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="badge" style={{ background: tx.status === 'completed' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(59, 130, 246, 0.2)', color: tx.status === 'completed' ? '#22C55E' : '#3B82F6', border: `1px solid ${tx.status === 'completed' ? '#22C55E' : '#3B82F6'}`, padding: '6px 12px', fontSize: '12px' }}>
                    {tx.status === 'completed' ? 'PAID / LUNAS ✓' : 'ACTIVE RENTAL 🛵'}
                  </span>
                </div>
              </div>

              {/* Renter & Vehicle */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px', background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '10px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 700 }}>Penyewa / Renter</div>
                  <div style={{ fontWeight: 700, fontSize: '15px', marginTop: '2px' }}>{tx.renter_name}</div>
                  <div style={{ fontSize: '12px', color: '#CBD5E1' }}>{tx.renter_phone}</div>
                  {tx.renter_address && (
                    <div style={{ fontSize: '11.5px', color: 'var(--brand-primary-light)', marginTop: '4px' }}>
                      <i className="fa-solid fa-location-dot" style={{ marginRight: '4px' }}></i> {tx.renter_address}
                    </div>
                  )}
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 700 }}>Motor / Vehicle</div>
                  <div style={{ fontWeight: 700, fontSize: '15px', marginTop: '2px', color: 'var(--brand-primary-light)' }}>{vehicle?.name || 'Motor'}</div>
                  <div style={{ fontSize: '12px', color: '#CBD5E1' }}>Plat: <strong>{vehicle?.plate_number}</strong></div>
                </div>
              </div>

              {/* Documentation Photos on Invoice Card */}
              {(tx.customer_image_url || tx.handover_image_url) && (
                <div style={{ marginBottom: '20px', background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 800, textTransform: 'uppercase', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <i className="fa-solid fa-camera" style={{ color: 'var(--brand-primary)' }}></i> Dokumentasi Foto Transaksi
                  </div>
                  <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                    {tx.customer_image_url && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <img src={tx.customer_image_url} alt="KTP / SIM" style={{ width: '110px', height: '76px', objectFit: 'cover', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)' }} />
                        <span style={{ fontSize: '10px', color: '#22C55E', fontWeight: 800 }}>✓ Foto Identitas KTP/SIM</span>
                      </div>
                    )}
                    {tx.handover_image_url && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <img src={tx.handover_image_url} alt="Serah Terima" style={{ width: '110px', height: '76px', objectFit: 'cover', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)' }} />
                        <span style={{ fontSize: '10px', color: '#3B82F6', fontWeight: 800 }}>✓ Foto Orang + Motor</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Dates & Pricing Table */}
              <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse', marginBottom: '20px', whiteSpace: 'nowrap' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#94A3B8', textAlign: 'left' }}>
                    <th style={{ padding: '8px 0' }}>DESKRIPSI</th>
                    <th style={{ padding: '8px 0', textAlign: 'right' }}>DURASI / VALUE</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '10px 0' }}>Periode Sewa ({new Date(tx.start_date).toLocaleDateString('id-ID')} s/d {new Date(tx.end_date).toLocaleDateString('id-ID')})</td>
                    <td style={{ padding: '10px 0', textAlign: 'right', fontWeight: 600 }}>{tx.duration_days} Hari</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '10px 0' }}>Tarif Sewa Harian</td>
                    <td style={{ padding: '10px 0', textAlign: 'right' }}>{formatRupiah(vehicle?.rate_per_day)} / hari</td>
                  </tr>
                  {tx.discount > 0 && (
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#F59E0B' }}>
                      <td style={{ padding: '10px 0' }}>Diskon Potongan Harga</td>
                      <td style={{ padding: '10px 0', textAlign: 'right' }}>-{formatRupiah(tx.discount)}</td>
                    </tr>
                  )}
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '10px 0' }}>Deposit Jaminan (Held)</td>
                    <td style={{ padding: '10px 0', textAlign: 'right' }}>{formatRupiah(tx.deposit)}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', fontWeight: 800, fontSize: '15px' }}>
                    <td style={{ padding: '12px 0', color: 'var(--brand-primary-light)' }}>TOTAL PEMBAYARAN</td>
                    <td style={{ padding: '12px 0', textAlign: 'right', color: 'var(--brand-primary-light)' }}>{formatRupiah(tx.total_price)}</td>
                  </tr>
                </tbody>
              </table>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#94A3B8' }}>
                <div>Metode Pembayaran: <strong style={{ color: paymentMeta.color }}><i className={paymentMeta.icon}></i> {paymentMeta.label}</strong></div>
                <div>Thank you for choosing Demo Rental Preview! 🌴</div>
              </div>
            </div>

            <div className="modal-footer" style={{ marginTop: '16px', justifyContent: 'space-between' }}>
              <button className="btn btn-secondary" onClick={handlePrint}>
                <i className="fa-solid fa-print" style={{ marginRight: '6px' }}></i> Cetak / Print PDF
              </button>
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-success"
                style={{ textDecoration: 'none', background: '#25D366', borderColor: '#25D366', color: '#fff' }}
              >
                <i className="fa-brands fa-whatsapp" style={{ marginRight: '6px', fontSize: '16px' }}></i> Kirim Invoice WA
              </a>
            </div>
          </div>
        )}
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
export default function TransactionsPage() {
  const role = useRole();
  const [transactions, setTransactions] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [completeModal, setCompleteModal] = useState({ open: false, tx: null });
  const [waModal, setWaModal] = useState({ open: false, tx: null });
  const [deleteModal, setDeleteModal] = useState({ open: false, txId: null });
  const [successModal, setSuccessModal] = useState({ open: false, message: '' });
  const [lunasModal, setLunasModal] = useState({ open: false, tx: null });
  const [lunasToast, setLunasToast] = useState({ open: false, renterName: '' });
  const [saveToast, setSaveToast] = useState({ open: false, isEdit: false, renterName: '' });
  const [errorToast, setErrorToast] = useState({ open: false, message: '' });

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
    setLoading(false);
  }, []);

  useEffect(() => { Promise.resolve().then(fetchAll); }, [fetchAll]);

const handleSubmit = async (formData) => {
    const isEdit = !!editData;
    const url = isEdit ? `/api/transactions/${editData.id}` : '/api/transactions';
    const method = isEdit ? 'PUT' : 'POST';

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
      tx.status === statusFilter ||
      (statusFilter === 'belum_bayar' && tx.status === 'active' && tx.payment_status === 'unpaid');
    return matchSearch && matchStatus;
  });

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h2><i className="fa-solid fa-file-invoice-dollar" style={{ marginRight: '8px' }}></i> Kelola Transaksi Sewa</h2>
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
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Customer</th>
                  <th>Motor</th>
                  <th>Mulai / Selesai</th>
                  <th>KM Odometer</th>
                  <th>Total & Diskon</th>
                  <th>Denda / Deposit</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((tx, idx) => (
                  <tr key={tx.id}>
                    <td style={{ fontWeight: 700, color: 'var(--text-muted)' }}>{idx + 1}</td>
                    <td>
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
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
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
                            <div style={{ fontSize: '11px', color: 'var(--brand-primary-light)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '220px' }} title={tx.renter_address}>
                              <i className="fa-solid fa-location-dot" style={{ marginRight: '4px' }}></i>
                              {tx.renter_address}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '180px' }}>
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
                    <td>
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
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '12px' }}>
                        <div>Start: <strong>{tx.km_start ? `${tx.km_start} KM` : '-'}</strong></div>
                        <div>End: <strong>{tx.km_end ? `${tx.km_end} KM` : '-'}</strong></div>
                      </div>
                    </td>
                    <td>
                      <div className="tx-price-cell">
                        <strong style={{ fontSize: '14px', color: '#22C55E' }}>{formatRupiah(tx.total_price)}</strong>
                        {tx.discount > 0 && (
                          <div>
                            <span className="tx-info-pill" style={{ color: '#F59E0B', borderColor: 'rgba(245, 158, 11, 0.3)', background: 'rgba(245, 158, 11, 0.1)' }}>
                              Diskon: -{formatRupiah(tx.discount)}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
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
                    <td style={{ verticalAlign: 'middle' }}>
                      {statusBadge(tx.status, tx.payment_status)}
                      {tx.status === 'active' && tx.payment_status !== 'unpaid' && (
                        <div style={{ marginTop: '4px' }}>
                          <span style={{ fontSize: '10px', color: '#22C55E', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <i className="fa-solid fa-circle-check" style={{ fontSize: '9px' }}></i> Lunas
                          </span>
                        </div>
                      )}
                    </td>
                    <td style={{ verticalAlign: 'middle' }}>
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

                        <Link
                          href={`/contracts/new?transactionId=${tx.id}`}
                          className="btn btn-sm"
                          title="Buat Kontrak Sewa"
                          style={{ padding: '7px 10px', background: 'rgba(139,92,246,0.15)', border: '1px solid #8B5CF6', color: '#8B5CF6' }}
                        >
                          <i className="fa-solid fa-file-signature"></i>
                        </Link>

                        {/* Tandai Lunas button for unpaid active transactions */}
                        {role === 'admin' && tx.status === 'active' && tx.payment_status === 'unpaid' && (
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
        onClose={() => { setShowModal(false); setEditData(null); }}
        onSubmit={handleSubmit}
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
