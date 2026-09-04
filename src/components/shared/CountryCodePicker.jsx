'use client';

import { useState } from 'react';
import { COUNTRY_CODES, getFlagImageUrl } from '@/lib/countryCodes';

// ===== SEARCHABLE COUNTRY CODE PICKER WITH FLAG CDN =====
// Dipakai di form Transaksi, Customer, dan Booking biar konsisten — sebelumnya
// ada 2 copy terpisah di transactions/page.jsx dan customers/page.jsx, dan
// EditBookingModal di bookings/page.jsx malah nggak punya sama sekali (cuma
// input polos tanpa kode negara).
export default function CountryCodePicker({ value, onChange, lang = 'id' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const t = lang === 'en'
    ? { searchPlaceholder: 'Search 221 countries / codes...', noResults: 'No results found' }
    : { searchPlaceholder: 'Cari 221 negara / kode...', noResults: 'Tidak ditemukan' };

  const currentCountry = COUNTRY_CODES.find(c => c.code === value) || COUNTRY_CODES[0];

  const filtered = COUNTRY_CODES.filter(c =>
    c.country.toLowerCase().includes(search.toLowerCase()) ||
    c.code.includes(search)
  );

  return (
    <div style={{ position: 'relative', width: '108px', flexShrink: 0 }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="form-control"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '4px',
          fontWeight: 600,
          cursor: 'pointer',
          padding: '8px 8px',
          background: 'var(--bg-elevated)',
          borderColor: 'var(--bg-border)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0 }}>
          <img
            src={getFlagImageUrl(currentCountry.iso)}
            alt={currentCountry.country}
            style={{ width: '18px', height: '13px', borderRadius: '2px', objectFit: 'cover', flexShrink: 0 }}
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <span style={{ fontSize: '13px', whiteSpace: 'nowrap' }}>{currentCountry.code}</span>
        </div>
        <i className={`fa-solid fa-chevron-${isOpen ? 'up' : 'down'}`} style={{ fontSize: '10px', color: 'var(--text-muted)', flexShrink: 0 }}></i>
      </button>

      {isOpen && (
        <>
          <div onClick={() => setIsOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }}></div>
          <div style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            width: '270px',
            maxHeight: '280px',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--brand-primary)',
            borderRadius: '10px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.35)',
            zIndex: 9999,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ padding: '8px', borderBottom: '1px solid var(--bg-border)' }}>
              <input
                type="text"
                className="form-control"
                placeholder={t.searchPlaceholder}
                value={search}
                onChange={e => setSearch(e.target.value)}
                autoFocus
                style={{ fontSize: '12px', padding: '6px 10px' }}
              />
            </div>

            <div style={{ overflowY: 'auto', flex: 1, padding: '4px' }}>
              {filtered.length === 0 ? (
                <div style={{ padding: '12px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
                  {t.noResults}
                </div>
              ) : (
                filtered.map(c => {
                  const isSelected = c.code === value;
                  return (
                    <div
                      key={`${c.iso}-${c.code}`}
                      onClick={() => {
                        onChange(c.code);
                        setIsOpen(false);
                        setSearch('');
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        background: isSelected ? 'rgba(37, 99, 235, 0.15)' : 'transparent',
                        color: isSelected ? 'var(--brand-primary-light)' : 'var(--text-primary)',
                        fontSize: '12px',
                        fontWeight: isSelected ? 700 : 500
                      }}
                    >
                      <img
                        src={getFlagImageUrl(c.iso)}
                        alt={c.country}
                        style={{ width: '20px', height: '14px', borderRadius: '2px', objectFit: 'cover' }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                      <strong style={{ minWidth: '42px' }}>{c.code}</strong>
                      <span style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.country}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
