/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { updateFavicon } from '@/lib/favicon';
import { RoleContext } from '@/lib/RoleContext';

export default function DashboardShell({ user, role = 'admin', fullName, children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState('light');
  const pathname = usePathname();

  // Load saved theme on mount
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('boss_rent_theme') || 'light';
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    } catch { /* ignore */ }
  }, []);

  // Sync favicon
  useEffect(() => {
    try {
      const savedBiz = localStorage.getItem('boss_rent_biz_settings');
      if (savedBiz) {
        const parsed = JSON.parse(savedBiz);
        if (parsed.logoUrl) updateFavicon(parsed.logoUrl);
      }
    } catch (e) {
      console.error('Favicon sync error:', e);
    }
  }, []);

  // Close mobile nav on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  // Prevent background scroll when mobile menu open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next = prev === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('boss_rent_theme', next); } catch { /* ignore */ }
      return next;
    });
  }, []);

  return (
    <div className="app-layout">
      {mobileOpen && (
        <div className="mobile-sidebar-backdrop" onClick={() => setMobileOpen(false)} />
      )}

      <Sidebar
        user={user}
        role={role}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      <div className="main-content">
        <Header
          user={user}
          role={role}
          fullName={fullName}
          theme={theme}
          onToggleTheme={toggleTheme}
          onToggleMobile={() => setMobileOpen(prev => !prev)}
        />
        <main className="page-content fade-in">
          <RoleContext.Provider value={role}>
            {children}
          </RoleContext.Provider>
        </main>
      </div>
    </div>
  );
}
