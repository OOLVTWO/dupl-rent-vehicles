'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/lib/LanguageContext';

function formatRupiah(amount) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount || 0);
}

const ICON_OPTIONS = [
  { value: 'fa-solid fa-hard-hat', label: 'attributesPage.iconHelmet' },
  { value: 'fa-solid fa-mobile-screen', label: 'attributesPage.iconPhoneHolder' },
  { value: 'fa-solid fa-cloud-rain', label: 'attributesPage.iconRaincoat' },
  { value: 'fa-solid fa-box', label: 'attributesPage.iconBoxShad' },
  { value: 'fa-solid fa-water', label: 'attributesPage.iconSurfRack' },
  { value: 'fa-solid fa-plus', label: 'attributesPage.iconOther' },
];

function AttributeModal({ editData, onClose, onSaved }) {
  const { t } = useLanguage();
  const [form, setForm] = useState({
    name: editData?.name || '',
    quantity: editData?.quantity ?? 0,
    price: editData?.price ?? 0,
    is_auto_included: editData?.is_auto_included || false,
    sort_order: editData?.sort_order ?? 0,
    icon: editData?.icon || 'fa-solid fa-plus',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError(t('attributesPage.nameRequired'));
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
        setError(data.error || t('attributesPage.failSave'));
        setSaving(false);
        return;
      }
      onSaved(data);
    } catch {
      setError(t('attributesPage.failConnectServer'));
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{editData ? t('attributesPage.editAttribute') : t('attributesPage.addAttribute')}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">{t('attributesPage.attributeName')} <span className="required">*</span></label>
            <input
              type="text"
              className="form-control"
              placeholder={t('attributesPage.attributeNamePlaceholder')}
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t('attributesPage.icon')}</label>
            <select className="form-control" value={form.icon} onChange={(e) => handleChange('icon', e.target.value)}>
              {ICON_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{t(opt.label)}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">{t('attributesPage.stockQuantity')} <span className="required">*</span></label>
            <input
              type="number"
              min="0"
              className="form-control"
              value={form.quantity}
              onChange={(e) => handleChange('quantity', e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t('attributesPage.sortOrder')}</label>
            <input
              type="number"
              min="0"
              className="form-control"
              value={form.sort_order}
              onChange={(e) => handleChange('sort_order', e.target.value)}
            />
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', marginBottom: 0 }}>
              {t('attributesPage.sortOrderHint')}
            </p>
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
              {t('attributesPage.alwaysIncludedFree')}
            </label>
          </div>

          {!form.is_auto_included && (
            <div className="form-group">
              <label className="form-label">{t('attributesPage.extraCost')}</label>
              <input
                type="number"
                min="0"
                className="form-control"
                placeholder={t('attributesPage.extraCostPlaceholder')}
                value={form.price}
                onChange={(e) => handleChange('price', e.target.value)}
              />
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', marginBottom: 0 }}>
                {t('attributesPage.extraCostHint')}
              </p>
            </div>
          )}

          {error && (
            <div className="alert alert-danger" style={{ marginBottom: '12px' }}>
              <i className="fa-solid fa-circle-exclamation" style={{ marginRight: '6px' }}></i>{error}
            </div>
          )}

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>{t('attributesPage.cancel')}</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '6px' }}></i>{t('attributesPage.saving')}</> : t('attributesPage.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AttributesPage() {
  const { t } = useLanguage();
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
      else setError(data.error || t('attributesPage.failSave'));
    } catch {
      setError(t('attributesPage.failConnectServer'));
    }
    setLoading(false);
  }, [t]);

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
          <h2><i className="fa-solid fa-layer-group" style={{ marginRight: '8px' }}></i> {t('attributesPage.title')}</h2>
          <p>{t('attributesPage.subtitle')}</p>
        </div>
      </div>

      <button className="btn btn-primary" style={{ marginBottom: '18px' }} onClick={() => { setEditData(null); setShowModal(true); }}>
        <i className="fa-solid fa-plus" style={{ marginRight: '6px' }}></i> {t('attributesPage.addAttribute')}
      </button>

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '16px' }}>
          <i className="fa-solid fa-circle-exclamation" style={{ marginRight: '6px' }}></i>{error}
        </div>
      )}

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrapper">
          {loading ? (
            <div className="table-empty"><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '8px' }}></i> {t('attributesPage.loadingAttrData')}</div>
          ) : attributes.length === 0 ? (
            <div className="table-empty">
              <div className="table-empty-icon"><i className="fa-solid fa-layer-group"></i></div>
              <p>{t('attributesPage.noAttributesYet')}</p>
            </div>
          ) : (
            <table className="table table--stack-mobile">
              <thead>
                <tr>
                  <th>{t('attributesPage.thAttribute')}</th>
                  <th>{t('attributesPage.thType')}</th>
                  <th>{t('attributesPage.thStock')}</th>
                  <th>{t('attributesPage.thCost')}</th>
                  <th>{t('attributesPage.thActions')}</th>
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
                        <span className="badge badge-success"><i className="fa-solid fa-circle-info" style={{ marginRight: '4px' }}></i>{t('attributesPage.alwaysIncluded')}</span>
                      ) : (
                        <span className="badge badge-info"><i className="fa-solid fa-square-check" style={{ marginRight: '4px' }}></i>{t('attributesPage.optionalCheckbox')}</span>
                      )}
                    </td>
                    <td data-label="Stok">
                      <span style={{ fontWeight: 800, color: Number(attr.quantity) > 0 ? 'var(--text-primary)' : '#EF4444' }}>
                        {attr.quantity} {t('attributesPage.unit')}
                      </span>
                    </td>
                    <td data-label="Biaya">
                      {Number(attr.price) > 0 ? (
                        <strong style={{ color: '#F59E0B' }}>{formatRupiah(attr.price)}</strong>
                      ) : (
                        <span style={{ color: '#22C55E', fontWeight: 700 }}>{t('attributesPage.free')}</span>
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
              <div className="modal-title">{t('attributesPage.deleteAttribute')}</div>
              <button className="modal-close" onClick={() => setDeleteTarget(null)}>✕</button>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              {t('attributesPage.confirmDelete').split('{name}')[0]}<strong>{deleteTarget.name}</strong>{t('attributesPage.confirmDelete').split('{name}')[1]}
            </p>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>{t('attributesPage.cancel')}</button>
              <button className="btn btn-danger" disabled={busyId === deleteTarget.id} onClick={handleDelete}>
                {busyId === deleteTarget.id ? <><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '6px' }}></i>{t('attributesPage.deleting')}</> : t('attributesPage.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
