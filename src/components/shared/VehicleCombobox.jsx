'use client';

import { useState } from 'react';

export const BRANDS = [
  { key: 'honda',    label: 'Honda',          icon: 'fa-solid fa-motorcycle', color: '#EF4444' },
  { key: 'yamaha',   label: 'Yamaha',          icon: 'fa-solid fa-motorcycle', color: '#3B82F6' },
  { key: 'suzuki',   label: 'Suzuki',          icon: 'fa-solid fa-motorcycle', color: '#F59E0B' },
  { key: 'kawasaki', label: 'Kawasaki',        icon: 'fa-solid fa-motorcycle', color: '#22C55E' },
  { key: 'vespa',    label: 'Vespa / Piaggio', icon: 'fa-solid fa-person-biking', color: '#8B5CF6' },
  { key: 'other',    label: 'Merek Lain',      icon: 'fa-solid fa-circle-question', color: '#9898B0' },
];

function formatRupiah(amount) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount || 0);
}

// ===== BRAND-FIRST VEHICLE PICKER (Langkah 1: pilih merek, Langkah 2: pilih unit) =====
export default function VehicleCombobox({ vehicles, value, onChange, required = true }) {
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [query, setQuery] = useState('');

  const selected = vehicles.find(v => v.id === value);

  // Motor tanpa category ditampilkan di bucket 'other' bukan default 'honda',
  // supaya tidak tersembunyi dan user tetap bisa memilihnya.
  const getVehicleCategory = (v) => (v.category && v.category.trim() !== '') ? v.category : 'other';

  // Adjust state saat render (pola resmi React) — menggantikan useEffect
  const [prevSelectedId, setPrevSelectedId] = useState(null);
  const selectedId = selected?.id ?? null;
  if (selectedId !== prevSelectedId) {
    setPrevSelectedId(selectedId);
    if (selected && !selectedBrand) {
      setSelectedBrand(getVehicleCategory(selected));
    }
  }

  const brandVehicles = selectedBrand
    ? vehicles.filter(v => getVehicleCategory(v) === selectedBrand)
    : [];

  const filteredVehicles = brandVehicles.filter(v => {
    const q = query.toLowerCase();
    return !q || v.name.toLowerCase().includes(q) || (v.plate_number || '').toLowerCase().includes(q);
  });

  const brandMeta = (key) => BRANDS.find(b => b.key === key) || BRANDS[BRANDS.length - 1];

  const handleBrandSelect = (key) => {
    setSelectedBrand(key);
    setQuery('');
    if (value) {
      const currentVehicle = vehicles.find(v => v.id === value);
      if (currentVehicle && getVehicleCategory(currentVehicle) !== key) {
        onChange('');
      }
    }
  };

  const handleVehicleSelect = (id) => {
    onChange(id);
    setQuery('');
  };

  return (
    <div className="form-group">
      <label className="form-label">
        <i className="fa-solid fa-motorcycle" style={{ marginRight: '6px' }}></i>
        Pilih Kendaraan Motor {required && <span className="required">*</span>}
      </label>

      {/* STEP 1: Brand Filter Buttons */}
      <div style={{ marginBottom: '10px' }}>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '6px' }}>
          Langkah 1 — Pilih Merek Motor
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {BRANDS.map(brand => {
            const count = vehicles.filter(v => getVehicleCategory(v) === brand.key).length;
            const isActive = selectedBrand === brand.key;
            return (
              <button
                key={brand.key}
                type="button"
                onClick={() => handleBrandSelect(brand.key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: isActive ? 700 : 500,
                  border: `1px solid ${isActive ? brand.color : 'var(--bg-border)'}`,
                  background: isActive ? `${brand.color}22` : 'var(--bg-elevated)',
                  color: isActive ? brand.color : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <i className={brand.icon} style={{ fontSize: '12px' }}></i>
                {brand.label}
                {count > 0 && (
                  <span style={{
                    background: isActive ? brand.color : 'var(--bg-hover)',
                    color: isActive ? '#fff' : 'var(--text-muted)',
                    borderRadius: '20px',
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '1px 6px',
                    minWidth: '18px',
                    textAlign: 'center'
                  }}>{count}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* STEP 2: Motor List under selected brand */}
      {selectedBrand && (
        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '8px' }}>
            <i className="fa-solid fa-list" style={{ marginRight: '4px' }}></i>
            Langkah 2 — Pilih Motor {brandMeta(selectedBrand).label}
            {' '}({brandVehicles.length} unit tersedia)
          </div>

          {brandVehicles.length > 3 && (
            <div style={{ position: 'relative', marginBottom: '8px' }}>
              <input
                type="text"
                className="form-control"
                placeholder="Cari nama atau plat nomor..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                style={{ paddingLeft: '36px', fontSize: '13px' }}
              />
              <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none', fontSize: '12px' }}></i>
            </div>
          )}

          {filteredVehicles.length === 0 ? (
            <div style={{
              padding: '20px',
              textAlign: 'center',
              background: 'var(--bg-elevated)',
              borderRadius: '10px',
              border: '1px dashed var(--bg-border)',
              fontSize: '13px',
              color: 'var(--text-muted)'
            }}>
              <i className="fa-solid fa-motorcycle" style={{ fontSize: '24px', display: 'block', marginBottom: '6px', opacity: 0.4 }}></i>
              {brandVehicles.length === 0
                ? `Belum ada motor ${brandMeta(selectedBrand).label} yang tersedia.`
                : 'Tidak ada motor yang cocok dengan pencarian.'}
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '8px',
              maxHeight: '220px',
              overflowY: 'auto',
              paddingRight: '4px'
            }}>
              {filteredVehicles.map(v => {
                const isSelected = value === v.id;
                return (
                  <div
                    key={v.id}
                    onClick={() => handleVehicleSelect(v.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: `1.5px solid ${isSelected ? 'var(--brand-primary)' : 'var(--bg-border)'}`,
                      background: isSelected ? 'rgba(37, 99, 235, 0.12)' : 'var(--bg-elevated)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '6px',
                      background: 'var(--bg-hover)', overflow: 'hidden', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      {v.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={v.image_url} alt={v.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => e.target.style.display = 'none'} />
                      ) : (
                        <i className="fa-solid fa-motorcycle" style={{ fontSize: '16px', color: 'var(--brand-primary)' }}></i>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: isSelected ? 700 : 600, fontSize: '13px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {v.name}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        <span style={{ color: 'var(--brand-primary-light)', fontWeight: 600 }}>{v.plate_number}</span>{v.rate_per_day ? ` • ${formatRupiah(v.rate_per_day)}/hr` : ''}
                      </div>
                    </div>
                    {isSelected && (
                      <i className="fa-solid fa-circle-check" style={{ color: 'var(--brand-primary)', fontSize: '16px', flexShrink: 0 }}></i>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Show currently selected motor badge if brand not picked yet */}
      {selected && !selectedBrand && (
        <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
          Terpilih: <strong>{selected.name} ({selected.plate_number})</strong>
        </div>
      )}
    </div>
  );
}
