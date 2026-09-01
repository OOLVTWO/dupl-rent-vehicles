import { createAdminClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

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
