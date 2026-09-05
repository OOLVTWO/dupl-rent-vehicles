'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useLanguage } from '@/lib/LanguageContext';

const VALID_AVAIL_TABS = ['all', 'available', 'rented', 'overdue', 'maintenance'];

// Reads ?tab= so the sidebar "Ketersediaan" dropdown links land on the
// right filter. Split out because useSearchParams() requires a Suspense
// boundary.
function TabFromQuery({ onTab }) {
  const searchParams = useSearchParams();
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && VALID_AVAIL_TABS.includes(tab)) onTab(tab);
  }, [searchParams, onTab]);
  return null;
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getDaysLeft(endDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  return Math.floor((end - today) / (1000 * 60 * 60 * 24));
}

function formatRupiah(amount) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount || 0);
}

const BRAND_ICONS = {
  honda: { icon: 'fa-solid fa-motorcycle', color: '#EF4444', label: 'Honda' },
  yamaha: { icon: 'fa-solid fa-motorcycle', color: '#3B82F6', label: 'Yamaha' },
  suzuki: { icon: 'fa-solid fa-motorcycle', color: '#F59E0B', label: 'Suzuki' },
  kawasaki: { icon: 'fa-solid fa-motorcycle', color: '#22C55E', label: 'Kawasaki' },
  vespa: { icon: 'fa-solid fa-person-biking', color: '#8B5CF6', label: 'Vespa' },
  other: { icon: 'fa-solid fa-circle-question', color: '#9898B0', label: 'availabilityPage.brandOther' },
};

// ─── Vehicle Availability Card ──────────────────────────────────────────────
function VehicleCard({ vehicle, activeTransaction }) {
  const { t } = useLanguage();
  const brandMeta = BRAND_ICONS[vehicle.category] || BRAND_ICONS.other;

  const isRented = vehicle.status === 'rented' || !!activeTransaction;
  const isMaintenance = vehicle.status === 'maintenance';
  const isAvailable = !isRented && !isMaintenance;

  const daysLeft = activeTransaction ? getDaysLeft(activeTransaction.end_date) : null;

  const statusMeta = isAvailable
    ? { label: t('availabilityPage.statusAvailable'), color: '#22C55E', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)', icon: 'fa-solid fa-circle-check', cls: 'avail-available' }
    : isMaintenance
    ? { label: t('availabilityPage.statusMaintenance'), color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', icon: 'fa-solid fa-wrench', cls: 'avail-maintenance' }
    : daysLeft < 0
    ? { label: t('availabilityPage.statusOverdue'), color: '#EF4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.35)', icon: 'fa-solid fa-circle-exclamation', cls: 'avail-overdue' }
    : daysLeft === 0
    ? { label: t('availabilityPage.statusEndingToday'), color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', icon: 'fa-solid fa-bell', cls: 'avail-today' }
    : { label: t('availabilityPage.statusRented'), color: '#3B82F6', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.3)', icon: 'fa-solid fa-key', cls: 'avail-rented' };

  return (
    <div className={`avail-card ${statusMeta.cls}`} style={{ borderColor: statusMeta.border }}>
      {/* Top accent bar */}
      <div className="avail-card-accent" style={{ background: `linear-gradient(90deg, ${statusMeta.color}, transparent)` }}></div>

      {/* Status Badge */}
      <div className="avail-status-badge" style={{ color: statusMeta.color, background: statusMeta.bg, borderColor: statusMeta.border }}>
        <i className={`${statusMeta.icon}${isRented && daysLeft === 0 ? ' fa-shake' : isRented && daysLeft < 0 ? ' fa-beat' : ''}`}></i>
        {statusMeta.label}
      </div>

      {/* Vehicle Icon & Name */}
      <div className="avail-vehicle-main">
        <div className="avail-vehicle-icon" style={{ color: brandMeta.color, background: `${brandMeta.color}18` }}>
          <i className={brandMeta.icon}></i>
        </div>
        <div className="avail-vehicle-identity">
          <div className="avail-vehicle-name">{vehicle.name}</div>
          <div className="avail-vehicle-plate">
            <i className="fa-solid fa-id-card" style={{ fontSize: '10px', marginRight: '4px', color: '#9898B0' }}></i>
            {vehicle.plate_number}
          </div>
          <div className="avail-vehicle-brand" style={{ color: brandMeta.color }}>
            <i className={`${brandMeta.icon}`} style={{ fontSize: '10px', marginRight: '4px' }}></i>
            {t(brandMeta.label)} · {vehicle.year}
          </div>
        </div>
      </div>

      {/* Rate */}
      <div className="avail-rate">
        <i className="fa-solid fa-tag" style={{ color: 'var(--brand-accent)', fontSize: '11px' }}></i>
        <span>{formatRupiah(vehicle.rate_per_day)} {t('availabilityPage.perDay')}</span>
      </div>

      {/* If rented — show renter info */}
      {isRented && activeTransaction && (
        <div className="avail-renter-info">
          <div className="avail-renter-divider">
            <i className="fa-solid fa-user-tie" style={{ color: statusMeta.color, marginRight: '6px' }}></i>
            {t('availabilityPage.renterInfo')}
          </div>
          <div className="avail-renter-row">
            <i className="fa-solid fa-user" style={{ color: '#9898B0', fontSize: '11px', width: '14px' }}></i>
            <span className="avail-renter-name">{activeTransaction.renter_name}</span>
          </div>
          <div className="avail-renter-row">
            <i className="fa-solid fa-phone" style={{ color: '#22C55E', fontSize: '11px', width: '14px' }}></i>
            <span>{activeTransaction.renter_phone}</span>
          </div>
          <div className="avail-renter-row">
            <i className="fa-solid fa-calendar-plus" style={{ color: '#3B82F6', fontSize: '11px', width: '14px' }}></i>
            <span>{t('availabilityPage.startLabel')}: {formatDate(activeTransaction.start_date)}</span>
          </div>
          <div className="avail-renter-row" style={{ color: statusMeta.color, fontWeight: 600 }}>
            <i className="fa-solid fa-calendar-xmark" style={{ fontSize: '11px', width: '14px' }}></i>
            <span>{t('availabilityPage.endLabel')}: {formatDate(activeTransaction.end_date)}</span>
          </div>

          {/* Days left indicator */}
          {daysLeft !== null && (
            <div className="avail-days-left" style={{ color: statusMeta.color, background: statusMeta.bg, borderColor: statusMeta.border }}>
              <i className={`fa-solid ${daysLeft < 0 ? 'fa-circle-exclamation fa-beat' : daysLeft === 0 ? 'fa-bell fa-shake' : 'fa-hourglass-half'}`}></i>
              {daysLeft < 0
                ? t('availabilityPage.overdueDays').replace('{n}', Math.abs(daysLeft))
                : daysLeft === 0
                ? t('availabilityPage.endingTodayExcl')
                : t('availabilityPage.daysLeft').replace('{n}', daysLeft)}
            </div>
          )}
        </div>
      )}

      {/* If available — show availability indicator */}
      {isAvailable && (
        <div className="avail-ready-badge">
          <i className="fa-solid fa-circle-check fa-beat-fade" style={{ color: '#22C55E' }}></i>
          <span>{t('availabilityPage.readyToRent')}</span>
        </div>
      )}

      {/* If maintenance */}
      {isMaintenance && (
        <div className="avail-maintenance-badge">
          <i className="fa-solid fa-wrench" style={{ color: '#F59E0B' }}></i>
          <span>{t('availabilityPage.underMaintenance')}</span>
          {vehicle.notes && <p className="avail-notes">{vehicle.notes}</p>}
        </div>
      )}

      {/* KM Info */}
      <div className="avail-km-row">
        <i className="fa-solid fa-gauge" style={{ color: '#9898B0', fontSize: '11px' }}></i>
        <span>{(vehicle.current_km || 0).toLocaleString('id-ID')} km</span>
        <span className="avail-km-sep">·</span>
        <i className="fa-solid fa-paint-roller" style={{ color: vehicle.color ? '#A78BFA' : '#9898B0', fontSize: '11px' }}></i>
        <span>{vehicle.color || '-'}</span>
      </div>
    </div>
  );
}

// ─── Main Availability Page ─────────────────────────────────────────────────
export default function AvailabilityPage() {
  const { t } = useLanguage();
  const [vehicles, setVehicles] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const loadData = useCallback(async () => {
    const supabase = createClient();
    const [{ data: vData }, { data: txData }] = await Promise.all([
      supabase.from('vehicles').select('*').order('name'),
      supabase
        .from('transactions')
        .select('*')
        .eq('status', 'active'),
    ]);
    setVehicles(vData || []);
    setTransactions(txData || []);
    setLastRefresh(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    // Defer ke microtask: loadData memanggil setState — hindari setState sinkron di effect
    Promise.resolve().then(loadData);
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Map: vehicle_id → active transaction
  const activeTxMap = {};
  (transactions || []).forEach(tx => {
    activeTxMap[tx.vehicle_id] = tx;
  });

  // Compute effective status
  const enrichedVehicles = (vehicles || []).map(v => {
    const activeTx = activeTxMap[v.id] || null;
    const isRented = v.status === 'rented' || !!activeTx;
    const isMaintenance = v.status === 'maintenance';
    const effectiveStatus = isMaintenance ? 'maintenance' : isRented ? 'rented' : 'available';
    return { vehicle: v, activeTx, effectiveStatus };
  });

  // Stats
  const availableCount = enrichedVehicles.filter(e => e.effectiveStatus === 'available').length;
  const rentedCount = enrichedVehicles.filter(e => e.effectiveStatus === 'rented').length;
  const maintenanceCount = enrichedVehicles.filter(e => e.effectiveStatus === 'maintenance').length;
  const overdueCount = enrichedVehicles.filter(e => e.activeTx && getDaysLeft(e.activeTx.end_date) < 0).length;

  // Filter
  const filtered = enrichedVehicles.filter(({ vehicle, effectiveStatus, activeTx }) => {
    const q = search.toLowerCase();
    const matchSearch = !q
      || (vehicle.name || '').toLowerCase().includes(q)
      || (vehicle.plate_number || '').toLowerCase().includes(q)
      || (activeTx?.renter_name || '').toLowerCase().includes(q);

    const matchFilter = filter === 'all'
      || (filter === 'available' && effectiveStatus === 'available')
      || (filter === 'rented' && effectiveStatus === 'rented')
      || (filter === 'maintenance' && effectiveStatus === 'maintenance')
      || (filter === 'overdue' && activeTx && getDaysLeft(activeTx.end_date) < 0);

    return matchSearch && matchFilter;
  });

  const FILTERS = [
    { key: 'all', label: t('availabilityPage.filterAll'), icon: 'fa-solid fa-grip', count: enrichedVehicles.length },
    { key: 'available', label: t('availabilityPage.filterAvailable'), icon: 'fa-solid fa-circle-check', count: availableCount, color: '#22C55E' },
    { key: 'rented', label: t('availabilityPage.filterRented'), icon: 'fa-solid fa-key', count: rentedCount, color: '#3B82F6' },
    { key: 'overdue', label: t('availabilityPage.filterOverdue'), icon: 'fa-solid fa-circle-exclamation', count: overdueCount, color: '#EF4444' },
    { key: 'maintenance', label: t('availabilityPage.filterMaintenance'), icon: 'fa-solid fa-wrench', count: maintenanceCount, color: '#F59E0B' },
  ];

  return (
    <div className="page-content">
      <Suspense fallback={null}>
        <TabFromQuery onTab={setFilter} />
      </Suspense>

      {/* ── Page Header ── */}
      <div className="tracking-page-header">
        <div className="tracking-header-left">
          <div className="tracking-header-icon" style={{ background: 'linear-gradient(135deg, #22C55E, #16A34A)' }}>
            <i className="fa-solid fa-motorcycle"></i>
          </div>
          <div>
            <h2>{t('availabilityPage.title')}</h2>
            <p>{t('availabilityPage.subtitle')}</p>
          </div>
        </div>
        <div className="tracking-header-right">
          <div className="tracking-refresh-info">
            <i className="fa-solid fa-rotate" style={{ fontSize: '11px', color: '#22C55E' }}></i>
            <span>{t('availabilityPage.autoRefresh')}</span>
            <span className="tracking-refresh-time">
              {lastRefresh.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
          <button className="btn-refresh" onClick={loadData}>
            <i className="fa-solid fa-arrows-rotate"></i> {t('availabilityPage.refresh')}
          </button>
        </div>
      </div>

      {/* ── Summary Bar ── */}
      <div className="avail-summary-bar">
        <div className="avail-summary-item available-item">
          <div className="avail-summary-icon"><i className="fa-solid fa-circle-check"></i></div>
          <div className="avail-summary-count">{availableCount}</div>
          <div className="avail-summary-label">{t('availabilityPage.summaryAvailable')}</div>
        </div>
        <div className="avail-summary-divider"></div>
        <div className="avail-summary-item rented-item">
          <div className="avail-summary-icon"><i className="fa-solid fa-key"></i></div>
          <div className="avail-summary-count">{rentedCount}</div>
          <div className="avail-summary-label">{t('availabilityPage.summaryRented')}</div>
        </div>
        <div className="avail-summary-divider"></div>
        <div className="avail-summary-item overdue-item-sm">
          <div className="avail-summary-icon"><i className="fa-solid fa-circle-exclamation fa-beat"></i></div>
          <div className="avail-summary-count">{overdueCount}</div>
          <div className="avail-summary-label">{t('availabilityPage.summaryOverdue')}</div>
        </div>
        <div className="avail-summary-divider"></div>
        <div className="avail-summary-item maintenance-item">
          <div className="avail-summary-icon"><i className="fa-solid fa-wrench"></i></div>
          <div className="avail-summary-count">{maintenanceCount}</div>
          <div className="avail-summary-label">{t('availabilityPage.summaryMaintenance')}</div>
        </div>

        {/* Utilization bar */}
        <div className="avail-util-wrap">
          <div className="avail-util-label">
            <i className="fa-solid fa-chart-pie" style={{ marginRight: '5px', color: 'var(--brand-accent)' }}></i>
            {t('availabilityPage.fleetUtilization')}
          </div>
          <div className="avail-util-bar">
            <div
              className="avail-util-fill"
              style={{ width: `${enrichedVehicles.length ? (rentedCount / enrichedVehicles.length) * 100 : 0}%` }}
            ></div>
          </div>
          <div className="avail-util-pct">
            {t('availabilityPage.rentedPercent').replace('{n}', enrichedVehicles.length ? Math.round((rentedCount / enrichedVehicles.length) * 100) : 0)}
          </div>
        </div>
      </div>

      {/* ── Controls ── */}
      <div className="tracking-controls">
        {/* Current filter indicator — filter is now chosen from the
            sidebar "Ketersediaan" dropdown, this just confirms what's showing */}
        {(() => {
          const current = FILTERS.find(f => f.key === filter) || FILTERS[0];
          return (
            <span className="badge" style={{
              background: current.color ? `${current.color}18` : 'var(--bg-elevated)',
              color: current.color || 'var(--brand-primary)',
              border: `1px solid ${current.color ? `${current.color}40` : 'var(--bg-border)'}`,
              fontSize: '12.5px', padding: '6px 14px', fontWeight: 600,
            }}>
              <i className={current.icon} style={{ marginRight: '6px' }}></i>
              {current.label}
              {current.count > 0 && <span style={{ marginLeft: '6px', opacity: 0.75 }}>({current.count})</span>}
            </span>
          );
        })()}
        <div className="tracking-search-wrap">
          <i className="fa-solid fa-magnifying-glass"></i>
          <input
            type="text"
            placeholder={t('availabilityPage.searchPlaceholder')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="tracking-search-input"
          />
          {search && (
            <button onClick={() => setSearch('')} className="tracking-search-clear">
              <i className="fa-solid fa-xmark"></i>
            </button>
          )}
        </div>
      </div>

      {/* ── Grid ── */}
      {loading ? (
        <div className="tracking-loading">
          <i className="fa-solid fa-spinner fa-spin-pulse" style={{ fontSize: '32px', color: 'var(--brand-primary)' }}></i>
          <p>{t('availabilityPage.loadingFleetData')}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="tracking-empty">
          <i className="fa-solid fa-magnifying-glass" style={{ fontSize: '48px', color: 'var(--text-muted)', marginBottom: '16px' }}></i>
          <h3>{t('availabilityPage.noVehiclesFound')}</h3>
          <p>{t('availabilityPage.tryDifferentFilter')}</p>
        </div>
      ) : (
        <>
          <div className="tracking-results-info">
            <i className="fa-solid fa-motorcycle" style={{ color: 'var(--brand-primary)' }}></i>
            {(() => { const parts = t('availabilityPage.showingVehicles').split(/\{shown\}|\{total\}/); return <>{parts[0]}<strong>{filtered.length}</strong>{parts[1]}<strong>{enrichedVehicles.length}</strong>{parts[2]}</>; })()}
          </div>
          <div className="avail-grid">
            {filtered.map(({ vehicle, activeTx }) => (
              <VehicleCard key={vehicle.id} vehicle={vehicle} activeTransaction={activeTx} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
