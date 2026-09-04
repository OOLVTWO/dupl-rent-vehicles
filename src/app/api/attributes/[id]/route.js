import { createAdminClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

// PATCH /api/attributes/[id] — admin only
export async function PATCH(request, { params }) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Body request bukan JSON valid.' }, { status: 400 });

  const updateData = {};
  if ('name' in body) updateData.name = String(body.name || '').trim();
  if ('icon' in body) updateData.icon = body.icon;
  if ('is_auto_included' in body) updateData.is_auto_included = !!body.is_auto_included;
  if ('quantity' in body) {
    const qty = Number(body.quantity);
    updateData.quantity = Number.isFinite(qty) && qty >= 0 ? qty : 0;
  }
  if ('price' in body) {
    const price = Number(body.price);
    updateData.price = Number.isFinite(price) && price >= 0 ? price : 0;
  }
  updateData.updated_at = new Date().toISOString();

  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from('vehicle_attributes')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE /api/attributes/[id] — admin only
export async function DELETE(request, { params }) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const { id } = await params;
  const supabase = await createAdminClient();
  const { error } = await supabase.from('vehicle_attributes').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
