'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getWhatsAppShareUrl, getWaReminderTemplate } from '@/lib/countryCodes';
import { useRole } from '@/lib/RoleContext';

const VALID_TRACKING_TABS = ['all', 'overdue', 'critical', 'upcoming'];

// Reads ?tab= so the sidebar "Tracking Sewa" dropdown links land on the
// right filter. Split out because useSearchParams() requires a Suspense
// boundary.
function TabFromQuery({ onTab }) {
  const searchParams = useSearchParams();
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && VALID_TRACKING_TABS.includes(tab)) onTab(tab);
  }, [searchParams, onTab]);
  return null;
}

// ─── Helpers ───────────────────────────────────────────────────────────────
function formatRupiah(amount) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount || 0);
}

function formatDateTime(dateStr, createdTime) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (createdTime) {
    const c = new Date(createdTime);
    if (!isNaN(c.getTime())) {
      d.setHours(c.getHours(), c.getMinutes());
    }
  }
  const datePart = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  const timePart = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  return `${datePart} (${timePart})`;
}

function getExactTargetDate(tx) {
  if (!tx) return new Date();
  const endDate = new Date(tx.end_date || tx.start_date);

  if (tx.created_at) {
    const created = new Date(tx.created_at);
    if (!isNaN(created.getTime())) {
      endDate.setHours(created.getHours(), created.getMinutes(), created.getSeconds(), created.getMilliseconds());
      return endDate;
    }
  }

  // Default ke 23:59:59 jika created_at tidak tersedia
  endDate.setHours(23, 59, 59, 999);
  return endDate;
}

function getExactStartDate(tx) {
  if (!tx) return new Date();
  if (tx.created_at) {
    const created = new Date(tx.created_at);
    if (!isNaN(created.getTime())) return created;
  }
  const startDate = new Date(tx.start_date);
  startDate.setHours(0, 0, 0, 0);
  return startDate;
}

function getDaysLeft(target) {
  const now = new Date();
  const targetEnd = typeof target === 'object' && target !== null ? getExactTargetDate(target) : (() => {
    const d = new Date(target);
    d.setHours(23, 59, 59, 999);
    return d;
  })();

  const diffMs = targetEnd - now;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function getCountdown(tx) {
  const now = new Date();
  const targetEnd = typeof tx === 'object' && tx !== null ? getExactTargetDate(tx) : (() => {
    const d = new Date(tx);
    d.setHours(23, 59, 59, 999);
    return d;
  })();

  const diff = targetEnd - now;
  if (diff <= 0) return null;

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return { days, hours, minutes, seconds, diff };
}

function getBizSettings() {
  if (typeof window === 'undefined') return {};
  try {
    const saved = localStorage.getItem('boss_rent_biz_settings');
    return saved ? JSON.parse(saved) : {};
  } catch { return {}; }
}

function generateReminderText(tx, vehicle, type) {
  const biz = getBizSettings();
  const shopName = biz.name || 'Demo Rental Preview';
  const shopPhone = biz.phone || '+62 812-3456-7890';
  const shopLocation = biz.location || 'Jl. Pantai Pererenan, Canggu, Badung, Bali';
  const daysLeft = getDaysLeft(tx);
  const overdueAbs = Math.abs(daysLeft);

  const formatEnDate = (dStr) => dStr ? new Date(dStr).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';

  const statusText = type === 'overdue'
    ? `⛔ OVERDUE ${overdueAbs} day(s)`
    : type === 'today'
    ? '🔔 Ending TODAY'
    : type === 'tomorrow'
    ? '⏳ 1 day left (ends tomorrow)'
    : `⏳ ${daysLeft} days remaining`;

  const template = getWaReminderTemplate();

  return template
    .replaceAll('{RENTER_NAME}', tx.renter_name || 'Customer')
    .replaceAll('{RENTER_PHONE}', tx.renter_phone || '-')
    .replaceAll('{VEHICLE_NAME}', vehicle?.name || 'Motorbike')
    .replaceAll('{PLATE_NUMBER}', vehicle?.plate_number || '-')
    .replaceAll('{START_DATE}', formatEnDate(tx.start_date))
    .replaceAll('{END_DATE}', formatEnDate(tx.end_date))
    .replaceAll('{TIME_LEFT_STATUS}', statusText)
    .replaceAll('{SHOP_NAME}', shopName)
    .replaceAll('{SHOP_LOCATION}', shopLocation)
    .replaceAll('{SHOP_PHONE}', shopPhone);
}

function classifyTx(tx) {
  const targetEnd = getExactTargetDate(tx);
  const now = new Date();
  if (now > targetEnd) return 'overdue';

  const days = getDaysLeft(tx);
  if (days <= 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days <= 7) return 'upcoming';
  return 'future';
}

// ─── Countdown Display ─────────────────────────────────────────────────────
function CountdownTimer({ tx }) {
  const [countdown, setCountdown] = useState(null);

  useEffect(() => {
    const update = () => setCountdown(getCountdown(tx));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [tx]);

  const targetEnd = getExactTargetDate(tx);
  const now = new Date();
  const isOverdue = now > targetEnd;

  if (isOverdue) {
    const overdueMs = now - targetEnd;
    const overdueHours = Math.floor(overdueMs / (1000 * 60 * 60));
    const overdueDays = Math.floor(overdueHours / 24);
    const overdueText = overdueDays > 0 ? `${overdueDays} HARI ${overdueHours % 24} JAM` : `${overdueHours} JAM`;

    return (
      <div className="countdown-display overdue">
        <div className="countdown-overdue-badge">
          <i className="fa-solid fa-triangle-exclamation"></i>
          <span>OVERDUE {overdueText}</span>
        </div>
      </div>
    );
  }

  if (!countdown) {
    return (
      <div className="countdown-display overdue">
        <div className="countdown-overdue-badge">
          <i className="fa-solid fa-triangle-exclamation"></i>
          <span>BERAKHIR SEKARANG</span>
        </div>
      </div>
    );
  }

  return (
    <div className="countdown-display">
      <div className="countdown-units">
        <div className="countdown-unit">
          <span className="countdown-value">{String(countdown.days).padStart(2, '0')}</span>
          <span className="countdown-label">Hari</span>
        </div>
        <div className="countdown-separator">:</div>
        <div className="countdown-unit">
          <span className="countdown-value">{String(countdown.hours).padStart(2, '0')}</span>
          <span className="countdown-label">Jam</span>
        </div>
        <div className="countdown-separator">:</div>
        <div className="countdown-unit">
          <span className="countdown-value">{String(countdown.minutes).padStart(2, '0')}</span>
          <span className="countdown-label">Mnt</span>
        </div>
        <div className="countdown-separator">:</div>
        <div className="countdown-unit">
          <span className="countdown-value">{String(countdown.seconds).padStart(2, '0')}</span>
          <span className="countdown-label">Dtk</span>
        </div>
      </div>
    </div>
  );
}

// ─── Tracking Card ──────────────────────────────────────────────────────────
function TrackingCard({ tx, vehicle, onComplete, role }) {
  const [copied, setCopied] = useState(false);
  const [confirmSelesai, setConfirmSelesai] = useState(false);
  const [completing, setCompleting] = useState(false);
  const type = classifyTx(tx);
  const daysLeft = getDaysLeft(tx);

  // "now" yang ticking via state — Date.now() tidak boleh dipanggil langsung saat render (purity).
  // Progress bar tetap hidup: refresh tiap 30 detik.
  const [nowTs, setNowTs] = useState(null);
  useEffect(() => {
    const update = () => setNowTs(Date.now());
    Promise.resolve().then(update);
    const t = setInterval(update, 30000);
    return () => clearInterval(t);
  }, []);

  const categoryMeta = {
    overdue: { label: 'Overdue', color: '#EF4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)', icon: 'fa-solid fa-circle-exclamation', pulse: true },
    today: { label: 'Hari Ini', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)', icon: 'fa-solid fa-bell', pulse: true },
    tomorrow: { label: 'Besok', color: '#F59E0B', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)', icon: 'fa-solid fa-clock', pulse: false },
    upcoming: { label: `${daysLeft} Hari Lagi`, color: '#3B82F6', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.2)', icon: 'fa-solid fa-calendar-days', pulse: false },
    future: { label: `${daysLeft} Hari Lagi`, color: '#22C55E', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.2)', icon: 'fa-solid fa-calendar-check', pulse: false },
  };
  const meta = categoryMeta[type];

  const reminderText = generateReminderText(tx, vehicle, type);
  const waUrl = getWhatsAppShareUrl(tx.renter_phone, reminderText);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(reminderText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  // Progress bar for time elapsed using exact creation timestamp
  const startD = getExactStartDate(tx);
  const endD = getExactTargetDate(tx);
  const totalMs = endD - startD;
  const elapsedMs = (nowTs ?? startD.getTime()) - startD;
  const progress = totalMs > 0 ? Math.min(100, Math.max(0, (elapsedMs / totalMs) * 100)) : 0;
  const isOverProgress = progress >= 100;

  return (
    <div className="tracking-card" style={{ borderColor: meta.border, background: `linear-gradient(145deg, var(--bg-card), ${meta.bg})` }}>
      {/* Top Badge */}
      <div className="tracking-card-top">
        <div className="tracking-status-badge" style={{ color: meta.color, background: meta.bg, borderColor: meta.border }}>
          <i className={`${meta.icon} ${meta.pulse ? 'fa-beat' : ''}`}></i>
          <span>{meta.label}</span>
        </div>
        <div className="tracking-vehicle-info">
          <i className="fa-solid fa-motorcycle" style={{ color: meta.color }}></i>
          <span>{vehicle?.name || 'Motor'}</span>
          <span className="tracking-plate">{vehicle?.plate_number || '-'}</span>
        </div>
      </div>

      {/* Renter Info */}
      <div className="tracking-renter">
        <div className="tracking-renter-avatar" style={{ background: `linear-gradient(135deg, ${meta.color}, ${meta.border})` }}>
          <i className="fa-solid fa-user"></i>
        </div>
        <div className="tracking-renter-info">
          <div className="tracking-renter-name">{tx.renter_name}</div>
          <div className="tracking-renter-phone">
            <i className="fa-solid fa-phone" style={{ fontSize: '10px', color: '#22C55E' }}></i>
            {tx.renter_phone}
          </div>
        </div>
        <div className="tracking-dates">
          <div className="tracking-date-row" title="Waktu Mulai Sewa (Jam Transaksi)">
            <i className="fa-solid fa-calendar-plus" style={{ color: '#9898B0', fontSize: '11px' }}></i>
            <span>{formatDateTime(tx.start_date, tx.created_at)}</span>
          </div>
          <div className="tracking-date-arrow">
            <i className="fa-solid fa-arrow-down" style={{ color: '#9898B0', fontSize: '10px' }}></i>
          </div>
          <div className="tracking-date-row" style={{ color: meta.color, fontWeight: 600 }} title="Waktu Selesai Sewa (Persis Jam yang sama)">
            <i className="fa-solid fa-calendar-xmark" style={{ fontSize: '11px' }}></i>
            <span>{formatDateTime(tx.end_date, tx.created_at)}</span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="tracking-progress-wrap">
        <div className="tracking-progress-labels">
          <span><i className="fa-solid fa-hourglass-start" style={{ fontSize: '10px', marginRight: '4px' }}></i>Mulai</span>
          <span style={{ color: isOverProgress ? '#EF4444' : meta.color }}>
            {isOverProgress ? 'Sudah Berakhir' : `${Math.round(progress)}% berjalan`}
          </span>
          <span><i className="fa-solid fa-flag-checkered" style={{ fontSize: '10px', marginRight: '4px' }}></i>Selesai</span>
        </div>
        <div className="tracking-progress-bar">
          <div
            className="tracking-progress-fill"
            style={{
              width: `${progress}%`,
              background: isOverProgress
                ? 'linear-gradient(90deg, #EF4444, #DC2626)'
                : `linear-gradient(90deg, ${meta.color}, ${meta.border})`
            }}
          ></div>
        </div>
      </div>

      {/* Countdown */}
      <CountdownTimer tx={tx} />

      {/* Action Buttons — admin only, driver fokus ke countdown aja */}
      {role === 'admin' && (
        <div className="tracking-actions">
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="tracking-btn-wa"
          >
            <i className="fa-brands fa-whatsapp"></i>
            <span>Kirim Reminder WA</span>
          </a>
          <button className="tracking-btn-copy" onClick={handleCopy} title="Salin teks pesan">
            <i className={copied ? 'fa-solid fa-check' : 'fa-solid fa-copy'}></i>
            <span>{copied ? 'Tersalin!' : 'Salin Teks'}</span>
          </button>
        </div>
      )}

      {/* Selesai Sewa Button — admin only, sama kayak aksi tulis lain di app ini */}
      {role === 'admin' && (!confirmSelesai ? (
        <button
          onClick={() => setConfirmSelesai(true)}
          style={{
            width: '100%', marginTop: '10px', padding: '10px 16px',
            borderRadius: '10px', border: '1.5px solid rgba(34,197,94,0.5)',
            background: 'rgba(34,197,94,0.08)', color: '#22C55E',
            fontWeight: 700, fontSize: '13px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            transition: 'all 0.2s ease'
          }}
        >
          <i className="fa-solid fa-flag-checkered"></i>
          Selesai Sewa (Manual)
        </button>
      ) : (
        <div style={{
          marginTop: '10px', padding: '12px', borderRadius: '10px',
          border: '1.5px solid rgba(34,197,94,0.5)', background: 'rgba(34,197,94,0.08)'
        }}>
          <div style={{ fontSize: '12px', color: '#22C55E', fontWeight: 700, marginBottom: '8px', textAlign: 'center' }}>
            <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '5px', color: '#F59E0B' }}></i>
            Yakin selesaikan sewa ini? Motor akan langsung jadi <strong>Tersedia</strong>.
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setConfirmSelesai(false)}
              style={{
                flex: 1, padding: '8px', borderRadius: '8px',
                border: '1px solid var(--bg-border)', background: 'var(--bg-elevated)',
                color: 'var(--text-secondary)', fontWeight: 600, fontSize: '12px', cursor: 'pointer'
              }}
            >Batal</button>
            <button
              disabled={completing}
              onClick={async () => {
                setCompleting(true);
                await onComplete(tx.id, tx.vehicle_id);
                setCompleting(false);
                setConfirmSelesai(false);
              }}
              style={{
                flex: 2, padding: '8px', borderRadius: '8px',
                border: 'none', background: '#22C55E',
                color: '#fff', fontWeight: 700, fontSize: '12px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
              }}
            >
              {completing
                ? <><i className="fa-solid fa-spinner fa-spin"></i> Memproses...</>
                : <><i className="fa-solid fa-flag-checkered"></i> Ya, Selesaikan!</>}
            </button>
          </div>
        </div>
      ))}

      {/* Preview message on hover (expandable) — admin only */}
      {role === 'admin' && (
        <details className="tracking-msg-preview">
          <summary>
            <i className="fa-solid fa-eye" style={{ marginRight: '6px' }}></i>
            Lihat Preview Pesan WA
          </summary>
          <pre className="tracking-msg-text">{reminderText}</pre>
        </details>
      )}
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────
export default function TrackingPage() {
  const role = useRole();
  const [transactions, setTransactions] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [search, setSearch] = useState('');
  const refreshRef = useRef(null);

  const loadData = useCallback(async () => {
    const supabase = createClient();
    const [{ data: txData }, { data: vData }] = await Promise.all([
      supabase
        .from('transactions')
        .select('*, vehicles(id, name, plate_number, category, rate_per_day)')
        .eq('status', 'active')
        .order('end_date', { ascending: true }),
      supabase.from('vehicles').select('*'),
    ]);
    const validTxData = (txData || []).filter(tx => tx.vehicles && tx.vehicles.id);
    setTransactions(validTxData);
    setVehicles(vData || []);
    setLastRefresh(new Date());
    setLoading(false);
  }, []);

  const handleCompleteTracking = useCallback(async (txId, vehicleId) => {
    try {
      // Coba via API route dulu
      const txRes = await fetch(`/api/transactions/${txId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed', km_end: 0 }),
      });

      if (!txRes.ok) {
        // Fallback: update langsung via Supabase jika API gagal
        console.warn('API PUT gagal, fallback ke direct Supabase update');
        const supabase = createClient();
        const { error: txError } = await supabase
          .from('transactions')
          .update({ status: 'completed', km_end: 0 })
          .eq('id', txId);
        if (txError) throw txError;
        // Update vehicle status langsung
        if (vehicleId) {
          const { error: vError } = await supabase
            .from('vehicles')
            .update({ status: 'available' })
            .eq('id', vehicleId);
          if (vError) console.warn('Vehicle fallback update error:', vError);
        }
      }
      // Jika API berhasil, vehicle status sudah di-update oleh route [id]

      // Reload tracking data
      await loadData();
    } catch (err) {
      console.error('Error completing tracking rental:', err);
      alert('Gagal menyelesaikan sewa. Coba lagi.');
    }
  }, [loadData]);

  useEffect(() => {
    // Defer ke microtask: hindari setState sinkron di dalam effect
    Promise.resolve().then(loadData);
    refreshRef.current = setInterval(loadData, 60000);
    return () => clearInterval(refreshRef.current);
  }, [loadData]);

  // Build vehicle lookup
  const vehicleMap = Object.fromEntries((vehicles || []).map(v => [v.id, v]));

  // Classify & filter
  const enriched = (transactions || []).map(tx => {
    const vehicle = tx.vehicles || vehicleMap[tx.vehicle_id];
    const type = classifyTx(tx);
    const daysLeft = getDaysLeft(tx.end_date);
    return { tx, vehicle, type, daysLeft };
  });

  const filtered = enriched.filter(({ tx, vehicle, type }) => {
    const q = search.toLowerCase();
    const matchSearch = !q || (tx.renter_name || '').toLowerCase().includes(q)
      || (tx.renter_phone || '').toLowerCase().includes(q)
      || (vehicle?.name || '').toLowerCase().includes(q)
      || (vehicle?.plate_number || '').toLowerCase().includes(q);

    const matchFilter = filter === 'all'
      || (filter === 'overdue' && type === 'overdue')
      || (filter === 'critical' && (type === 'today' || type === 'tomorrow'))
      || (filter === 'upcoming' && (type === 'upcoming' || type === 'future'));

    return matchSearch && matchFilter;
  });

  // Stats
  const overdueCnt = enriched.filter(e => e.type === 'overdue').length;
  const criticalCnt = enriched.filter(e => e.type === 'today' || e.type === 'tomorrow').length;
  const upcomingCnt = enriched.filter(e => e.type === 'upcoming').length;

  const FILTERS = [
    { key: 'all', label: 'Semua', icon: 'fa-solid fa-list', count: enriched.length },
    { key: 'overdue', label: 'Overdue', icon: 'fa-solid fa-circle-exclamation', count: overdueCnt, color: '#EF4444' },
    { key: 'critical', label: 'Kritis', icon: 'fa-solid fa-bell', count: criticalCnt, color: '#F59E0B' },
    { key: 'upcoming', label: 'Akan Datang', icon: 'fa-solid fa-calendar-days', count: upcomingCnt, color: '#3B82F6' },
  ];

  return (
    <div className="page-content">
      <Suspense fallback={null}>
        <TabFromQuery onTab={setFilter} />
      </Suspense>

      {/* ── Page Header ── */}
      <div className="tracking-page-header">
        <div className="tracking-header-left">
          <div className="tracking-header-icon">
            <i className="fa-solid fa-clock-rotate-left"></i>
          </div>
          <div>
            <h2>Tracking Sewa Motor</h2>
            <p>Monitor masa sewa aktif & kirim pengingat ke customer via WhatsApp</p>
          </div>
        </div>
        <div className="tracking-header-right">
          <div className="tracking-refresh-info">
            <i className="fa-solid fa-rotate" style={{ fontSize: '11px', color: '#22C55E' }}></i>
            <span>Auto-refresh tiap 60 detik</span>
            <span className="tracking-refresh-time">
              {lastRefresh.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
          <button className="btn-refresh" onClick={loadData}>
            <i className="fa-solid fa-arrows-rotate"></i> Refresh
          </button>
        </div>
      </div>

      {/* ── Summary Stats ── */}
      <div className="tracking-stats-row">
        <div className="tracking-stat overdue-stat">
          <div className="tracking-stat-icon"><i className="fa-solid fa-circle-exclamation fa-beat"></i></div>
          <div>
            <div className="tracking-stat-val">{overdueCnt}</div>
            <div className="tracking-stat-label">Overdue</div>
          </div>
        </div>
        <div className="tracking-stat critical-stat">
          <div className="tracking-stat-icon"><i className="fa-solid fa-bell fa-shake"></i></div>
          <div>
            <div className="tracking-stat-val">{criticalCnt}</div>
            <div className="tracking-stat-label">Kritis (Hari ini/Besok)</div>
          </div>
        </div>
        <div className="tracking-stat upcoming-stat">
          <div className="tracking-stat-icon"><i className="fa-solid fa-calendar-days"></i></div>
          <div>
            <div className="tracking-stat-val">{upcomingCnt}</div>
            <div className="tracking-stat-label">Akan Datang (2-7 Hari)</div>
          </div>
        </div>
        <div className="tracking-stat total-stat">
          <div className="tracking-stat-icon"><i className="fa-solid fa-motorcycle"></i></div>
          <div>
            <div className="tracking-stat-val">{enriched.length}</div>
            <div className="tracking-stat-label">Total Aktif</div>
          </div>
        </div>
      </div>

      {/* ── Filters & Search ── */}
      <div className="tracking-controls">
        {/* Current filter indicator — filter is now chosen from the
            sidebar "Tracking Sewa" dropdown, this just confirms what's showing */}
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
            placeholder="Cari nama, HP, atau motor..."
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

      {/* ── Content ── */}
      {loading ? (
        <div className="tracking-loading">
          <i className="fa-solid fa-spinner fa-spin-pulse" style={{ fontSize: '32px', color: 'var(--brand-primary)' }}></i>
          <p>Memuat data sewa aktif...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="tracking-empty">
          <i className="fa-solid fa-motorcycle" style={{ fontSize: '48px', color: 'var(--text-muted)', marginBottom: '16px' }}></i>
          <h3>Tidak ada data</h3>
          <p>{enriched.length === 0 ? 'Tidak ada transaksi sewa aktif saat ini.' : 'Tidak ada transaksi yang sesuai filter.'}</p>
          {search && <button className="btn-refresh" onClick={() => setSearch('')} style={{ marginTop: '12px' }}>
            <i className="fa-solid fa-xmark"></i> Reset Pencarian
          </button>}
        </div>
      ) : (
        <>
          <div className="tracking-results-info">
            <i className="fa-solid fa-list-check" style={{ color: 'var(--brand-primary)' }}></i>
            Menampilkan <strong>{filtered.length}</strong> dari <strong>{enriched.length}</strong> transaksi aktif
          </div>
          <div className="tracking-grid">
            {filtered.map(({ tx, vehicle }) => (
              <TrackingCard key={tx.id} tx={tx} vehicle={vehicle} onComplete={handleCompleteTracking} role={role} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
