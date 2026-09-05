'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import { translations } from './translations';

const STORAGE_KEY = 'app_language';

export const LanguageContext = createContext({
  lang: 'en',
  setLang: () => {},
  t: (key) => key,
});

/**
 * Provider bahasa untuk seluruh aplikasi (publik + admin + driver).
 * Bahasa disimpan di localStorage supaya konsisten antar halaman & sesi.
 * Kamus terjemahan ada di src/lib/translations.js, terorganisir per
 * namespace (common, fleet, booking, admin, dst) supaya bisa ditambah
 * bertahap tanpa mengganggu bagian yang sudah ada.
 */
export function LanguageProvider({ children, defaultLang = 'en' }) {
  const [lang, setLangState] = useState(() => {
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
      if (saved === 'en' || saved === 'id') return saved;
    } catch { /* ignore */ }
    return defaultLang;
  });

  const setLang = useCallback((newLang) => {
    setLangState(newLang);
    try { localStorage.setItem(STORAGE_KEY, newLang); } catch { /* ignore */ }
  }, []);

  const t = useCallback((key) => {
    const parts = key.split('.');
    let node = translations[lang];
    for (const p of parts) node = node?.[p];
    if (typeof node === 'string') return node;

    // Fallback ke English kalau key belum ada terjemahan Indonesia-nya
    let fallback = translations.en;
    for (const p of parts) fallback = fallback?.[p];
    return typeof fallback === 'string' ? fallback : key;
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
