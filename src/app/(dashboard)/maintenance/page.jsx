'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { analyzeVehicleHealth } from '@/lib/aiDiagnostic';

const VALID_MAINT_TABS = ['diagnostics', 'history', 'reports'];

// Reads ?tab= so the sidebar "AI Diagnostic" dropdown links land on the
// right section. Split out because useSearchParams() requires a Suspense
// boundary.
function TabFromQuery({ onTab }) {
  const searchParams = useSearchParams();
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && VALID_MAINT_TABS.includes(tab)) onTab(tab);
  }, [searchParams, onTab]);
  return null;
}

function formatRupiah(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount || 0);
}

// ===== MODAL CATAT SERVIS / PERBAIKAN SELESAI =====
function ResolveMaintenanceModal({ isOpen, onClose, onConfirm, vehicle }) {
  const [cost, setCost] = useState('0');
  const [notes, setNotes] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // Take dynamic AI action items from vehicle analysis
  const actionItems = (vehicle?.aiActionItems && vehicle.aiActionItems.length > 0)
    ? vehicle.aiActionItems
    : [
        { id: 'oli_mesin_std', label: 'Ganti Oli Mesin (MPX2 / Yamalube)', category: 'Perawatan Rutin (KM)', estimatedCost: 65000, reason: 'Perawatan berkala rutin', recommended: true },
        { id: 'oli_gardan_std', label: 'Ganti Oli Gardan / Transmission Oil', category: 'Perawatan Rutin (KM)', estimatedCost: 25000, reason: 'Perawatan berkala rutin', recommended: true },
        { id: 'servis_cvt_std', label: 'Pembersihan & Greasing CVT', category: 'Transmisi CVT', estimatedCost: 80000, reason: 'Pemeriksaan rutin CVT', recommended: false },
        { id: 'poles_bodi_std', label: 'Perbaikan Bodi Lecet / Poles Bodi', category: 'Bodi & Estetika', estimatedCost: 150000, reason: 'Perbaikan kosmetik', recommended: false }
      ];

  // Reset form saat modal dibuka untuk motor tertentu — pola resmi React
  // "adjust state during render" (menggantikan useEffect + setState sinkron)
  const [prevModalKey, setPrevModalKey] = useState(null);
  const modalKey = isOpen && vehicle ? (vehicle.vehicleId ?? vehicle.id ?? 'open') : null;
  if (modalKey !== prevModalKey) {
    setPrevModalKey(modalKey);
    if (modalKey) {
      setNotes('');
      setCost('0'); // Default 0 (Opsional)

      // Auto pre-select all AI recommended items for this specific vehicle
      const recItems = actionItems.filter(item => item.recommended).map(item => item.id);
      const initialChecked = recItems.length > 0 ? recItems : actionItems.slice(0, 2).map(i => i.id);
      setSelectedItems(initialChecked);
    }
  }

  if (!isOpen || !vehicle) return null;

  // Toggle checklist item
  const toggleItem = (itemId) => {
    setSelectedItems(prev =>
      prev.includes(itemId) ? prev.filter(i => i !== itemId) : [...prev, itemId]
    );
  };

  // Group items by category
  const categoriesMap = new Map();
  actionItems.forEach(item => {
    const cat = item.category || 'Perbaikan Umum';
    if (!categoriesMap.has(cat)) categoriesMap.set(cat, []);
    categoriesMap.get(cat).push(item);
  });

  // Real-time Health Restoration Calculator
  const initialHealth = vehicle.healthScore || 50;
  const recommendedItemIds = actionItems.filter(i => i.recommended).map(i => i.id);
  const checkedRecommendedCount = selectedItems.filter(id => recommendedItemIds.includes(id)).length;
  const totalRecommendedCount = Math.max(1, recommendedItemIds.length);

  // If all AI recommended items checked -> 100%!
  let calculatedHealth = 100;
  if (checkedRecommendedCount < totalRecommendedCount) {
    const boostRatio = checkedRecommendedCount / totalRecommendedCount;
    calculatedHealth = Math.round(initialHealth + (100 - initialHealth) * boostRatio);
  }

  // Total AI Estimated Damage Cost for checked items (Sebagai referensi)
  const totalEstimatedCost = actionItems
    .filter(item => selectedItems.includes(item.id))
    .reduce((sum, item) => sum + (item.estimatedCost || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const checkedObjects = actionItems.filter(i => selectedItems.includes(i.id));
    const itemNames = checkedObjects.map(i => `${i.label} (Kisaran ${formatRupiah(i.estimatedCost)})`);

    const fullNotes = [
      checkedObjects.length > 0 ? `Tindakan Perbaikan Dikerjakan: ${itemNames.join(', ')}` : '',
      notes ? `Catatan Bengkel: ${notes}` : ''
    ].filter(Boolean).join('\n');

    const primaryCategory = checkedObjects.find(i => i.category)?.category || 'Servis & Perbaikan';

    await onConfirm(vehicle, {
      serviceCategory: primaryCategory,
      cost: parseFloat(cost) || 0, // 0 jika tidak diisi
      notes: fullNotes,
      selectedItems: itemNames,
      calculatedHealth: 100 // Reset to 100% on service completion!
    });

    setLoading(false);
    onClose();
  };

  const getCategoryIcon = (catName) => {
    if (catName.includes('Bodi')) return 'fa-solid fa-spray-can-sparkles';
    if (catName.includes('Rem')) return 'fa-solid fa-stop-circle';
    if (catName.includes('CVT')) return 'fa-solid fa-gears';
    if (catName.includes('Mesin')) return 'fa-solid fa-oil-can';
    if (catName.includes('Ban')) return 'fa-solid fa-circle-dot';
    if (catName.includes('Kelistrikan')) return 'fa-solid fa-bolt';
    if (catName.includes('Suspensi')) return 'fa-solid fa-screwdriver-wrench';
    return 'fa-solid fa-wrench';
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fa-solid fa-robot" style={{ color: 'var(--brand-primary)' }}></i>
              Formulir Servis AI & Pemulihan Performa Motor
            </div>
            <div className="modal-subtitle">AI menganalisis keluhan & secara otomatis menyesuaikan rekomendasi perbaikan untuk unit ini</div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* AI Context Banner (Keluhan Pelanggan Terlaporkan) */}
          {vehicle.recentIssues && vehicle.recentIssues.length > 0 && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '10px',
              padding: '12px 14px',
              marginBottom: '16px'
            }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#EF4444', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <i className="fa-solid fa-triangle-exclamation"></i>
                Keluhan Terlaporkan dari Penyewa:
              </div>
              <div style={{ fontSize: '13px', color: '#fff', marginTop: '4px', fontWeight: 600, fontStyle: 'italic' }}>
                &ldquo;{vehicle.recentIssues.join(', ')}&rdquo;
              </div>
            </div>
          )}

          {/* Real-time Dynamic Score Bar Header */}
          <div className="alert alert-info mb-4" style={{ fontSize: '13px', background: 'var(--bg-card)', border: '1px solid var(--bg-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div>
                Motor: <strong>{vehicle.vehicleName}</strong> (<span style={{ color: 'var(--brand-primary-light)' }}>{vehicle.plateNumber}</span>)
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Odometer: <strong>{vehicle.currentKm.toLocaleString('id-ID')} KM</strong>
                </div>
              </div>

              {/* Dynamic Real-Time Health Score Indicator */}
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Proyeksi Pemulihan Kesehatan:</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{initialHealth}% ➔</span>
                  <span style={{
                    fontSize: '22px',
                    fontWeight: 900,
                    color: calculatedHealth >= 85 ? '#22C55E' : calculatedHealth >= 60 ? '#F59E0B' : '#EF4444',
                    transition: 'all 0.3s ease'
                  }}>
                    {calculatedHealth}%
                  </span>
                </div>
              </div>
            </div>

            {/* Dynamic Real-Time Progress Bar */}
            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '6px', height: '10px', overflow: 'hidden', margin: '8px 0' }}>
              <div style={{
                width: `${calculatedHealth}%`,
                height: '100%',
                background: calculatedHealth >= 85 ? '#22C55E' : calculatedHealth >= 60 ? '#F59E0B' : '#EF4444',
                transition: 'all 0.3s ease'
              }} />
            </div>

            <div style={{ fontSize: '11.5px', color: calculatedHealth === 100 ? '#22C55E' : '#F59E0B', fontWeight: 600, marginTop: '4px' }}>
              {calculatedHealth === 100 ? '🏆 100% SEHAT PRIMA — Semua indikator & keluhan AI telah selesai diperbaiki!' :
               '💛 Centang seluruh rekomendasi AI di bawah untuk mengembalikan kesehatan motor ke 100% Prima.'}
            </div>
          </div>

          {/* AI Damage Cost Estimator Reference Banner */}
          <div style={{
            background: 'rgba(59, 130, 246, 0.08)',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            borderRadius: '10px',
            padding: '12px 16px',
            marginBottom: '20px',
            display: 'flex',
            justify: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#3B82F6', fontWeight: 700, letterSpacing: '0.4px' }}>
                <i className="fa-solid fa-calculator" style={{ marginRight: '6px' }}></i> Kisaran Estimasi Biaya AI (Referensi Acuan)
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Hanya gambaran perkiraan kisaran harga pasaran sparepart/servis
              </div>
            </div>

            <div style={{ fontSize: '18px', fontWeight: 800, color: '#3B82F6' }}>
              ~{formatRupiah(totalEstimatedCost)}
            </div>
          </div>

          {/* Dynamic AI Action Checklist Grouped by Category */}
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <label className="form-label" style={{ margin: 0, fontSize: '13px' }}>
                <i className="fa-solid fa-list-check" style={{ marginRight: '6px', color: 'var(--brand-primary)' }}></i>
                Checklist Tindakan Perbaikan (Penyesuaian Otomatis AI):
              </label>
              <span style={{ fontSize: '11px', color: 'var(--brand-primary-light)', fontWeight: 600 }}>
                {selectedItems.length} dari {actionItems.length} Item Terpilih
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {Array.from(categoriesMap.entries()).map(([catName, items]) => (
                <div key={catName} style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--bg-border)',
                  borderRadius: '10px',
                  padding: '12px 14px'
                }}>
                  {/* Category Header */}
                  <div style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    marginBottom: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.4px'
                  }}>
                    <i className={getCategoryIcon(catName)} style={{ color: 'var(--brand-primary)' }}></i>
                    <span>{catName}</span>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 400 }}>({items.length} item)</span>
                  </div>

                  {/* Items List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {items.map(item => {
                      const checked = selectedItems.includes(item.id);
                      return (
                        <label
                          key={item.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justify: 'space-between',
                            gap: '10px',
                            fontSize: '12.5px',
                            cursor: 'pointer',
                            padding: '8px 10px',
                            borderRadius: '6px',
                            border: item.recommended ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid var(--bg-border)',
                            background: checked ? 'rgba(34, 197, 94, 0.12)' : item.recommended ? 'rgba(245, 158, 11, 0.06)' : 'transparent',
                            color: checked ? '#22C55E' : item.recommended ? '#F59E0B' : 'var(--text-secondary)',
                            fontWeight: checked || item.recommended ? 600 : 400,
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleItem(item.id)}
                              style={{ accentColor: '#22C55E', width: '16px', height: '16px' }}
                            />
                            <div>
                              <div>{item.label}</div>
                              {item.reason && (
                                <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: 400, marginTop: '1px' }}>
                                  <i className="fa-solid fa-robot" style={{ marginRight: '4px', fontSize: '9px' }}></i>
                                  {item.reason}
                                </div>
                              )}
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                            <span style={{
                              fontSize: '11px',
                              fontWeight: 600,
                              color: 'var(--text-muted)',
                              background: 'var(--bg-hover)',
                              padding: '2px 8px',
                              borderRadius: '6px'
                            }}>
                              Kisaran ~{formatRupiah(item.estimatedCost)}
                            </span>
                            {item.recommended && (
                              <span style={{ fontSize: '9.5px', background: 'rgba(245, 158, 11, 0.2)', padding: '2px 6px', borderRadius: '4px', color: '#F59E0B', fontWeight: 800 }}>
                                Rekomendasi AI 🎯
                              </span>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actual Cost Input Field (Optional - Default 0) */}
          <div className="form-group" style={{ marginTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label className="form-label" htmlFor="maint-cost" style={{ margin: 0 }}>
                <i className="fa-solid fa-receipt" style={{ marginRight: '6px' }}></i> Biaya Real Kwitansi Bengkel (Rp)
              </label>
              <span style={{ fontSize: '11px', color: '#22C55E', background: 'rgba(34, 197, 94, 0.15)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                Opsional (Default 0)
              </span>
            </div>
            <input
              id="maint-cost"
              type="number"
              className="form-control"
              placeholder="0 (Isi jika ada pengeluaran bengkel yang ingin dicatat ke laporan keuangan)"
              value={cost}
              onChange={e => setCost(e.target.value)}
              min="0"
            />
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              *Jika diisi angka (misal Rp 150.000), nominal ini akan dicatat ke <strong>Pengeluaran Operasional Keuangan</strong>. Jika disetting 0 atau kosong, tidak ada pengeluaran yang dicatat.
            </div>
          </div>

          {/* Bengkel Notes */}
          <div className="form-group">
            <label className="form-label" htmlFor="maint-notes">
              <i className="fa-regular fa-note-sticky" style={{ marginRight: '6px' }}></i> Catatan Mekanik / Nama Bengkel
            </label>
            <textarea
              id="maint-notes"
              className="form-control"
              rows={2}
              placeholder="Contoh: Diganti sendiri di garasi / Bengkel Honda Pererenan..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Batal</button>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ background: '#22C55E', borderColor: '#22C55E' }}>
              {loading ? (
                <><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '6px' }}></i> Menyimpan Perbaikan...</>
              ) : (
                <><i className="fa-solid fa-circle-check" style={{ marginRight: '6px' }}></i> Selesaikan Perbaikan & Restore Ke 100%</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ===== MAIN MAINTENANCE PAGE =====
export default function MaintenancePage() {
  const [activeTab, setActiveTab] = useState('diagnostics'); // 'diagnostics' | 'history' | 'reports'
  const [vehicles, setVehicles] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [resolveModal, setResolveModal] = useState({ open: false, vehicle: null });
  const [alert, setAlert] = useState(null);

  const showAlert = (message, type = 'success') => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 5000);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [vRes, tRes, eRes] = await Promise.all([
      fetch('/api/vehicles'),
      fetch('/api/transactions'),
      fetch('/api/expenses')
    ]);
    const vData = await vRes.json();
    const tData = await tRes.json();
    const eData = await eRes.json();

    setVehicles(Array.isArray(vData) ? vData : []);
    setTransactions(Array.isArray(tData) ? tData : []);
    setExpenses(Array.isArray(eData) ? eData : []);
    setLastUpdated(new Date());
    setLoading(false);
  }, []);

  useEffect(() => { Promise.resolve().then(fetchData); }, [fetchData]);

  // Auto refresh every 60s
  useEffect(() => {
    const timer = setInterval(() => fetchData(), 60000);
    return () => clearInterval(timer);
  }, [fetchData]);

  const diagnostics = vehicles.map(v => analyzeVehicleHealth(v, transactions));

  const filtered = diagnostics.filter(diag => {
    const matchSearch = !searchQuery ||
      diag.vehicleName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      diag.plateNumber.toLowerCase().includes(searchQuery.toLowerCase());

    let matchStatus = true;
    if (filterStatus === 'urgent') matchStatus = diag.healthScore < 60;
    if (filterStatus === 'warning') matchStatus = diag.healthScore >= 60 && diag.healthScore < 85;
    if (filterStatus === 'healthy') matchStatus = diag.healthScore >= 85;

    return matchSearch && matchStatus;
  });

  const urgentCount = diagnostics.filter(d => d.healthScore < 60).length;
  const warningCount = diagnostics.filter(d => d.healthScore >= 60 && d.healthScore < 85).length;
  const healthyCount = diagnostics.filter(d => d.healthScore >= 85).length;

  // Filter Service Expenses for History Log
  const serviceHistoryLogs = expenses.filter(exp =>
    exp.category === 'service' ||
    exp.category === 'sparepart' ||
    exp.title?.toLowerCase().includes('servis') ||
    exp.title?.toLowerCase().includes('perbaikan')
  ).filter(exp => {
    if (!searchQuery) return true;
    return exp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (exp.notes && exp.notes.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  // Get ONLY unresolved issue reports (where issue date is AFTER vehicle's last_serviced_at)
  const recentReports = transactions
    .filter(t => {
      if (t.status !== 'completed' || !t.issues_reported || !t.issues_reported.trim()) return false;
      const v = vehicles.find(veh => veh.id === t.vehicle_id);
      if (!v) return true;
      if (!v.last_serviced_at) return true;
      const txDate = new Date(t.updated_at || t.created_at);
      const serviceDate = new Date(v.last_serviced_at);
      return txDate > serviceDate;
    })
    .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));

  // Helper to generate dynamic required items list for card view
  const getCardRequiredFixes = (diag) => {
    const fixes = [];
    const allText = [
      ...(diag.warnings || []),
      ...(diag.recentIssues || []),
      ...(diag.recommendations || [])
    ].join(' ').toLowerCase();

    if (diag.kmToNextOil <= 300 || allText.includes('oli')) fixes.push({ name: 'Ganti Oli Mesin & Gardan', icon: 'fa-solid fa-oil-can' });
    if (diag.kmToNextCvt <= 500 || allText.includes('cvt') || allText.includes('gredek')) fixes.push({ name: 'Servis CVT & Roller', icon: 'fa-solid fa-gears' });
    if (allText.includes('rem') || allText.includes('blong')) fixes.push({ name: 'Servis / Ganti Kampas Rem', icon: 'fa-solid fa-stop-circle' });
    if (allText.includes('ban') || allText.includes('kempes') || allText.includes('bocor') || allText.includes('gundul')) fixes.push({ name: 'Ganti Ban / Cek Tekanan', icon: 'fa-solid fa-circle-dot' });
    if (allText.includes('lampu') || allText.includes('stang') || allText.includes('redup') || allText.includes('tekor')) fixes.push({ name: 'Servis Aki & Kelistrikan', icon: 'fa-solid fa-bolt' });
    if (allText.includes('mesin') || allText.includes('kasar') || allText.includes('mogok')) fixes.push({ name: 'Tune-Up Injeksi & Busi', icon: 'fa-solid fa-wrench' });

    return fixes;
  };

  // Confirm Service Completion
  const handleConfirmService = async (diagVehicle, serviceData) => {
    const { cost, notes, serviceCategory, calculatedHealth } = serviceData;
    const nowIso = new Date().toISOString();

    // 1. Update vehicle record (last_service_km, last_serviced_at, status='available')
    const vRes = await fetch(`/api/vehicles/${diagVehicle.vehicleId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        last_service_km: diagVehicle.currentKm,
        last_serviced_at: nowIso,
        status: 'available'
      }),
    });

    // 2. Auto insert into Expenses history log
    const catLabels = {
      service: 'Servis Rutin & Oli',
      brake: 'Perbaikan Sistem Rem',
      cvt: 'Servis CVT & Roller',
      tire: 'Penggantian Ban',
      electrical: 'Servis Aki & Kelistrikan',
      engine: 'Tune-Up Mesin'
    };

    await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `Servis Motor: ${diagVehicle.vehicleName} (${diagVehicle.plateNumber}) - ${catLabels[serviceCategory] || 'Servis'}`,
        category: serviceCategory === 'cvt' || serviceCategory === 'tire' ? 'sparepart' : 'service',
        amount: cost || 0,
        expense_date: nowIso.split('T')[0],
        notes: notes || `Perbaikan diselesaikan. Skor Kesehatan Terkini: ${calculatedHealth}%`
      }),
    });

    if (vRes.ok) {
      showAlert(`Perbaikan motor ${diagVehicle.vehicleName} (${diagVehicle.plateNumber}) telah dicatat! Skor kesehatan motor terupdate menjadi ${calculatedHealth}% 🎉`);
      fetchData();
    } else {
      showAlert('Gagal memperbarui data kendaraan.', 'danger');
    }
  };

  return (
    <div className="fade-in">
      <Suspense fallback={null}>
        <TabFromQuery onTab={setActiveTab} />
      </Suspense>

      {/* Page Header */}
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2><i className="fa-solid fa-robot" style={{ marginRight: '8px', color: 'var(--brand-primary-light)' }}></i> AI Maintenance & Rekam Jejak Servis Motor</h2>
            <p>Deteksi dini kesehatan mesin, jadwal penggantian oli, CVT & history lengkap perbaikan motor</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {lastUpdated && (
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                <i className="fa-solid fa-rotate" style={{ marginRight: '4px' }}></i>
                Update: {lastUpdated.toLocaleTimeString('id-ID')}
              </span>
            )}
            <button className="btn btn-secondary" onClick={fetchData} disabled={loading}>
              <i className={`fa-solid fa-rotate ${loading ? 'fa-spin' : ''}`} style={{ marginRight: '6px' }}></i>
              Refresh Data
            </button>
          </div>
        </div>
      </div>

      {alert && <div className={`alert alert-${alert.type}`}>{alert.message}</div>}

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
        {[
          { key: 'diagnostics', label: 'Skor Kesehatan', icon: 'fa-solid fa-robot' },
          { key: 'history', label: 'Riwayat Servis', icon: 'fa-solid fa-clock-rotate-left' },
          { key: 'reports', label: 'Keluhan Pelanggan', icon: 'fa-solid fa-clipboard-list' },
        ].map(t => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActiveTab(t.key)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '7px 14px', borderRadius: 'var(--radius-full, 999px)', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer',
              border: activeTab === t.key ? '1.5px solid var(--brand-primary)' : '1px solid var(--bg-border)',
              background: activeTab === t.key ? 'var(--brand-primary-bg, rgba(59,130,246,0.12))' : 'transparent',
              color: activeTab === t.key ? 'var(--brand-primary)' : 'var(--text-secondary)',
            }}
          >
            <i className={t.icon}></i>{t.label}
          </button>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid-3 mb-6">
        <div className="stat-card" onClick={() => { setFilterStatus('healthy'); setActiveTab('diagnostics'); }} style={{ cursor: 'pointer' }}>
          <div className="stat-icon" style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#22C55E' }}>
            <i className="fa-solid fa-heart-pulse"></i>
          </div>
          <div className="stat-info">
            <div className="stat-label">Armada Sehat (100% Prima)</div>
            <div className="stat-value">{healthyCount} Motor</div>
            <div className="stat-change">Kondisi siap sewa ✓</div>
          </div>
        </div>

        <div className="stat-card" onClick={() => { setFilterStatus('warning'); setActiveTab('diagnostics'); }} style={{ cursor: 'pointer' }}>
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B' }}>
            <i className="fa-solid fa-triangle-exclamation"></i>
          </div>
          <div className="stat-info">
            <div className="stat-label">Perlu Cek Berkala</div>
            <div className="stat-value">{warningCount} Motor</div>
            <div className="stat-change">Mendekati jadwal servis</div>
          </div>
        </div>

        <div className="stat-card" onClick={() => { setFilterStatus('urgent'); setActiveTab('diagnostics'); }} style={{ cursor: 'pointer' }}>
          <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#EF4444' }}>
            <i className="fa-solid fa-screwdriver-wrench"></i>
          </div>
          <div className="stat-info">
            <div className="stat-label">Servis / Kendala Keluhan</div>
            <div className="stat-value">{urgentCount} Motor</div>
            <div className="stat-change">Ada keluhan / skor &lt; 60%</div>
          </div>
        </div>
      </div>

      {/* Current section indicator — section is now chosen from the
          sidebar "AI Diagnostic" dropdown, this just confirms what's showing */}
      {(() => {
        const TABS = {
          diagnostics: { label: `AI Diagnostics & Skor Kesehatan (${diagnostics.length})`, icon: 'fa-solid fa-robot' },
          history: { label: `Riwayat & History Servis (${serviceHistoryLogs.length})`, icon: 'fa-solid fa-clock-rotate-left' },
          reports: { label: `Keluhan Pelanggan (${recentReports.length})`, icon: 'fa-solid fa-clipboard-list' },
        };
        const current = TABS[activeTab] || TABS.diagnostics;
        return (
          <div style={{ marginBottom: '16px' }}>
            <span className="badge" style={{
              background: 'var(--bg-elevated)', color: 'var(--brand-primary)', border: '1px solid var(--bg-border)',
              fontSize: '12.5px', padding: '6px 14px', fontWeight: 600,
            }}>
              <i className={current.icon} style={{ marginRight: '6px' }}></i>{current.label}
            </span>
          </div>
        );
      })()}

      <div className="page-actions mb-6">
        <div className="filter-bar" style={{ width: '100%' }}>
          <div className="search-bar" style={{ flex: 1 }}>
            <span className="search-bar-icon"><i className="fa-solid fa-magnifying-glass"></i></span>
            <input
              type="text"
              className="form-control"
              placeholder="Cari nama motor, plat nomor, atau jenis perbaikan..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          {activeTab === 'diagnostics' && (
            <select
              className="form-control filter-select"
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
            >
              <option value="all">Semua Kondisi Armada</option>
              <option value="healthy">💚 Sehat (85%+)</option>
              <option value="warning">💛 Perlu Cek (60-84%)</option>
              <option value="urgent">❤️ Perlu Servis (&lt;60%)</option>
            </select>
          )}
        </div>
      </div>

      {/* TAB 1: AI DIAGNOSTICS & HEALTH SCORES */}
      {activeTab === 'diagnostics' && (
        <>
          {loading ? (
            <div className="card table-empty">
              <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '8px' }}></i> Menganalisis data kesehatan kendaraan dengan AI...
            </div>
          ) : filtered.length === 0 ? (
            <div className="card table-empty">
              <div className="table-empty-icon"><i className="fa-solid fa-robot"></i></div>
              <p>Tidak ada kendaraan yang sesuai dengan kriteria pencarian</p>
            </div>
          ) : (
            <div className="grid-2">
              {filtered.map(diag => {
                const cardFixes = getCardRequiredFixes(diag);

                return (
                  <div key={diag.vehicleId} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h3 style={{ fontSize: '17px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                          {diag.vehicleName}
                        </h3>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                          Plat Nomor: <strong style={{ color: 'var(--brand-primary-light)' }}>{diag.plateNumber}</strong>
                          {' | '}KM Odometer: <strong>{diag.currentKm.toLocaleString('id-ID')} KM</strong>
                          {diag.lastServicedAt && (
                            <div style={{ color: '#22C55E', marginTop: '2px', fontWeight: 600 }}>
                              <i className="fa-solid fa-wrench" style={{ marginRight: '4px' }}></i>
                              Servis Terakhir: {new Date(diag.lastServicedAt).toLocaleDateString('id-ID')}
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{
                          fontSize: '24px',
                          fontWeight: 900,
                          color: diag.healthScore >= 85 ? '#22C55E' : diag.healthScore >= 60 ? '#F59E0B' : '#EF4444'
                        }}>
                          {diag.healthScore}%
                        </div>
                        <span className="badge" style={{
                          background: `${diag.badgeColor}20`,
                          color: diag.badgeColor,
                          border: `1px solid ${diag.badgeColor}40`,
                          fontSize: '11px'
                        }}>
                          {diag.statusLevel}
                        </span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '8px', height: '8px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${diag.healthScore}%`,
                        height: '100%',
                        background: diag.healthScore >= 85 ? '#22C55E' : diag.healthScore >= 60 ? '#F59E0B' : '#EF4444',
                        transition: 'width 0.4s ease'
                      }} />
                    </div>

                    {/* Service Estimates */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid var(--bg-border)' }}>
                      <div style={{ fontSize: '12px' }}>
                        <span style={{ color: 'var(--text-muted)' }}><i className="fa-solid fa-oil-can" style={{ marginRight: '4px' }}></i> Ganti Oli Mesin:</span>
                        <div style={{ fontWeight: 600, color: diag.kmToNextOil <= 300 ? '#EF4444' : 'var(--text-primary)' }}>
                          {diag.kmToNextOil <= 0 ? 'Waktunya ganti sekarang!' : `Tersisa ~${diag.kmToNextOil} KM`}
                        </div>
                      </div>
                      <div style={{ fontSize: '12px' }}>
                        <span style={{ color: 'var(--text-muted)' }}><i className="fa-solid fa-gears" style={{ marginRight: '4px' }}></i> Servis CVT berkala:</span>
                        <div style={{ fontWeight: 600, color: diag.kmToNextCvt <= 500 ? '#F59E0B' : 'var(--text-primary)' }}>
                          {diag.kmToNextCvt <= 0 ? 'Waktunya servis CVT!' : `Tersisa ~${diag.kmToNextCvt} KM`}
                        </div>
                      </div>
                    </div>

                    {/* AI TARGETED REQUIRED FIXES (For ALL motorbikes with health < 100%) */}
                    {diag.healthScore < 100 && cardFixes.length > 0 && (
                      <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', padding: '12px', borderRadius: '8px' }}>
                        <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#F59E0B', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <i className="fa-solid fa-bullseye"></i>
                          <span>Rekomendasi Perbaikan Utama AI (Dibutuhkan 🎯):</span>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {cardFixes.map((fix, fIdx) => (
                            <span key={fIdx} style={{
                              fontSize: '11px',
                              background: 'rgba(245, 158, 11, 0.18)',
                              color: '#F59E0B',
                              border: '1px solid rgba(245, 158, 11, 0.35)',
                              padding: '3px 9px',
                              borderRadius: '6px',
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              <i className={fix.icon}></i>
                              {fix.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Warnings / AI Alerts */}
                    {diag.warnings.length > 0 && (
                      <div style={{ background: 'rgba(239, 68, 68, 0.08)', borderLeft: '3px solid #EF4444', padding: '10px 14px', borderRadius: '4px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#EF4444', marginBottom: '6px' }}>
                          <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '6px' }}></i> AI Warning & Catatan Keluhan:
                        </div>
                        {diag.warnings.map((w, idx) => (
                          <div key={idx} style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '2px' }}>{w}</div>
                        ))}
                      </div>
                    )}

                    {/* Issues from transactions */}
                    {diag.recentIssues.length > 0 && (
                      <div style={{ background: 'rgba(245, 158, 11, 0.06)', borderLeft: '3px solid #F59E0B', padding: '10px 14px', borderRadius: '4px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#F59E0B', marginBottom: '6px' }}>
                          <i className="fa-solid fa-clipboard-list" style={{ marginRight: '6px' }}></i> Keluhan Pelanggan Belum Difix:
                        </div>
                        {diag.recentIssues.map((issue, idx) => (
                          <div key={idx} style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '2px' }}>• {issue}</div>
                        ))}
                      </div>
                    )}

                    {/* AI Recommendations */}
                    <div style={{ background: 'rgba(59, 130, 246, 0.08)', borderLeft: '3px solid #3B82F6', padding: '10px 14px', borderRadius: '4px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#3B82F6', marginBottom: '6px' }}>
                        <i className="fa-solid fa-lightbulb" style={{ marginRight: '6px' }}></i> Rekomendasi Mekanik AI:
                      </div>
                      {diag.recommendations.map((r, idx) => (
                        <div key={idx} style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '2px' }}>• {r}</div>
                      ))}
                    </div>

                    {/* ACTION BUTTON */}
                    <div style={{ marginTop: 'auto', paddingTop: '8px' }}>
                      {diag.healthScore < 100 ? (
                        <button
                          className="btn btn-success"
                          style={{ width: '100%', gap: '8px', padding: '10px', fontSize: '13px' }}
                          onClick={() => setResolveModal({ open: true, vehicle: diag })}
                        >
                          <i className="fa-solid fa-screwdriver-wrench"></i>
                          Catat Perbaikan & Kalkulasi Skor Real-Time
                        </button>
                      ) : (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          padding: '10px',
                          borderRadius: '8px',
                          background: 'rgba(34, 197, 94, 0.1)',
                          border: '1px solid rgba(34, 197, 94, 0.25)',
                          color: '#22C55E',
                          fontSize: '12.5px',
                          fontWeight: 700
                        }}>
                          <i className="fa-solid fa-shield-halved"></i>
                          <span>Motor 100% Prima — Siap Disewa Kembali</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* TAB 2: RIWAYAT & HISTORY SERVIS LOG */}
      {activeTab === 'history' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>
              <i className="fa-solid fa-clock-rotate-left" style={{ marginRight: '8px', color: 'var(--brand-primary-light)' }}></i>
              Rekam Jejak History Servis & Perbaikan Armada Motor
            </h3>
            <span className="badge badge-info">{serviceHistoryLogs.length} Catatan Perbaikan</span>
          </div>

          {serviceHistoryLogs.length === 0 ? (
            <div className="table-empty">
              <div className="table-empty-icon"><i className="fa-solid fa-wrench"></i></div>
              <p>Belum ada riwayat perbaikan motor yang dicatat.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Tanggal Servis</th>
                    <th>Nama Motor & Keterangan</th>
                    <th>Kategori Perbaikan</th>
                    <th>Biaya Servis</th>
                    <th>Detail Tindakan Bengkel</th>
                    <th>Status Performa</th>
                  </tr>
                </thead>
                <tbody>
                  {serviceHistoryLogs.map((log) => (
                    <tr key={log.id}>
                      <td style={{ fontSize: '12.5px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        <i className="fa-regular fa-calendar-check" style={{ marginRight: '6px', color: 'var(--brand-primary-light)' }}></i>
                        {new Date(log.expense_date).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </td>
                      <td style={{ fontWeight: 700 }}>
                        {log.title}
                      </td>
                      <td>
                        <span className="badge badge-secondary" style={{ textTransform: 'capitalize' }}>
                          <i className="fa-solid fa-gear" style={{ marginRight: '4px' }}></i>
                          {log.category}
                        </span>
                      </td>
                      <td style={{ fontWeight: 800, color: '#EF4444' }}>
                        {formatRupiah(log.amount)}
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--text-secondary)', maxWidth: '300px' }}>
                        {log.notes || 'Perbaikan rutin & penyetelan mesin'}
                      </td>
                      <td>
                        <span className="badge badge-success">
                          <i className="fa-solid fa-circle-check" style={{ marginRight: '4px' }}></i>
                          Terbukti Prima
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: KELUHAN PELANGGAN RECENT REPORTS */}
      {activeTab === 'reports' && (
        <div className="card">
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 4px 0' }}>
              <i className="fa-solid fa-clipboard-list" style={{ marginRight: '8px', color: '#F59E0B' }}></i>
              Laporan Keluhan Motor dari Penyewa (Transaksi Selesai)
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
              Daftar keluhan yang dilaporkan oleh customer saat pengembalian motor dan mempengaruhi skor kesehatan AI.
            </p>
          </div>

          {recentReports.length === 0 ? (
            <div className="table-empty">
              <div className="table-empty-icon"><i className="fa-solid fa-circle-check"></i></div>
              <p>Tidak ada laporan keluhan aktif dari pelanggan. Semua motor bebas masalah!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {recentReports.map(t => {
                const targetDiag = diagnostics.find(d => d.vehicleId === t.vehicle_id);
                return (
                  <div key={t.id} style={{
                    background: 'rgba(245, 158, 11, 0.08)',
                    border: '1px solid rgba(245, 158, 11, 0.25)',
                    borderRadius: '8px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontWeight: 800, fontSize: '14px' }}>
                        <i className="fa-solid fa-motorcycle" style={{ marginRight: '8px', color: 'var(--brand-primary-light)' }}></i>
                        {t.vehicles?.name || 'Motor'} — <span style={{ color: 'var(--brand-primary-light)' }}>{t.vehicles?.plate_number}</span>
                      </div>
                      {targetDiag && (
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => setResolveModal({ open: true, vehicle: targetDiag })}
                        >
                          <i className="fa-solid fa-wrench" style={{ marginRight: '4px' }}></i>
                          Fix & Kalkulasi Real-Time
                        </button>
                      )}
                    </div>

                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Penyewa: <strong>{t.renter_name}</strong> ({t.renter_phone}) | Selesai Sewa: {new Date(t.updated_at || t.created_at).toLocaleDateString('id-ID')}
                      {t.km_start && t.km_end && (
                        <span> | Total Pakai: +{(t.km_end - t.km_start).toLocaleString()} KM</span>
                      )}
                    </div>

                    <div style={{ background: 'var(--bg-card)', padding: '10px 14px', borderRadius: '6px', borderLeft: '3px solid #F59E0B', fontSize: '13px', color: '#F59E0B', fontStyle: 'italic' }}>
                      &quot;{t.issues_reported}&quot;
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Resolve Maintenance Modal */}
      <ResolveMaintenanceModal
        isOpen={resolveModal.open}
        onClose={() => setResolveModal({ open: false, vehicle: null })}
        onConfirm={handleConfirmService}
        vehicle={resolveModal.vehicle}
      />
    </div>
  );
}
