'use client';

function formatRupiah(amount) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount || 0);
}

// ===== RINGKASAN PEMBAYARAN — dipakai di Transaksi & Booking =====
// Selalu tampilkan berapa yang MASIH HARUS dibayar, apapun status
// pembayarannya: Lunas = 0, DP = sisa (total - dp), Belum Bayar = penuh.
export default function PaymentSummaryCell({ status, total, dp }) {
  const totalNum = Number(total) || 0;
  const dpNum = Number(dp) || 0;

  if (status === 'paid') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          Total Sewa: <strong style={{ color: 'var(--text-primary)' }}>{formatRupiah(totalNum)}</strong>
        </div>
        <div style={{ fontSize: '13px', color: '#22C55E', fontWeight: 800 }}>
          <i className="fa-solid fa-circle-check" style={{ marginRight: '5px', fontSize: '11px' }}></i>
          Total yang harus dibayar: {formatRupiah(0)} (Lunas)
        </div>
      </div>
    );
  }

  if (status === 'down_payment') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          Total Sewa: <strong style={{ color: 'var(--text-primary)' }}>{formatRupiah(totalNum)}</strong>
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          Sudah DP: <strong style={{ color: '#3B82F6' }}>{formatRupiah(dpNum)}</strong>
        </div>
        <div style={{ fontSize: '13px', color: '#F59E0B', fontWeight: 800, marginTop: '2px' }}>
          Total yang harus dibayar: {formatRupiah(Math.max(0, totalNum - dpNum))}
        </div>
      </div>
    );
  }

  // unpaid
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
        Total Sewa: <strong style={{ color: 'var(--text-primary)' }}>{formatRupiah(totalNum)}</strong>
      </div>
      <div style={{ fontSize: '13px', color: '#EF4444', fontWeight: 800 }}>
        Total yang harus dibayar: {formatRupiah(totalNum)} (Belum Bayar)
      </div>
    </div>
  );
}
