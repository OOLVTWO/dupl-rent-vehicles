import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rateLimit';
import { readJsonBody } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

/**
 * POST /api/auth/login
 *
 * Login sekarang lewat route ini (bukan langsung dari browser ke Supabase)
 * supaya bisa dipasangi rate limit di sisi server sebelum percobaan
 * password dikirim ke Supabase Auth. Login dari browser langsung tidak
 * punya proteksi apa pun selain limit bawaan Supabase — brute-force di
 * app level tidak tercegah.
 *
 * Limit lebih ketat dari API data (5 percobaan / 5 menit per IP) karena
 * ini titik masuk paling sensitif di seluruh aplikasi.
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

  const supabase = await createClient();
  const { error: authError } = await supabase.auth.signInWithPassword({
    email: body.email,
    password: body.password,
  });

  if (authError) {
    // Pesan generik — jangan bocorkan apakah email terdaftar atau tidak.
    return NextResponse.json({ error: 'Email atau password salah.' }, { status: 401 });
  }

  return NextResponse.json({ success: true });
}
