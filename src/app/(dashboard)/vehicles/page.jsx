'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { compressImage } from '@/lib/imageCompressor';
import { createClient } from '@/lib/supabase/client';

function formatRupiah(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount || 0);
}

const statusBadge = (status) => {
  const map = {
    available: <span className="badge badge-success"><i className="fa-solid fa-circle-check" style={{ marginRight: '4px' }}></i> Tersedia</span>,
    rented: <span className="badge badge-info"><i className="fa-solid fa-key" style={{ marginRight: '4px' }}></i> Disewa</span>,
    maintenance: <span className="badge badge-warning"><i className="fa-solid fa-wrench" style={{ marginRight: '4px' }}></i> Perawatan</span>,
  };
  return map[status] || <span className="badge badge-muted">{status}</span>;
};

// ===== IMAGE ADJUSTER MODAL (With Mouse Dragging & 9-Box Grid Alignment) =====
function ImageAdjusterModal({ isOpen, imageSrc, onConfirm, onCancel }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const imgRef = useRef(null);

  const [scale, setScale] = useState(1);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [focalPoint, setFocalPoint] = useState('center');
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Reset editor state saat modal dibuka / gambar berganti — pola resmi React
  // "adjust state during render" (menggantikan useEffect + setState sinkron)
  const [prevEditKey, setPrevEditKey] = useState(null);
  const editKey = isOpen && imageSrc ? imageSrc : null;
  if (editKey !== prevEditKey) {
    setPrevEditKey(editKey);
    if (editKey) {
      setScale(1);
      setBrightness(100);
      setContrast(100);
      setPanOffset({ x: 0, y: 0 });
      setFocalPoint('center');
      setIsDragging(false);
    }
  }

  // Handle Focal Point Presets (9 Grid Boxes)
  const handleFocalSelect = (key) => {
    setFocalPoint(key);
    const maxShift = 80;
    const shifts = {
      'top-left': { x: maxShift, y: maxShift },
      'top-center': { x: 0, y: maxShift },
      'top-right': { x: -maxShift, y: maxShift },
      'center-left': { x: maxShift, y: 0 },
      'center': { x: 0, y: 0 },
      'center-right': { x: -maxShift, y: 0 },
      'bottom-left': { x: maxShift, y: -maxShift },
      'bottom-center': { x: 0, y: -maxShift },
      'bottom-right': { x: -maxShift, y: -maxShift },
    };
    setPanOffset(shifts[key] || { x: 0, y: 0 });
  };

  // Mouse & Touch Dragging Handlers
  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    setDragStart({ x: clientX - panOffset.x, y: clientY - panOffset.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const newX = clientX - dragStart.x;
    const newY = clientY - dragStart.y;

    // Bound offset range
    const maxBound = 150 * scale;
    const boundedX = Math.max(-maxBound, Math.min(maxBound, newX));
    const boundedY = Math.max(-maxBound, Math.min(maxBound, newY));

    setPanOffset({ x: boundedX, y: boundedY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const applyAndConfirm = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const img = imgRef.current;
    if (!img) return;

    const size = 600;
    canvas.width = size;
    canvas.height = size;

    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;
    ctx.save();

    // Calculate canvas shift matching preview container (300px preview container -> 600px canvas size)
    const canvasShiftX = (panOffset.x / 150) * (size / 2);
    const canvasShiftY = (panOffset.y / 150) * (size / 2);

    ctx.translate(size / 2 + canvasShiftX, size / 2 + canvasShiftY);
    ctx.scale(scale, scale);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2, img.naturalWidth, img.naturalHeight);
    ctx.restore();

    const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
    onConfirm(dataUrl);
  };

  if (!isOpen || !imageSrc) return null;

  const gridCells = [
    { key: 'top-left', label: 'Atas Kiri', icon: 'fa-arrow-up-left' },
    { key: 'top-center', label: 'Atas Tengah', icon: 'fa-arrow-up' },
    { key: 'top-right', label: 'Atas Kanan', icon: 'fa-arrow-up-right' },
    { key: 'center-left', label: 'Tengah Kiri', icon: 'fa-arrow-left' },
    { key: 'center', label: 'Tengah (Pusat)', icon: 'fa-crosshairs' },
    { key: 'center-right', label: 'Tengah Kanan', icon: 'fa-arrow-right' },
    { key: 'bottom-left', label: 'Bawah Kiri', icon: 'fa-arrow-down-left' },
    { key: 'bottom-center', label: 'Bawah Tengah', icon: 'fa-arrow-down' },
    { key: 'bottom-right', label: 'Bawah Kanan', icon: 'fa-arrow-down-right' },
  ];

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()} style={{ maxWidth: '750px' }}>
        <div className="modal-header">
          <div>
            <div className="modal-title">
              <i className="fa-solid fa-crop-simple" style={{ marginRight: '6px', color: 'var(--brand-primary-light)' }}></i>
              Sesuaikan Foto Motor & Geser Kursor (Grid 9 Kotak)
            </div>
            <div className="modal-subtitle">Klik & tahan kursor mouse untuk menggeser posisi foto motor ke arah mana saja</div>
          </div>
          <button className="modal-close" onClick={onCancel}>✕</button>
        </div>

        <div style={{ padding: '16px 24px' }}>
          {/* Draggable Preview Container */}
          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleMouseDown}
            onTouchMove={handleMouseMove}
            onTouchEnd={handleMouseUp}
            style={{
              position: 'relative',
              width: '100%',
              height: '300px',
              background: 'var(--bg-base)',
              borderRadius: '12px',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
              border: `2px solid ${isDragging ? 'var(--brand-primary)' : 'var(--bg-border)'}`,
              cursor: isDragging ? 'grabbing' : 'grab',
              userSelect: 'none',
              transition: 'border-color 0.2s ease'
            }}
          >
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Preview Motor"
              crossOrigin="anonymous"
              draggable={false}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${scale})`,
                filter: `brightness(${brightness}%) contrast(${contrast}%)`,
                transition: isDragging ? 'none' : 'transform 0.15s ease'
              }}
            />

            {/* Rule of Thirds 3x3 Grid Overlay */}
            <div style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gridTemplateRows: '1fr 1fr 1fr',
              pointerEvents: 'none',
              zIndex: 10
            }}>
              {gridCells.map(cell => {
                const isActive = focalPoint === cell.key;
                return (
                  <div
                    key={cell.key}
                    style={{
                      border: '1px dashed rgba(255,255,255,0.18)',
                      background: isActive ? 'rgba(20, 116, 107, 0.12)' : 'transparent',
                      transition: 'all 0.15s ease'
                    }}
                  />
                );
              })}
            </div>

            {/* Dragging Help Indicator Badge */}
            <div style={{
              position: 'absolute',
              bottom: '12px',
              left: '12px',
              background: isDragging ? 'var(--brand-primary)' : 'rgba(0,0,0,0.65)',
              color: '#fff',
              padding: '5px 12px',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backdropFilter: 'blur(4px)',
              pointerEvents: 'none',
              zIndex: 15
            }}>
              <i className={`fa-solid ${isDragging ? 'fa-hand-grabbing' : 'fa-up-down-left-right'}`}></i>
              <span>{isDragging ? 'Sedang menggeser foto motor...' : 'Tahan & Geser Kursor Mouse Untuk Atur Posisi'}</span>
            </div>
          </div>
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {/* Controls Grid */}
          <div className="adj-controls" style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: '20px', alignItems: 'flex-start' }}>
            {/* Sliders */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span><i className="fa-solid fa-magnifying-glass-plus" style={{ marginRight: '6px' }}></i> Zoom Perbesaran</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{Math.round(scale * 100)}%</strong>
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2.5"
                  step="0.05"
                  value={scale}
                  onChange={e => setScale(parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--brand-primary)' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span><i className="fa-solid fa-sun" style={{ marginRight: '6px' }}></i> Kecerahan (Brightness)</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{brightness}%</strong>
                </label>
                <input
                  type="range"
                  min="50"
                  max="150"
                  step="5"
                  value={brightness}
                  onChange={e => setBrightness(parseInt(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--brand-primary)' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span><i className="fa-solid fa-circle-half-stroke" style={{ marginRight: '6px' }}></i> Kontras</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{contrast}%</strong>
                </label>
                <input
                  type="range"
                  min="50"
                  max="150"
                  step="5"
                  value={contrast}
                  onChange={e => setContrast(parseInt(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--brand-primary)' }}
                />
              </div>
            </div>

            {/* 9-Box Grid Mini Map Selector */}
            <div style={{ background: 'var(--bg-elevated)', padding: '12px', borderRadius: '10px', border: '1px solid var(--bg-border)' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                <i className="fa-solid fa-grip" style={{ marginRight: '4px', color: 'var(--brand-primary-light)' }}></i> Grid 9 Kotak Presets
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '4px'
              }}>
                {gridCells.map(cell => {
                  const isActive = focalPoint === cell.key;
                  return (
                    <button
                      key={cell.key}
                      type="button"
                      onClick={() => handleFocalSelect(cell.key)}
                      title={cell.label}
                      style={{
                        height: '42px',
                        border: `1px solid ${isActive ? 'var(--brand-primary)' : 'var(--bg-border)'}`,
                        background: isActive ? 'var(--brand-primary)' : 'var(--bg-card)',
                        color: isActive ? '#fff' : 'var(--text-secondary)',
                        borderRadius: '6px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <i className={`fa-solid ${cell.icon}`}></i>
                    </button>
                  );
                })}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--brand-primary-light)', marginTop: '8px', textAlign: 'center', fontWeight: 600 }}>
                {gridCells.find(c => c.key === focalPoint)?.label}
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => { setScale(1); setBrightness(100); setContrast(100); setPanOffset({ x: 0, y: 0 }); setFocalPoint('center'); }}>
            <i className="fa-solid fa-rotate-left" style={{ marginRight: '6px' }}></i> Reset Posisi
          </button>
          <button className="btn btn-secondary" onClick={onCancel}>Batal</button>
          <button className="btn btn-primary" onClick={applyAndConfirm}>
            <i className="fa-solid fa-floppy-disk" style={{ marginRight: '6px' }}></i> Terapkan & Gunakan Gambar
          </button>
        </div>
      </div>
    </div>
  );
}

// Default form di module scope (fungsi) — menghindari object baru tiap render
// sekaligus menghilangkan warning exhaustive-deps pada effect reset form
function getDefaultVehicleForm() {
  return {
    name: '',
    plate_number: '',
    year: new Date().getFullYear(),
    color: '',
    category: 'honda',
    rate_per_day: '',
    rate_per_week: '',
    rate_per_month: '',
    image_url: '',
    current_km: 15000,
    status: 'available',
    notes: '',
    // Investor & Ownership Fields
    owner_type: 'internal',
    owner_name: '',
    owner_contact: '',
    revenue_share_percentage: '70',
    purchase_date: '',
    purchase_price: '',
  };
}

function VehicleModal({ isOpen, onClose, onSubmit, editData, onOpenAdjuster }) {
  const [form, setForm] = useState(() => getDefaultVehicleForm());
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    // Defer ke microtask: hindari setState sinkron di dalam effect
    Promise.resolve().then(() => {
      if (editData) {
        setForm({
          name: editData.name || '',
          plate_number: editData.plate_number || '',
          year: editData.year || new Date().getFullYear(),
          color: editData.color || '',
          category: editData.category || 'honda',
          rate_per_day: editData.rate_per_day || '',
          rate_per_week: editData.rate_per_week || '',
          rate_per_month: editData.rate_per_month || '',
          image_url: editData.image_url || '',
          current_km: editData.current_km || 15000,
          status: editData.status || 'available',
          notes: editData.notes || '',
          owner_type: editData.owner_type || (editData.owner_name ? 'investor' : 'internal'),
          owner_name: editData.owner_name || '',
          owner_contact: editData.owner_contact || '',
          revenue_share_percentage: editData.revenue_share_percentage ? String(editData.revenue_share_percentage) : '70',
          purchase_date: editData.purchase_date || '',
          purchase_price: editData.purchase_price ? String(editData.purchase_price) : '',
        });
      } else {
        setForm(getDefaultVehicleForm());
      }
    });
  }, [editData, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const numericFields = ['rate_per_day', 'rate_per_week', 'rate_per_month', 'current_km', 'revenue_share_percentage', 'purchase_price'];
    if (numericFields.includes(name)) {
      setForm({ ...form, [name]: value.replace(/[^0-9]/g, '') });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploading(true);
      const compressed = await compressImage(file, 800, 0.7);
      setForm(prev => ({ ...prev, image_url: compressed }));
    } catch (err) {
      alert(err.message || 'Gagal mengompresi gambar motor.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const safeInt = (v) => parseInt(String(v).replace(/[^0-9]/g, ''), 10) || 0;
    await onSubmit({
      ...form,
      year: parseInt(form.year, 10),
      rate_per_day:   safeInt(form.rate_per_day),
      rate_per_week:  safeInt(form.rate_per_week),
      rate_per_month: safeInt(form.rate_per_month),
      current_km:     safeInt(form.current_km),
      revenue_share_percentage: safeInt(form.revenue_share_percentage) || 70,
      purchase_price: safeInt(form.purchase_price),
      purchase_date: (form.purchase_date && String(form.purchase_date).trim() !== '') ? form.purchase_date : null,
    });
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-title">
              {editData ? (
                <><i className="fa-solid fa-pen-to-square" style={{ marginRight: '6px' }}></i> Edit Data Motor</>
              ) : (
                <><i className="fa-solid fa-motorcycle" style={{ marginRight: '6px' }}></i> Tambah Motor Baru</>
              )}
            </div>
            <div className="modal-subtitle">Isi informasi kendaraan rental & kilometer Odometer</div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="v-name">
              <i className="fa-solid fa-motorcycle" style={{ marginRight: '6px' }}></i> Nama Motor <span className="required">*</span>
            </label>
            <input id="v-name" name="name" type="text" className="form-control" placeholder="e.g. Honda Beat 2022" value={form.name} onChange={handleChange} required />
          </div>

          <div className="form-row cols-2">
            <div className="form-group">
              <label className="form-label" htmlFor="v-plate">
                <i className="fa-solid fa-id-card" style={{ marginRight: '6px' }}></i> Plat Nomor <span className="required">*</span>
              </label>
              <input id="v-plate" name="plate_number" type="text" className="form-control" placeholder="DK 1234 AB" value={form.plate_number} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="v-cat">
                <i className="fa-solid fa-motorcycle" style={{ marginRight: '6px' }}></i> Merek / Kategori Motor <span className="required">*</span>
              </label>
              <select
                id="v-cat"
                name="category"
                className="form-control"
                value={['honda', 'yamaha', 'suzuki', 'kawasaki', 'vespa'].includes(form.category?.toLowerCase()) ? form.category.toLowerCase() : 'custom'}
                onChange={e => {
                  const val = e.target.value;
                  if (val === 'custom') {
                    setForm(p => ({ ...p, category: '' }));
                  } else {
                    setForm(p => ({ ...p, category: val }));
                  }
                }}
                required
              >
                <option value="honda">Honda</option>
                <option value="yamaha">Yamaha</option>
                <option value="suzuki">Suzuki</option>
                <option value="kawasaki">Kawasaki</option>
                <option value="vespa">Vespa / Piaggio</option>
                <option value="custom">+ Tambah Merek Baru / Custom...</option>
              </select>

              {!['honda', 'yamaha', 'suzuki', 'kawasaki', 'vespa'].includes(form.category?.toLowerCase()) && (
                <div style={{ position: 'relative', marginTop: '8px' }}>
                  <i className="fa-solid fa-pen-to-square" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#A855F7', fontSize: '13px' }}></i>
                  <input
                    type="text"
                    className="form-control"
                    style={{ paddingLeft: '34px', border: '1px solid #A855F7' }}
                    placeholder="Ketik merek motor baru (e.g. Aprilia, BMW, Royal Enfield)..."
                    value={form.category}
                    onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                    required
                  />
                </div>
              )}
            </div>
          </div>

          <div className="form-row cols-2">
            <div className="form-group">
              <label className="form-label" htmlFor="v-year">
                <i className="fa-solid fa-calendar-days" style={{ marginRight: '6px' }}></i> Tahun <span className="required">*</span>
              </label>
              <input id="v-year" name="year" type="number" className="form-control" min="2000" max="2030" value={form.year} onChange={handleChange} required />
            </div>
          </div>

          <div className="form-row cols-2">
            <div className="form-group">
              <label className="form-label" htmlFor="v-color">
                <i className="fa-solid fa-palette" style={{ marginRight: '6px' }}></i> Warna <span className="required">*</span>
              </label>
              <input id="v-color" name="color" type="text" className="form-control" placeholder="Hitam, Putih, Merah..." value={form.color} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="v-km">
                <i className="fa-solid fa-gauge-high" style={{ marginRight: '6px' }}></i> Kilometer Saat Ini (Odometer)
              </label>
              <input
                id="v-km"
                name="current_km"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                className="form-control"
                placeholder="15000"
                value={form.current_km}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* ── 3-Tier Pricing ── */}
          <div className="pricing-tier-section">
            <div className="pricing-tier-header">
              <i className="fa-solid fa-tags"></i>
              <span>Pricing Tiers</span>
              <span className="pricing-tier-hint">Set rates for Smart Calculator recommendations</span>
            </div>
            <div className="pricing-tier-grid">
              <div className="pricing-tier-card daily-tier">
                <div className="tier-icon"><i className="fa-solid fa-sun"></i></div>
                <label className="form-label" htmlFor="v-rate">
                  Daily Rate (Rp) <span className="required">*</span>
                </label>
                <input
                  id="v-rate"
                  name="rate_per_day"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="form-control"
                  placeholder="150,000"
                  value={form.rate_per_day}
                  onChange={handleChange}
                  required
                />
                <div className="tier-desc">per day / 1–6 days</div>
                {form.rate_per_day > 0 && (
                  <div className="tier-preview">{formatRupiah(parseInt(form.rate_per_day) || 0)}/day</div>
                )}
              </div>

              <div className="pricing-tier-card weekly-tier">
                <div className="tier-icon"><i className="fa-solid fa-calendar-week"></i></div>
                <label className="form-label" htmlFor="v-rate-week">
                  Weekly Rate (Rp)
                </label>
                <input
                  id="v-rate-week"
                  name="rate_per_week"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="form-control"
                  placeholder="900,000"
                  value={form.rate_per_week}
                  onChange={handleChange}
                />
                <div className="tier-desc">per 7 days / best for 7–29 days</div>
                {form.rate_per_week > 0 && (
                  <div className="tier-preview">{formatRupiah(parseInt(form.rate_per_week) || 0)}/week</div>
                )}
                {form.rate_per_day > 0 && form.rate_per_week > 0 && (
                  <div className="tier-saving">
                    <i className="fa-solid fa-arrow-trend-down"></i>
                    Save {Math.round((1 - (parseInt(form.rate_per_week) / (parseInt(form.rate_per_day) * 7))) * 100)}% vs daily
                  </div>
                )}
              </div>

              <div className="pricing-tier-card monthly-tier">
                <div className="tier-icon"><i className="fa-solid fa-calendar-days"></i></div>
                <label className="form-label" htmlFor="v-rate-month">
                  Monthly Rate (Rp)
                </label>
                <input
                  id="v-rate-month"
                  name="rate_per_month"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="form-control"
                  placeholder="2,500,000"
                  value={form.rate_per_month}
                  onChange={handleChange}
                />
                <div className="tier-desc">per 30 days / best for 30+ days</div>
                {form.rate_per_month > 0 && (
                  <div className="tier-preview">{formatRupiah(parseInt(form.rate_per_month) || 0)}/month</div>
                )}
                {form.rate_per_day > 0 && form.rate_per_month > 0 && (
                  <div className="tier-saving">
                    <i className="fa-solid fa-arrow-trend-down"></i>
                    Save {Math.round((1 - (parseInt(form.rate_per_month) / (parseInt(form.rate_per_day) * 30))) * 100)}% vs daily
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="form-group">
              <label className="form-label">
                <i className="fa-solid fa-camera" style={{ marginRight: '6px' }}></i> Upload Foto Motor
              </label>
              <label htmlFor="v-file-input" className="custom-file-btn">
                <i className="fa-solid fa-cloud-arrow-up" style={{ color: 'var(--brand-primary-light)', fontSize: '16px' }}></i>
                <span>Pilih Foto dari Perangkat</span>
              </label>
              <input
                id="v-file-input"
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
                disabled={uploading}
              />
              {uploading && (
                <div style={{ fontSize: '11px', color: 'var(--brand-primary-light)', marginTop: '6px' }}>
                  <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '4px' }}></i> Mengompresi gambar...
                </div>
              )}
              {form.image_url && !uploading && (
                <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <img src={form.image_url} alt="Preview" style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover' }} />
                  <span style={{ fontSize: '11px', color: '#22C55E', fontWeight: 600 }}>
                    <i className="fa-solid fa-circle-check" style={{ marginRight: '4px' }}></i> Foto Berhasil Dimuat
                  </span>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => onOpenAdjuster(form.image_url, (adjusted) => setForm(p => ({ ...p, image_url: adjusted })))}
                  >
                    <i className="fa-solid fa-sliders" style={{ marginRight: '4px' }}></i> Adjust Foto
                  </button>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setForm(p => ({ ...p, image_url: '' }))}>Hapus</button>
                </div>
              )}
            </div>

          {/* 🔒 OWNERSHIP & INVESTOR SECTION (PRIVACY MANAGEMENT ONLY) */}
          <div style={{ background: 'rgba(168, 85, 247, 0.07)', border: '1px solid rgba(168, 85, 247, 0.28)', padding: '16px', borderRadius: '14px', marginBottom: '20px' }}>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#A855F7', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fa-solid fa-user-shield"></i>
              <span>Kepemilikan & Investor (Privasi Management)</span>
            </div>

            <div className="form-group mb-3">
              <label className="form-label" style={{ fontSize: '12px', fontWeight: 700 }}>
                Status Kepemilikan Unit Motor
              </label>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-primary)', background: 'var(--bg-card)', padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--bg-border)' }}>
                  <input
                    type="radio"
                    name="owner_type"
                    value="internal"
                    checked={form.owner_type === 'internal'}
                    onChange={e => setForm(p => ({ ...p, owner_type: e.target.value }))}
                    style={{ accentColor: '#A855F7' }}
                  />
                  <span><i className="fa-solid fa-building" style={{ marginRight: '4px', color: 'var(--brand-primary)' }}></i> Milik Internal Boss Rent</span>
                </label>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-primary)', background: 'var(--bg-card)', padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--bg-border)' }}>
                  <input
                    type="radio"
                    name="owner_type"
                    value="investor"
                    checked={form.owner_type === 'investor'}
                    onChange={e => setForm(p => ({ ...p, owner_type: e.target.value }))}
                    style={{ accentColor: '#A855F7' }}
                  />
                  <span><i className="fa-solid fa-crown" style={{ marginRight: '4px', color: '#A855F7' }}></i> Titipan Investor (Bagi Hasil)</span>
                </label>
              </div>
            </div>

            {form.owner_type === 'investor' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed rgba(168, 85, 247, 0.3)' }}>
                <div className="form-row cols-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="v-owner-name">
                      <i className="fa-solid fa-user-tie" style={{ marginRight: '6px', color: '#A855F7' }}></i> Nama Investor / Pemilik <span className="required">*</span>
                    </label>
                    <input
                      id="v-owner-name"
                      name="owner_name"
                      type="text"
                      className="form-control"
                      placeholder="e.g. Bpk. Budi Santoso / PT Bali Investama"
                      value={form.owner_name}
                      onChange={handleChange}
                      required={form.owner_type === 'investor'}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="v-owner-contact">
                      <i className="fa-brands fa-whatsapp" style={{ marginRight: '6px', color: '#22C55E' }}></i> No. WA / HP Investor
                    </label>
                    <input
                      id="v-owner-contact"
                      name="owner_contact"
                      type="text"
                      className="form-control"
                      placeholder="081234567890"
                      value={form.owner_contact}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="form-row cols-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="v-share-pct">
                      <i className="fa-solid fa-percent" style={{ marginRight: '6px', color: '#A855F7' }}></i> Bagi Hasil Investor (%)
                    </label>
                    <input
                      id="v-share-pct"
                      name="revenue_share_percentage"
                      type="text"
                      inputMode="numeric"
                      className="form-control"
                      placeholder="70"
                      value={form.revenue_share_percentage}
                      onChange={handleChange}
                    />
                    <div style={{ fontSize: '11px', color: '#A855F7', marginTop: '4px', fontWeight: 600 }}>
                      * {form.revenue_share_percentage || 70}% Investor / {100 - Number(form.revenue_share_percentage || 70)}% Boss Rent
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="v-status">
              <i className="fa-solid fa-list-check" style={{ marginRight: '6px' }}></i> Status Kendaraan
            </label>
            <select id="v-status" name="status" className="form-control" value={form.status} onChange={handleChange}>
              <option value="available">Tersedia</option>
              <option value="rented">Sedang Disewa</option>
              <option value="maintenance">Dalam Perawatan (Bengkel)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="v-notes">
              <i className="fa-regular fa-note-sticky" style={{ marginRight: '6px' }}></i> Catatan Kondisi Motor
            </label>
            <textarea id="v-notes" name="notes" className="form-control" rows={3} placeholder="Catatan kondisi motor, barang bawaan, helm, dll." value={form.notes} onChange={handleChange} style={{ resize: 'vertical' }} />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Batal</button>
            <button id="btn-vehicle-submit" type="submit" className="btn btn-primary" disabled={loading || uploading}>
              {loading ? (
                <><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '6px' }}></i> Menyimpan...</>
              ) : editData ? (
                <><i className="fa-solid fa-floppy-disk" style={{ marginRight: '6px' }}></i> Simpan</>
              ) : (
                <><i className="fa-solid fa-plus" style={{ marginRight: '6px' }}></i> Tambah Motor</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ===== CONFIRM DELETE & FK CONFLICT MODAL =====
function ConfirmModal({ isOpen, onClose, onConfirm, onForceDelete, onSetMaintenance, vehicleName, historyError }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-md" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '6px', color: historyError ? '#F59E0B' : '#EF4444' }}></i>
            {historyError ? 'Motor Memiliki Riwayat Transaksi' : 'Hapus Motor?'}
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {historyError ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="alert alert-warning" style={{ fontSize: '13px', margin: 0 }}>
              Motor <strong style={{ color: '#F59E0B' }}>{vehicleName}</strong> pernah disewakan dan memiliki riwayat transaksi di sistem. Menghapus motor ini secara paksa akan merusak laporan keuangan.
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Pilih tindakan yang diinginkan:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                className="btn btn-primary"
                onClick={() => { onSetMaintenance(); onClose(); }}
                style={{ justifyContent: 'flex-start', padding: '10px 14px' }}
              >
                <i className="fa-solid fa-wrench" style={{ marginRight: '8px' }}></i>
                <div>
                  <div style={{ fontWeight: 700 }}>Ubah Status ke &apos;Perawatan&apos; (Direkomendasikan)</div>
                  <div style={{ fontSize: '11px', opacity: 0.8, fontWeight: 400 }}>Motor disembunyikan dari sewa aktif, histori laporan tetap aman</div>
                </div>
              </button>
              <button
                className="btn btn-danger"
                onClick={() => { onForceDelete(); onClose(); }}
                style={{ justifyContent: 'flex-start', padding: '10px 14px' }}
              >
                <i className="fa-solid fa-trash-can" style={{ marginRight: '8px' }}></i>
                <div>
                  <div style={{ fontWeight: 700 }}>Hapus Permanen & Hapus Seluruh Histori Transaksi</div>
                  <div style={{ fontSize: '11px', opacity: 0.8, fontWeight: 400 }}>Menghapus motor dan riwayat transaksinya dari database</div>
                </div>
              </button>
            </div>
          </div>
        ) : (
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Motor <strong style={{ color: 'var(--text-primary)' }}>{vehicleName}</strong> akan dihapus secara permanen dari database.
          </p>
        )}

        {!historyError && (
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>Batal</button>
            <button id="btn-vehicle-delete-confirm" className="btn btn-danger" onClick={() => { onConfirm(); }}>
              <i className="fa-solid fa-trash-can" style={{ marginRight: '6px' }}></i> Hapus Motor
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ===== MAIN PAGE =====
export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [ownershipFilter, setOwnershipFilter] = useState('all'); // 'all', 'internal', 'investor', 'investor_recap'
  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ open: false, id: null, name: '', historyError: false });
  const [alert, setAlert] = useState(null);

  const showAlert = (message, type = 'success') => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 4000);
  };

  const fetchVehicles = useCallback(async () => {
    setLoading(true);
    let list = null;
    // Jalur utama: API route. Jika gagal (401/500/network) → fallback LANGSUNG
    // ke Supabase (sama seperti halaman Ketersediaan/Tracking) supaya data
    // motor TIDAK pernah tampak "hilang".
    try {
      const res = await fetch('/api/vehicles');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) list = data;
      } else {
        console.warn('API /api/vehicles HTTP ' + res.status + ' — fallback ke Supabase langsung.');
      }
    } catch (err) {
      console.error('Fetch vehicles via API error:', err);
    }
    if (list === null) {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('vehicles')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        list = data || [];
      } catch (err) {
        console.error('Fetch vehicles via Supabase error:', err);
        list = [];
      }
    }
    setVehicles(list);
    setLoading(false);
  }, []);

  useEffect(() => { Promise.resolve().then(fetchVehicles); }, [fetchVehicles]);

  const safeVehicles = Array.isArray(vehicles) ? vehicles : [];

  const investorVehicles = safeVehicles.filter(v => v.owner_type === 'investor' || (v.owner_name && v.owner_name.trim() !== ''));
  const internalVehicles = safeVehicles.filter(v => (!v.owner_type || v.owner_type === 'internal') && (!v.owner_name || v.owner_name.trim() === ''));

  // Group vehicles by unique investor
  const investorMap = {};
  investorVehicles.forEach(v => {
    const name = v.owner_name?.trim() || 'Investor Tanpa Nama';
    if (!investorMap[name]) {
      investorMap[name] = {
        name,
        contact: v.owner_contact || '-',
        sharePct: v.revenue_share_percentage || 70,
        vehicles: [],
        totalCapital: 0
      };
    }
    investorMap[name].vehicles.push(v);
    investorMap[name].totalCapital += Number(v.purchase_price || 0);
  });
  const investorList = Object.values(investorMap);

  const filtered = safeVehicles.filter(v => {
    const matchStatus = statusFilter === 'all' || v.status === statusFilter;
    const isInvestor = v.owner_type === 'investor' || (v.owner_name && v.owner_name.trim() !== '');
    const matchOwnership = ownershipFilter === 'all' || ownershipFilter === 'investor_recap' ||
      (ownershipFilter === 'internal' && !isInvestor) ||
      (ownershipFilter === 'investor' && isInvestor);

    const q = searchQuery.toLowerCase();
    const matchSearch = !q || v.name?.toLowerCase().includes(q) || v.plate_number?.toLowerCase().includes(q) || v.color?.toLowerCase().includes(q) || v.owner_name?.toLowerCase().includes(q);
    return matchStatus && matchOwnership && matchSearch;
  });

  const handleSubmit = async (formData) => {
    const url = editData ? `/api/vehicles/${editData.id}` : '/api/vehicles';
    const method = editData ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    const data = await res.json();
    if (res.ok) {
      showAlert(editData ? 'Data motor berhasil diperbarui.' : 'Motor baru berhasil ditambahkan.');
      setShowModal(false);
      setEditData(null);
      fetchVehicles();
    } else {
      showAlert(data.error || 'Terjadi kesalahan.', 'danger');
    }
  };

  const handleDelete = async (id, cascade = false) => {
    const url = cascade ? `/api/vehicles/${id}?cascade=true` : `/api/vehicles/${id}`;
    const res = await fetch(url, { method: 'DELETE' });
    const data = await res.json();

    if (res.ok) {
      showAlert('Motor berhasil dihapus.');
      setDeleteModal({ open: false, id: null, name: '', historyError: false });
      fetchVehicles();
    } else if (res.status === 409 || data.hasHistory) {
      // Show FK conflict options in modal
      setDeleteModal(prev => ({ ...prev, historyError: true }));
    } else {
      showAlert(data.error || 'Gagal menghapus motor.', 'danger');
    }
  };

  const handleSetMaintenance = async (id) => {
    const res = await fetch(`/api/vehicles/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'maintenance' }),
    });
    if (res.ok) {
      showAlert('Status motor berhasil diubah menjadi Perawatan.');
      fetchVehicles();
    }
  };

  const [adjusterModal, setAdjusterModal] = useState({ open: false, src: null, callback: null });

  const handleOpenAdjuster = (src, callback) => {
    setAdjusterModal({ open: true, src, callback });
  };

  const handleCardAdjuster = (vehicle) => {
    if (!vehicle.image_url) return;
    setAdjusterModal({
      open: true,
      src: vehicle.image_url,
      callback: async (adjustedUrl) => {
        const res = await fetch(`/api/vehicles/${vehicle.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image_url: adjustedUrl }),
        });
        if (res.ok) {
          showAlert('Foto motor berhasil disesuaikan.');
          fetchVehicles();
        }
      }
    });
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <h2><i className="fa-solid fa-motorcycle" style={{ marginRight: '8px' }}></i> Data Motor</h2>
        <p>Kelola armada kendaraan rental Boss Rent Pererenan</p>
      </div>

      {alert && <div className={`alert alert-${alert.type}`}>{alert.message}</div>}

      {/* OWNERSHIP TABS FILTER BAR */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '4px' }}>
        <button
          className={`btn btn-sm ${ownershipFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setOwnershipFilter('all')}
          style={{ borderRadius: '8px', padding: '6px 14px', fontSize: '12.5px', fontWeight: 600, whiteSpace: 'nowrap' }}
        >
          <i className="fa-solid fa-motorcycle" style={{ marginRight: '6px' }}></i>
          Semua Unit Armada ({safeVehicles.length})
        </button>
        <button
          className={`btn btn-sm ${ownershipFilter === 'internal' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setOwnershipFilter('internal')}
          style={{ borderRadius: '8px', padding: '6px 14px', fontSize: '12.5px', fontWeight: 600, whiteSpace: 'nowrap' }}
        >
          <i className="fa-solid fa-building" style={{ marginRight: '6px' }}></i>
          Milik Internal ({internalVehicles.length})
        </button>
        <button
          className={`btn btn-sm ${ownershipFilter === 'investor' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setOwnershipFilter('investor')}
          style={{ borderRadius: '8px', padding: '6px 14px', fontSize: '12.5px', fontWeight: 600, whiteSpace: 'nowrap' }}
        >
          <i className="fa-solid fa-crown" style={{ marginRight: '6px', color: '#A855F7' }}></i>
          Milik Investor ({investorVehicles.length})
        </button>
        <button
          className={`btn btn-sm ${ownershipFilter === 'investor_recap' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setOwnershipFilter('investor_recap')}
          style={{ borderRadius: '8px', padding: '6px 14px', fontSize: '12.5px', fontWeight: 600, whiteSpace: 'nowrap' }}
        >
          <i className="fa-solid fa-address-card" style={{ marginRight: '6px', color: '#A855F7' }}></i>
          Directory & Rekap Investor ({investorList.length})
        </button>
      </div>

      <div className="page-actions">
        <div className="filter-bar">
          <div className="search-bar">
            <span className="search-bar-icon"><i className="fa-solid fa-magnifying-glass"></i></span>
            <input
              id="vehicle-search"
              type="text"
              className="form-control"
              placeholder="Cari motor, plat, nama investor..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <select
            id="vehicle-status-filter"
            className="form-control filter-select"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="all">Semua Status</option>
            <option value="available">Tersedia</option>
            <option value="rented">Disewa</option>
            <option value="maintenance">Perawatan</option>
          </select>
        </div>
        <button
          id="btn-add-vehicle"
          className="btn btn-primary"
          onClick={() => { setEditData(null); setShowModal(true); }}
        >
          <i className="fa-solid fa-plus" style={{ marginRight: '6px' }}></i> Tambah Motor
        </button>
      </div>

      {loading ? (
        <div className="table-empty card"><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '8px' }}></i> Memuat data motor...</div>
      ) : ownershipFilter === 'investor_recap' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Investor Summary Cards */}
          <div className="grid-2">
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#A855F7' }}>
                <i className="fa-solid fa-users"></i>
              </div>
              <div className="stat-info">
                <div className="stat-label">Total Investor Aktif</div>
                <div className="stat-value" style={{ color: '#A855F7' }}>{investorList.length} Investor</div>
                <div className="stat-change">{investorVehicles.length} total unit motor titipan</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#22C55E' }}>
                <i className="fa-solid fa-hand-holding-dollar"></i>
              </div>
              <div className="stat-info">
                <div className="stat-label">Unit Titipan Investor (Bagi Hasil)</div>
                <div className="stat-value" style={{ color: '#22C55E' }}>{investorVehicles.length} Unit</div>
                <div className="stat-change">{Math.round((investorVehicles.length / Math.max(safeVehicles.length, 1)) * 100)}% dari total armada</div>
              </div>
            </div>
          </div>

          {/* Directory Cards Grid */}
          {investorList.length === 0 ? (
            <div className="table-empty card">
              <div className="table-empty-icon"><i className="fa-solid fa-crown" style={{ color: '#A855F7' }}></i></div>
              <p>Belum ada data investor terdaftar. Edit atau tambah motor baru lalu aktifkan status kepemilikan &apos;Titipan Investor&apos;.</p>
            </div>
          ) : (
            <div className="grid-2">
              {investorList.map((inv, idx) => (
                <div key={idx} className="card" style={{ padding: '20px', borderRadius: '16px', border: '1px solid rgba(168, 85, 247, 0.3)', background: 'var(--bg-card)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px', borderBottom: '1px solid var(--bg-border)', paddingBottom: '12px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="badge" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#A855F7', padding: '4px 10px', fontSize: '11px' }}>
                          <i className="fa-solid fa-crown"></i> Investor #{idx + 1}
                        </span>
                        <strong style={{ fontSize: '15.5px', color: 'var(--text-primary)' }}>{inv.name}</strong>
                      </div>
                      {inv.contact && inv.contact !== '-' && (
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                          <i className="fa-brands fa-whatsapp" style={{ color: '#22C55E', marginRight: '6px' }}></i>{inv.contact}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className="badge badge-success" style={{ fontSize: '11.5px', padding: '4px 10px' }}>
                        {inv.sharePct}% Investor / {100 - Number(inv.sharePct)}% Boss Rent
                      </span>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>
                      <i className="fa-solid fa-motorcycle" style={{ marginRight: '6px', color: 'var(--brand-primary-light)' }}></i> Unit Motor Dititipkan ({inv.vehicles.length} Unit):
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {inv.vehicles.map(v => (
                        <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-elevated)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--bg-border)' }}>
                          <div>
                            <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{v.name}</strong>
                            <span style={{ fontSize: '11px', color: 'var(--brand-primary-light)', marginLeft: '8px', fontWeight: 600 }}>({v.plate_number})</span>
                          </div>
                          <div>{statusBadge(v.status)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : filtered.length === 0 ? (
        <div className="table-empty card">
          <div className="table-empty-icon"><i className="fa-solid fa-motorcycle"></i></div>
          <p>Tidak ada motor ditemukan. <button className="btn btn-primary btn-sm" onClick={() => { setEditData(null); setShowModal(true); }}>Tambah Motor</button></p>
        </div>
      ) : (
        <div className="grid-3">
          {filtered.map(vehicle => {
            const isInvestorUnit = vehicle.owner_type === 'investor' || (vehicle.owner_name && vehicle.owner_name.trim() !== '');

            return (
              <div key={vehicle.id} className="vehicle-card" style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="vehicle-card-image" style={{ position: 'relative', overflow: 'hidden', height: '160px', background: 'var(--bg-card-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {vehicle.image_url ? (
                    <img
                      src={vehicle.image_url}
                      alt={vehicle.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                    />
                  ) : null}
                  <div style={{ display: vehicle.image_url ? 'none' : 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <i className="fa-solid fa-motorcycle" style={{ fontSize: '48px', color: 'var(--brand-primary)' }}></i>
                  </div>
                  {vehicle.image_url && (
                    <button
                      onClick={() => handleCardAdjuster(vehicle)}
                      title="Sesuaikan tampilan foto motor"
                      style={{
                        position: 'absolute', top: '10px', left: '10px',
                        background: 'rgba(0,0,0,0.6)', color: '#fff',
                        border: 'none', borderRadius: '6px',
                        width: '30px', height: '30px',
                        cursor: 'pointer', fontSize: '12px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}
                    >
                      <i className="fa-solid fa-sliders"></i>
                    </button>
                  )}
                  <div className="vehicle-card-status" style={{ position: 'absolute', top: '10px', right: '10px' }}>
                    {statusBadge(vehicle.status)}
                  </div>
                </div>
                <div className="vehicle-card-body" style={{ flex: 1 }}>
                  <div className="vehicle-card-name">{vehicle.name}</div>
                  <div className="vehicle-card-plate"><i className="fa-solid fa-id-card" style={{ marginRight: '4px' }}></i> {vehicle.plate_number}</div>
                  <div className="vehicle-card-rate">{formatRupiah(vehicle.rate_per_day)}<span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 400 }}>/hari</span></div>
                  <div className="vehicle-card-meta" style={{ marginTop: '8px' }}>
                    <span><i className="fa-solid fa-calendar-days" style={{ marginRight: '4px' }}></i> {vehicle.year}</span>
                    <span><i className="fa-solid fa-palette" style={{ marginRight: '4px' }}></i> {vehicle.color}</span>
                    <span><i className="fa-solid fa-gauge-high" style={{ marginRight: '4px' }}></i> {vehicle.current_km ? `${vehicle.current_km.toLocaleString('id-ID')} KM` : '-'}</span>
                  </div>
                  {isInvestorUnit && (
                    <div style={{ marginTop: '8px' }}>
                      <span className="badge" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#A855F7', borderColor: 'rgba(168, 85, 247, 0.35)', fontSize: '10.5px', padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <i className="fa-solid fa-crown"></i> Investor: {vehicle.owner_name || 'Bagi Hasil'} ({vehicle.revenue_share_percentage || 70}/{100 - Number(vehicle.revenue_share_percentage || 70)})
                      </span>
                    </div>
                  )}
                  {vehicle.notes && (
                    <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      <i className="fa-regular fa-note-sticky" style={{ marginRight: '4px' }}></i> {vehicle.notes}
                    </div>
                  )}
                </div>
                <div className="vehicle-card-actions">
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1 }}
                    onClick={() => { setEditData(vehicle); setShowModal(true); }}
                  >
                    <i className="fa-solid fa-pen-to-square" style={{ marginRight: '4px' }}></i> Edit
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => setDeleteModal({ open: true, id: vehicle.id, name: vehicle.name })}
                  >
                    <i className="fa-solid fa-trash-can"></i>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <VehicleModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditData(null); }}
        onSubmit={handleSubmit}
        editData={editData}
        onOpenAdjuster={handleOpenAdjuster}
      />

      <ConfirmModal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, id: null, name: '', historyError: false })}
        vehicleName={deleteModal.name}
        historyError={deleteModal.historyError}
        onConfirm={() => handleDelete(deleteModal.id, false)}
        onForceDelete={() => handleDelete(deleteModal.id, true)}
        onSetMaintenance={() => handleSetMaintenance(deleteModal.id)}
      />

      <ImageAdjusterModal
        isOpen={adjusterModal.open}
        imageSrc={adjusterModal.src}
        onConfirm={(adjustedUrl) => {
          if (adjusterModal.callback) adjusterModal.callback(adjustedUrl);
          setAdjusterModal({ open: false, src: null, callback: null });
        }}
        onCancel={() => setAdjusterModal({ open: false, src: null, callback: null })}
      />
    </div>
  );
}
