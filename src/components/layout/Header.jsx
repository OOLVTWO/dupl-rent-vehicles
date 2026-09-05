/* eslint-disable react-hooks/set-state-in-effect, @next/next/no-img-element */
'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import VuiVoiceControl from '@/components/dashboard/VuiVoiceControl';
import { useLanguage } from '@/lib/LanguageContext';

const pageMeta = {
  '/dashboard':   { title: 'sidebar.dashboard',       subtitle: 'pageMeta.dashboardSub' },
  '/bookings':    { title: 'sidebar.booking',         subtitle: 'pageMeta.bookingsSub' },
  '/contracts/new': { title: 'sidebar.contract',       subtitle: 'pageMeta.contractsNewSub' },
  '/contracts':   { title: 'sidebar.contractReports', subtitle: 'pageMeta.contractsSub' },
  '/transactions':{ title: 'sidebar.transactions',        subtitle: 'pageMeta.transactionsSub' },
  '/vehicles':    { title: 'sidebar.vehicleData',       subtitle: 'pageMeta.vehiclesSub' },
  '/tracking':    { title: 'sidebar.tracking',    subtitle: 'pageMeta.trackingSub' },
  '/availability':{ title: 'sidebar.availability',     subtitle: 'pageMeta.availabilitySub' },
  '/expenses':    { title: 'sidebar.finance',         subtitle: 'pageMeta.expensesSub' },
  '/maintenance': { title: 'sidebar.aiDiagnostic',    subtitle: 'pageMeta.maintenanceSub' },
  '/gallery':     { title: 'sidebar.photoGallery',      subtitle: 'pageMeta.gallerySub' },
  '/driver-income': { title: 'sidebar.incomeHistory', subtitle: 'pageMeta.driverIncomeSub' },
  '/reports':     { title: 'sidebar.financeReports', subtitle: 'pageMeta.reportsSub' },
  '/fleet':       { title: 'sidebar.publicWebsite',   subtitle: 'pageMeta.fleetSub' },
  '/customers':   { title: 'sidebar.customerData',    subtitle: 'pageMeta.customersSub' },
};

// /settings kepakai dari 3 grup sidebar yang beda (Data Master, Employee,
// Lainnya) — judulnya harus ngikutin ?tab= biar nggak selalu bilang
// "Pengaturan" padahal lagi buka Employee atau Database & Storage.
const settingsTabMeta = {
  storage:  { title: 'sidebar.databaseStorage', subtitle: 'pageMeta.settingsStorageSub' },
  staff:    { title: 'sidebar.groupEmployee',           subtitle: 'pageMeta.settingsStaffSub' },
  payment:  { title: 'sidebar.settings',         subtitle: 'pageMeta.settingsPaymentSub' },
  wacustom: { title: 'sidebar.settings',         subtitle: 'pageMeta.settingsWacustomSub' },
  security: { title: 'sidebar.settings',         subtitle: 'pageMeta.settingsSecuritySub' },
  business: { title: 'sidebar.settings',         subtitle: 'pageMeta.settingsBusinessSub' },
  delivery: { title: 'sidebar.settings',         subtitle: 'pageMeta.settingsDeliverySub' },
};

function SettingsTabWatcher({ onChange }) {
  const searchParams = useSearchParams();
  useEffect(() => { onChange(searchParams.get('tab') || ''); }, [searchParams, onChange]);
  return null;
}

export default function Header({ onToggleMobile, theme, onToggleTheme }) {
  const { lang, setLang, t } = useLanguage();
  const pathname = usePathname();
  const [settingsTab, setSettingsTab] = useState('');
  const matchedKey = Object.keys(pageMeta).find(key => pathname.startsWith(key));
  const meta = pathname.startsWith('/settings')
    ? (settingsTabMeta[settingsTab] || { title: 'sidebar.settings', subtitle: 'pageMeta.settingsDefaultSub' })
    : (pageMeta[matchedKey] || { title: 'Demo Rental Preview', subtitle: 'pageMeta.adminPanel' });
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
          <h2>{t(meta.title)}</h2>
          <p className="header-subtitle">{t(meta.subtitle)}</p>
        </div>
      </div>

      <div className="header-right-wrap">
        <VuiVoiceControl />

        {/* ── Language Toggle ── */}
        <button
          type="button"
          className="theme-dropdown-trigger"
          onClick={() => setLang(lang === 'en' ? 'id' : 'en')}
          aria-label="Ganti bahasa / Switch language"
          title="Ganti bahasa / Switch language"
          style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.3px' }}
        >
          {lang === 'en' ? 'EN' : 'ID'}
        </button>

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
