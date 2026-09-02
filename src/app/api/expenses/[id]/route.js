import { createAdminClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

// PUT /api/expenses/[id] — admin only (driver tidak lagi punya akses Keuangan)
export async function PUT(request, { params }) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const { id } = await params;
  const supabase = await createAdminClient();

  const body = await request.json();

  const { id: _id, created_at, updated_at, ...rawUpdateData } = body;
  const updateData = { ...rawUpdateData };

  if ('amount' in updateData) updateData.amount = Math.round(Number(String(updateData.amount || 0).replace(/[,.]/g, ''))) || 0;

  let { data, error } = await supabase
    .from('expenses')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error && (error.message.includes('column "type"') || error.message.includes('type'))) {
    const fallbackUpdate = { ...updateData };
    delete fallbackUpdate.type;
    const retry = await supabase
      .from('expenses')
      .update(fallbackUpdate)
      .eq('id', id)
      .select()
      .single();
    data = retry.data ? { ...retry.data, type: updateData.type || 'expense' } : null;
    error = retry.error;
  }

  if (error) {
    console.error('Update expense error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

// DELETE /api/expenses/[id] — admin only (driver tidak lagi punya akses Keuangan)
export async function DELETE(request, { params }) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const { id } = await params;
  const supabase = await createAdminClient();

  const { error } = await supabase.from('expenses').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
