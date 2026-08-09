'use client';

import { useMemo } from 'react';
import { formatRupiah, getLocalDateStr, toLocalDateStr, isPaidTransaction } from '@/lib/finance';

export default function StatCards({ transactions, vehicles, periodLabel, isCurrentPeriod, periodMode }) {
  const stats = useMemo(() => {
    // Tanggal lokal (WITA) — bukan UTC — agar "hari ini" akurat
    const today = getLocalDateStr();

    // `transactions` sudah difilter per periode oleh DashboardClient.
    // Hanya transaksi terbayar yang diakui sebagai pendapatan (konsisten dgn Laporan)
    const paidTx = transactions.filter(isPaidTransaction);
    const periodRevenue = paidTx.reduce((s, t) => s + Number(t.total_price || 0), 0);

    const todayTx = paidTx.filter((t) => toLocalDateStr(t.created_at) === today);
    const todayRevenue = todayTx.reduce((s, t) => s + Number(t.total_price || 0), 0);

    const activeCount = vehicles.filter((v) => v.status === 'rented').length;
    const availableCount = vehicles.filter((v) => v.status === 'available').length;
    const maintenanceCount = vehicles.filter((v) => v.status === 'maintenance').length;
    const activeTx = transactions.filter((t) => t.status === 'active').length;

    return {
      todayRevenue,
      periodRevenue,
      paidCount: paidTx.length,
      activeCount,
      availableCount,
      maintenanceCount,
      activeTx,
      totalVehicles: vehicles.length,
    };
  }, [transactions, vehicles]);

  // Kartu pendapatan: mode bulan berjalan → tampilkan "Hari Ini" (real-time).
  // Mode lain (bulan lampau / tahunan) → tampilkan total pendapatan periode tsb.
  const showToday = isCurrentPeriod && periodMode === 'month';
  const revenueCard = {
    iconClass: 'fa-solid fa-sack-dollar',
    label: showToday ? 'Pendapatan Hari Ini' : `Pendapatan ${periodLabel}`,
    value: formatRupiah(showToday ? stats.todayRevenue : stats.periodRevenue),
    iconBg: 'linear-gradient(135deg, rgba(20, 116, 107,0.2), rgba(79, 168, 157,0.15))',
    iconColor: '#4FA89D',
    change: showToday
      ? `${periodLabel}: ${formatRupiah(stats.periodRevenue)}`
      : `${stats.paidCount} transaksi terbayar`,
  };

  const cards = [
    revenueCard,
    {
      iconClass: 'fa-solid fa-key',
      label: 'Motor Sedang Disewa',
      value: stats.activeCount,
      iconBg: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(59,130,246,0.1))',
      iconColor: '#3B82F6',
      change: `${stats.activeTx} transaksi aktif`,
    },
    {
      iconClass: 'fa-solid fa-circle-check',
      label: 'Motor Tersedia',
      value: stats.availableCount,
      iconBg: 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(34,197,94,0.1))',
      iconColor: '#22C55E',
      change: `dari ${stats.totalVehicles} total motor`,
    },
    {
      iconClass: 'fa-solid fa-wrench',
      label: 'Dalam Perawatan',
      value: stats.maintenanceCount,
      iconBg: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(245,158,11,0.1))',
      iconColor: '#F59E0B',
      change: `Motor tidak beroperasi`,
    },
  ];

  return (
    <div className="grid-4 mb-6">
      {cards.map((card, i) => (
        <div key={i} className="stat-card">
          <div
            className="stat-icon"
            style={{ background: card.iconBg, color: card.iconColor }}
          >
            <i className={card.iconClass}></i>
          </div>
          <div className="stat-info">
            <div className="stat-label">{card.label}</div>
            <div className="stat-value">{card.value}</div>
            <div className="stat-change">{card.change}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
