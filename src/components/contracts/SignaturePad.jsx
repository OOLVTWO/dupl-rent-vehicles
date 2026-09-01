'use client';

import { useRef, useState, useEffect, useCallback } from 'react';

/**
 * Kanvas tanda tangan sederhana — customer tanda tangan langsung di layar
 * (mouse di desktop, jari di HP/tablet). Tidak pakai library eksternal,
 * murni Canvas API bawaan browser.
 */
export default function SignaturePad({ onChange }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const lastPoint = useRef(null);
  const [hasSignature, setHasSignature] = useState(false);

  const getCanvasContext = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext('2d');
  }, []);

  // Set ukuran kanvas sesuai device pixel ratio biar garis tetap tajam.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    const ctx = canvas.getContext('2d');
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1E293B';
  }, []);

  const getPoint = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches && e.touches[0];
    const clientX = touch ? touch.clientX : e.clientX;
    const clientY = touch ? touch.clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDraw = (e) => {
    e.preventDefault();
    drawing.current = true;
    lastPoint.current = getPoint(e);
  };

  const draw = (e) => {
    if (!drawing.current) return;
    e.preventDefault();
    const ctx = getCanvasContext();
    const point = getPoint(e);
    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    lastPoint.current = point;
    if (!hasSignature) setHasSignature(true);
  };

  const endDraw = () => {
    if (!drawing.current) return;
    drawing.current = false;
    if (onChange) {
      const canvas = canvasRef.current;
      onChange(canvas.toDataURL('image/png'));
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = getCanvasContext();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    if (onChange) onChange('');
  };

  return (
    <div>
      <div
        style={{
          border: '2px dashed var(--sharp-line-strong, #CBD5E1)',
          borderRadius: 'var(--radius-md, 10px)',
          background: '#fff',
          position: 'relative',
          touchAction: 'none',
        }}
      >
        {!hasSignature && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#94A3B8', fontSize: '13px', pointerEvents: 'none',
          }}>
            <i className="fa-solid fa-signature" style={{ marginRight: '8px' }}></i> Tanda tangan di sini
          </div>
        )}
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: '160px', display: 'block', cursor: 'crosshair' }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
      </div>
      <button
        type="button"
        onClick={handleClear}
        style={{
          marginTop: '8px', background: 'none', border: 'none', color: 'var(--sharp-muted, #64748B)',
          fontSize: '12px', cursor: 'pointer', textDecoration: 'underline',
        }}
      >
        <i className="fa-solid fa-eraser" style={{ marginRight: '4px' }}></i> Hapus & ulangi
      </button>
    </div>
  );
}
