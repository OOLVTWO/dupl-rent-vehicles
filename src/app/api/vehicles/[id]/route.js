import { createAdminClient } from '@/lib/supabase/server';
import { requireAuth, requireAdmin, getUserRole, redactVehicleFields } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

// GET /api/vehicles/[id] — admin & driver boleh akses, field rahasia
// investor/harga beli disaring untuk role driver.
export async function GET(request, { params }) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const { id } = await params;
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  const role = await getUserRole(request);
  return NextResponse.json(role === 'driver' ? redactVehicleFields(data) : data);
}

// PUT /api/vehicles/[id] — khusus admin.
export async function PUT(request, { params }) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const { id } = await params;
  const supabase = await createAdminClient();
  const body = await request.json();

  const { id: _id, created_at, updated_at, ...rawUpdateData } = body;
  const updateData = { ...rawUpdateData };

  if ('rate_per_day' in updateData) updateData.rate_per_day = parseFloat(updateData.rate_per_day) || 0;
  if ('rate_per_week' in updateData) updateData.rate_per_week = parseFloat(updateData.rate_per_week) || 0;
  if ('rate_per_month' in updateData) updateData.rate_per_month = parseFloat(updateData.rate_per_month) || 0;
  if ('year' in updateData) updateData.year = parseInt(updateData.year) || new Date().getFullYear();
  if ('current_km' in updateData) updateData.current_km = parseInt(updateData.current_km) || 0;
  if ('last_service_km' in updateData) updateData.last_service_km = parseInt(updateData.last_service_km) || 0;
  if ('purchase_date' in updateData) {
    updateData.purchase_date = (updateData.purchase_date && String(updateData.purchase_date).trim() !== '') ? updateData.purchase_date : null;
  }

  let { data, error } = await supabase
    .from('vehicles')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error && (error.message.includes('Could not find') || error.message.includes('column') || error.message.includes('schema cache') || error.code === 'PGRST204')) {
    console.warn('Fallback vehicle update without unmigrated columns:', error.message);
    const { owner_type: _ot, owner_name: _on, owner_contact: _oc, revenue_share_percentage: _rsp, purchase_date: _pd, purchase_price: _pp, image_url: _i, current_km: _ck, ...fallbackUpdateData } = updateData;

    const retry = await supabase
      .from('vehicles')
      .update(fallbackUpdateData)
      .eq('id', id)
      .select()
      .single();

    data = retry.data;
    error = retry.error;
  }

  if (error) {
    console.error('Update vehicle error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

// DELETE /api/vehicles/[id] — khusus admin.
export async function DELETE(request, { params }) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const cascade = searchParams.get('cascade') === 'true';

  const authError = await requireAdmin(request);
  if (authError) return authError;

  const supabase = await createAdminClient();

  // 1. Check for active rental transactions
  const { data: activeTx } = await supabase
    .from('transactions')
    .select('id')
    .eq('vehicle_id', id)
    .eq('status', 'active')
    .limit(1);

  if (activeTx && activeTx.length > 0) {
    return NextResponse.json(
      { error: 'Motor ini sedang disewa (transaksi aktif). Selesaikan transaksi pengembalian motor terlebih dahulu.' },
      { status: 400 }
    );
  }

  // 2. If user requested cascade delete (force delete with history)
  if (cascade) {
    // Delete all linked transactions first
    await supabase.from('transactions').delete().eq('vehicle_id', id);
  }

  // 3. Attempt deleting vehicle
  const { error } = await supabase.from('vehicles').delete().eq('id', id);

  if (error) {
    // Foreign key violation error code 23503 or message check
    if (error.code === '23503' || error.message.includes('foreign key constraint') || error.message.includes('transactions_vehicle_id_fkey')) {
      return NextResponse.json({
        error: 'Motor ini memiliki riwayat transaksi sewa di database.',
        hasHistory: true
      }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
