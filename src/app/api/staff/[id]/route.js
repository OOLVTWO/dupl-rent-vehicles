import { createAdminClient, createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

// PATCH /api/staff/[id] — ubah nama/role/telepon staff (admin only)
export async function PATCH(request, { params }) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Body request bukan JSON valid.' }, { status: 400 });

  const updateData = {};
  if ('full_name' in body) {
    const name = String(body.full_name || '').trim();
    if (!name) return NextResponse.json({ error: 'Nama wajib diisi.' }, { status: 400 });
    updateData.full_name = name;
  }
  if ('role' in body) {
    if (!['admin', 'driver'].includes(body.role)) {
      return NextResponse.json({ error: `Role tidak valid: ${body.role}` }, { status: 400 });
    }
    updateData.role = body.role;
  }
  if ('phone' in body) updateData.phone = body.phone || null;
  updateData.updated_at = new Date().toISOString();

  const supabase = await createAdminClient();

  // Ganti password (opsional)
  if (body.password) {
    if (String(body.password).length < 6) {
      return NextResponse.json({ error: 'Password minimal 6 karakter.' }, { status: 400 });
    }
    const { error: pwError } = await supabase.auth.admin.updateUserById(id, { password: body.password });
    if (pwError) {
      return NextResponse.json({ error: pwError.message || 'Gagal ganti password.' }, { status: 400 });
    }
  }

  const { data, error } = await supabase
    .from('staff_profiles')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('PATCH /api/staff/[id] error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

// DELETE /api/staff/[id] — hapus akun staff (admin only)
export async function DELETE(request, { params }) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const { id } = await params;

  try {
    const sessionClient = await createClient();
    const { data: { user: currentUser } } = await sessionClient.auth.getUser();
    if (currentUser && currentUser.id === id) {
      return NextResponse.json({ error: 'Tidak bisa menghapus akun sendiri.' }, { status: 400 });
    }
  } catch { /* fall through, deletion below still guarded by requireAdmin */ }

  const supabase = await createAdminClient();
  const { error } = await supabase.auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
