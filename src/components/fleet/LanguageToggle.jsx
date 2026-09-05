'use client';

import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '@/lib/LanguageContext';

/**
 * Tombol ganti bahasa untuk halaman publik — sekarang berupa dropdown
 * (bukan toggle langsung), pakai ikon "translate" universal (fa-language)
 * biar orang paham ini tombol ganti bahasa tanpa perlu baca teks dulu.
 * Klik → muncul pilihan English / Bahasa Indonesia → klik salah satu →
 * bahasa berubah & dropdown nutup. Styling meniru ThemeToggle biar
 * konsisten sebagai sepasang tombol.
 */
export default function LanguageToggle() {
  const { lang, setLang } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const options = [
    { code: 'en', label: 'English' },
    { code: 'id', label: 'Bahasa Indonesia' },
  ];

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className="theme-toggle-btn"
        aria-label="Change language / Ganti bahasa"
        title="Change language / Ganti bahasa"
        aria-expanded={open}
      >
        <i className="fa-solid fa-language" style={{ fontSize: '18px' }}></i>
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute', top: 'calc(100% + 6px)', right: 0, minWidth: '170px',
            background: 'var(--sharp-surface)', border: '1px solid var(--sharp-line-strong)',
            borderRadius: 'var(--radius-md)', boxShadow: 'var(--sharp-shadow-lg, 0 10px 25px rgba(0,0,0,0.15))',
            overflow: 'hidden', zIndex: 200,
          }}
        >
          {options.map(opt => (
            <button
              key={opt.code}
              type="button"
              role="menuitem"
              onClick={() => { setLang(opt.code); setOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
                padding: '10px 14px', fontSize: '13px', fontWeight: lang === opt.code ? 800 : 500,
                color: lang === opt.code ? 'var(--sharp-accent)' : 'var(--sharp-ink)',
                background: lang === opt.code ? 'rgba(37,99,235,0.08)' : 'transparent',
                border: 'none', cursor: 'pointer', textAlign: 'left',
              }}
            >
              {opt.label}
              {lang === opt.code && <i className="fa-solid fa-check" style={{ fontSize: '11px' }}></i>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
