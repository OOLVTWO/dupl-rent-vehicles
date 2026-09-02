import { createAdminClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

// PATCH /api/contracts/[id] — ubah detail kontrak (nama, tanggal, motor, dll).
// Foto & tanda tangan sengaja TIDAK bisa diubah lewat sini — itu bukti asli
// yang sudah ditandatangani, kalau perlu revisi total sebaiknya buat kontrak baru.
export async function PATCH(request, { params }) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Body request bukan JSON valid.' }, { status: 400 });

  const updateData = {};
  const textFields = ['customer_name', 'customer_id_number', 'customer_phone', 'customer_address', 'vehicle_name', 'notes'];
  textFields.forEach((f) => { if (f in body) updateData[f] = body[f] || null; });
  if ('vehicle_id' in body) updateData.vehicle_id = body.vehicle_id || null;

  if ('start_date' in body || 'end_date' in body) {
    if (!body.start_date || !body.end_date) {
      return NextResponse.json({ error: 'Tanggal mulai dan selesai wajib diisi.' }, { status: 400 });
    }
    updateData.start_date = body.start_date;
    updateData.end_date = body.end_date;
  }
  if (updateData.customer_name !== undefined && !String(updateData.customer_name).trim()) {
    return NextResponse.json({ error: 'Nama customer wajib diisi.' }, { status: 400 });
  }

  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from('contracts')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('PATCH /api/contracts/[id] error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

// DELETE /api/contracts/[id] — hapus kontrak (admin only)
export async function DELETE(request, { params }) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const { id } = await params;
  const supabase = await createAdminClient();
  const { error } = await supabase.from('contracts').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
