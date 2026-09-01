/* eslint-disable react-hooks/set-state-in-effect, @next/next/no-img-element */
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useState, useEffect } from 'react';

// ── Nav grouped by section ──
// `driverAllowed: true` = tetap muncul untuk akun role Driver.
// Item tanpa flag ini otomatis disembunyikan dari Driver (khusus Admin).
const NAV_SECTIONS = [
  {
    label: 'Operasional',
    items: [
      { href: '/dashboard',    iconClass: 'fa-solid fa-chart-pie',           label: 'Dashboard' },
      {
        href: '/bookings',
        iconClass: 'fa-solid fa-inbox',
        label: 'Booking Confirmation',
        badge: 'bookings',
        isDropdown: true,
        driverAllowed: true,
        children: [
          { href: '/bookings?tab=all',       iconClass: 'fa-solid fa-list',              label: 'Semua' },
          { href: '/bookings?tab=pending',   iconClass: 'fa-solid fa-hourglass-half',    label: 'Pending' },
          { href: '/bookings?tab=confirmed', iconClass: 'fa-solid fa-circle-check',      label: 'Confirmed' },
          { href: '/bookings?tab=completed', iconClass: 'fa-solid fa-flag-checkered',    label: 'Completed' },
          { href: '/bookings?tab=cancelled', iconClass: 'fa-solid fa-circle-xmark',      label: 'Cancelled' },
        ],
      },
      { href: '/transactions', iconClass: 'fa-solid fa-file-invoice-dollar', label: 'Transaksi',      badge: null, driverAllowed: true },
      {
        href: '/contracts',
        iconClass: 'fa-solid fa-file-signature',
        label: 'Kontrak',
        driverAllowed: true,
        isDropdown: true,
        children: [
          { href: '/contracts',     iconClass: 'fa-solid fa-list',        label: 'Laporan Kontrak' },
          { href: '/contracts/new', iconClass: 'fa-solid fa-file-pen',    label: 'Buat Kontrak Baru' },
        ],
      },
      {
        href: '/customers',
        iconClass: 'fa-solid fa-users',
        label: 'Data Customer',
        isDropdown: true,
        children: [
          { href: '/customers?tab=all',    iconClass: 'fa-solid fa-users',      label: 'Semua Customer' },
          { href: '/customers?tab=repeat', iconClass: 'fa-solid fa-crown',      label: 'Repeat Customer' },
          { href: '/customers?tab=new',    iconClass: 'fa-solid fa-user-plus',  label: 'Customer Baru' },
        ],
      },
      {
        href: '/vehicles',
        iconClass: 'fa-solid fa-motorcycle',
        label: 'Data Motor',
        isDropdown: true,
        children: [
          { href: '/vehicles?tab=all',            iconClass: 'fa-solid fa-motorcycle',    label: 'Semua Unit Armada' },
          { href: '/vehicles?tab=internal',       iconClass: 'fa-solid fa-building',      label: 'Milik Internal' },
          { href: '/vehicles?tab=investor',       iconClass: 'fa-solid fa-crown',         label: 'Milik Investor' },
          { href: '/vehicles?tab=investor_recap', iconClass: 'fa-solid fa-address-card',  label: 'Directory & Rekap Investor' },
        ],
      },
      {
        href: '/tracking',
        iconClass: 'fa-solid fa-clock-rotate-left',
        label: 'Tracking Sewa',
        badge: 'tracking',
        isDropdown: true,
        driverAllowed: true,
        children: [
          { href: '/tracking?tab=all',      iconClass: 'fa-solid fa-list',              label: 'Semua' },
          { href: '/tracking?tab=overdue',  iconClass: 'fa-solid fa-circle-exclamation', label: 'Overdue' },
          { href: '/tracking?tab=critical', iconClass: 'fa-solid fa-bell',               label: 'Kritis' },
          { href: '/tracking?tab=upcoming', iconClass: 'fa-solid fa-calendar-days',      label: 'Akan Datang' },
        ],
      },
      {
        href: '/availability',
        iconClass: 'fa-solid fa-circle-half-stroke',
        label: 'Ketersediaan',
        badge: 'availability',
        isDropdown: true,
        driverAllowed: true,
        children: [
          { href: '/availability?tab=all',         iconClass: 'fa-solid fa-grip',              label: 'Semua Armada' },
          { href: '/availability?tab=available',   iconClass: 'fa-solid fa-circle-check',      label: 'Tersedia' },
          { href: '/availability?tab=rented',      iconClass: 'fa-solid fa-key',                label: 'Disewa' },
          { href: '/availability?tab=overdue',     iconClass: 'fa-solid fa-circle-exclamation', label: 'Overdue' },
          { href: '/availability?tab=maintenance', iconClass: 'fa-solid fa-wrench',             label: 'Perawatan' },
        ],
      },
    ],
  },
  {
    label: 'Keuangan',
    items: [
      {
        href: '/expenses',
        iconClass: 'fa-solid fa-wallet',
        label: 'Keuangan',
        isDropdown: true,
        driverAllowed: true,
        children: [
          { href: '/expenses?tab=all',     iconClass: 'fa-solid fa-list-check',        label: 'Semua Arus Kas' },
          { href: '/expenses?tab=income',  iconClass: 'fa-solid fa-circle-arrow-down', label: 'Pemasukan (+)' },
          { href: '/expenses?tab=expense', iconClass: 'fa-solid fa-circle-arrow-up',   label: 'Pengeluaran (-)' },
        ],
      },
      {
        href: '/reports',
        iconClass: 'fa-solid fa-chart-line',
        label: 'Laporan',
        isDropdown: true,
        children: [
          { href: '/reports?tab=income',      iconClass: 'fa-solid fa-sack-dollar',         label: 'Pemasukan (Sewa)' },
          { href: '/reports?tab=expenses',    iconClass: 'fa-solid fa-money-bill-transfer', label: 'Pengeluaran' },
          { href: '/reports?tab=profit_loss', iconClass: 'fa-solid fa-calculator',          label: 'Laba Rugi' },
          { href: '/reports?tab=investor',    iconClass: 'fa-solid fa-crown',               label: 'Bagi Hasil Investor' },
        ],
      },
    ],
  },
  {
    label: 'Tools',
    items: [
      {
        href: '/maintenance',
        iconClass: 'fa-solid fa-robot',
        label: 'AI Diagnostic',
        isDropdown: true,
        children: [
          { href: '/maintenance?tab=diagnostics', iconClass: 'fa-solid fa-robot',              label: 'Skor Kesehatan' },
          { href: '/maintenance?tab=history',     iconClass: 'fa-solid fa-clock-rotate-left',  label: 'Riwayat Servis' },
          { href: '/maintenance?tab=reports',     iconClass: 'fa-solid fa-clipboard-list',     label: 'Keluhan Pelanggan' },
        ],
      },
      { href: '/gallery',     iconClass: 'fa-solid fa-images', label: 'Galeri Foto' },
    ],
  },
  {
    label: 'Lainnya',
    items: [
      {
        href: '/settings',
        iconClass: 'fa-solid fa-gear',
        label: 'Pengaturan',
        isDropdown: true,
        children: [
          { href: '/settings?tab=storage',  iconClass: 'fa-solid fa-database',       label: 'Database & Storage' },
          { href: '/settings?tab=payment',  iconClass: 'fa-solid fa-credit-card',    label: 'Metode Pembayaran' },
          { href: '/settings?tab=wacustom', iconClass: 'fa-brands fa-whatsapp',      label: 'Template Invoice WA' },
          { href: '/settings?tab=security', iconClass: 'fa-solid fa-shield-halved', label: 'Keamanan & Password' },
          { href: '/settings?tab=business', iconClass: 'fa-solid fa-sliders',        label: 'Operasional Rental' },
          { href: '/settings?tab=staff',    iconClass: 'fa-solid fa-user-tie',       label: 'Akun Staff' },
        ],
      },
      { href: '/fleet', iconClass: 'fa-solid fa-globe', label: 'Website Publik', driverAllowed: true },
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

  // Auto-expand a dropdown if the current path matches one of its items
  useEffect(() => {
    const match = {};
    NAV_SECTIONS.forEach(section => {
      section.items.forEach(item => {
        if (item.isDropdown && pathname.startsWith(item.href)) {
          match[item.href] = true;
        }
      });
    });
    if (Object.keys(match).length > 0) {
      setOpenDropdowns(prev => ({ ...prev, ...match }));
    }
  }, [pathname]);

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

  return (
    <aside className={`sidebar ${mobileOpen ? 'mobile-active' : ''}`}>

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
        {NAV_SECTIONS.map((section) => {
          const visibleItems = role === 'driver'
            ? section.items.filter(item => item.driverAllowed)
            : section.items;
          if (visibleItems.length === 0) return null;

          return (
          <div key={section.label} className="sidebar-section">
            <div className="sidebar-section-label">{section.label}</div>

            {visibleItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/') ||
                (item.href !== '/dashboard' && pathname.startsWith(item.href.split('?')[0]));
              const badgeCount =
                item.badge === 'tracking' ? alertCounts.tracking
                : item.badge === 'availability' ? alertCounts.availability
                : item.badge === 'bookings' ? alertCounts.bookings
                : 0;

              // Dropdown (Laporan, Data Motor, Keuangan, Pengaturan)
              if (item.isDropdown) {
                const isDropdownActive = pathname.startsWith(item.href);
                const isOpen = !!openDropdowns[item.href];
                return (
                  <div key={item.href}>
                    <button
                      type="button"
                      onClick={() => setOpenDropdowns(prev => ({ ...prev, [item.href]: !prev[item.href] }))}
                      className={`sidebar-nav-item sidebar-dropdown-trigger ${isDropdownActive ? 'active' : ''}`}
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
                      maxHeight: isOpen ? `${item.children.length * 42 + 8}px` : '0px',
                      transition: 'max-height 0.28s ease',
                    }}>
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className="sidebar-nav-item sidebar-child-item"
                          onClick={onClose}
                          style={{ paddingLeft: '36px' }}
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

              // Regular item
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                  onClick={onClose}
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
            })}
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
