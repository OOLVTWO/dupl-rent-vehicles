'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

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
      <div
        className="modal modal-lg"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '750px' }}
      >
        <div className="modal-header">
          <div>
            <div className="modal-title">
              <i className="fa-solid fa-crop-simple" style={{ marginRight: '6px', color: 'var(--brand-primary-light)' }}></i>
              Sesuaikan Gambar & Geser Kursor (Grid 9 Kotak)
            </div>
            <div className="modal-subtitle">Klik & tahan kursor mouse untuk menggeser posisi foto ke arah mana saja</div>
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
              alt="Preview"
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
                      background: isActive ? 'rgba(37, 99, 235, 0.12)' : 'transparent',
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
              <span>{isDragging ? 'Sedang menggeser foto...' : 'Tahan & Geser Kursor Mouse Untuk Atur Posisi'}</span>
            </div>
          </div>
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {/* Controls Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: '20px', alignItems: 'flex-start' }}>
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

export default function GalleryPage() {
  const [transactions, setTransactions] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('id_cards'); // 'id_cards' | 'handover' | 'vehicles'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);

  // Image Adjuster State
  const [adjusterOpen, setAdjusterOpen] = useState(false);
  const [adjusterSrc, setAdjusterSrc] = useState(null);
  const [adjusterTarget, setAdjusterTarget] = useState(null); // { type: 'customer' | 'vehicle', field: string, id: string }

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [tRes, vRes] = await Promise.all([
      fetch('/api/transactions'),
      fetch('/api/vehicles'),
    ]);
    const tData = await tRes.json();
    const vData = await vRes.json();
    setTransactions(Array.isArray(tData) ? tData : []);
    setVehicles(Array.isArray(vData) ? vData : []);
    setLoading(false);
  }, []);

  useEffect(() => { Promise.resolve().then(fetchData); }, [fetchData]);

  const removeTransactionPhoto = async (txId, fieldName = 'customer_image_url') => {
    const label = fieldName === 'customer_image_url' ? 'foto identitas customer' : 'foto serah terima orang + motor';
    if (!confirm(`Hapus ${label} ini dari galeri?`)) return;
    const res = await fetch(`/api/transactions/${txId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [fieldName]: null }),
    });
    if (res.ok) fetchData();
  };

  const removeVehiclePhoto = async (vId) => {
    if (!confirm('Hapus foto fisik motor ini dari galeri?')) return;
    const res = await fetch(`/api/vehicles/${vId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_url: null }),
    });
    if (res.ok) fetchData();
  };

  // Open adjuster before saving photo to a record
  const openAdjuster = (src, target) => {
    setAdjusterSrc(src);
    setAdjusterTarget(target);
    setAdjusterOpen(true);
  };

  const handleAdjusterConfirm = async (adjustedDataUrl) => {
    setAdjusterOpen(false);
    if (!adjusterTarget) return;
    const { type, field, id } = adjusterTarget;

    if (type === 'customer') {
      await fetch(`/api/transactions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field || 'customer_image_url']: adjustedDataUrl }),
      });
    } else {
      await fetch(`/api/vehicles/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: adjustedDataUrl }),
      });
    }
    fetchData();
  };

  const allTransactions = Array.isArray(transactions) ? transactions : [];
  const allVehicles = Array.isArray(vehicles) ? vehicles : [];

  const idCardTransactions = allTransactions.filter(t =>
    t.customer_image_url || (!searchQuery ? false : (t.renter_name?.toLowerCase().includes(searchQuery.toLowerCase()) || t.renter_phone?.includes(searchQuery)))
  );

  const handoverTransactions = allTransactions.filter(t =>
    t.handover_image_url || (!searchQuery ? false : (t.renter_name?.toLowerCase().includes(searchQuery.toLowerCase()) || t.renter_phone?.includes(searchQuery)))
  );

  const filteredVehicles = allVehicles.filter(v =>
    v.image_url || (!searchQuery ? false : (v.name?.toLowerCase().includes(searchQuery.toLowerCase()) || v.plate_number?.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  const hasPhotoIdCards = allTransactions.filter(t => t.customer_image_url).length;
  const hasPhotoHandover = allTransactions.filter(t => t.handover_image_url).length;
  const hasPhotoVehicles = allVehicles.filter(v => v.image_url).length;

  return (
    <div className="fade-in">
      <div className="page-header">
        <h2><i className="fa-solid fa-images" style={{ marginRight: '8px', color: 'var(--brand-primary-light)' }}></i> Galeri Foto Transaksi & Armada Motor</h2>
        <p>Arsip terpilah 3 kategori foto: Foto Identitas Customer (KTP/Paspor), Foto Serah Terima (Orang + Motor), dan Foto Fisik Armada.</p>
      </div>

      {/* 3-Tab Filter Category Pills */}
      <div className="scrollable-tabs-bar">
        <button
          type="button"
          className={`scrollable-tab-btn ${activeTab === 'id_cards' ? 'active' : ''}`}
          onClick={() => setActiveTab('id_cards')}
        >
          <i className="fa-solid fa-id-card"></i>
          1. Foto Identitas Customer ({hasPhotoIdCards})
        </button>
        <button
          type="button"
          className={`scrollable-tab-btn ${activeTab === 'handover' ? 'active' : ''}`}
          onClick={() => setActiveTab('handover')}
        >
          <i className="fa-solid fa-camera"></i>
          2. Foto Orang + Motor ({hasPhotoHandover})
        </button>
        <button
          type="button"
          className={`scrollable-tab-btn ${activeTab === 'vehicles' ? 'active' : ''}`}
          onClick={() => setActiveTab('vehicles')}
        >
          <i className="fa-solid fa-motorcycle"></i>
          3. Foto Fisik Motor ({hasPhotoVehicles})
        </button>
      </div>

      {/* Search */}
      <div className="page-actions mb-6">
        <div className="filter-bar" style={{ width: '100%' }}>
          <div className="search-bar" style={{ flex: 1 }}>
            <span className="search-bar-icon"><i className="fa-solid fa-magnifying-glass"></i></span>
            <input
              type="text"
              className="form-control"
              placeholder="Cari nama customer, HP, motor, atau plat nomor..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="card table-empty">
          <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '8px' }}></i> Memuat galeri foto terpilah...
        </div>
      ) : activeTab === 'id_cards' ? (
        /* TAB 1: CUSTOMER ID CARD PHOTOS (KTP/PASPOR/SIM) */
        idCardTransactions.length === 0 ? (
          <div className="card table-empty">
            <div className="table-empty-icon"><i className="fa-solid fa-id-card"></i></div>
            <p>Belum ada foto identitas customer (KTP/Paspor/SIM). Upload saat membuat transaksi baru.</p>
          </div>
        ) : (
          <div className="grid-3">
            {idCardTransactions.map(tx => (
              <div key={tx.id} className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', border: '1px solid var(--bg-border)' }}>
                <div
                  style={{
                    height: '180px',
                    background: 'var(--bg-elevated)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    cursor: tx.customer_image_url ? 'pointer' : 'default'
                  }}
                  onClick={() => tx.customer_image_url && setSelectedImage(tx.customer_image_url)}
                >
                  {tx.customer_image_url ? (
                    <img
                      src={tx.customer_image_url}
                      alt={tx.renter_name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
                      <i className="fa-solid fa-id-card" style={{ fontSize: '48px', color: 'var(--brand-primary)', opacity: 0.4 }}></i>
                      <span style={{ fontSize: '11px' }}>Belum Upload Foto KTP</span>
                    </div>
                  )}

                  <span style={{ position: 'absolute', top: '8px', left: '8px', background: 'rgba(15,23,42,0.9)', color: '#22C55E', fontSize: '10px', padding: '3px 8px', fontWeight: 800, borderRadius: '4px', border: '1px solid #22C55E' }}>
                    🪪 Foto Identitas
                  </span>

                  {tx.customer_image_url && (
                    <button
                      onClick={e => { e.stopPropagation(); openAdjuster(tx.customer_image_url, { type: 'customer', field: 'customer_image_url', id: tx.id }); }}
                      title="Sesuaikan gambar"
                      style={{
                        position: 'absolute', top: '8px', right: '8px',
                        background: 'rgba(0,0,0,0.7)', color: '#fff',
                        border: 'none', borderRadius: '6px',
                        width: '32px', height: '32px',
                        cursor: 'pointer', fontSize: '13px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}
                    >
                      <i className="fa-solid fa-sliders"></i>
                    </button>
                  )}
                </div>

                <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '5px', flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>
                    {tx.renter_name}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    <i className="fa-solid fa-phone" style={{ marginRight: '6px' }}></i>{tx.renter_phone}
                  </div>
                  {tx.renter_id_number && (
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      <i className="fa-solid fa-id-card" style={{ marginRight: '6px' }}></i>No. ID: {tx.renter_id_number}
                    </div>
                  )}
                  {tx.renter_address && (
                    <div style={{ fontSize: '11.5px', color: 'var(--brand-primary-light)' }}>
                      <i className="fa-solid fa-location-dot" style={{ marginRight: '6px' }}></i>{tx.renter_address}
                    </div>
                  )}
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, marginTop: '2px' }}>
                    <i className="fa-solid fa-motorcycle" style={{ marginRight: '6px', color: 'var(--brand-primary)' }}></i>{tx.vehicles?.name || 'Motor'} ({tx.vehicles?.plate_number})
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Sewa: {new Date(tx.start_date).toLocaleDateString('id-ID')} — {new Date(tx.end_date).toLocaleDateString('id-ID')}
                  </div>
                  {tx.customer_image_url && (
                    <div className="flex gap-2" style={{ marginTop: '8px' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '11px', flex: 1 }}
                        onClick={() => openAdjuster(tx.customer_image_url, { type: 'customer', field: 'customer_image_url', id: tx.id })}
                      >
                        <i className="fa-solid fa-sliders" style={{ marginRight: '4px' }}></i> Adjust
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        style={{ fontSize: '11px', flex: 1 }}
                        onClick={e => { e.stopPropagation(); removeTransactionPhoto(tx.id, 'customer_image_url'); }}
                      >
                        <i className="fa-solid fa-trash-can" style={{ marginRight: '4px' }}></i> Hapus
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      ) : activeTab === 'handover' ? (
        /* TAB 2: HANDOVER PHOTOS (ORANG + MOTOR) */
        handoverTransactions.length === 0 ? (
          <div className="card table-empty">
            <div className="table-empty-icon"><i className="fa-solid fa-camera"></i></div>
            <p>Belum ada foto serah terima orang + motor. Upload di Form Transaksi pada saat penyerahan unit.</p>
          </div>
        ) : (
          <div className="grid-3">
            {handoverTransactions.map(tx => (
              <div key={tx.id} className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', border: '1px solid var(--bg-border)' }}>
                <div
                  style={{
                    height: '180px',
                    background: 'var(--bg-elevated)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    cursor: tx.handover_image_url ? 'pointer' : 'default'
                  }}
                  onClick={() => tx.handover_image_url && setSelectedImage(tx.handover_image_url)}
                >
                  {tx.handover_image_url ? (
                    <img
                      src={tx.handover_image_url}
                      alt={`Serah Terima ${tx.renter_name}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
                      <i className="fa-solid fa-camera" style={{ fontSize: '48px', color: '#3B82F6', opacity: 0.4 }}></i>
                      <span style={{ fontSize: '11px' }}>Belum Upload Foto Serah Terima</span>
                    </div>
                  )}

                  <span style={{ position: 'absolute', top: '8px', left: '8px', background: 'rgba(15,23,42,0.9)', color: '#3B82F6', fontSize: '10px', padding: '3px 8px', fontWeight: 800, borderRadius: '4px', border: '1px solid #3B82F6' }}>
                    🛵 Foto Orang + Motor
                  </span>

                  {tx.handover_image_url && (
                    <button
                      onClick={e => { e.stopPropagation(); openAdjuster(tx.handover_image_url, { type: 'customer', field: 'handover_image_url', id: tx.id }); }}
                      title="Sesuaikan gambar"
                      style={{
                        position: 'absolute', top: '8px', right: '8px',
                        background: 'rgba(0,0,0,0.7)', color: '#fff',
                        border: 'none', borderRadius: '6px',
                        width: '32px', height: '32px',
                        cursor: 'pointer', fontSize: '13px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}
                    >
                      <i className="fa-solid fa-sliders"></i>
                    </button>
                  )}
                </div>

                <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '5px', flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>
                    {tx.renter_name}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    <i className="fa-solid fa-phone" style={{ marginRight: '6px' }}></i>{tx.renter_phone}
                  </div>
                  {tx.renter_address && (
                    <div style={{ fontSize: '11.5px', color: 'var(--brand-primary-light)' }}>
                      <i className="fa-solid fa-location-dot" style={{ marginRight: '6px' }}></i>{tx.renter_address}
                    </div>
                  )}
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, marginTop: '2px' }}>
                    <i className="fa-solid fa-motorcycle" style={{ marginRight: '6px', color: '#3B82F6' }}></i>{tx.vehicles?.name || 'Motor'} ({tx.vehicles?.plate_number})
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Sewa: {new Date(tx.start_date).toLocaleDateString('id-ID')} — {new Date(tx.end_date).toLocaleDateString('id-ID')}
                  </div>
                  {tx.handover_image_url && (
                    <div className="flex gap-2" style={{ marginTop: '8px' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '11px', flex: 1 }}
                        onClick={() => openAdjuster(tx.handover_image_url, { type: 'customer', field: 'handover_image_url', id: tx.id })}
                      >
                        <i className="fa-solid fa-sliders" style={{ marginRight: '4px' }}></i> Adjust
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        style={{ fontSize: '11px', flex: 1 }}
                        onClick={e => { e.stopPropagation(); removeTransactionPhoto(tx.id, 'handover_image_url'); }}
                      >
                        <i className="fa-solid fa-trash-can" style={{ marginRight: '4px' }}></i> Hapus
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* TAB 3: VEHICLE PHYSICAL PHOTOS */
        filteredVehicles.length === 0 ? (
          <div className="card table-empty">
            <div className="table-empty-icon"><i className="fa-solid fa-motorcycle"></i></div>
            <p>Belum ada data foto fisik kendaraan.</p>
          </div>
        ) : (
          <div className="grid-3">
            {filteredVehicles.map(v => (
              <div key={v.id} className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div
                  style={{
                    height: '180px',
                    background: 'var(--bg-elevated)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    cursor: v.image_url ? 'pointer' : 'default'
                  }}
                  onClick={() => v.image_url && setSelectedImage(v.image_url)}
                >
                  {v.image_url ? (
                    <img
                      src={v.image_url}
                      alt={v.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
                      <i className="fa-solid fa-motorcycle" style={{ fontSize: '48px', color: 'var(--brand-primary)', opacity: 0.4 }}></i>
                      <span style={{ fontSize: '11px' }}>Belum Ada Foto</span>
                    </div>
                  )}

                  <span style={{ position: 'absolute', top: '8px', left: '8px', background: 'rgba(15,23,42,0.9)', color: 'var(--brand-primary-light)', fontSize: '10px', padding: '3px 8px', fontWeight: 800, borderRadius: '4px', border: '1px solid var(--brand-primary)' }}>
                    🏍️ Foto Fisik Armada
                  </span>

                  {v.image_url && (
                    <button
                      onClick={e => { e.stopPropagation(); openAdjuster(v.image_url, { type: 'vehicle', id: v.id }); }}
                      title="Sesuaikan gambar"
                      style={{
                        position: 'absolute', top: '8px', right: '8px',
                        background: 'rgba(0,0,0,0.7)', color: '#fff',
                        border: 'none', borderRadius: '6px',
                        width: '32px', height: '32px',
                        cursor: 'pointer', fontSize: '13px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}
                    >
                      <i className="fa-solid fa-sliders"></i>
                    </button>
                  )}
                </div>

                <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', flex: 1, gap: '4px' }}>
                  <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>{v.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--brand-primary-light)', fontWeight: 600 }}>{v.plate_number}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Tahun: {v.year} | Warna: {v.color}
                  </div>
                  {v.image_url && (
                    <div className="flex gap-2" style={{ marginTop: '8px' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '11px', flex: 1 }}
                        onClick={() => openAdjuster(v.image_url, { type: 'vehicle', id: v.id })}
                      >
                        <i className="fa-solid fa-sliders" style={{ marginRight: '4px' }}></i> Adjust
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        style={{ fontSize: '11px', flex: 1 }}
                        onClick={e => { e.stopPropagation(); removeVehiclePhoto(v.id); }}
                      >
                        <i className="fa-solid fa-trash-can" style={{ marginRight: '4px' }}></i> Hapus
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Fullscreen Image Preview Modal */}
      {selectedImage && (
        <div className="modal-overlay" onClick={() => setSelectedImage(null)}>
          <div style={{ maxWidth: '90vw', maxHeight: '90vh', position: 'relative' }} onClick={e => e.stopPropagation()}>
            <img src={selectedImage} alt="Preview Penuh" style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: '12px', display: 'block' }} />
            <button
              onClick={() => setSelectedImage(null)}
              style={{
                position: 'absolute', top: '-14px', right: '-14px',
                background: '#EF4444', color: '#fff',
                border: 'none', borderRadius: '50%', width: '32px', height: '32px',
                cursor: 'pointer', fontWeight: 700, fontSize: '14px'
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Image Adjuster Modal */}
      <ImageAdjusterModal
        isOpen={adjusterOpen}
        imageSrc={adjusterSrc}
        onConfirm={handleAdjusterConfirm}
        onCancel={() => setAdjusterOpen(false)}
      />
    </div>
  );
}
