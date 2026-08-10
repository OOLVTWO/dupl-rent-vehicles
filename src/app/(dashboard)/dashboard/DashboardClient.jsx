'use client';

import { useState, useEffect, useMemo } from 'react';
import DashboardCharts from '@/components/dashboard/DashboardCharts';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { analyzeVehicleHealth } from '@/lib/aiDiagnostic';
import { calcFinancialSummary, formatRupiah, getLocalMonthStr, getLocalDateStr, toLocalDateStr, isPaidTransaction } from '@/lib/finance';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const statusBadge = (status, paymentStatus) => {
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

function fleetStatusDot(status) {
  if (status === 'available') return '#22C55E';
  if (status === 'rented') return '#3B82F6';
  if (status === 'maintenance') return '#F59E0B';
  return '#5C5C78';
}

function fleetStatusLabel(status) {
  if (status === 'available') return 'Tersedia';
  if (status === 'rented') return 'Disewa';
  if (status === 'maintenance') return 'Servis';
  return status;
}

export default function DashboardClient({ transactions, vehicles }) {
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

  const safeTx       = Array.isArray(transactions) ? transactions : [];
  const safeVehicles = Array.isArray(vehicles)     ? vehicles     : [];
  const safeExpenses = Array.isArray(expenses)     ? expenses     : [];

  const periodRange = useMemo(() => {
    const currentYear = getLocalMonthStr().substring(0, 4);
    if (periodMode === 'year') {
      return {
        start: `${selectedYear}-01-01`,
        end: `${selectedYear}-12-31`,
        label: `Tahun ${selectedYear}`,
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
  }, [periodMode, selectedMonth, selectedYear]);

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
  const todayRevenue = todayPaidTx.reduce((s, t) => s + Number(t.total_price || 0), 0);
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

  const recentTx    = filteredTx.slice(0, 5);
  const fleetPreview = safeVehicles.slice(0, 6);

  const periodRevenue = paidTx.reduce((s, t) => s + Number(t.total_price || 0), 0);

  const kpiCards = [
    {
      accent: '#E85D04',
      iconBg: 'rgba(232,93,4,0.12)',
      iconColor: '#E85D04',
      icon: 'fa-solid fa-sack-dollar',
      label: showToday ? 'Pendapatan Hari Ini' : `Pendapatan ${periodRange.label}`,
      value: formatRupiah(showToday ? todayRevenue : periodRevenue),
      sub: showToday ? `${periodRange.label}: ${formatRupiah(periodRevenue)}` : `${paidTx.length} transaksi terbayar`,
    },
    {
      accent: '#3B82F6',
      iconBg: 'rgba(59,130,246,0.12)',
      iconColor: '#3B82F6',
      icon: 'fa-solid fa-key',
      label: 'Motor Sedang Disewa',
      value: `${activeCount} Unit`,
      sub: `dari ${safeVehicles.length} total armada`,
    },
    {
      accent: '#22C55E',
      iconBg: 'rgba(34,197,94,0.12)',
      iconColor: '#22C55E',
      icon: 'fa-solid fa-circle-check',
      label: 'Motor Tersedia',
      value: `${availableCount} Unit`,
      sub: 'siap sewa sekarang',
    },
    {
      accent: '#F59E0B',
      iconBg: 'rgba(245,158,11,0.12)',
      iconColor: '#F59E0B',
      icon: 'fa-solid fa-wrench',
      label: 'Dalam Perawatan',
      value: `${maintenanceCount} Unit`,
      sub: 'tidak beroperasi',
    },
  ];

  return (
    <div className="dashboard-v2 fade-in">

      {(unpaidTx.length > 0 || urgentVehicles.length > 0) && (
        <div className="dash-alerts">
          {unpaidTx.length > 0 && (
            <Link href="/transactions" className="dash-alert-bar unpaid">
              <i className="fa-solid fa-triangle-exclamation"></i>
              <span>{unpaidTx.length} sewa aktif belum bayar — total piutang {formatRupiah(totalUnpaid)}</span>
              <span className="alert-cta">Lihat Transaksi &rarr;</span>
            </Link>
          )}
          {urgentVehicles.length > 0 && (
            <Link href="/maintenance" className="dash-alert-bar maintenance">
              <i className="fa-solid fa-robot"></i>
              <span>AI Diagnostic: {urgentVehicles.length} motor perlu perhatian — {urgentVehicles.map(v => v.vehicleName).join(', ')}</span>
              <span className="alert-cta">Cek Diagnostic &rarr;</span>
            </Link>
          )}
        </div>
      )}

      <div className="dash-header">
        <div>
          <h2 className="dash-title">
            <i className="fa-solid fa-chart-pie" style={{ marginRight: '8px', color: 'var(--brand-primary)' }}></i>
            Dashboard
          </h2>
          <p className="dash-subtitle">Ringkasan performa usaha — {periodRange.label}</p>
        </div>

        <div className="dash-period-bar">
          <div className="dash-period-tabs">
            <button
              type="button"
              className={`dash-ptab ${periodMode === 'month' ? 'active' : ''}`}
              onClick={() => setPeriodMode('month')}
            >Bulanan</button>
            <button
              type="button"
              className={`dash-ptab ${periodMode === 'year' ? 'active' : ''}`}
              onClick={() => setPeriodMode('year')}
            >Tahunan</button>
          </div>

          {/* Always rendered — hidden in year mode to prevent layout shift */}
          <select
            className="dash-period-select"
            style={{ display: periodMode === 'year' ? 'none' : undefined }}
            value={selectedMonth.substring(5, 7)}
            onChange={e => setSelectedMonth(`${selectedMonth.substring(0, 4)}-${e.target.value}`)}
          >
            {MONTH_NAMES.map((name, i) => (
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
              <i className="fa-solid fa-rotate-left"></i> Periode Berjalan
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
            <div className="fin-label">Total Pemasukan</div>
            <div className="fin-value">{formatRupiah(totalRevenue)}</div>
          </div>
        </div>
        <div className="dash-finance-divider"></div>
        <div className="dash-finance-item expense">
          <i className="fa-solid fa-circle-arrow-up"></i>
          <div>
            <div className="fin-label">Total Pengeluaran</div>
            <div className="fin-value">{formatRupiah(totalExpenses)}</div>
          </div>
        </div>
        {hasInvestor && (
          <>
            <div className="dash-finance-divider"></div>
            <div className="dash-finance-item investor">
              <i className="fa-solid fa-crown"></i>
              <div>
                <div className="fin-label">Bagi Hasil Investor</div>
                <div className="fin-value">{formatRupiah(investorPayout)}</div>
              </div>
            </div>
          </>
        )}
        <div className="dash-finance-divider"></div>
        <div className={`dash-finance-item profit ${netProfit >= 0 ? 'positive' : 'negative'}`}>
          <i className={`fa-solid ${netProfit >= 0 ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'}`}></i>
          <div>
            <div className="fin-label">Laba Bersih</div>
            <div className="fin-value">{formatRupiah(netProfit)}</div>
          </div>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <Link href="/reports" className="btn btn-secondary btn-sm">
            Laporan Lengkap <i className="fa-solid fa-arrow-right" style={{ marginLeft: '4px' }}></i>
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
              Rekap Deposit Jaminan
            </div>
            <div className="dash-card-sub">Monitoring garansi &amp; klaim denda</div>
          </div>
          <div className="dash-deposit-list">
            <div className="dash-deposit-item dep-held">
              <div className="dep-dot"></div>
              <div className="dep-info">
                <div className="dep-name">Deposit Ditahan (Aktif)</div>
                <div className="dep-count">{activeTx.length} sewa berjalan</div>
              </div>
              <div className="dep-amount" style={{ color: '#F59E0B' }}>{formatRupiah(totalDepositHeld)}</div>
            </div>
            <div className="dash-deposit-item dep-damage">
              <div className="dep-dot"></div>
              <div className="dep-info">
                <div className="dep-name">Klaim Denda Ganti Rugi</div>
                <div className="dep-count">Masuk sebagai pemasukan</div>
              </div>
              <div className="dep-amount" style={{ color: '#A855F7' }}>{formatRupiah(totalDepositDamage)}</div>
            </div>
            <div className="dash-deposit-item dep-returned">
              <div className="dep-dot"></div>
              <div className="dep-info">
                <div className="dep-name">Deposit Dikembalikan</div>
                <div className="dep-count">{completedTx.length} transaksi selesai</div>
              </div>
              <div className="dep-amount" style={{ color: '#3B82F6' }}>{formatRupiah(totalDepositReturned)}</div>
            </div>
          </div>
        </div>

        <div className="dash-card dash-quick-card">
          <div className="dash-card-header">
            <div className="dash-card-title">
              <i className="fa-solid fa-bolt" style={{ color: 'var(--brand-primary)' }}></i>
              Aksi Cepat
            </div>
          </div>
          <div className="dash-quick-grid">
            <Link href="/transactions" className="dash-quick-btn q-orange">
              <i className="fa-solid fa-plus"></i>
              <div className="qbtn-label">Transaksi Baru</div>
              <div className="qbtn-sub">Catat sewa motor</div>
            </Link>
            <Link href="/availability" className="dash-quick-btn q-blue">
              <i className="fa-solid fa-circle-half-stroke"></i>
              <div className="qbtn-label">Cek Armada</div>
              <div className="qbtn-sub">Status real-time</div>
            </Link>
            <Link href="/reports?tab=investor" className="dash-quick-btn q-green">
              <i className="fa-solid fa-chart-line"></i>
              <div className="qbtn-label">Laporan Investor</div>
              <div className="qbtn-sub">Export Excel</div>
            </Link>
            <Link href="/maintenance" className="dash-quick-btn q-purple">
              <i className="fa-solid fa-robot"></i>
              <div className="qbtn-label">AI Diagnostic</div>
              <div className="qbtn-sub">Kesehatan motor</div>
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
                Transaksi Terbaru
              </div>
              <div className="dash-card-sub">5 terkini pada {periodRange.label}</div>
            </div>
            <Link href="/transactions" className="btn btn-secondary btn-sm">
              Lihat Semua <i className="fa-solid fa-arrow-right" style={{ marginLeft: '4px' }}></i>
            </Link>
          </div>

          {recentTx.length === 0 ? (
            <div className="table-empty" style={{ padding: '32px 16px' }}>
              <div className="table-empty-icon"><i className="fa-solid fa-receipt"></i></div>
              <p>Belum ada transaksi. <Link href="/transactions">Catat transaksi baru</Link></p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table table--stack-mobile" style={{ minWidth: '580px' }}>
                <thead>
                  <tr>
                    <th>Penyewa</th>
                    <th>Motor</th>
                    <th>Tanggal</th>
                    <th>Total</th>
                    <th>Status</th>
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
                      <td data-label="Status">{statusBadge(tx.status, tx.payment_status)}</td>
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
                Status Armada
              </div>
              <div className="dash-card-sub">{safeVehicles.length} unit terdaftar</div>
            </div>
            <Link href="/availability" className="btn btn-secondary btn-sm">
              Selengkapnya <i className="fa-solid fa-arrow-right" style={{ marginLeft: '4px' }}></i>
            </Link>
          </div>

          <div className="fleet-legend">
            <span className="fleet-legend-item"><span className="fleet-dot-lg" style={{ background: '#22C55E' }}></span>{availableCount} Tersedia</span>
            <span className="fleet-legend-item"><span className="fleet-dot-lg" style={{ background: '#3B82F6' }}></span>{activeCount} Disewa</span>
            <span className="fleet-legend-item"><span className="fleet-dot-lg" style={{ background: '#F59E0B' }}></span>{maintenanceCount} Servis</span>
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
                  {fleetStatusLabel(v.status)}
                </div>
              </div>
            ))}
            {safeVehicles.length === 0 && (
              <div className="table-empty" style={{ padding: '24px' }}>
                <p><Link href="/vehicles">Tambah motor pertama</Link></p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
