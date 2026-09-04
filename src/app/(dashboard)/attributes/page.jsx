'use client';

import { useState, useEffect, useCallback } from 'react';

function formatRupiah(amount) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount || 0);
}

const ICON_OPTIONS = [
  { value: 'fa-solid fa-hard-hat', label: 'Helm' },
  { value: 'fa-solid fa-mobile-screen', label: 'Phone Holder' },
  { value: 'fa-solid fa-cloud-rain', label: 'Jas Hujan' },
  { value: 'fa-solid fa-box', label: 'Box / Shad' },
  { value: 'fa-solid fa-water', label: 'Surf Rack' },
  { value: 'fa-solid fa-plus', label: 'Lainnya' },
];

function AttributeModal({ editData, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: editData?.name || '',
    quantity: editData?.quantity ?? 0,
    price: editData?.price ?? 0,
    is_auto_included: editData?.is_auto_included || false,
    icon: editData?.icon || 'fa-solid fa-plus',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Nama atribut wajib diisi.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const url = editData ? `/api/attributes/${editData.id}` : '/api/attributes';
      const method = editData ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          quantity: Number(form.quantity) || 0,
          price: form.is_auto_included ? 0 : (Number(form.price) || 0),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Gagal menyimpan atribut.');
        setSaving(false);
        return;
      }
      onSaved(data);
    } catch {
      setError('Gagal terhubung ke server.');
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{editData ? 'Edit Atribut' : 'Tambah Atribut'}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">Nama Atribut <span className="required">*</span></label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Box Shad, Surf Rack, Jas Hujan"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Ikon</label>
            <select className="form-control" value={form.icon} onChange={(e) => handleChange('icon', e.target.value)}>
              {ICON_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Jumlah Stok <span className="required">*</span></label>
            <input
              type="number"
              min="0"
              className="form-control"
              value={form.quantity}
              onChange={(e) => handleChange('quantity', e.target.value)}
              required
            />
          </div>

          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-elevated)', padding: '12px 14px', borderRadius: '10px' }}>
            <input
              type="checkbox"
              id="attr-auto-included"
              checked={form.is_auto_included}
              onChange={(e) => handleChange('is_auto_included', e.target.checked)}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <label htmlFor="attr-auto-included" style={{ margin: 0, fontSize: '13px', cursor: 'pointer' }}>
              Selalu disertakan gratis (tampil sebagai info, bukan checkbox pilihan di form booking)
            </label>
          </div>

          {!form.is_auto_included && (
            <div className="form-group">
              <label className="form-label">Biaya Tambahan (Rp)</label>
              <input
                type="number"
                min="0"
                className="form-control"
                placeholder="0 kalau gratis"
                value={form.price}
                onChange={(e) => handleChange('price', e.target.value)}
              />
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', marginBottom: 0 }}>
                Biaya berlaku flat sampai pemakaian motor selesai (bukan per hari). Kosongkan / isi 0 kalau gratis.
              </p>
            </div>
          )}

          {error && (
            <div className="alert alert-danger" style={{ marginBottom: '12px' }}>
              <i className="fa-solid fa-circle-exclamation" style={{ marginRight: '6px' }}></i>{error}
            </div>
          )}

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Batal</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '6px' }}></i>Menyimpan...</> : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AttributesPage() {
  const [attributes, setAttributes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const fetchAttributes = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/attributes');
      const data = await res.json().catch(() => []);
      if (res.ok) setAttributes(Array.isArray(data) ? data : []);
      else setError(data.error || 'Gagal memuat data atribut.');
    } catch {
      setError('Gagal terhubung ke server.');
    }
    setLoading(false);
  }, []);

  useEffect(() => { Promise.resolve().then(fetchAttributes); }, [fetchAttributes]);

  const handleSaved = () => {
    setShowModal(false);
    setEditData(null);
    fetchAttributes();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    try {
      await fetch(`/api/attributes/${deleteTarget.id}`, { method: 'DELETE' });
      setDeleteTarget(null);
      fetchAttributes();
    } catch { /* ignore */ }
    setBusyId(null);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2><i className="fa-solid fa-layer-group" style={{ marginRight: '8px' }}></i> Atribut Motor</h2>
          <p>Kelola aksesoris tambahan (Helm, Phone Holder, Box Shad, Surf Rack, Jas Hujan, dll) beserta stok dan harganya</p>
        </div>
      </div>

      <button className="btn btn-primary" style={{ marginBottom: '18px' }} onClick={() => { setEditData(null); setShowModal(true); }}>
        <i className="fa-solid fa-plus" style={{ marginRight: '6px' }}></i> Tambah Atribut
      </button>

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '16px' }}>
          <i className="fa-solid fa-circle-exclamation" style={{ marginRight: '6px' }}></i>{error}
        </div>
      )}

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrapper">
          {loading ? (
            <div className="table-empty"><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '8px' }}></i> Memuat data...</div>
          ) : attributes.length === 0 ? (
            <div className="table-empty">
              <div className="table-empty-icon"><i className="fa-solid fa-layer-group"></i></div>
              <p>Belum ada atribut. Klik &quot;Tambah Atribut&quot; untuk mulai.</p>
            </div>
          ) : (
            <table className="table table--stack-mobile">
              <thead>
                <tr>
                  <th>Atribut</th>
                  <th>Tipe</th>
                  <th>Stok</th>
                  <th>Biaya</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {attributes.map(attr => (
                  <tr key={attr.id}>
                    <td data-label="Atribut" data-label-align="left">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <i className={attr.icon || 'fa-solid fa-plus'} style={{ color: 'var(--brand-primary-light)', fontSize: '14px' }}></i>
                        </span>
                        <strong style={{ fontSize: '13.5px' }}>{attr.name}</strong>
                      </div>
                    </td>
                    <td data-label="Tipe" data-label-align="left">
                      {attr.is_auto_included ? (
                        <span className="badge badge-success"><i className="fa-solid fa-circle-info" style={{ marginRight: '4px' }}></i>Selalu Disertakan</span>
                      ) : (
                        <span className="badge badge-info"><i className="fa-solid fa-square-check" style={{ marginRight: '4px' }}></i>Opsional (Checkbox)</span>
                      )}
                    </td>
                    <td data-label="Stok">
                      <span style={{ fontWeight: 800, color: Number(attr.quantity) > 0 ? 'var(--text-primary)' : '#EF4444' }}>
                        {attr.quantity} unit
                      </span>
                    </td>
                    <td data-label="Biaya">
                      {Number(attr.price) > 0 ? (
                        <strong style={{ color: '#F59E0B' }}>{formatRupiah(attr.price)}</strong>
                      ) : (
                        <span style={{ color: '#22C55E', fontWeight: 700 }}>Gratis</span>
                      )}
                    </td>
                    <td data-label="Aksi" data-label-align="left">
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => { setEditData(attr); setShowModal(true); }}
                        >
                          <i className="fa-solid fa-pen"></i>
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          disabled={busyId === attr.id}
                          onClick={() => setDeleteTarget(attr)}
                        >
                          <i className="fa-solid fa-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showModal && (
        <AttributeModal
          editData={editData}
          onClose={() => { setShowModal(false); setEditData(null); }}
          onSaved={handleSaved}
        />
      )}

      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Hapus Atribut?</div>
              <button className="modal-close" onClick={() => setDeleteTarget(null)}>✕</button>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Yakin mau hapus <strong>{deleteTarget.name}</strong>? Booking/transaksi yang sudah memilih atribut ini tetap menyimpan datanya, cuma nggak akan muncul lagi sebagai pilihan baru.
            </p>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>Batal</button>
              <button className="btn btn-danger" disabled={busyId === deleteTarget.id} onClick={handleDelete}>
                {busyId === deleteTarget.id ? <><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '6px' }}></i>Menghapus...</> : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
