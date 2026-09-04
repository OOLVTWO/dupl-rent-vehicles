'use client';

function formatRupiah(amount) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount || 0);
}

/**
 * Pemilih atribut/aksesoris motor (Surf Rack, Box Shad, Jas Hujan, dll) —
 * dipakai SAMA PERSIS di form booking publik dan form Transaksi admin biar
 * pengalamannya konsisten.
 *
 * - Atribut is_auto_included (Helm, Phone Holder) ditampilkan sebagai info
 *   text di bawah, BUKAN checkbox — karena selalu disertakan gratis.
 * - Atribut lainnya jadi checkbox bulat yang bisa dicentang lebih dari satu.
 *   Yang berbayar dikasih catatan "berlaku sampai motor dikembalikan".
 *
 * Props:
 *   attributes: array dari tabel vehicle_attributes
 *   selectedIds: array of attribute id yang lagi dicentang
 *   onChange: (newSelectedIds) => void
 */
export default function AttributeSelector({ attributes = [], selectedIds = [], onChange }) {
  const includedAttrs = attributes.filter(a => a.is_auto_included);
  const selectableAttrs = attributes.filter(a => !a.is_auto_included);

  const toggle = (id) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(x => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  if (attributes.length === 0) return null;

  return (
    <div style={{ marginBottom: '18px' }}>
      <label style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-muted, var(--sharp-muted, #94A3B8))', marginBottom: '10px' }}>
        <i className="fa-solid fa-layer-group" style={{ marginRight: '6px' }}></i>
        Atribut / Perlengkapan Tambahan
      </label>

      {selectableAttrs.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {selectableAttrs.map(attr => {
            const isChecked = selectedIds.includes(attr.id);
            const outOfStock = Number(attr.quantity) <= 0;
            return (
              <button
                key={attr.id}
                type="button"
                disabled={outOfStock}
                onClick={() => toggle(attr.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px', width: '100%', textAlign: 'left',
                  padding: '12px 14px', borderRadius: '12px', cursor: outOfStock ? 'not-allowed' : 'pointer',
                  border: isChecked ? '2px solid var(--brand-primary, var(--sharp-accent, #2563EB))' : '1px solid var(--bg-border, var(--sharp-line, #E2E8F0))',
                  background: isChecked ? 'rgba(37,99,235,0.08)' : 'var(--bg-elevated, var(--sharp-surface-2, #F8FAFC))',
                  opacity: outOfStock ? 0.5 : 1,
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
                    {outOfStock && <span style={{ fontSize: '11px', color: '#EF4444', fontWeight: 700, marginLeft: '6px' }}>(Stok Habis)</span>}
                  </div>
                  {Number(attr.price) > 0 && (
                    <div style={{ fontSize: '10.5px', color: 'var(--text-muted, var(--sharp-muted, #94A3B8))', marginTop: '1px' }}>
                      Berlaku sampai pemakaian motor selesai
                    </div>
                  )}
                </div>

                <span style={{ fontSize: '12.5px', fontWeight: 800, color: Number(attr.price) > 0 ? '#F59E0B' : '#22C55E', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {Number(attr.price) > 0 ? `+${formatRupiah(attr.price)}` : 'Gratis'}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {includedAttrs.length > 0 && (
        <div style={{
          marginTop: selectableAttrs.length > 0 ? '10px' : 0, padding: '10px 12px', borderRadius: '10px',
          background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)',
          fontSize: '12px', color: '#22C55E', display: 'flex', alignItems: 'flex-start', gap: '8px',
        }}>
          <i className="fa-solid fa-circle-info" style={{ marginTop: '2px', flexShrink: 0 }}></i>
          <span>
            <strong>{includedAttrs.map(a => a.name).join(' & ')}</strong> sudah otomatis disertakan gratis untuk setiap penyewaan.
          </span>
        </div>
      )}
    </div>
  );
}
