'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRole } from '@/lib/RoleContext';

function formatDate(d) {
  if (!d) return '-';
  try {
    return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return d;
  }
}

function ContractDetailModal({ contract, onClose, onDelete, canDelete, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    customer_name: contract.customer_name || '',
    customer_id_number: contract.customer_id_number || '',
    customer_phone: contract.customer_phone || '',
    customer_address: contract.customer_address || '',
    vehicle_name: contract.vehicle_name || '',
    start_date: contract.start_date || '',
    end_date: contract.end_date || '',
    notes: contract.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.customer_name.trim()) { setError('Nama customer wajib diisi.'); return; }
    if (!form.start_date || !form.end_date) { setError('Tanggal wajib diisi.'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/contracts/${contract.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Gagal menyimpan perubahan.');
        setSaving(false);
        return;
      }
      onSaved(data);
      setEditing(false);
    } catch {
      setError('Gagal terhubung ke server.');
    }
    setSaving(false);
  };

  if (editing) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <div>
              <div className="modal-title"><i className="fa-solid fa-pen-to-square" style={{ marginRight: '6px' }}></i> Edit Kontrak</div>
              <div className="modal-subtitle">Foto & tanda tangan tidak bisa diubah — hanya data teksnya.</div>
            </div>
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>

          <form onSubmit={handleSave}>
            <div className="form-group">
              <label className="form-label">Nama Customer</label>
              <input type="text" className="form-control" value={form.customer_name} onChange={(e) => handleChange('customer_name', e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">No. KTP / Passport</label>
              <input type="text" className="form-control" value={form.customer_id_number} onChange={(e) => handleChange('customer_id_number', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Telepon</label>
              <input type="tel" className="form-control" value={form.customer_phone} onChange={(e) => handleChange('customer_phone', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Alamat</label>
              <textarea className="form-control" rows={2} value={form.customer_address} onChange={(e) => handleChange('customer_address', e.target.value)} style={{ resize: 'vertical' }} />
            </div>
            <div className="form-group">
              <label className="form-label">Nama Motor</label>
              <input type="text" className="form-control" value={form.vehicle_name} onChange={(e) => handleChange('vehicle_name', e.target.value)} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Tanggal Mulai</label>
                <input type="date" className="form-control" value={form.start_date} onChange={(e) => handleChange('start_date', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Tanggal Selesai</label>
                <input type="date" className="form-control" min={form.start_date} value={form.end_date} onChange={(e) => handleChange('end_date', e.target.value)} required />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Catatan</label>
              <textarea className="form-control" rows={2} value={form.notes} onChange={(e) => handleChange('notes', e.target.value)} style={{ resize: 'vertical' }} />
            </div>

            {error && (
              <div className="alert alert-danger" style={{ marginBottom: '12px' }}>
                <i className="fa-solid fa-circle-exclamation" style={{ marginRight: '6px' }}></i>{error}
              </div>
            )}

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setEditing(false)}>Batal</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '6px' }}></i>Menyimpan...</> : 'Simpan Perubahan'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-title"><i className="fa-solid fa-file-signature" style={{ marginRight: '6px' }}></i> Detail Kontrak</div>
            <div className="modal-subtitle">{contract.customer_name}</div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px' }}>Nama Customer</div>
            <div style={{ fontSize: '14px', fontWeight: 700 }}>{contract.customer_name}</div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px' }}>No. KTP / Passport</div>
            <div style={{ fontSize: '14px' }}>{contract.customer_id_number || '-'}</div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px' }}>Telepon</div>
            <div style={{ fontSize: '14px' }}>{contract.customer_phone || '-'}</div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px' }}>Alamat</div>
            <div style={{ fontSize: '14px' }}>{contract.customer_address || '-'}</div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px' }}>Motor</div>
            <div style={{ fontSize: '14px' }}>{contract.vehicle_name || '-'}</div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px' }}>Tanggal Sewa</div>
            <div style={{ fontSize: '14px' }}>{formatDate(contract.start_date)} — {formatDate(contract.end_date)}</div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px' }}>Dibuat Oleh</div>
            <div style={{ fontSize: '14px' }}>{contract.created_by_name || '-'}</div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px' }}>Waktu Dibuat</div>
            <div style={{ fontSize: '14px' }}>{new Date(contract.created_at).toLocaleString('id-ID')}</div>
          </div>
        </div>

        {contract.notes && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px' }}>Catatan</div>
            <div style={{ fontSize: '13px' }}>{contract.notes}</div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
          {contract.passport_photo_url && (
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '6px' }}>Foto Passport / KTP</div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={contract.passport_photo_url} alt="Passport" style={{ width: '100%', borderRadius: '10px', border: '1px solid var(--bg-border)' }} />
            </div>
          )}
          {contract.customer_vehicle_photo_url && (
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '6px' }}>Foto Customer + Motor</div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={contract.customer_vehicle_photo_url} alt="Customer dengan motor" style={{ width: '100%', borderRadius: '10px', border: '1px solid var(--bg-border)' }} />
            </div>
          )}
          {contract.signature_url && (
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '6px' }}>Tanda Tangan Customer</div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={contract.signature_url} alt="Tanda tangan" style={{ width: '100%', borderRadius: '10px', border: '1px solid var(--bg-border)', background: '#fff' }} />
            </div>
          )}
        </div>

        <div className="modal-footer">
          {canDelete && (
            <button className="btn btn-danger" onClick={() => onDelete(contract)}>
              <i className="fa-solid fa-trash-can" style={{ marginRight: '6px' }}></i> Hapus Kontrak
            </button>
          )}
          <button className="btn btn-secondary" onClick={() => setEditing(true)}>
            <i className="fa-solid fa-pen-to-square" style={{ marginRight: '6px' }}></i> Edit
          </button>
          <button className="btn btn-secondary" onClick={onClose}>Tutup</button>
        </div>
      </div>
    </div>
  );
}

export default function ContractsPage() {
  const role = useRole();
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');

  const fetchContracts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/contracts');
      const data = await res.json().catch(() => []);
      if (!res.ok) {
        setError(data.error || 'Gagal memuat data kontrak.');
        setContracts([]);
      } else {
        setContracts(Array.isArray(data) ? data : []);
      }
    } catch {
      setError('Gagal terhubung ke server.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    Promise.resolve().then(fetchContracts);
  }, [fetchContracts]);

  const handleDelete = async (contract) => {
    if (!confirm(`Hapus kontrak "${contract.customer_name}"? Aksi ini tidak bisa dibatalkan.`)) return;
    try {
      const res = await fetch(`/api/contracts/${contract.id}`, { method: 'DELETE' });
      if (res.ok) {
        setContracts(prev => prev.filter(c => c.id !== contract.id));
        setSelected(null);
      }
    } catch { /* ignore */ }
  };

  const filtered = contracts.filter(c => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (c.customer_name || '').toLowerCase().includes(q)
      || (c.vehicle_name || '').toLowerCase().includes(q)
      || (c.customer_id_number || '').toLowerCase().includes(q);
  });

  return (
    <div className="page-content">
      <div className="page-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '18px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>Laporan Kontrak</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Kontrak sewa yang sudah ditandatangani customer
          </p>
        </div>
        <Link href="/contracts/new" className="btn btn-primary">
          <i className="fa-solid fa-file-pen" style={{ marginRight: '6px' }}></i> Buat Kontrak Baru
        </Link>
      </div>

      <div className="form-group" style={{ maxWidth: '320px', marginBottom: '16px' }}>
        <input
          type="text"
          className="form-control"
          placeholder="Cari nama customer / motor / no. ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '16px' }}>
          <i className="fa-solid fa-circle-exclamation" style={{ marginRight: '6px' }}></i> {error}
        </div>
      )}

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrapper">
          {loading ? (
            <div className="table-empty"><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '8px' }}></i> Memuat data...</div>
          ) : filtered.length === 0 ? (
            <div className="table-empty">
              <div className="table-empty-icon"><i className="fa-solid fa-file-signature"></i></div>
              <p>Belum ada kontrak yang tercatat.</p>
            </div>
          ) : (
            <table className="table table--stack-mobile">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Motor</th>
                  <th>Tanggal Sewa</th>
                  <th>Dibuat Oleh</th>
                  <th>Dokumen</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => setSelected(c)}>
                    <td data-label="Customer" data-label-align="left">
                      <strong style={{ fontSize: '14px' }}>{c.customer_name}</strong>
                      {c.customer_id_number && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{c.customer_id_number}</div>}
                    </td>
                    <td data-label="Motor" style={{ fontSize: '13px' }}>{c.vehicle_name || '-'}</td>
                    <td data-label="Tanggal Sewa" style={{ fontSize: '12.5px' }}>{formatDate(c.start_date)} — {formatDate(c.end_date)}</td>
                    <td data-label="Dibuat Oleh" style={{ fontSize: '12.5px' }}>{c.created_by_name || '-'}</td>
                    <td data-label="Dokumen">
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {c.passport_photo_url && <span className="badge badge-muted" title="Foto Passport"><i className="fa-solid fa-id-card"></i></span>}
                        {c.customer_vehicle_photo_url && <span className="badge badge-muted" title="Foto Customer + Motor"><i className="fa-solid fa-camera"></i></span>}
                        {c.signature_url && <span className="badge badge-success" title="Tanda tangan ada"><i className="fa-solid fa-signature"></i></span>}
                      </div>
                    </td>
                    <td><i className="fa-solid fa-chevron-right" style={{ color: 'var(--text-muted)', fontSize: '12px' }}></i></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {selected && (
        <ContractDetailModal
          contract={selected}
          onClose={() => setSelected(null)}
          onDelete={handleDelete}
          canDelete={role === 'admin'}
          onSaved={(updated) => {
            setContracts(prev => prev.map(c => (c.id === updated.id ? updated : c)));
            setSelected(updated);
          }}
        />
      )}
    </div>
  );
}
