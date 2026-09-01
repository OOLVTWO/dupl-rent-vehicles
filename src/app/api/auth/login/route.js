import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rateLimit';
import { readJsonBody } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

/**
 * POST /api/auth/login
 *
 * Login lewat route ini (bukan langsung dari browser ke Supabase) supaya
 * bisa dipasangi rate limit di sisi server sebelum percobaan password
 * dikirim ke Supabase Auth, dan supaya role (admin/driver) bisa
 * divalidasi cocok dengan peran yang dipilih di form login sebelum sesi
 * diteruskan ke client.
 */
export async function POST(request) {
  const rl = rateLimit(request, { windowMs: 5 * 60_000, max: 5 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Terlalu banyak percobaan login. Silakan coba lagi beberapa menit lagi.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
    );
  }

  const body = await readJsonBody(request);
  if (!body || !body.email || !body.password) {
    return NextResponse.json({ error: 'Email dan password wajib diisi.' }, { status: 400 });
  }
  const loginAs = body.loginAs === 'driver' ? 'driver' : 'admin';

  try {
    const supabase = await createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: body.email,
      password: body.password,
    });

    if (authError) {
      // Pesan generik — jangan bocorkan apakah email terdaftar atau tidak.
      return NextResponse.json({ error: 'Email atau password salah.' }, { status: 401 });
    }

    const { data: { user } } = await supabase.auth.getUser();

    // Akun lama (sebelum fitur role ada) tidak punya baris staff_profiles →
    // diperlakukan sebagai admin (backward compatible).
    const { data: profile } = await supabase
      .from('staff_profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .maybeSingle();
    const actualRole = profile?.role || 'admin';

    if (actualRole !== loginAs) {
      await supabase.auth.signOut();
      return NextResponse.json(
        {
          error: loginAs === 'driver'
            ? 'Akun ini bukan akun Driver. Coba login sebagai Admin.'
            : 'Akun ini adalah akun Driver, bukan Admin. Coba login sebagai Driver.',
        },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true, role: actualRole, fullName: profile?.full_name || null });
  } catch (err) {
    console.error('Login error:', err?.message);
    return NextResponse.json({ error: 'Gagal terhubung ke server. Silakan coba lagi.' }, { status: 500 });
  }
}
