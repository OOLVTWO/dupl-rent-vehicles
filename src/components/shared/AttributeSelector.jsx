'use client';

import { useRef } from 'react';

function formatRupiah(amount) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount || 0);
}

const TEXT = {
  id: {
    heading: 'Atribut / Perlengkapan Tambahan',
    outOfStock: 'Stok Habis',
    validNote: 'Berlaku sampai pemakaian motor selesai',
    free: 'Gratis',
    noneOption: 'Tidak Perlu Atribut Tambahan',
    includedNote: (names) => <><strong>{names}</strong> sudah otomatis disertakan gratis dari Demo Rental Preview.</>,
  },
  en: {
    heading: 'Additional Equipment',
    outOfStock: 'Out of Stock',
    validNote: 'Valid until the end of your rental',
    free: 'Free',
    noneOption: "I Don't Need Any Additional Equipment",
    includedNote: (names) => <><strong>{names}</strong> {names.includes('&') || names.includes(',') ? 'are' : 'is'} automatically included free by Demo Rental Preview.</>,
  },
};

/**
 * Pemilih atribut/aksesoris motor (Surf Rack, Box Shad, Raincoat, dll) —
 * dipakai SAMA PERSIS di form booking publik dan form Transaksi admin biar
 * pengalamannya konsisten. Teks UI-nya bisa di-translate lewat prop `lang`.
 *
 * - Atribut is_auto_included (Helmet, Phone Holder) ditampilkan sebagai info
 *   text di bawah, BUKAN pilihan — karena selalu disertakan gratis.
 * - Atribut dengan max_per_booking === 1 jadi checkbox bulat biasa.
 * - Atribut dengan max_per_booking > 1 (misal Raincoat, max 2) jadi checkbox
 *   + stepper +/- begitu dicentang — minimal 1, maksimal max_per_booking,
 *   nggak bisa balik ke 0 lewat tombol minus (harus un-centang barisnya).
 * - Wajib pilih salah satu: minimal 1 atribut, ATAU opsi "Tidak Perlu
 *   Atribut Tambahan" — kalau opsi itu dicentang, semua atribut lain
 *   ke-disable & ke-reset, tapi kepilihannya sebelumnya "diingat" dan balik
 *   lagi otomatis kalau opsi itu di-uncheck.
 *
 * Props:
 *   attributes: array dari tabel vehicle_attributes (termasuk max_per_booking)
 *   quantities: { [attributeId]: number } — quantity per atribut, 0 = nggak dipilih
 *   noneChosen: boolean — apakah opsi "Tidak Perlu Atribut" lagi aktif
 *   onChange: ({ quantities, noneChosen }) => void
 *   lang: 'id' | 'en'
 */
export default function AttributeSelector({ attributes = [], quantities = {}, noneChosen = false, onChange, lang = 'id' }) {
  const t = TEXT[lang] || TEXT.id;
  const includedAttrs = attributes.filter(a => a.is_auto_included);
  const selectableAttrs = attributes.filter(a => !a.is_auto_included);
  const rememberedRef = useRef({});

  if (selectableAttrs.length === 0 && includedAttrs.length === 0) return null;

  const setQty = (attrId, newQty, max) => {
    if (noneChosen) return;
    const clamped = Math.max(0, Math.min(max, newQty));
    onChange({ quantities: { ...quantities, [attrId]: clamped }, noneChosen: false });
  };

  const toggleAttr = (attr) => {
    if (noneChosen) return;
    const current = quantities[attr.id] || 0;
    setQty(attr.id, current > 0 ? 0 : 1, attr.max_per_booking || 1);
  };

  const toggleNone = () => {
    if (noneChosen) {
      // Batal pilih "Tidak Perlu" -> balikin pilihan sebelumnya
      onChange({ quantities: rememberedRef.current || {}, noneChosen: false });
    } else {
      // Pilih "Tidak Perlu" -> simpan pilihan saat ini, lalu kosongkan
      rememberedRef.current = quantities;
      onChange({ quantities: {}, noneChosen: true });
    }
  };

  return (
    <div style={{ marginBottom: '18px' }}>
      <label style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-muted, var(--sharp-muted, #94A3B8))', marginBottom: '10px' }}>
        <i className="fa-solid fa-layer-group" style={{ marginRight: '6px' }}></i>
        {t.heading} *
      </label>

      {selectableAttrs.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '8px' }}>
          {selectableAttrs.map(attr => {
            const qty = quantities[attr.id] || 0;
            const isChecked = qty > 0;
            const hasStepper = Number(attr.max_per_booking) > 1;
            const outOfStock = Number(attr.quantity) <= 0;
            const blocked = noneChosen || outOfStock;
            return (
              <div key={attr.id}>
                <button
                  type="button"
                  disabled={blocked}
                  onClick={() => toggleAttr(attr)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px', width: '100%', textAlign: 'left',
                    padding: '12px 14px', borderRadius: hasStepper && isChecked ? '12px 12px 0 0' : '12px',
                    cursor: blocked ? 'not-allowed' : 'pointer',
                    border: isChecked ? '2px solid var(--brand-primary, var(--sharp-accent, #2563EB))' : '1px solid var(--bg-border, var(--sharp-line, #E2E8F0))',
                    borderBottom: hasStepper && isChecked ? 'none' : (isChecked ? '2px solid var(--brand-primary, var(--sharp-accent, #2563EB))' : '1px solid var(--bg-border, var(--sharp-line, #E2E8F0))'),
                    background: isChecked ? 'rgba(37,99,235,0.08)' : 'transparent',
                    opacity: blocked ? 0.5 : 1,
                    outline: 'none', WebkitAppearance: 'none', appearance: 'none', margin: 0, WebkitTapHighlightColor: 'transparent', boxShadow: 'none',
                  }}
                >
                  {/* Checkbox bulat */}
                  <span style={{
                    width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
                    border: `2px solid ${isChecked ? 'var(--brand-primary, var(--sharp-accent, #2563EB))' : 'var(--bg-border, var(--sharp-line, #E2E8F0))'}`,
                    background: isChecked ? 'var(--brand-primary, var(--sharp-accent, #2563EB))' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {isChecked && <i className="fa-solid fa-check" style={{ fontSize: '11px', color: '#fff' }}></i>}
                  </span>

                  <i className={attr.icon || 'fa-solid fa-plus'} style={{ fontSize: '15px', color: isChecked ? 'var(--brand-primary-light, var(--sharp-accent, #2563EB))' : 'var(--text-muted, var(--sharp-muted, #94A3B8))', width: '18px', textAlign: 'center', flexShrink: 0 }}></i>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary, var(--sharp-ink, #0F172A))' }}>
                      {attr.name}
                      {outOfStock && <span style={{ fontSize: '11px', color: '#EF4444', fontWeight: 700, marginLeft: '6px' }}>({t.outOfStock})</span>}
                    </div>
                    {Number(attr.price) > 0 && (
                      <div style={{ fontSize: '10.5px', color: 'var(--text-muted, var(--sharp-muted, #94A3B8))', marginTop: '1px' }}>
                        {t.validNote}
                      </div>
                    )}
                  </div>

                  <span style={{ fontSize: '12.5px', fontWeight: 800, color: Number(attr.price) > 0 ? '#F59E0B' : '#22C55E', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {Number(attr.price) > 0 ? `+${formatRupiah(attr.price)}` : t.free}
                  </span>
                </button>

                {hasStepper && isChecked && (
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px',
                    padding: '10px 14px', borderRadius: '0 0 12px 12px',
                    border: '2px solid var(--brand-primary, var(--sharp-accent, #2563EB))', borderTop: 'none',
                    background: 'rgba(37,99,235,0.04)',
                  }}>
                    <span style={{ fontSize: '11.5px', color: 'var(--text-muted, var(--sharp-muted, #94A3B8))' }}>
                      {lang === 'en' ? 'Quantity' : 'Jumlah'}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <button
                        type="button"
                        disabled={qty <= 1 || noneChosen}
                        onClick={() => setQty(attr.id, qty - 1, attr.max_per_booking)}
                        style={{
                          width: '28px', height: '28px', borderRadius: '50%', border: '1px solid var(--bg-border, var(--sharp-line, #E2E8F0))',
                          background: 'var(--bg-elevated, var(--sharp-surface-2, #F8FAFC))', color: 'var(--text-primary, var(--sharp-ink, #0F172A))',
                          cursor: qty <= 1 ? 'not-allowed' : 'pointer', opacity: qty <= 1 ? 0.4 : 1, fontWeight: 800,
                          outline: 'none', WebkitAppearance: 'none', appearance: 'none', margin: 0, WebkitTapHighlightColor: 'transparent', boxShadow: 'none', padding: 0,
                        }}
                      >−</button>
                      <strong style={{ fontSize: '14px', color: 'var(--text-primary, var(--sharp-ink, #0F172A))', minWidth: '14px', textAlign: 'center' }}>{qty}</strong>
                      <button
                        type="button"
                        disabled={qty >= Number(attr.max_per_booking) || noneChosen}
                        onClick={() => setQty(attr.id, qty + 1, attr.max_per_booking)}
                        style={{
                          width: '28px', height: '28px', borderRadius: '50%', border: '1px solid var(--brand-primary, var(--sharp-accent, #2563EB))',
                          background: 'var(--brand-primary, var(--sharp-accent, #2563EB))', color: '#fff',
                          cursor: qty >= Number(attr.max_per_booking) ? 'not-allowed' : 'pointer', opacity: qty >= Number(attr.max_per_booking) ? 0.4 : 1, fontWeight: 800,
                          outline: 'none', WebkitAppearance: 'none', appearance: 'none', margin: 0, WebkitTapHighlightColor: 'transparent', boxShadow: 'none', padding: 0,
                        }}
                      >+</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Opsi "Tidak Perlu Atribut Tambahan" — wajib pilih ini ATAU minimal 1 atribut di atas */}
      <button
        type="button"
        onClick={toggleNone}
        style={{
          display: 'flex', alignItems: 'center', gap: '12px', width: '100%', textAlign: 'left',
          padding: '12px 14px', borderRadius: '12px', cursor: 'pointer',
          border: noneChosen ? '2px solid var(--text-muted, var(--sharp-muted, #94A3B8))' : '1px dashed var(--bg-border, var(--sharp-line, #E2E8F0))',
          background: noneChosen ? 'var(--bg-elevated, var(--sharp-surface-2, #F8FAFC))' : 'transparent',
          outline: 'none', WebkitAppearance: 'none', appearance: 'none', margin: 0, WebkitTapHighlightColor: 'transparent', boxShadow: 'none',
        }}
      >
        <span style={{
          width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
          border: `2px solid ${noneChosen ? 'var(--text-muted, var(--sharp-muted, #94A3B8))' : 'var(--bg-border, var(--sharp-line, #E2E8F0))'}`,
          background: noneChosen ? 'var(--text-muted, var(--sharp-muted, #94A3B8))' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {noneChosen && <i className="fa-solid fa-check" style={{ fontSize: '11px', color: '#fff' }}></i>}
        </span>
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary, var(--sharp-ink-soft, #475569))' }}>
          {t.noneOption}
        </span>
      </button>

      {includedAttrs.length > 0 && (
        <div style={{
          marginTop: '10px', padding: '10px 12px', borderRadius: '10px',
          background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)',
          fontSize: '12px', color: '#22C55E', display: 'flex', alignItems: 'flex-start', gap: '8px',
        }}>
          <i className="fa-solid fa-circle-info" style={{ marginTop: '2px', flexShrink: 0 }}></i>
          <span>
            {t.includedNote(includedAttrs.map(a => a.name).join(' & '))}
          </span>
        </div>
      )}
    </div>
  );
}
