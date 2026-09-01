'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { fetchCustomers } from '@/lib/customers';

// ===== SMART CHOOSE: auto-fill data dari customer yang sudah pernah menyewa =====
export default function CustomerPickerCombobox({ onSelectCustomer, label = 'Auto-Fill Customer Terdaftar' }) {
  const [customers, setCustomers] = useState([]);
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedCust, setSelectedCust] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const supabase = createClient();
        const data = await fetchCustomers(supabase);
        setCustomers(data || []);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    }
    load();
  }, []);

  const filtered = customers.filter(c => {
    const q = query.toLowerCase();
    return !q ||
      c.name.toLowerCase().includes(q) ||
      (c.phone && c.phone.toLowerCase().includes(q)) ||
      (c.id_number && c.id_number.toLowerCase().includes(q));
  });

  const handlePick = (cust) => {
    setSelectedCust(cust);
    onSelectCustomer(cust);
    setQuery('');
    setIsOpen(false);
  };

  return (
    <div style={{ marginBottom: '16px', background: 'rgba(37, 99, 235, 0.06)', border: '1px solid rgba(37, 99, 235, 0.25)', borderRadius: '12px', padding: '12px' }}>
      <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--brand-primary-light)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span><i className="fa-solid fa-users" style={{ marginRight: '6px' }}></i> {label}</span>
        <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 500 }}>{customers.length} customer tersimpan</span>
      </div>

      <div style={{ position: 'relative' }}>
        <input
          type="text"
          className="form-control"
          placeholder="Cari nama, WA, atau KTP customer pernah menyewa untuk auto-fill..."
          value={query}
          onChange={e => { setQuery(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          style={{ fontSize: '13px', paddingLeft: '36px', background: 'var(--bg-elevated)' }}
        />
        <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '13px' }}></i>

        {isOpen && (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 998 }} onClick={() => setIsOpen(false)}></div>
            <div className="autofill-dropdown-list" style={{
              position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
              maxHeight: '220px', overflowY: 'auto', background: 'var(--bg-card)',
              border: '1.5px solid var(--brand-primary)', borderRadius: '10px',
              zIndex: 999, boxShadow: '0 12px 35px rgba(0,0,0,0.35)', padding: '6px'
            }}>
              {loading ? (
                <div style={{ padding: '12px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>Memuat data customer...</div>
              ) : filtered.length === 0 ? (
                <div style={{ padding: '12px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
                  Tidak ada customer cocok. Isi data manual di bawah untuk customer baru.
                </div>
              ) : (
                filtered.map(c => (
                  <div
                    key={c.id}
                    onClick={() => handlePick(c)}
                    style={{
                      padding: '8px 12px', borderRadius: '8px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      marginBottom: '4px', background: 'var(--bg-elevated)', transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-hover)', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {c.customer_image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={c.customer_image_url} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <i className="fa-solid fa-user" style={{ fontSize: '14px', color: 'var(--brand-primary)' }}></i>
                        )}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {c.name}
                          {(c.total_rentals || 0) > 1 && (
                            <span style={{ fontSize: '9px', background: 'rgba(59, 130, 246, 0.2)', color: '#60A5FA', padding: '1px 6px', borderRadius: '10px', fontWeight: 700 }}>
                              <i className="fa-solid fa-crown" style={{ marginRight: '2px' }}></i> Loyal ({c.total_rentals}x)
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          WA: <span style={{ color: '#22C55E' }}>{c.phone}</span> {c.id_number ? `• KTP: ${c.id_number}` : ''}
                        </div>
                      </div>
                    </div>

                    <button type="button" className="btn btn-secondary btn-sm" style={{ fontSize: '11px', padding: '4px 10px' }}>
                      Pilih Auto-Fill
                    </button>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {selectedCust && (
        <div style={{ marginTop: '8px', fontSize: '12px', color: '#22C55E', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span><i className="fa-solid fa-circle-check" style={{ marginRight: '6px' }}></i> Terpilih: <strong>{selectedCust.name}</strong> ({selectedCust.phone})</span>
          <button type="button" onClick={() => setSelectedCust(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '11px', textDecoration: 'underline' }}>Reset</button>
        </div>
      )}
    </div>
  );
}
