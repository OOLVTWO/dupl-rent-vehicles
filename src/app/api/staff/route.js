import { createAdminClient } from '@/lib/supabase/server';
import { requireAdmin, missingFields } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

// GET /api/staff — daftar akun staff (admin + driver), admin only
export async function GET(request) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from('staff_profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('GET /api/staff error:', error.message);
    return NextResponse.json({ error: 'Gagal mengambil data staff.' }, { status: 500 });
  }

  // Sisipkan email dari auth.users (tidak tersimpan di staff_profiles)
  const { data: usersData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const emailById = new Map((usersData?.users || []).map(u => [u.id, u.email]));
  const enriched = (data || []).map(p => ({ ...p, email: emailById.get(p.id) || '-' }));

  return NextResponse.json(enriched);
}

// POST /api/staff — buat akun staff baru (admin only)
export async function POST(request) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Body request bukan JSON valid.' }, { status: 400 });

  const missing = missingFields(body, ['email', 'password', 'full_name', 'role']);
  if (missing.length > 0) {
    return NextResponse.json({ error: `Field wajib belum diisi: ${missing.join(', ')}` }, { status: 400 });
  }
  if (!['admin', 'driver'].includes(body.role)) {
    return NextResponse.json({ error: `Role tidak valid: ${body.role}` }, { status: 400 });
  }
  if (String(body.password).length < 6) {
    return NextResponse.json({ error: 'Password minimal 6 karakter.' }, { status: 400 });
  }

  const supabase = await createAdminClient();

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email: String(body.email).trim(),
    password: String(body.password),
    email_confirm: true,
  });

  if (createError || !created?.user) {
    console.error('POST /api/staff createUser error:', createError?.message);
    return NextResponse.json(
      { error: createError?.message || 'Gagal membuat akun staff.' },
      { status: 400 }
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from('staff_profiles')
    .insert([{
      id: created.user.id,
      full_name: String(body.full_name).trim(),
      role: body.role,
      phone: body.phone || null,
    }])
    .select()
    .single();

  if (profileError) {
    // Rollback: hapus auth user kalau gagal simpan profil, biar tidak nyangkut akun tanpa profil.
    await supabase.auth.admin.deleteUser(created.user.id).catch(() => {});
    console.error('POST /api/staff profile insert error:', profileError.message);
    return NextResponse.json({ error: 'Gagal menyimpan profil staff.' }, { status: 500 });
  }

  return NextResponse.json({ ...profile, email: created.user.email });
}
