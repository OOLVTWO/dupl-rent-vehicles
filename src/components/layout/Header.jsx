/* eslint-disable react-hooks/set-state-in-effect, @next/next/no-img-element */
'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import VuiVoiceControl from '@/components/dashboard/VuiVoiceControl';

const pageMeta = {
  '/dashboard':   { title: 'Dashboard',       subtitle: 'Ringkasan statistik usaha rental' },
  '/bookings':    { title: 'Booking',         subtitle: 'Booking masuk dari website publik' },
  '/contracts/new': { title: 'Kontrak',       subtitle: 'Data diri, foto, dan tanda tangan customer' },
  '/contracts':   { title: 'Laporan Kontrak', subtitle: 'Kontrak sewa yang sudah ditandatangani' },
  '/transactions':{ title: 'Transaksi',        subtitle: 'Kelola pencatatan sewa motor' },
  '/vehicles':    { title: 'Data Motor',       subtitle: 'Manajemen armada kendaraan' },
  '/tracking':    { title: 'Tracking Sewa',    subtitle: 'Monitoring durasi sewa & pengingat WA' },
  '/availability':{ title: 'Ketersediaan',     subtitle: 'Ketersediaan armada motor real-time' },
  '/expenses':    { title: 'Keuangan',         subtitle: 'Catat pemasukan, pengeluaran & saldo bersih' },
  '/maintenance': { title: 'AI Diagnostic',    subtitle: 'Deteksi dini kesehatan motor' },
  '/gallery':     { title: 'Galeri Foto',      subtitle: 'Arsip foto identitas & kendaraan' },
  '/driver-income': { title: 'History Pendapatan', subtitle: 'Riwayat pendapatan kamu' },
  '/reports':     { title: 'Laporan Keuangan', subtitle: 'Export dan analisis pendapatan' },
  '/fleet':       { title: 'Website Publik',   subtitle: 'Katalog sewa motor publik (/fleet)' },
  '/customers':   { title: 'Data Customer',    subtitle: 'Kelola data penyewa & riwayat' },
};

// /settings kepakai dari 3 grup sidebar yang beda (Data Master, Employee,
// Lainnya) — judulnya harus ngikutin ?tab= biar nggak selalu bilang
// "Pengaturan" padahal lagi buka Employee atau Database & Storage.
const settingsTabMeta = {
  storage:  { title: 'Database & Storage', subtitle: 'Koneksi database & backup data' },
  staff:    { title: 'Employee',           subtitle: 'Kelola akun admin & driver' },
  payment:  { title: 'Pengaturan',         subtitle: 'Metode pembayaran & konfigurasi rental' },
  wacustom: { title: 'Pengaturan',         subtitle: 'Template invoice WhatsApp' },
  security: { title: 'Pengaturan',         subtitle: 'Keamanan akun & password' },
  business: { title: 'Pengaturan',         subtitle: 'Operasional rental' },
  delivery: { title: 'Pengaturan',         subtitle: 'Zona & ongkos delivery' },
};

function SettingsTabWatcher({ onChange }) {
  const searchParams = useSearchParams();
  useEffect(() => { onChange(searchParams.get('tab') || ''); }, [searchParams, onChange]);
  return null;
}

export default function Header({ onToggleMobile, theme, onToggleTheme }) {
  const pathname = usePathname();
  const [settingsTab, setSettingsTab] = useState('');
  const matchedKey = Object.keys(pageMeta).find(key => pathname.startsWith(key));
  const meta = pathname.startsWith('/settings')
    ? (settingsTabMeta[settingsTab] || { title: 'Pengaturan', subtitle: 'Koneksi database & template WA' })
    : (pageMeta[matchedKey] || { title: 'Demo Rental Preview', subtitle: 'Admin Panel' });
  const [logoUrl, setLogoUrl] = useState('/images/logoCompany.png');
  const [themeDropOpen, setThemeDropOpen] = useState(false);
  const themeRef = useRef(null);

  useEffect(() => {
    try {
      const savedBiz = localStorage.getItem('boss_rent_biz_settings');
      if (savedBiz) {
        const parsed = JSON.parse(savedBiz);
        if (parsed.logoUrl) setLogoUrl(parsed.logoUrl);
      }
    } catch { /* ignore */ }
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (themeRef.current && !themeRef.current.contains(e.target)) {
        setThemeDropOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const now = new Date();
  const dateStr = now.toLocaleDateString('id-ID', {
    weekday: 'short', month: 'short', day: 'numeric',
  });

  const isDark = theme === 'dark';

  const handleSelectTheme = (dark) => {
    if (dark !== isDark) onToggleTheme();
    setThemeDropOpen(false);
  };

  return (
    <header className="header">
      <Suspense fallback={null}>
        <SettingsTabWatcher onChange={setSettingsTab} />
      </Suspense>
      <div className="header-left-wrap">
        <button
          type="button"
          className="mobile-hamburger-btn"
          onClick={onToggleMobile}
          aria-label="Buka Menu Navigasi"
        >
          <i className="fa-solid fa-bars"></i>
        </button>
        <div className="header-title-box">
          <h2>{meta.title}</h2>
          <p className="header-subtitle">{meta.subtitle}</p>
        </div>
      </div>

      <div className="header-right-wrap">
        <VuiVoiceControl />

        {/* ── Theme Dropdown Toggle ── */}
        <div className="theme-dropdown-wrap" ref={themeRef}>
          <button
            type="button"
            className={`theme-dropdown-trigger ${themeDropOpen ? 'open' : ''}`}
            onClick={() => setThemeDropOpen(prev => !prev)}
            aria-label="Pilih tema"
            aria-expanded={themeDropOpen}
          >
            {/* Active theme icon */}
            <i className={isDark ? 'fa-solid fa-moon' : 'fa-solid fa-sun'}></i>
            {/* Chevron arrow — rotates when open */}
            <i className="fa-solid fa-chevron-down theme-dropdown-arrow"></i>
          </button>

          {themeDropOpen && (
            <div className="theme-dropdown-menu" role="menu">
              <button
                type="button"
                className={`theme-dropdown-item ${!isDark ? 'active' : ''}`}
                onClick={() => handleSelectTheme(false)}
                role="menuitem"
              >
                <i className="fa-solid fa-sun"></i>
                <span>Terang</span>
                {!isDark && <i className="fa-solid fa-check theme-check"></i>}
              </button>
              <button
                type="button"
                className={`theme-dropdown-item ${isDark ? 'active' : ''}`}
                onClick={() => handleSelectTheme(true)}
                role="menuitem"
              >
                <i className="fa-solid fa-moon"></i>
                <span>Gelap</span>
                {isDark && <i className="fa-solid fa-check theme-check"></i>}
              </button>
            </div>
          )}
        </div>

        <img src={logoUrl} alt="Demo Rental Preview" className="header-logo-img" />

        <div className="header-date">
          <i className="fa-regular fa-calendar-days" style={{ marginRight: '6px' }}></i>
          {dateStr}
        </div>
      </div>
    </header>
  );
}
