'use client';

import { useState, useEffect, useMemo } from 'react';
import DashboardCharts from '@/components/dashboard/DashboardCharts';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { analyzeVehicleHealth } from '@/lib/aiDiagnostic';
import { calcFinancialSummary, formatRupiah, getLocalMonthStr, getLocalDateStr, toLocalDateStr, isPaidTransaction, isIncomeEntry } from '@/lib/finance';
import { useLanguage } from '@/lib/LanguageContext';

const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];
const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const statusBadge = (status, paymentStatus, t) => {
  if (status === 'active' && paymentStatus === 'unpaid') {
    return (
      <span className="tx-status-pill" style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B', borderColor: 'rgba(245,158,11,0.4)' }}>
        <i className="fa-solid fa-clock" style={{ fontSize: '11px' }}></i> {t('dashboard.unpaid')}
      </span>
    );
  }
  const map = {
    active: (
      <span className="tx-status-pill active">
        <i className="fa-solid fa-bolt" style={{ fontSize: '11px' }}></i> {t('dashboard.activeRental')}
      </span>
    ),
    completed: (
      <span className="tx-status-pill completed">
        <i className="fa-solid fa-circle-check" style={{ fontSize: '11px' }}></i> {t('dashboard.completed')}
      </span>
    ),
    cancelled: (
      <span className="tx-status-pill cancelled">
        <i className="fa-solid fa-circle-xmark" style={{ fontSize: '11px' }}></i> {t('dashboard.cancelled')}
      </span>
    ),
  };
  return map[status] || <span className="tx-status-pill">{status}</span>;
};

function fleetStatusDot(status) {
  if (status === 'available') return '#22C55E';
  if (status === 'rented') return '#3B82F6';
  if (status === 'maintenance') return '#F59E0B';
  return '#5C5C78';
}

function fleetStatusLabel(status, t) {
  if (status === 'available') return t('dashboard.available');
  if (status === 'rented') return t('dashboard.rented');
  if (status === 'maintenance') return t('dashboard.maintenance');
  return status;
}

export default function DashboardClient({ transactions, vehicles }) {
  const { t, lang } = useLanguage();
  const [expenses, setExpenses] = useState([]);
  const [periodMode, setPeriodMode] = useState('month');
  const [selectedMonth, setSelectedMonth] = useState(getLocalMonthStr());
  const [selectedYear, setSelectedYear] = useState(getLocalMonthStr().substring(0, 4));

  useEffect(() => {
    (async () => {
      let list = null;
      try {
        const res = await fetch('/api/expenses');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) list = data;
        }
      } catch (err) {
        console.error('Fetch expenses via API error:', err);
      }
      if (list === null) {
        try {
          const supabase = createClient();
          const { data, error } = await supabase
            .from('expenses')
            .select('*')
            .order('expense_date', { ascending: false });
          if (!error) list = data || [];
        } catch (err) {
          console.error('Fetch expenses via Supabase error:', err);
        }
      }
      setExpenses(list || []);
    })();
  }, []);

  const [bookings, setBookings] = useState([]);
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/bookings');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) setBookings(data);
        }
      } catch (err) {
        console.error('Fetch bookings error:', err);
      }
    })();
  }, []);

  const safeTx       = Array.isArray(transactions) ? transactions : [];
  const safeVehicles = Array.isArray(vehicles)     ? vehicles     : [];
  const safeExpenses = Array.isArray(expenses)     ? expenses     : [];

  const periodRange = useMemo(() => {
    const currentYear = getLocalMonthStr().substring(0, 4);
    const MONTH_NAMES = lang === 'en' ? MONTH_NAMES_EN : MONTH_NAMES_ID;
    if (periodMode === 'year') {
      return {
        start: `${selectedYear}-01-01`,
        end: `${selectedYear}-12-31`,
        label: t('dashboard.yearLabel').replace('{year}', selectedYear),
        isCurrent: selectedYear === currentYear,
      };
    }
    const parts = selectedMonth.split('-').map(Number);
    const y = parts[0];
    const m = parts[1];
    const lastDay = new Date(y, m, 0).getDate();
    return {
      start: `${selectedMonth}-01`,
      end: `${selectedMonth}-${String(lastDay).padStart(2, '0')}`,
      label: `${MONTH_NAMES[m - 1]} ${y}`,
      isCurrent: selectedMonth === getLocalMonthStr(),
    };
  }, [periodMode, selectedMonth, selectedYear, lang, t]);

  const filteredTx = safeTx.filter(t => {
    const d = toLocalDateStr(t.created_at);
    return d >= periodRange.start && d <= periodRange.end;
  });

  const filteredExpenses = safeExpenses.filter(e => {
    const d = e.expense_date || toLocalDateStr(e.created_at);
    return d >= periodRange.start && d <= periodRange.end;
  });

  const yearOptions = useMemo(() => {
    const years = new Set([Number(getLocalMonthStr().substring(0, 4))]);
    safeTx.forEach(t => {
      const y = Number(toLocalDateStr(t.created_at).substring(0, 4));
      if (y) years.add(y);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [safeTx]);

  const handleResetPeriod = () => {
    setSelectedMonth(getLocalMonthStr());
    setSelectedYear(getLocalMonthStr().substring(0, 4));
  };

  const today        = getLocalDateStr();
  const paidTx       = filteredTx.filter(isPaidTransaction);
  const todayPaidTx  = paidTx.filter(t => toLocalDateStr(t.created_at) === today);
  // "Pendapatan Hari Ini" = pendapatan sewa motor hari ini + pemasukan
  // Keuangan hari ini (tip, biaya antar-jemput, klaim deposit, dll).
  // Keuangan income yang benar-benar "rental_income" sudah dikecualikan
  // dari kategori yang bisa dipilih saat input (lihat expenses/page.jsx),
  // jadi menjumlahkan keduanya di sini tidak akan menghitung dobel.
  const todayExpenses = safeExpenses.filter(e => (e.expense_date || toLocalDateStr(e.created_at)) === today);
  const todayOtherIncome = todayExpenses.filter(isIncomeEntry).reduce((s, e) => s + Number(e.amount || 0), 0);
  const todayRevenue = todayPaidTx.reduce((s, t) => s + Number(t.total_price || 0), 0) + todayOtherIncome;
  const showToday    = periodRange.isCurrent && periodMode === 'month';

  const activeCount      = safeVehicles.filter(v => v.status === 'rented').length;
  const availableCount   = safeVehicles.filter(v => v.status === 'available').length;
  const maintenanceCount = safeVehicles.filter(v => v.status === 'maintenance').length;

  const summary = calcFinancialSummary({
    transactions: filteredTx,
    expenses: filteredExpenses,
    vehicles: safeVehicles,
  });
  const { totalRevenue, totalExpenses, investorPayout, netProfit } = summary;

  const hasInvestor = safeVehicles.some(v =>
    v.owner_type === 'investor' || v.ownership_type === 'investor'
  );

  const activeTx           = safeTx.filter(t => t.status === 'active');
  const completedTx        = filteredTx.filter(t => t.status === 'completed');
  const totalDepositHeld   = activeTx.reduce((s, t) => s + Number(t.deposit || 0), 0);
  const totalDepositDamage = completedTx.reduce((s, t) => s + Number(t.damage_fee || 0), 0);
  const totalDepositReturned = completedTx.reduce((s, t) => {
    return s + Math.max(0, Number(t.deposit || 0) - Number(t.damage_fee || 0));
  }, 0);

  const unpaidTx    = safeTx.filter(t => t.status === 'active' && t.payment_status === 'unpaid');
  const totalUnpaid = unpaidTx.reduce((s, t) => s + Number(t.total_price || 0), 0);

  const diagnostics    = safeVehicles.map(v => analyzeVehicleHealth(v, safeTx));
  const urgentVehicles = diagnostics.filter(d => d.healthScore < 60 || d.recentIssues.length > 0);

  const pendingBookings = bookings.filter(b => b.status === 'pending');
  const todaysBookings = bookings.filter(b => b.status === 'confirmed' && b.start_date === today);
  const unassignedDeliveriesToday = todaysBookings.filter(b => b.fulfillment_method === 'delivery' && !b.assigned_driver_id);
  const tomorrowDate = new Date(`${today}T00:00:00`);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowStr = getLocalDateStr(tomorrowDate);
  const tomorrowBookings = bookings.filter(b => (b.status === 'confirmed' || b.status === 'pending') && b.start_date === tomorrowStr);
  const activeBookings = bookings
    .filter(b => b.status === 'pending' || b.status === 'confirmed')
    .sort((a, b) => (a.start_date || '').localeCompare(b.start_date || ''));

  const recentTx    = filteredTx.slice(0, 5);
  const fleetPreview = safeVehicles.slice(0, 6);

  // Reuse summary.totalRevenue (from calcFinancialSummary) rather than a
  // separate transactions-only calculation, so this figure always matches
  // the "Total Pemasukan" card lower on the page — same period, same
  // rental + Keuangan income combination.
  const periodRevenue = totalRevenue;

  const kpiCards = [
    {
      accent: '#E85D04',
      iconBg: 'rgba(232,93,4,0.12)',
      iconColor: '#E85D04',
      icon: 'fa-solid fa-sack-dollar',
      label: showToday ? t('dashboard.revenueToday') : t('dashboard.revenuePeriod').replace('{period}', periodRange.label),
      value: formatRupiah(showToday ? todayRevenue : periodRevenue),
      sub: showToday ? `${periodRange.label}: ${formatRupiah(periodRevenue)}` : t('dashboard.paidTxCount').replace('{n}', paidTx.length),
    },
    {
      accent: '#3B82F6',
      iconBg: 'rgba(59,130,246,0.12)',
      iconColor: '#3B82F6',
      icon: 'fa-solid fa-key',
      label: t('dashboard.vehiclesRented'),
      value: `${activeCount} Unit`,
      sub: t('dashboard.ofTotalFleet').replace('{n}', safeVehicles.length),
    },
    {
      accent: '#22C55E',
      iconBg: 'rgba(34,197,94,0.12)',
      iconColor: '#22C55E',
      icon: 'fa-solid fa-circle-check',
      label: t('dashboard.vehiclesAvailable'),
      value: `${availableCount} Unit`,
      sub: t('dashboard.readyToRentNow'),
    },
    {
      accent: '#F59E0B',
      iconBg: 'rgba(245,158,11,0.12)',
      iconColor: '#F59E0B',
      icon: 'fa-solid fa-wrench',
      label: t('dashboard.underMaintenance'),
      value: `${maintenanceCount} Unit`,
      sub: t('dashboard.notOperating'),
    },
  ];

  return (
    <div className="dashboard-v2 fade-in">

      {(unpaidTx.length > 0 || urgentVehicles.length > 0 || pendingBookings.length > 0 || todaysBookings.length > 0 || tomorrowBookings.length > 0) && (
        <div className="dash-alerts">
          {pendingBookings.length > 0 && (
            <Link href="/bookings?tab=pending" className="dash-alert-bar" style={{ background: 'rgba(245, 158, 11, 0.12)', borderColor: 'rgba(245, 158, 11, 0.4)', color: '#F59E0B' }}>
              <i className="fa-solid fa-inbox"></i>
              <span>{t('dashboard.newBookingsWaiting').replace('{n}', pendingBookings.length)}</span>
              <span className="alert-cta">{t('dashboard.checkBooking')} &rarr;</span>
            </Link>
          )}
          {todaysBookings.length > 0 && (
            <Link href="/bookings?tab=confirmed" className="dash-alert-bar" style={{ background: 'rgba(59, 130, 246, 0.12)', borderColor: 'rgba(59, 130, 246, 0.4)', color: '#3B82F6' }}>
              <i className="fa-solid fa-calendar-day"></i>
              <span>
                {t('dashboard.todaySchedule').replace('{n}', todaysBookings.length)}
                {unassignedDeliveriesToday.length > 0 && t('dashboard.unassignedDelivery').replace('{n}', unassignedDeliveriesToday.length)}
              </span>
              <span className="alert-cta">{t('dashboard.viewSchedule')} &rarr;</span>
            </Link>
          )}
          {tomorrowBookings.length > 0 && (
            <Link href="/bookings" className="dash-alert-bar" style={{ background: 'rgba(139, 92, 246, 0.12)', borderColor: 'rgba(139, 92, 246, 0.4)', color: '#8B5CF6' }}>
              <i className="fa-solid fa-calendar-plus"></i>
              <span>{t('dashboard.tomorrowBookings').replace('{n}', tomorrowBookings.length)}</span>
              <span className="alert-cta">{t('dashboard.viewSchedule')} &rarr;</span>
            </Link>
          )}
          {unpaidTx.length > 0 && (
            <Link href="/transactions" className="dash-alert-bar unpaid">
              <i className="fa-solid fa-triangle-exclamation"></i>
              <span>{t('dashboard.unpaidActiveRentals').replace('{n}', unpaidTx.length).replace('{amount}', formatRupiah(totalUnpaid))}</span>
              <span className="alert-cta">{t('dashboard.viewTransactions')} &rarr;</span>
            </Link>
          )}
          {urgentVehicles.length > 0 && (
            <Link href="/maintenance" className="dash-alert-bar maintenance">
              <i className="fa-solid fa-robot"></i>
              <span>{t('dashboard.aiDiagnosticAlert').replace('{n}', urgentVehicles.length).replace('{names}', urgentVehicles.map(v => v.vehicleName).join(', '))}</span>
              <span className="alert-cta">{t('dashboard.checkDiagnostic')} &rarr;</span>
            </Link>
          )}
        </div>
      )}

      <div className="dash-header">
        <div>
          <h2 className="dash-title">
            <i className="fa-solid fa-chart-pie" style={{ marginRight: '8px', color: 'var(--brand-primary)' }}></i>
            {t('dashboard.title')}
          </h2>
          <p className="dash-subtitle">{t('dashboard.subtitle').replace('{period}', periodRange.label)}</p>
        </div>

        <div className="dash-period-bar">
          <div className="dash-period-tabs">
            <button
              type="button"
              className={`dash-ptab ${periodMode === 'month' ? 'active' : ''}`}
              onClick={() => setPeriodMode('month')}
            >{t('dashboard.monthly')}</button>
            <button
              type="button"
              className={`dash-ptab ${periodMode === 'year' ? 'active' : ''}`}
              onClick={() => setPeriodMode('year')}
            >{t('dashboard.yearly')}</button>
          </div>

          {/* Always rendered — hidden in year mode to prevent layout shift */}
          <select
            className="dash-period-select"
            style={{ display: periodMode === 'year' ? 'none' : undefined }}
            value={selectedMonth.substring(5, 7)}
            onChange={e => setSelectedMonth(`${selectedMonth.substring(0, 4)}-${e.target.value}`)}
          >
            {(lang === 'en' ? MONTH_NAMES_EN : MONTH_NAMES_ID).map((name, i) => (
              <option key={i} value={String(i + 1).padStart(2, '0')}>{name}</option>
            ))}
          </select>

          <select
            className="dash-period-select"
            value={periodMode === 'year' ? selectedYear : selectedMonth.substring(0, 4)}
            onChange={e => {
              if (periodMode === 'year') setSelectedYear(e.target.value);
              else setSelectedMonth(`${e.target.value}-${selectedMonth.substring(5, 7)}`);
            }}
          >
            {yearOptions.map(y => <option key={y} value={String(y)}>{y}</option>)}
          </select>

          {!periodRange.isCurrent && (
            <button type="button" className="dash-period-reset" onClick={handleResetPeriod}>
              <i className="fa-solid fa-rotate-left"></i> {t('dashboard.currentPeriod')}
            </button>
          )}
        </div>
      </div>

      <div className="dash-kpi-row">
        {kpiCards.map((card, i) => (
          <div key={i} className="dash-kpi-card" style={{ borderTopColor: card.accent }}>
            <div className="dash-kpi-icon" style={{ background: card.iconBg, color: card.iconColor }}>
              <i className={card.icon}></i>
            </div>
            <div className="dash-kpi-text">
              <div className="dash-kpi-label">{card.label}</div>
              <div className="dash-kpi-value">{card.value}</div>
              <div className="dash-kpi-sub">{card.sub}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="dash-finance-row">
        <div className="dash-finance-item income">
          <i className="fa-solid fa-circle-arrow-down"></i>
          <div>
            <div className="fin-label">{t('dashboard.totalIncome')}</div>
            <div className="fin-value">{formatRupiah(totalRevenue)}</div>
          </div>
        </div>
        <div className="dash-finance-divider"></div>
        <div className="dash-finance-item expense">
          <i className="fa-solid fa-circle-arrow-up"></i>
          <div>
            <div className="fin-label">{t('dashboard.totalExpenses')}</div>
            <div className="fin-value">{formatRupiah(totalExpenses)}</div>
          </div>
        </div>
        {hasInvestor && (
          <>
            <div className="dash-finance-divider"></div>
            <div className="dash-finance-item investor">
              <i className="fa-solid fa-crown"></i>
              <div>
                <div className="fin-label">{t('dashboard.investorPayout')}</div>
                <div className="fin-value">{formatRupiah(investorPayout)}</div>
              </div>
            </div>
          </>
        )}
        <div className="dash-finance-divider"></div>
        <div className={`dash-finance-item profit ${netProfit >= 0 ? 'positive' : 'negative'}`}>
          <i className={`fa-solid ${netProfit >= 0 ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'}`}></i>
          <div>
            <div className="fin-label">{t('dashboard.netProfit')}</div>
            <div className="fin-value">{formatRupiah(netProfit)}</div>
          </div>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <Link href="/reports" className="btn btn-secondary btn-sm">
            {t('dashboard.fullReport')} <i className="fa-solid fa-arrow-right" style={{ marginLeft: '4px' }}></i>
          </Link>
        </div>
      </div>

      <DashboardCharts
        transactions={filteredTx}
        vehicles={safeVehicles}
        periodMode={periodMode}
        periodRange={periodRange}
      />

      <div className="dash-mid-row">
        <div className="dash-card dash-deposit-card">
          <div className="dash-card-header">
            <div className="dash-card-title">
              <i className="fa-solid fa-vault" style={{ color: 'var(--brand-primary)' }}></i>
              {t('dashboard.depositRecap')}
            </div>
            <div className="dash-card-sub">{t('dashboard.depositMonitoring')}</div>
          </div>
          <div className="dash-deposit-list">
            <div className="dash-deposit-item dep-held">
              <div className="dep-dot"></div>
              <div className="dep-info">
                <div className="dep-name">{t('dashboard.depositHeld')}</div>
                <div className="dep-count">{t('dashboard.rentalsRunning').replace('{n}', activeTx.length)}</div>
              </div>
              <div className="dep-amount" style={{ color: '#F59E0B' }}>{formatRupiah(totalDepositHeld)}</div>
            </div>
            <div className="dash-deposit-item dep-damage">
              <div className="dep-dot"></div>
              <div className="dep-info">
                <div className="dep-name">{t('dashboard.damageClaim')}</div>
                <div className="dep-count">{t('dashboard.countedAsIncome')}</div>
              </div>
              <div className="dep-amount" style={{ color: '#A855F7' }}>{formatRupiah(totalDepositDamage)}</div>
            </div>
            <div className="dash-deposit-item dep-returned">
              <div className="dep-dot"></div>
              <div className="dep-info">
                <div className="dep-name">{t('dashboard.depositReturned')}</div>
                <div className="dep-count">{t('dashboard.txCompleted').replace('{n}', completedTx.length)}</div>
              </div>
              <div className="dep-amount" style={{ color: '#3B82F6' }}>{formatRupiah(totalDepositReturned)}</div>
            </div>
          </div>
        </div>

        <div className="dash-card dash-quick-card">
          <div className="dash-card-header">
            <div className="dash-card-title">
              <i className="fa-solid fa-bolt" style={{ color: 'var(--brand-primary)' }}></i>
              {t('dashboard.quickActions')}
            </div>
          </div>
          <div className="dash-quick-grid">
            <Link href="/transactions" className="dash-quick-btn q-orange">
              <i className="fa-solid fa-plus"></i>
              <div className="qbtn-label">{t('dashboard.newTransaction')}</div>
              <div className="qbtn-sub">{t('dashboard.recordRental')}</div>
            </Link>
            <Link href="/availability" className="dash-quick-btn q-blue">
              <i className="fa-solid fa-circle-half-stroke"></i>
              <div className="qbtn-label">{t('dashboard.checkFleet')}</div>
              <div className="qbtn-sub">{t('dashboard.realtimeStatus')}</div>
            </Link>
            <Link href="/reports?tab=investor" className="dash-quick-btn q-green">
              <i className="fa-solid fa-chart-line"></i>
              <div className="qbtn-label">{t('dashboard.investorReport')}</div>
              <div className="qbtn-sub">{t('dashboard.exportExcel')}</div>
            </Link>
            <Link href="/maintenance" className="dash-quick-btn q-purple">
              <i className="fa-solid fa-robot"></i>
              <div className="qbtn-label">{t('sidebar.aiDiagnostic')}</div>
              <div className="qbtn-sub">{t('dashboard.vehicleHealth')}</div>
            </Link>
          </div>
        </div>
      </div>

      <div className="dash-bottom-row">
        <div className="dash-card">
          <div className="dash-card-header">
            <div>
              <div className="dash-card-title">
                <i className="fa-solid fa-receipt" style={{ color: 'var(--brand-primary)' }}></i>
                {t('dashboard.recentTransactions')}
              </div>
              <div className="dash-card-sub">{t('dashboard.recentOnPeriod').replace('{period}', periodRange.label)}</div>
            </div>
            <Link href="/transactions" className="btn btn-secondary btn-sm">
              {t('dashboard.viewAll')} <i className="fa-solid fa-arrow-right" style={{ marginLeft: '4px' }}></i>
            </Link>
          </div>

          {recentTx.length === 0 ? (
            <div className="table-empty" style={{ padding: '32px 16px' }}>
              <div className="table-empty-icon"><i className="fa-solid fa-receipt"></i></div>
              <p>{t('dashboard.noTransactionsYet')} <Link href="/transactions">{t('dashboard.recordNewTransaction')}</Link></p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table table--stack-mobile" style={{ minWidth: '580px' }}>
                <thead>
                  <tr>
                    <th>{t('dashboard.thRenter')}</th>
                    <th>{t('dashboard.thVehicle')}</th>
                    <th>{t('dashboard.thDate')}</th>
                    <th>{t('dashboard.thTotal')}</th>
                    <th>{t('dashboard.thStatus')}</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTx.map((tx) => (
                    <tr key={tx.id}>
                      <td data-label="Penyewa" data-label-align="left">
                        <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>{tx.renter_name}</div>
                        {tx.renter_phone && (
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            <i className="fa-solid fa-phone" style={{ marginRight: '3px', fontSize: '10px' }}></i>{tx.renter_phone}
                          </div>
                        )}
                      </td>
                      <td data-label="Motor" data-label-align="left">
                        <div style={{ fontSize: '13px', fontWeight: 500 }}>{tx.vehicles?.name || tx.vehicle_name || '\u2014'}</div>
                        {(tx.vehicles?.plate_number || tx.plate_number) && (
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'var(--bg-elevated)', padding: '1px 6px', borderRadius: '4px' }}>
                            {tx.vehicles?.plate_number || tx.plate_number}
                          </span>
                        )}
                      </td>
                      <td data-label="Tanggal" data-label-align="left" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        <div><i className="fa-solid fa-calendar-plus" style={{ marginRight: '3px', color: '#22C55E', fontSize: '10px' }}></i>{tx.start_date}</div>
                        <div><i className="fa-solid fa-calendar-check" style={{ marginRight: '3px', color: '#3B82F6', fontSize: '10px' }}></i>{tx.end_date}</div>
                      </td>
                      <td data-label="Total">
                        <strong style={{ fontSize: '13px' }}>{formatRupiah(tx.total_price)}</strong>
                      </td>
                      <td data-label="Status">{statusBadge(tx.status, tx.payment_status, t)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="dash-card dash-fleet-card">
          <div className="dash-card-header">
            <div>
              <div className="dash-card-title">
                <i className="fa-solid fa-motorcycle" style={{ color: 'var(--brand-primary)' }}></i>
                {t('dashboard.fleetStatus')}
              </div>
              <div className="dash-card-sub">{t('dashboard.unitsRegistered').replace('{n}', safeVehicles.length)}</div>
            </div>
            <Link href="/availability" className="btn btn-secondary btn-sm">
              {t('dashboard.moreDetails')} <i className="fa-solid fa-arrow-right" style={{ marginLeft: '4px' }}></i>
            </Link>
          </div>

          <div className="fleet-legend">
            <span className="fleet-legend-item"><span className="fleet-dot-lg" style={{ background: '#22C55E' }}></span>{availableCount} {t('dashboard.available')}</span>
            <span className="fleet-legend-item"><span className="fleet-dot-lg" style={{ background: '#3B82F6' }}></span>{activeCount} {t('dashboard.rented')}</span>
            <span className="fleet-legend-item"><span className="fleet-dot-lg" style={{ background: '#F59E0B' }}></span>{maintenanceCount} {t('dashboard.maintenance')}</span>
          </div>

          <div className="dash-fleet-grid">
            {fleetPreview.map((v) => (
              <div key={v.id} className="dash-fleet-item">
                <span className="fleet-status-dot" style={{ background: fleetStatusDot(v.status) }}></span>
                <div className="fleet-item-info">
                  <div className="fleet-item-name">{v.name}</div>
                  <div className="fleet-item-plate">{v.plate_number}</div>
                </div>
                <div className="fleet-item-status" style={{ color: fleetStatusDot(v.status) }}>
                  {fleetStatusLabel(v.status, t)}
                </div>
              </div>
            ))}
            {safeVehicles.length === 0 && (
              <div className="table-empty" style={{ padding: '24px' }}>
                <p><Link href="/vehicles">{t('dashboard.addFirstVehicle')}</Link></p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="dash-card" style={{ marginTop: '20px' }}>
        <div className="dash-card-header">
          <div>
            <div className="dash-card-title">
              <i className="fa-solid fa-motorcycle" style={{ color: 'var(--brand-primary)' }}></i>
              {t('driverDashboard.bookedVehicles')}
            </div>
            <div className="dash-card-sub">{t('dashboard.activeBookingsCount').replace('{n}', activeBookings.length)}</div>
          </div>
          <Link href="/bookings" className="btn btn-secondary btn-sm">
            {t('dashboard.viewAll')} <i className="fa-solid fa-arrow-right" style={{ marginLeft: '4px' }}></i>
          </Link>
        </div>

        {activeBookings.length === 0 ? (
          <div className="table-empty" style={{ padding: '32px 16px' }}>
            <div className="table-empty-icon"><i className="fa-solid fa-inbox"></i></div>
            <p>{t('driverDashboard.noActiveBookings')}</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table table--stack-mobile" style={{ minWidth: '620px' }}>
              <thead>
                <tr>
                  <th>{t('driverDashboard.thVehicle')}</th>
                  <th>{t('driverDashboard.thCustomer')}</th>
                  <th>{t('driverDashboard.thRentalDate')}</th>
                  <th>{t('driverDashboard.thMethod')}</th>
                  <th>{t('driverDashboard.thDriver')}</th>
                  <th>{t('driverDashboard.thStatus')}</th>
                </tr>
              </thead>
              <tbody>
                {activeBookings.slice(0, 8).map((b) => (
                  <tr key={b.id}>
                    <td data-label="Motor" data-label-align="left">
                      <div style={{ fontWeight: 700, fontSize: '13px' }}>{b.vehicle_name || '\u2014'}</div>
                    </td>
                    <td data-label="Customer" data-label-align="left">
                      <div style={{ fontSize: '13px', fontWeight: 600 }}>{b.customer_name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{b.customer_phone}</div>
                    </td>
                    <td data-label="Tanggal Sewa" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {b.start_date} &rarr; {b.end_date}
                    </td>
                    <td data-label="Metode">
                      <span className="badge" style={{ background: b.fulfillment_method === 'delivery' ? 'rgba(59,130,246,0.15)' : 'rgba(148,163,184,0.2)', color: b.fulfillment_method === 'delivery' ? '#3B82F6' : '#94A3B8', border: `1px solid ${b.fulfillment_method === 'delivery' ? '#3B82F6' : '#94A3B8'}` }}>
                        {b.fulfillment_method === 'delivery' ? t('driverDashboard.delivery') : t('driverDashboard.pickup')}
                      </span>
                    </td>
                    <td data-label="Driver" style={{ fontSize: '12px' }}>
                      {b.fulfillment_method === 'delivery' ? (b.assigned_driver_name || <span style={{ color: '#F59E0B' }}>{t('driverDashboard.notAssignedYet')}</span>) : '\u2014'}
                    </td>
                    <td data-label="Status">
                      <span className="badge" style={{
                        background: b.status === 'confirmed' ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)',
                        color: b.status === 'confirmed' ? '#22C55E' : '#F59E0B',
                        border: `1px solid ${b.status === 'confirmed' ? '#22C55E' : '#F59E0B'}`,
                      }}>
                        {b.status === 'confirmed' ? t('driverDashboard.confirmed') : t('driverDashboard.pending')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
