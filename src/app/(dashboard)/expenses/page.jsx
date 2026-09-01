'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { exportFinancesToExcel } from '@/lib/excel';
import { getLocalDateStr } from '@/lib/finance';
import { createClient } from '@/lib/supabase/client';
import { useRole } from '@/lib/RoleContext';

const VALID_TYPE_TABS = ['all', 'income', 'expense'];

// Reads ?tab= so the sidebar "Keuangan" dropdown links land on the right
// filter. Split out because useSearchParams() requires a Suspense boundary.
function TabFromQuery({ onTab, onCategoryReset }) {
  const searchParams = useSearchParams();
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && VALID_TYPE_TABS.includes(tab)) {
      onTab(tab);
      onCategoryReset();
    }
  }, [searchParams, onTab, onCategoryReset]);
  return null;
}

function formatRupiah(amount) {
  const cleanAmount = Math.round(Number(amount || 0));
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cleanAmount);
}

// Selectable when creating a NEW income entry. Deliberately excludes
// rental_income: motor rental revenue is already tracked automatically
// from the Transaksi (booking) system, so offering it here would let
// someone double-log it and inflate the Dashboard's total revenue.
// This is for income *outside* that flow — tips-equivalent income like
// add-on fees, delivery charges, or a forfeited deposit.
const INCOME_CATEGORIES = {
  deposit_forfeit: { label: 'Klaim Deposit / Denda Damage', icon: 'fa-solid fa-shield-halved', color: '#F59E0B' },
  addon_services: { label: 'Layanan Tambahan (Helm / Jas Hujan)', icon: 'fa-solid fa-headset', color: '#3B82F6' },
  delivery_fee: { label: 'Biaya Antar-Jemput Motor', icon: 'fa-solid fa-truck-ramp-box', color: '#8B5CF6' },
  other_income: { label: 'Pemasukan Lain-lain (mis. Tip)', icon: 'fa-solid fa-sack-dollar', color: '#10B981' },
};

// Full set including rental_income — kept only so any pre-existing
// historical entry with that category (from before this change) still
// displays with a proper label and can be filtered/found, not for
// selecting on new entries. See INCOME_CATEGORIES above for that.
const ALL_INCOME_CATEGORIES_FOR_DISPLAY = {
  rental_income: { label: 'Pendapatan Sewa Motor (Legacy)', icon: 'fa-solid fa-file-invoice-dollar', color: '#22C55E' },
  ...INCOME_CATEGORIES,
};

const EXPENSE_CATEGORIES = {
  service: { label: 'Servis & Perawatan', icon: 'fa-solid fa-wrench', color: '#EF4444' },
  sparepart: { label: 'Suku Cadang / Sparepart', icon: 'fa-solid fa-gear', color: '#F97316' },
  fuel: { label: 'Bahan Bakar', icon: 'fa-solid fa-gas-pump', color: '#EAB308' },
  salary: { label: 'Gaji Karyawan', icon: 'fa-solid fa-user-tie', color: '#EC4899' },
  other: { label: 'Pengeluaran Lain-lain', icon: 'fa-solid fa-receipt', color: '#64748B' },
};

const checkIsIncome = (item) => {
  if (!item) return false;
  if (item.type === 'income') return true;
  if (typeof item.category === 'string' && (item.category.startsWith('income_') || item.category.includes('income'))) return true;
  return false;
};

const getCleanCategoryKey = (cat) => {
  if (!cat) return 'other';
  return cat.replace(/^income_/, '');
};

const getCategoryMeta = (cat, isIncome = false) => {
  const cleanKey = getCleanCategoryKey(cat);
  if (isIncome) {
    return ALL_INCOME_CATEGORIES_FOR_DISPLAY[cleanKey] || { label: 'Pemasukan Lain-lain', icon: 'fa-solid fa-sack-dollar', color: '#22C55E' };
  }
  return EXPENSE_CATEGORIES[cleanKey] || { label: 'Pengeluaran Lain-lain', icon: 'fa-solid fa-receipt', color: '#EF4444' };
};

const SQL_MIGRATION = `-- Jalankan SQL ini di Supabase SQL Editor:
-- https://supabase.com/dashboard/project/eedrziblypwrufdzctvd/sql/new

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'expense';
UPDATE expenses SET type = 'expense' WHERE type IS NULL;
`;

// ===== FINANCIAL MODAL (PEMASUKAN & PENGELUARAN) =====
function FinanceModal({ isOpen, onClose, onSubmit, editData, defaultType = 'expense', allowIncome = true }) {
  const [form, setForm] = useState({
    type: 'expense',
    title: '',
    categoryKey: 'service',
    amount: '',
    expense_date: getLocalDateStr(),
    notes: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Defer ke microtask: hindari setState sinkron di dalam effect
    Promise.resolve().then(() => {
      if (editData) {
        const isInc = checkIsIncome(editData);
        setForm({
          type: isInc ? 'income' : 'expense',
          title: editData.title || '',
          categoryKey: getCleanCategoryKey(editData.category),
          amount: editData.amount || '',
          expense_date: editData.expense_date || getLocalDateStr(),
          notes: editData.notes || '',
        });
      } else {
        setForm({
          type: defaultType,
          title: '',
          categoryKey: defaultType === 'income' ? 'other_income' : 'service',
          amount: '',
          expense_date: getLocalDateStr(),
          notes: '',
        });
      }
    });
  }, [editData, isOpen, defaultType]);

  const handleTypeSwitch = (newType) => {
    setForm(prev => ({
      ...prev,
      type: newType,
      categoryKey: newType === 'income' ? 'other_income' : 'service'
    }));
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const isInc = form.type === 'income';
    const finalCategory = isInc ? `income_${form.categoryKey}` : form.categoryKey;

    await onSubmit({
      type: form.type,
      title: form.title,
      category: finalCategory,
      amount: Math.round(Number(String(form.amount || 0).replace(/[,.]/g, ''))) || 0,
      expense_date: form.expense_date,
      notes: form.notes
    });

    setLoading(false);
  };

  if (!isOpen) return null;

  const isIncome = form.type === 'income';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-md" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-title" style={{ color: isIncome ? '#22C55E' : '#EF4444' }}>
              {editData ? (
                <><i className="fa-solid fa-pen-to-square" style={{ marginRight: '6px' }}></i> Edit Transaksi Keuangan</>
              ) : isIncome ? (
                <><i className="fa-solid fa-circle-arrow-down" style={{ marginRight: '6px' }}></i> Tambah Pemasukan Baru</>
              ) : (
                <><i className="fa-solid fa-circle-arrow-up" style={{ marginRight: '6px' }}></i> Tambah Pengeluaran Baru</>
              )}
            </div>
            <div className="modal-subtitle">Isi data transaksi arus kas usaha Demo Rental Preview</div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* TYPE TOGGLE SWITCH */}
          <div className="form-group mb-4">
            <label className="form-label">
              <i className="fa-solid fa-right-left" style={{ marginRight: '6px' }}></i> Jenis Transaksi Keuangan <span className="required">*</span>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                type="button"
                className="btn"
                disabled={!allowIncome}
                onClick={() => handleTypeSwitch('income')}
                style={{
                  padding: '10px 14px',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '13px',
                  border: `2px solid ${isIncome ? '#22C55E' : 'var(--bg-border)'}`,
                  background: isIncome ? 'rgba(34, 197, 94, 0.15)' : 'var(--bg-elevated)',
                  color: isIncome ? '#22C55E' : 'var(--text-muted)',
                  cursor: allowIncome ? 'pointer' : 'not-allowed',
                  opacity: allowIncome ? 1 : 0.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <i className="fa-solid fa-circle-arrow-down" style={{ fontSize: '15px' }}></i>
                Pemasukan (+)
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => handleTypeSwitch('expense')}
                style={{
                  padding: '10px 14px',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '13px',
                  border: `2px solid ${!isIncome ? '#EF4444' : 'var(--bg-border)'}`,
                  background: !isIncome ? 'rgba(239, 68, 68, 0.15)' : 'var(--bg-elevated)',
                  color: !isIncome ? '#EF4444' : 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <i className="fa-solid fa-circle-arrow-up" style={{ fontSize: '15px' }}></i>
                Pengeluaran (-)
              </button>
            </div>
          </div>

          {isIncome && !editData && (
            <div className="alert alert-info" style={{ marginBottom: '16px', fontSize: '12.5px', lineHeight: 1.6 }}>
              <i className="fa-solid fa-circle-info" style={{ marginTop: '1px' }}></i>
              <span>
                Pendapatan sewa motor sudah otomatis tercatat lewat menu <strong>Transaksi</strong>. Gunakan
                form ini hanya untuk pemasukan di luar itu — misalnya tip, biaya antar-jemput, atau klaim
                deposit — supaya total pendapatan di Dashboard tidak terhitung dobel.
              </span>
            </div>
          )}

          {!isIncome && !editData && (
            <div className="alert alert-info" style={{ marginBottom: '16px', fontSize: '12.5px', lineHeight: 1.6 }}>
              <i className="fa-solid fa-circle-info" style={{ marginTop: '1px' }}></i>
              <span>
                Gunakan form ini untuk biaya operasional usaha — servis motor, suku cadang, bahan bakar,
                atau gaji karyawan. Untuk pengeluaran terkait motor tertentu, catat di sini agar bisa
                muncul di riwayat perawatan motor tersebut.
              </span>
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="fin-title">
              <i className="fa-solid fa-file-signature" style={{ marginRight: '6px' }}></i> Keterangan Transaksi <span className="required">*</span>
            </label>
            <input
              id="fin-title"
              name="title"
              type="text"
              className="form-control"
              placeholder={isIncome ? 'e.g. Sewa Helm Tambahan & Jas Hujan Turis' : 'e.g. Ganti Oli Honda Beat & Busi'}
              value={form.title}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-row cols-2">
            <div className="form-group">
              <label className="form-label" htmlFor="fin-cat">
                <i className="fa-solid fa-list" style={{ marginRight: '6px' }}></i> Kategori <span className="required">*</span>
              </label>
              <select id="fin-cat" name="categoryKey" className="form-control" value={form.categoryKey} onChange={handleChange} required>
                {isIncome ? (
                  Object.entries(INCOME_CATEGORIES).map(([key, cat]) => (
                    <option key={key} value={key}>{cat.label}</option>
                  ))
                ) : (
                  Object.entries(EXPENSE_CATEGORIES).map(([key, cat]) => (
                    <option key={key} value={key}>{cat.label}</option>
                  ))
                )}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="fin-amount">
                <i className="fa-solid fa-coins" style={{ marginRight: '6px' }}></i> Jumlah Nominal (Rp) <span className="required">*</span>
              </label>
              <input id="fin-amount" name="amount" type="number" className="form-control" placeholder="150000" min="0" value={form.amount} onChange={handleChange} required />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="fin-date">
              <i className="fa-solid fa-calendar-days" style={{ marginRight: '6px' }}></i> Tanggal Transaksi <span className="required">*</span>
            </label>
            <input id="fin-date" name="expense_date" type="date" className="form-control" value={form.expense_date} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="fin-notes">
              <i className="fa-regular fa-note-sticky" style={{ marginRight: '6px' }}></i> Catatan Tambahan
            </label>
            <textarea id="fin-notes" name="notes" className="form-control" rows={3} placeholder="Catatan opsional..." value={form.notes} onChange={handleChange} style={{ resize: 'vertical' }} />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Batal</button>
            <button
              type="submit"
              className="btn"
              disabled={loading}
              style={{
                background: isIncome ? 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)' : 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                color: '#fff',
                fontWeight: 700,
                border: 'none'
              }}
            >
              {loading ? (
                <><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '6px' }}></i> Menyimpan...</>
              ) : editData ? (
                <><i className="fa-solid fa-floppy-disk" style={{ marginRight: '6px' }}></i> Simpan Perubahan</>
              ) : isIncome ? (
                <><i className="fa-solid fa-plus" style={{ marginRight: '6px' }}></i> Simpan Pemasukan</>
              ) : (
                <><i className="fa-solid fa-plus" style={{ marginRight: '6px' }}></i> Simpan Pengeluaran</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ===== SQL MIGRATION BANNER =====
function MigrationBanner({ onCopy }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(SQL_MIGRATION);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
    if (onCopy) onCopy();
  };

  return (
    <div style={{
      background: 'rgba(239, 68, 68, 0.08)',
      border: '1px solid rgba(239, 68, 68, 0.3)',
      borderRadius: '12px',
      padding: '20px',
      marginBottom: '24px'
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
        <div style={{ fontSize: '28px', color: '#EF4444', flexShrink: 0 }}>
          <i className="fa-solid fa-circle-exclamation"></i>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: '15px', color: '#EF4444', marginBottom: '6px' }}>
            Database Belum Di-Migrate — Kolom type pada tabel expenses Belum Ada
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px', lineHeight: 1.6 }}>
            Fitur Pemasukan & Pengeluaran membutuhkan pembaruan skema database Supabase. Klik tombol di bawah untuk menyalin SQL, lalu jalankan di Supabase SQL Editor.
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={handleCopy} style={{ gap: '8px' }}>
              <i className={`fa-solid ${copied ? 'fa-check' : 'fa-copy'}`}></i>
              {copied ? 'SQL Tersalin! Tempel ke Supabase' : 'Salin SQL Migration'}
            </button>
            <a
              href="https://supabase.com/dashboard/project/eedrziblypwrufdzctvd/sql/new"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
            >
              <i className="fa-solid fa-arrow-up-right-from-square"></i>
              Buka Supabase SQL Editor
            </a>
          </div>
          <div style={{ marginTop: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '12px', maxHeight: '120px', overflow: 'auto' }}>
            <pre style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>{SQL_MIGRATION}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== CONFIRM DELETE MODAL =====
function ConfirmDeleteModal({ isOpen, onClose, onConfirm, record }) {
  if (!isOpen || !record) return null;

  const isIncome = checkIsIncome(record);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <i className="fa-solid fa-trash-can" style={{ marginRight: '6px', color: '#EF4444' }}></i> Hapus Record {isIncome ? 'Pemasukan' : 'Pengeluaran'}?
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '4px 0' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px', margin: 0 }}>
            Apakah kamu yakin ingin menghapus pencatatan {isIncome ? 'pemasukan' : 'pengeluaran'} berikut?
          </p>

          <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', borderRadius: '8px', padding: '12px 16px' }}>
            <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>{record.title}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
              <span>Tanggal: {new Date(record.expense_date).toLocaleDateString('id-ID')}</span>
              <strong style={{ color: isIncome ? '#22C55E' : '#EF4444' }}>
                {isIncome ? '+' : '-'}{formatRupiah(record.amount)}
              </strong>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Batal</button>
          <button className="btn btn-danger" onClick={() => { onConfirm(record.id); onClose(); }}>
            <i className="fa-solid fa-trash-can" style={{ marginRight: '6px' }}></i> Ya, Hapus
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== MAIN FINANCIAL MANAGEMENT PAGE =====
export default function FinancesPage() {
  const role = useRole();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [needsMigration, setNeedsMigration] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'income' | 'expense'
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [defaultModalType, setDefaultModalType] = useState('expense');
  const [editData, setEditData] = useState(null);
  const [alert, setAlert] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ open: false, data: null });

  const showAlert = (message, type = 'success') => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 4000);
  };

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const [expRes, txRes] = await Promise.all([
        fetch('/api/expenses').then(r => r.json()).catch(() => []),
        fetch('/api/transactions').then(r => r.json()).catch(() => [])
      ]);

      let manualRecords = Array.isArray(expRes) ? expRes : [];
      let txRecords = Array.isArray(txRes) ? txRes : [];

      // Fallback: jika API gagal (non-array), ambil langsung dari Supabase
      if (!Array.isArray(expRes) || !Array.isArray(txRes)) {
        try {
          const supabase = createClient();
          if (!Array.isArray(expRes)) {
            const { data: expData } = await supabase
              .from('expenses')
              .select('*')
              .order('expense_date', { ascending: false });
            manualRecords = expData || [];
          }
          if (!Array.isArray(txRes)) {
            const { data: txData } = await supabase
              .from('transactions')
              .select('*, vehicles(id, name, plate_number, rate_per_day)')
              .order('created_at', { ascending: false });
            txRecords = txData || [];
          }
        } catch (fbErr) {
          console.warn('Supabase fallback (expenses) gagal:', fbErr);
        }
      }

      // Generate auto income rows for completed rental transactions with deposit damage fee > 0
      const autoDepositIncomes = txRecords
        .filter(t => t.status === 'completed' && Number(t.damage_fee || 0) > 0)
        .map(t => ({
          id: `damage_claim_${t.id}`,
          type: 'income',
          expense_date: t.end_date ? t.end_date.split('T')[0] : (t.created_at ? t.created_at.split('T')[0] : new Date().toISOString().split('T')[0]),
          title: `Klaim Denda Kerusakan — ${t.renter_name} (${t.vehicles?.name || 'Motor'})`,
          category: 'income_deposit_forfeit',
          amount: Math.round(Number(t.damage_fee || 0)),
          notes: `Otomatis dari denda ganti rugi fisik deposit (Plat: ${t.vehicles?.plate_number || '-'})`,
          isAutoTransaction: true
        }));

      const combined = [...manualRecords, ...autoDepositIncomes].sort((a, b) => new Date(b.expense_date) - new Date(a.expense_date));
      setRecords(combined);
      setNeedsMigration(false);
    } catch (err) {
      console.error('Fetch finance records error:', err);
      setRecords([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { Promise.resolve().then(fetchRecords); }, [fetchRecords]);

  // Filtering records
  const filtered = Array.isArray(records) ? records.filter(item => {
    const isInc = checkIsIncome(item);
    const itemType = isInc ? 'income' : 'expense';
    const matchType = typeFilter === 'all' || itemType === typeFilter;
    const cleanCat = getCleanCategoryKey(item.category);
    const matchCat = categoryFilter === 'all' || cleanCat === categoryFilter || item.category === categoryFilter;
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || item.title?.toLowerCase().includes(q) || item.notes?.toLowerCase().includes(q);
    return matchType && matchCat && matchSearch;
  }) : [];

  // Financial Summary Totals (Correct Income vs Expense calculation)
  const totalIncome = records
    .filter(r => checkIsIncome(r))
    .reduce((s, r) => s + Number(r.amount || 0), 0);

  const totalExpense = records
    .filter(r => !checkIsIncome(r))
    .reduce((s, r) => s + Number(r.amount || 0), 0);

  const netBalance = totalIncome - totalExpense;

  const handleSubmit = async (formData) => {
    const url = editData ? `/api/expenses/${editData.id}` : '/api/expenses';
    const method = editData ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    const resData = await res.json();
    if (res.ok) {
      const typeLabel = formData.type === 'income' ? 'Pemasukan' : 'Pengeluaran';
      showAlert(editData ? `Record ${typeLabel} berhasil diperbarui.` : `Record ${typeLabel} baru berhasil ditambahkan.`);
      setShowModal(false);
      setEditData(null);
      fetchRecords();
    } else {
      if (resData.needsMigration) {
        setNeedsMigration(true);
        setShowModal(false);
        showAlert('Tabel database belum di-migrate. Jalankan SQL migration terlebih dahulu!', 'danger');
      } else {
        showAlert(resData.error || 'Terjadi kesalahan.', 'danger');
      }
    }
  };

  const handleDelete = async (id) => {
    const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
    if (res.ok) {
      showAlert('Record transaksi berhasil dihapus.');
      fetchRecords();
    } else {
      showAlert('Gagal menghapus record.', 'danger');
    }
  };

  const handleExportExcel = () => {
    if (!records.length) return;
    const exportMode = typeFilter; // 'all' | 'income' | 'expense'
    const defaultFilename = exportMode === 'income'
      ? 'laporan-pemasukan-boss-rent'
      : exportMode === 'expense'
        ? 'laporan-pengeluaran-boss-rent'
        : 'laporan-keuangan-lengkap-boss-rent';
    exportFinancesToExcel(records, exportMode, defaultFilename);
  };

  return (
    <div className="fade-in">
      <Suspense fallback={null}>
        <TabFromQuery onTab={setTypeFilter} onCategoryReset={() => setCategoryFilter('all')} />
      </Suspense>

      <div className="page-header">
        <div>
          <h2><i className="fa-solid fa-wallet" style={{ marginRight: '8px' }}></i> Kelola Keuangan Usaha</h2>
          <p>Catat dan pantau seluruh arus kas pemasukan, pengeluaran operasional, serta saldo bersih Demo Rental Preview</p>
        </div>
      </div>

      {alert && <div className={`alert alert-${alert.type}`}>{alert.message}</div>}

      {needsMigration && <MigrationBanner />}

      {/* Summary KPI Cards */}
      <div className="grid-3 mb-6">
        {/* Total Pemasukan Card */}
        <div className="stat-card" style={{ borderLeft: '4px solid #22C55E' }}>
          <div className="stat-icon" style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#22C55E' }}>
            <i className="fa-solid fa-circle-arrow-down"></i>
          </div>
          <div className="stat-info">
            <div className="stat-label">Total Pemasukan</div>
            <div className="stat-value" style={{ color: '#22C55E' }}>+{formatRupiah(totalIncome)}</div>
            <div className="stat-change" style={{ color: 'var(--text-muted)' }}>
              {records.filter(r => checkIsIncome(r)).length} transaksi masuk
            </div>
          </div>
        </div>

        {/* Total Pengeluaran Card */}
        <div className="stat-card" style={{ borderLeft: '4px solid #EF4444' }}>
          <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#EF4444' }}>
            <i className="fa-solid fa-circle-arrow-up"></i>
          </div>
          <div className="stat-info">
            <div className="stat-label">Total Pengeluaran</div>
            <div className="stat-value" style={{ color: '#EF4444' }}>-{formatRupiah(totalExpense)}</div>
            <div className="stat-change" style={{ color: 'var(--text-muted)' }}>
              {records.filter(r => !checkIsIncome(r)).length} transaksi keluar
            </div>
          </div>
        </div>

        {/* Saldo Net Profit Card */}
        <div className="stat-card" style={{ borderLeft: `4px solid ${netBalance >= 0 ? '#3B82F6' : '#EF4444'}` }}>
          <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3B82F6' }}>
            <i className="fa-solid fa-scale-balanced"></i>
          </div>
          <div className="stat-info">
            <div className="stat-label">Saldo / Laba Bersih</div>
            <div className="stat-value" style={{ color: netBalance >= 0 ? '#3B82F6' : '#EF4444' }}>
              {netBalance >= 0 ? '+' : ''}{formatRupiah(netBalance)}
            </div>
            <div className="stat-change" style={{ color: netBalance >= 0 ? '#22C55E' : '#EF4444', fontWeight: 600 }}>
              {netBalance >= 0 ? 'Surplus / Arus Kas Positif' : 'Defisit / Arus Kas Negatif'}
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Actions */}
      <div className="bento-card bento-table-card mb-6" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
          {/* Current filter indicator — filter is now chosen from the sidebar
              "Keuangan" dropdown, this just confirms what's showing */}
          <span className="badge" style={{
            background: 'var(--bg-elevated)', color: 'var(--brand-primary)', border: '1px solid var(--bg-border)',
            fontSize: '12.5px', padding: '6px 14px', fontWeight: 600,
          }}>
            {typeFilter === 'all' && <><i className="fa-solid fa-list-check" style={{ marginRight: '6px' }}></i>Semua Arus Kas ({records.length})</>}
            {typeFilter === 'income' && <><i className="fa-solid fa-circle-arrow-down" style={{ marginRight: '6px', color: '#22C55E' }}></i>Pemasukan (+)</>}
            {typeFilter === 'expense' && <><i className="fa-solid fa-circle-arrow-up" style={{ marginRight: '6px', color: '#EF4444' }}></i>Pengeluaran (-)</>}
          </span>

          {/* DUAL ACTION BUTTONS & EXPORT (2-COLUMN GRID ON MOBILE) */}
          <div className="fin-actions-wrap">
            <button
              className="btn btn-secondary btn-sm fin-export-btn"
              onClick={handleExportExcel}
              title="Export Laporan Keuangan ke Excel (.xlsx)"
              style={{ padding: '9px 14px', borderRadius: '12px', fontWeight: 600 }}
            >
              <i className="fa-solid fa-file-excel" style={{ marginRight: '6px', color: '#10B981' }}></i>
              Export Excel
            </button>
            {role === 'admin' && (
              <button
                className="fin-btn-income"
                onClick={() => { setEditData(null); setDefaultModalType('income'); setShowModal(true); }}
              >
                <i className="fa-solid fa-plus"></i> Tambah Pemasukan
              </button>
            )}
            <button
              className="fin-btn-expense"
              onClick={() => { setEditData(null); setDefaultModalType('expense'); setShowModal(true); }}
            >
              <i className="fa-solid fa-plus"></i> Tambah Pengeluaran
            </button>
          </div>
        </div>

        {/* SEARCH & CATEGORY FILTER */}
        <div className="filter-bar mt-4" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <div className="search-bar" style={{ flex: 1, minWidth: '220px' }}>
            <span className="search-bar-icon"><i className="fa-solid fa-magnifying-glass"></i></span>
            <input
              type="text"
              className="form-control"
              placeholder="Cari transaksi keuangan, keterangan, catatan..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <select
            className="form-control filter-select"
            style={{ width: '200px' }}
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
          >
            <option value="all">Semua Kategori</option>
            <optgroup label="Pemasukan">
              {Object.entries(ALL_INCOME_CATEGORIES_FOR_DISPLAY).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </optgroup>
            <optgroup label="Pengeluaran">
              {Object.entries(EXPENSE_CATEGORIES).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </optgroup>
          </select>
        </div>
      </div>

      {/* FINANCIAL TABLE */}
      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrapper">
          {loading ? (
            <div className="table-empty"><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '8px' }}></i> Memuat data keuangan...</div>
          ) : filtered.length === 0 ? (
            <div className="table-empty">
              <div className="table-empty-icon"><i className="fa-solid fa-wallet"></i></div>
              <p>{needsMigration ? 'Jalankan SQL migration untuk mengaktifkan fitur ini.' : 'Belum ada pencatatan transaksi keuangan'}</p>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Jenis Arus Kas</th>
                  <th>Tanggal</th>
                  <th>Keterangan</th>
                  <th>Kategori</th>
                  <th>Nominal</th>
                  <th>Catatan</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, idx) => {
                  const isInc = checkIsIncome(item);
                  const meta = getCategoryMeta(item.category, isInc);

                  return (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 700, color: 'var(--text-muted)' }}>{idx + 1}</td>
                      <td>
                        <span className={`tx-status-pill ${isInc ? 'completed' : 'cancelled'}`}>
                          <i className={`fa-solid ${isInc ? 'fa-arrow-down-left' : 'fa-arrow-up-right'}`} style={{ fontSize: '11px' }}></i>
                          {isInc ? 'Pemasukan (+)' : 'Pengeluaran (-)'}
                        </span>
                      </td>
                      <td style={{ fontSize: '12.5px', whiteSpace: 'nowrap' }}>{new Date(item.expense_date).toLocaleDateString('id-ID')}</td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <strong style={{ fontSize: '13.5px', color: 'var(--text-primary)' }}>{item.title}</strong>
                          {item.isAutoTransaction && (
                            <div>
                              <span className="badge badge-success" style={{ background: 'rgba(34, 197, 94, 0.12)', color: '#22C55E', borderColor: 'rgba(34, 197, 94, 0.35)', fontSize: '10.5px', padding: '2px 8px' }}>
                                <i className="fa-solid fa-bolt" style={{ marginRight: '4px' }}></i> Otomatis dari Transaksi Sewa
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-muted" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <i className={meta.icon} style={{ color: meta.color }}></i>
                          {meta.label}
                        </span>
                      </td>
                      <td>
                        <strong style={{ fontSize: '14px', color: isInc ? '#22C55E' : '#EF4444' }}>
                          {isInc ? '+' : '-'}{formatRupiah(item.amount)}
                        </strong>
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--text-muted)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.notes || ''}>{item.notes || '-'}</td>
                      <td>
                        <div className="flex gap-2">
                          {item.isAutoTransaction ? (
                            <span className="badge badge-muted" title="Otomatis terhubung dengan fitur transaksi sewa" style={{ fontSize: '11px', padding: '6px 10px' }}>
                              <i className="fa-solid fa-lock" style={{ marginRight: '4px' }}></i> Auto System
                            </span>
                          ) : (role === 'admin' || !isInc) ? (
                            <>
                              <button
                                className="btn btn-secondary btn-sm"
                                title="Edit Transaksi"
                                onClick={() => { setEditData(item); setShowModal(true); }}
                              >
                                <i className="fa-solid fa-pen-to-square"></i>
                              </button>
                              <button
                                className="btn btn-danger btn-sm"
                                title="Hapus Transaksi"
                                onClick={() => setDeleteModal({ open: true, data: item })}
                              >
                                <i className="fa-solid fa-trash-can"></i>
                              </button>
                            </>
                          ) : (
                            <span className="badge badge-muted" title="Staff hanya bisa melihat data pemasukan" style={{ fontSize: '11px', padding: '6px 10px' }}>
                              <i className="fa-solid fa-eye" style={{ marginRight: '4px' }}></i> Lihat saja
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <FinanceModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditData(null); }}
        onSubmit={handleSubmit}
        editData={editData}
        defaultType={defaultModalType}
        allowIncome={role === 'admin'}
      />

      <ConfirmDeleteModal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, data: null })}
        onConfirm={handleDelete}
        record={deleteModal.data}
      />
    </div>
  );
}
