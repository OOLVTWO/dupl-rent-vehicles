'use client';

export default function DashboardError({ error, reset }) {
  return (
    <div style={{ maxWidth: 520, margin: '80px auto', textAlign: 'center', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#F0F0F5' }}>
      <div style={{ fontSize: 40, marginBottom: 8 }}>⚠️</div>
      <h2 style={{ fontSize: 18, margin: '0 0 8px' }}>Terjadi kesalahan saat memuat halaman</h2>
      <p style={{ fontSize: 13, color: '#9898B0', wordBreak: 'break-word' }}>
        {error && error.message ? String(error.message) : 'Kesalahan tidak diketahui.'}
      </p>
      <button
        onClick={() => reset()}
        style={{ marginTop: 16, padding: '10px 24px', border: 'none', borderRadius: 8, background: '#2563EB', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
      >
        Coba Lagi
      </button>
    </div>
  );
}
