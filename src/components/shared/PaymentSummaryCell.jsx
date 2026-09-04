'use client';

function formatRupiah(amount) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount || 0);
}

// ===== RINGKASAN PEMBAYARAN — dipakai di Transaksi & Booking (admin & driver) =====
// Selalu tampilkan berapa yang MASIH HARUS dibayar, apapun status
// pembayarannya: Lunas = 0, DP = sisa (total - dp), Belum Bayar = penuh.
// Desainnya sama persis dengan kartu "Ringkasan" di form Tambah/Edit Transaksi,
// biar konsisten di mana pun ditampilkan.
export default function PaymentSummaryCell({ status, total, dp, discount = 0, deposit = 0 }) {
  const totalNum = Number(total) || 0;
  const dpNum = Number(dp) || 0;
  const discountNum = Number(discount) || 0;
  const depositNum = Number(deposit) || 0;

  const statusColor = status === 'paid' ? '#22C55E' : status === 'down_payment' ? '#3B82F6' : '#EF4444';
  const sisaBayar = status === 'paid' ? 0
    : status === 'down_payment' ? Math.max(0, totalNum - dpNum)
    : totalNum;

  return (
    <div style={{
      borderRadius: '10px', overflow: 'hidden', minWidth: '220px',
      border: `1px solid ${statusColor}33`, background: 'var(--bg-elevated)',
    }}>
      <div style={{ padding: '8px 12px', background: `${statusColor}14`, borderBottom: `1px solid ${statusColor}33`, display: 'flex', alignItems: 'center', gap: '6px' }}>
        <i className="fa-solid fa-receipt" style={{ color: statusColor, fontSize: '10px' }}></i>
        <span style={{ fontSize: '10.5px', fontWeight: 800, color: statusColor, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
          Ringkasan Pembayaran
        </span>
      </div>

      <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Total Sewa</span>
          <strong style={{ color: 'var(--text-primary)' }}>{formatRupiah(totalNum)}</strong>
        </div>
        {discountNum > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Diskon</span>
            <strong style={{ color: '#F59E0B' }}>- {formatRupiah(discountNum)}</strong>
          </div>
        )}
        {depositNum > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Deposit (Jaminan)</span>
            <strong style={{ color: 'var(--text-primary)' }}>{formatRupiah(depositNum)}</strong>
          </div>
        )}
        {status === 'down_payment' && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Sudah DP</span>
            <strong style={{ color: '#3B82F6' }}>{formatRupiah(dpNum)}</strong>
          </div>
        )}

        <div style={{
          marginTop: '2px', padding: '8px 10px', borderRadius: '8px',
          background: `${statusColor}14`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px',
        }}>
          <span style={{ color: statusColor, fontWeight: 800, fontSize: '11px', display: 'flex', alignItems: 'center', gap: '5px' }}>
            {status === 'paid' && <><i className="fa-solid fa-circle-check"></i>Lunas</>}
            {status === 'down_payment' && 'Sisa Bayar'}
            {status !== 'paid' && status !== 'down_payment' && 'Belum Bayar'}
          </span>
          <strong style={{ color: statusColor, fontSize: '14px', letterSpacing: '-0.2px', whiteSpace: 'nowrap' }}>{formatRupiah(sisaBayar)}</strong>
        </div>
      </div>
    </div>
  );
}
