import { createAdminClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

// PATCH /api/delivery-zones/[id] — admin only
export async function PATCH(request, { params }) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Body request bukan JSON valid.' }, { status: 400 });

  const updateData = {};
  if ('name' in body) updateData.name = String(body.name || '').trim();
  if ('zone_label' in body) updateData.zone_label = String(body.zone_label || '').trim();
  if ('color' in body) updateData.color = body.color;
  if ('sort_order' in body) updateData.sort_order = Number(body.sort_order) || 0;
  if ('fee' in body) {
    const fee = Number(body.fee);
    updateData.fee = Number.isFinite(fee) && fee >= 0 ? fee : 0;
  }
  updateData.updated_at = new Date().toISOString();

  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from('delivery_zones')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE /api/delivery-zones/[id] — admin only
export async function DELETE(request, { params }) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const { id } = await params;
  const supabase = await createAdminClient();
  const { error } = await supabase.from('delivery_zones').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
