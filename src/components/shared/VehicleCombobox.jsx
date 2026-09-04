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

// ===== VEHICLE PICKER — DROPDOWN MEREK, LALU DROPDOWN MOTOR =====
export default function VehicleCombobox({ vehicles, value, onChange, required = true }) {
  const [selectedBrand, setSelectedBrand] = useState(null);

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

  const brandMeta = (key) => BRANDS.find(b => b.key === key) || BRANDS[BRANDS.length - 1];

  const handleBrandSelect = (key) => {
    setSelectedBrand(key);
    if (value) {
      const currentVehicle = vehicles.find(v => v.id === value);
      if (currentVehicle && getVehicleCategory(currentVehicle) !== key) {
        onChange('');
      }
    }
  };

  return (
    <div className="form-group">
      <label className="form-label">
        <i className="fa-solid fa-motorcycle" style={{ marginRight: '6px' }}></i>
        Pilih Kendaraan Motor {required && <span className="required">*</span>}
      </label>

      {/* Dropdown Merek */}
      <select
        className="form-control"
        value={selectedBrand || ''}
        onChange={(e) => handleBrandSelect(e.target.value)}
        style={{ marginBottom: selectedBrand ? '10px' : 0 }}
      >
        <option value="">Pilih Merek Motor...</option>
        {BRANDS.map(brand => {
          const count = vehicles.filter(v => getVehicleCategory(v) === brand.key).length;
          return (
            <option key={brand.key} value={brand.key}>
              {brand.label}{count > 0 ? ` (${count} unit)` : ''}
            </option>
          );
        })}
      </select>

      {/* Dropdown Motor dari merek terpilih */}
      {selectedBrand && (
        brandVehicles.length === 0 ? (
          <div style={{
            padding: '14px', textAlign: 'center', background: 'var(--bg-elevated)', borderRadius: '10px',
            border: '1px dashed var(--bg-border)', fontSize: '12.5px', color: 'var(--text-muted)',
          }}>
            Belum ada motor {brandMeta(selectedBrand).label} yang tersedia.
          </div>
        ) : (
          <select
            className="form-control"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
          >
            <option value="">Pilih Motor {brandMeta(selectedBrand).label}...</option>
            {brandVehicles.map(v => (
              <option key={v.id} value={v.id}>
                {v.name} — {v.plate_number}{v.rate_per_day ? ` (${formatRupiah(v.rate_per_day)}/hr)` : ''}
              </option>
            ))}
          </select>
        )
      )}

      {/* Tampilkan motor terpilih kalau merek belum dipilih (misal saat edit) */}
      {selected && !selectedBrand && (
        <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
          Terpilih: <strong>{selected.name} ({selected.plate_number})</strong>
        </div>
      )}
    </div>
  );
}
