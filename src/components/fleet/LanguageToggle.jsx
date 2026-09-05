'use client';

import { useLanguage } from '@/lib/LanguageContext';

/**
 * Tombol ganti bahasa (English / Indonesia) untuk halaman publik.
 * Styling meniru ThemeToggle biar konsisten sebagai sepasang tombol.
 */
export default function LanguageToggle() {
  const { lang, setLang } = useLanguage();
  const isEn = lang === 'en';

  return (
    <button
      type="button"
      onClick={() => setLang(isEn ? 'id' : 'en')}
      className="theme-toggle-btn"
      aria-label={isEn ? 'Switch to Bahasa Indonesia' : 'Ganti ke English'}
      title={isEn ? 'Switch to Bahasa Indonesia' : 'Ganti ke English'}
      style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.3px' }}
    >
      {isEn ? 'EN' : 'ID'}
    </button>
  );
}
