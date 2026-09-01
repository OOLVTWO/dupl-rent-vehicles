import { createAdminClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

const VALID_STATUS = ['pending', 'confirmed', 'cancelled', 'completed'];

// PATCH /api/bookings/[id] — ubah status booking (mis. Pending -> Confirmed)
export async function PATCH(request, { params }) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const { id } = await params;
  const supabase = await createAdminClient();
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Body request bukan JSON valid.' }, { status: 400 });

  const updateData = {};
  if ('status' in body) {
    if (!VALID_STATUS.includes(body.status)) {
      return NextResponse.json({ error: `Status tidak valid: ${body.status}` }, { status: 400 });
    }
    updateData.status = body.status;
  }
  if ('notes' in body) updateData.notes = body.notes;
  if ('wa_notified_at' in body) updateData.wa_notified_at = body.wa_notified_at;
  updateData.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('bookings')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('PATCH /api/bookings/[id] error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

// DELETE /api/bookings/[id]
export async function DELETE(request, { params }) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const { id } = await params;
  const supabase = await createAdminClient();

  const { error } = await supabase.from('bookings').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
