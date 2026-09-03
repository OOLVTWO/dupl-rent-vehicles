import { createAdminClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

// PUT /api/transactions/[id] — ubah transaksi yang sudah ada (admin only;
// staff/driver hanya boleh MEMBUAT transaksi baru lewat POST di route.js utama)
export async function PUT(request, { params }) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const { id } = await params;
  const supabase = await createAdminClient();
  const body = await request.json();

  const {
    id: _id,
    created_at,
    updated_at,
    duration_days,
    vehicles,
    ...rawUpdateData
  } = body;

  const updateData = { ...rawUpdateData };

  // Clean empty strings for UUID fields
  Object.keys(updateData).forEach(key => {
    if ((key === 'id' || key.endsWith('_id')) && typeof updateData[key] === 'string' && !updateData[key].trim()) {
      delete updateData[key];
    }
  });

  if ('deposit' in updateData) updateData.deposit = parseFloat(updateData.deposit) || 0;
  if ('total_price' in updateData) updateData.total_price = parseFloat(updateData.total_price) || 0;
  if ('discount' in updateData) updateData.discount = parseFloat(updateData.discount) || 0;
  if ('damage_fee' in updateData) updateData.damage_fee = parseFloat(updateData.damage_fee) || 0;
  if ('km_start' in updateData) updateData.km_start = parseInt(updateData.km_start) || 0;
  if ('km_end' in updateData) updateData.km_end = parseInt(updateData.km_end) || 0;
  if ('dp_amount' in updateData) updateData.dp_amount = parseFloat(updateData.dp_amount) || 0;
  // Keep payment_status as-is (string 'paid' or 'unpaid')

  let { data, error } = await supabase
    .from('transactions')
    .update(updateData)
    .eq('id', id)
    .select(`*, vehicles(id, name, plate_number, rate_per_day)`)
    .single();

  // Smart Fallback jika kolom baru belum di-migrate di Supabase database
  if (error && (error.message.includes('Could not find the') || error.message.includes('schema cache'))) {
    console.warn('Fallback update without unmigrated columns due to Supabase schema cache:', error.message);
    const { customer_image_url, handover_image_url: _hou, renter_address: _ra, discount: _d, damage_fee: _df, km_start: _ks, km_end: _ke, dp_amount: _dpa, issues_reported: _ir, ...fallbackUpdate } = updateData;

    const retry = await supabase
      .from('transactions')
      .update(fallbackUpdate)
      .eq('id', id)
      .select(`*, vehicles(id, name, plate_number, rate_per_day)`)
      .single();

    data = retry.data;
    error = retry.error;
  }

  if (error) {
    console.error('Update transaction error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (body.status === 'completed' || body.status === 'cancelled') {
    if (data && data.vehicle_id) {
      await supabase
        .from('vehicles')
        .update({ status: 'available' })
        .eq('id', data.vehicle_id);
    }
  }

  return NextResponse.json(data);
}

// DELETE /api/transactions/[id] — admin only
export async function DELETE(request, { params }) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const { id } = await params;
  const supabase = await createAdminClient();

  const { data: tx } = await supabase
    .from('transactions')
    .select('vehicle_id, status, booking_id')
    .eq('id', id)
    .single();

  // Kontrak (dokumen legal bertanda tangan) yang masih nunjuk ke transaksi
  // ini di-lepas dulu (bukan dihapus) — foreign key contracts.transaction_id
  // nolak hapus transaksi selama masih ada kontrak yang nunjuk ke situ.
  await supabase.from('contracts').update({ transaction_id: null }).eq('transaction_id', id);

  const { error } = await supabase.from('transactions').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Transaksi & booking asalnya itu 1 kesatuan (bukti sewa yang sama) —
  // hapus salah satu, hapus juga yang lain, biar nggak ada data
  // "nyangkut" sendiri-sendiri. Kontrak TETAP disimpan (cuma di-lepas),
  // tapi catatan pendapatan driver yang otomatis dari booking ini ikut
  // DIHAPUS — nggak masuk akal riwayat pendapatannya masih nyantol di
  // History Pendapatan kalau transaksi/booking sumbernya udah nggak ada.
  if (tx && tx.booking_id) {
    await supabase.from('contracts').update({ booking_id: null }).eq('booking_id', tx.booking_id);
    await supabase.from('expenses').delete().eq('booking_id', tx.booking_id);
    await supabase.from('bookings').delete().eq('id', tx.booking_id);
  }

  if (tx && tx.status === 'active') {
    await supabase
      .from('vehicles')
      .update({ status: 'available' })
      .eq('id', tx.vehicle_id);
  }

  return NextResponse.json({ success: true });
}
