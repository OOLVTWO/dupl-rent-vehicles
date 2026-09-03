/* eslint-disable react-hooks/set-state-in-effect, @next/next/no-img-element */
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

// Kecil, dipisah biar useSearchParams() (butuh Suspense boundary) nggak
// nge-block render Sidebar utama. Dipakai buat bedain link yang share base
// path sama tapi query beda (mis. /settings?tab=storage vs ?tab=staff),
// biar highlight "active" di sidebar nggak nyala di banyak item sekaligus.
function SearchParamsWatcher({ onChange }) {
  const searchParams = useSearchParams();
  useEffect(() => { onChange(searchParams.toString()); }, [searchParams, onChange]);
  return null;
}

// ── Nav grouped by section ──
// `driverAllowed: true` = tetap muncul untuk akun role Driver.
// Item tanpa flag ini otomatis disembunyikan dari Driver (khusus Admin).
const NAV_SECTIONS = [
  {
    label: 'Operasional',
    items: [
      { href: '/dashboard', iconClass: 'fa-solid fa-chart-pie', label: 'Dashboard', driverAllowed: true },
      {
        href: '/bookings',
        iconClass: 'fa-solid fa-clipboard-list',
        label: 'Layanan Admin',
        isGroup: true,
        children: [
          { href: '/bookings',      iconClass: 'fa-solid fa-inbox',            label: 'Booking', badge: 'bookings' },
          { href: '/transactions',  iconClass: 'fa-solid fa-file-invoice-dollar', label: 'Transaksi' },
          { href: '/tracking',      iconClass: 'fa-solid fa-clock-rotate-left', label: 'Tracking Sewa', badge: 'tracking' },
          { href: '/availability',  iconClass: 'fa-solid fa-circle-half-stroke', label: 'Ketersediaan', badge: 'availability' },
          { href: '/expenses',      iconClass: 'fa-solid fa-wallet',           label: 'Keuangan' },
        ],
      },
      {
        href: '/customers',
        iconClass: 'fa-solid fa-database',
        label: 'Data Master',
        isGroup: true,
        children: [
          { href: '/customers',            iconClass: 'fa-solid fa-users',       label: 'Data Customer' },
          { href: '/vehicles',             iconClass: 'fa-solid fa-motorcycle',  label: 'Data Motor' },
          { href: '/settings?tab=storage', iconClass: 'fa-solid fa-database',    label: 'Database & Storage' },
        ],
      },
      {
        href: '/reports',
        iconClass: 'fa-solid fa-chart-line',
        label: 'Laporan',
        isGroup: true,
        children: [
          { href: '/contracts', iconClass: 'fa-solid fa-file-signature', label: 'Laporan Kontrak' },
          { href: '/reports',   iconClass: 'fa-solid fa-chart-line',     label: 'Laporan Keuangan' },
        ],
      },
      {
        href: '/settings?tab=staff',
        iconClass: 'fa-solid fa-user-tie',
        label: 'Employee',
        isGroup: true,
        children: [
          { href: '/settings?tab=staff',        iconClass: 'fa-solid fa-user-tie',           label: 'Akun Staff' },
          { href: '/contracts/new',             iconClass: 'fa-solid fa-file-pen',            label: 'Kontrak' },
          { href: '/settings?tab=staff-income', iconClass: 'fa-solid fa-sack-dollar',         label: 'Input Pendapatan' },
          { href: '/settings?tab=staff-payout', iconClass: 'fa-solid fa-hand-holding-dollar', label: 'Konfirmasi Pembayaran' },
        ],
      },
    ],
  },
  {
    label: 'Lainnya',
    items: [
      { href: '/maintenance',          iconClass: 'fa-solid fa-robot',  label: 'AI Diagnostic' },
      { href: '/gallery',              iconClass: 'fa-solid fa-images', label: 'Galeri Foto' },
      { href: '/settings?tab=payment', iconClass: 'fa-solid fa-gear',   label: 'Pengaturan' },
      { href: '/fleet', iconClass: 'fa-solid fa-globe', label: 'Website Publik', driverAllowed: true },
    ],
  },
];

// Nav khusus akun Driver — dipisah dari NAV_SECTIONS admin biar
// pengelompokannya beda (fokus ke alur kerja driver), bukan sekadar
// nyaring item admin.
const DRIVER_NAV_SECTIONS = [
  {
    label: 'Operasional',
    items: [
      { href: '/dashboard', iconClass: 'fa-solid fa-chart-pie', label: 'Dashboard' },
      {
        href: '/bookings',
        iconClass: 'fa-solid fa-user-tie',
        label: 'Layanan Driver',
        badge: 'bookings',
        isDropdown: true,
        children: [
          { href: '/bookings',      iconClass: 'fa-solid fa-inbox',           label: 'Booking' },
          { href: '/contracts/new', iconClass: 'fa-solid fa-file-signature',  label: 'Kontrak' },
          { href: '/driver-income', iconClass: 'fa-solid fa-sack-dollar',     label: 'History Pendapatan' },
          { href: '/tracking',      iconClass: 'fa-solid fa-clock-rotate-left', label: 'Tracking Sewa' },
        ],
      },
    ],
  },
  {
    label: 'Lainnya',
    items: [
      { href: '/fleet', iconClass: 'fa-solid fa-globe', label: 'Website Publik' },
    ],
  },
];

function getDaysLeft(endDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  return Math.floor((end - today) / (1000 * 60 * 60 * 24));
}

export default function Sidebar({ user, role = 'admin', mobileOpen, onClose }) {
  const pathname = usePathname();
  const router = useRouter();
  const [alertCounts, setAlertCounts] = useState({ tracking: 0, availability: 0, bookings: 0 });
  const [openDropdowns, setOpenDropdowns] = useState({});
  const [logoUrl, setLogoUrl] = useState('/images/logoCompany.png');
  const [searchString, setSearchString] = useState('');
  const currentFullPath = pathname + (searchString ? `?${searchString}` : '');

  // Item cocok dianggap "active" kalau: hrefnya nggak ada query (cukup match
  // base path), ATAU hrefnya ADA query dan itu match persis sama URL saat
  // ini (biar /settings?tab=storage dan /settings?tab=staff nggak nyala
  // bareng-bareng padahal cuma salah satunya yang lagi dibuka).
  const matchesHref = (href) => {
    const [hrefPath, hrefQuery] = href.split('?');
    if (!hrefQuery) return pathname === hrefPath || pathname.startsWith(hrefPath + '/');
    return currentFullPath === href;
  };

  // Auto-expand a dropdown/group if the current path matches one of its items
  useEffect(() => {
    const match = {};
    const walk = (items) => {
      items.forEach(item => {
        if (item.children) {
          const childMatch = item.children.some(c => matchesHref(c.href));
          if (childMatch) match[item.href] = true;
          if (item.isGroup) walk(item.children);
        }
      });
    };
    NAV_SECTIONS.forEach(section => walk(section.items));
    if (Object.keys(match).length > 0) {
      setOpenDropdowns(prev => ({ ...prev, ...match }));
    }
  }, [pathname, searchString]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('boss_rent_biz_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.logoUrl) setLogoUrl(parsed.logoUrl);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const supabase = createClient();
        const { data: activeTx } = await supabase
          .from('transactions')
          .select('end_date, vehicle_id')
          .eq('status', 'active');
        const alertCount = activeTx ? activeTx.filter(tx => getDaysLeft(tx.end_date) <= 0).length : 0;

        const { count: pendingBookings } = await supabase
          .from('bookings')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending');

        setAlertCounts({ tracking: alertCount, availability: alertCount, bookings: pendingBookings || 0 });
      } catch { /* ignore */ }
    };
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const userEmail = user?.email || 'admin@preview.com';
  const userInitial = userEmail.charAt(0).toUpperCase();

  // Render satu item nav — dipakai buat item level atas MAUPUN item di
  // dalam Group (recursive-ish lewat indent), biar nggak duplikat kode
  // buat kasus dropdown/link biasa.
  const renderNavItem = (item, indent) => {
    const isActive = item.href === '/dashboard' ? pathname === item.href : matchesHref(item.href);
    const badgeCount =
      item.badge === 'tracking' ? alertCounts.tracking
      : item.badge === 'availability' ? alertCounts.availability
      : item.badge === 'bookings' ? alertCounts.bookings
      : 0;

    // Group (mis. "Booking & Sewa", "Data Master") — kumpulan beberapa
    // fitur di 1 menu yang bisa diklik, biar sidebar nggak kepanjangan.
    if (item.isGroup) {
      const isGroupActive = item.children.some(c => matchesHref(c.href));
      const isOpen = !!openDropdowns[item.href];
      return (
        <div key={item.href}>
          <button
            type="button"
            onClick={() => setOpenDropdowns(prev => ({ ...prev, [item.href]: !prev[item.href] }))}
            className={`sidebar-nav-item sidebar-dropdown-trigger ${isGroupActive ? 'active' : ''}`}
          >
            <span className="nav-icon"><i className={item.iconClass}></i></span>
            <span style={{ flex: 1 }}>{item.label}</span>
            {badgeCount > 0 && (
              <span className="sidebar-alert-badge" style={{ marginRight: '4px' }}>
                {badgeCount > 9 ? '9+' : badgeCount}
              </span>
            )}
            <i
              className="fa-solid fa-chevron-down"
              style={{
                fontSize: '10px',
                transition: 'transform 0.22s ease',
                transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                opacity: 0.45,
              }}
            />
          </button>
          <div style={{
            overflow: 'hidden',
            maxHeight: isOpen ? '2000px' : '0px',
            transition: 'max-height 0.35s ease',
          }}>
            {item.children.map((child) => renderNavItem(child, indent + 16))}
          </div>
        </div>
      );
    }

    // Dropdown (Laporan, Data Motor, Keuangan, Pengaturan, dst)
    if (item.isDropdown) {
      const isDropdownActive = item.children.some(c => matchesHref(c.href));
      const isOpen = !!openDropdowns[item.href];
      const visibleChildren = item.children;
      return (
        <div key={item.href}>
          <button
            type="button"
            onClick={() => setOpenDropdowns(prev => ({ ...prev, [item.href]: !prev[item.href] }))}
            className={`sidebar-nav-item sidebar-dropdown-trigger ${isDropdownActive ? 'active' : ''}`}
            style={indent ? { paddingLeft: `${16 + indent}px` } : undefined}
          >
            <span className="nav-icon"><i className={item.iconClass}></i></span>
            <span style={{ flex: 1, fontSize: indent ? '13px' : undefined }}>{item.label}</span>
            {badgeCount > 0 && (
              <span className="sidebar-alert-badge" style={{ marginRight: '4px' }}>
                {badgeCount > 9 ? '9+' : badgeCount}
              </span>
            )}
            <i
              className="fa-solid fa-chevron-down"
              style={{
                fontSize: '10px',
                transition: 'transform 0.22s ease',
                transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                opacity: 0.45,
              }}
            />
          </button>
          <div style={{
            overflow: 'hidden',
            maxHeight: isOpen ? `${visibleChildren.length * 42 + 8}px` : '0px',
            transition: 'max-height 0.28s ease',
          }}>
            {visibleChildren.map((child) => (
              <Link
                key={child.href}
                href={child.href}
                className="sidebar-nav-item sidebar-child-item"
                onClick={onClose}
                style={{ paddingLeft: `${36 + indent}px` }}
              >
                <span className="nav-icon" style={{ fontSize: '12px', width: '16px' }}>
                  <i className={child.iconClass}></i>
                </span>
                <span style={{ fontSize: '12px' }}>{child.label}</span>
              </Link>
            ))}
          </div>
        </div>
      );
    }

    // Item biasa (link langsung)
    return (
      <Link
        key={item.href}
        href={item.href}
        className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
        onClick={onClose}
        style={indent ? { paddingLeft: `${16 + indent}px`, fontSize: '13px' } : undefined}
      >
        <span className="nav-icon"><i className={item.iconClass}></i></span>
        {item.label}
        {badgeCount > 0 && (
          <span className="sidebar-alert-badge">
            {badgeCount > 9 ? '9+' : badgeCount}
          </span>
        )}
      </Link>
    );
  };

  return (
    <aside className={`sidebar ${mobileOpen ? 'mobile-active' : ''}`}>
      <Suspense fallback={null}>
        <SearchParamsWatcher onChange={setSearchString} />
      </Suspense>

      {/* Mobile close button */}
      <button
        type="button"
        className="mobile-sidebar-close-btn"
        onClick={onClose}
        aria-label="Tutup Menu"
      >
        <i className="fa-solid fa-xmark"></i>
      </button>

      {/* Brand */}
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">
          <i className="fa-solid fa-motorcycle"></i>
        </div>
        <div className="sidebar-brand-text">
          <span className="sidebar-brand-name">Demo Rental Preview</span>
          <span className="sidebar-brand-sub">Pererenan, Bali</span>
        </div>
      </div>

      {/* Nav sections */}
      <nav className="sidebar-nav sidebar-nav-scroll">
        {(role === 'driver' ? DRIVER_NAV_SECTIONS : NAV_SECTIONS).map((section) => {
          const visibleItems = section.items;
          if (visibleItems.length === 0) return null;

          return (
          <div key={section.label} className="sidebar-section">
            <div className="sidebar-section-label">{section.label}</div>

            {visibleItems.map((item) => renderNavItem(item, 0))}
          </div>
          );
        })}
      </nav>

      {/* Footer: user + logout */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">{userInitial}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{userEmail}</div>
            <div className="sidebar-user-role">Administrator</div>
          </div>
        </div>
        <button
          type="button"
          className="sidebar-signout-btn"
          onClick={handleLogout}
        >
          <i className="fa-solid fa-right-from-bracket"></i>
          Keluar
        </button>
      </div>
    </aside>
  );
}
