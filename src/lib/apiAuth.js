import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rateLimit';

/**
 * Guard keamanan untuk SEMUA API route admin
 * (/api/vehicles, /api/transactions, /api/expenses).
 *
 * Route API memakai createAdminClient() (service role → bypass RLS), jadi WAJIB
 * diverifikasi dulu bahwa request datang dari user yang sudah login.
 *
 * PERUBAHAN:
 *  - requireAuth(request) kini menerima request → rate limiting (429).
 *  - Fail CLOSED: kesalahan konfigurasi pun menolak request (401).
 */
export async function requireAuth(request) {
  // 1) Rate limit (best-effort, per instance)
  const rl = rateLimit(request);
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Terlalu banyak permintaan. Silakan coba lagi beberapa saat.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
    );
  }

  // 2) Auth check — fail CLOSED
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return NextResponse.json(
        { error: 'Unauthorized — silakan login terlebih dahulu.' },
        { status: 401 }
      );
    }
    return null;
  } catch (err) {
    console.error('requireAuth error:', err);
    return NextResponse.json(
      { error: 'Unauthorized — silakan login terlebih dahulu.' },
      { status: 401 }
    );
  }
}

/**
 * Guard khusus untuk API route yang HANYA boleh diakses admin
 * (bukan staff/driver) — mis. hapus data, ubah transaksi yang sudah
 * tercatat, kelola akun staff.
 *
 * Akun lama (dibuat sebelum fitur role staff ada) tidak punya baris di
 * staff_profiles — diperlakukan sebagai admin (backward compatible),
 * karena satu-satunya cara staff_profiles kosong untuk seorang user
 * adalah karena mereka sudah ada sejak sebelum fitur ini dibuat.
 */
export async function requireAdmin(request) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from('staff_profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profile && profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Khusus admin — akun staff tidak punya akses ke aksi ini.' },
        { status: 403 }
      );
    }
    return null;
  } catch (err) {
    console.error('requireAdmin error:', err);
    return NextResponse.json({ error: 'Khusus admin.' }, { status: 403 });
  }
}

/**
 * Ambil role user yang sedang login ('admin' | 'driver'). Dipakai untuk
 * endpoint yang boleh diakses kedua role tapi perlu menyaring field
 * sensitif (misal data investor di /api/vehicles) berdasarkan role,
 * bukan cuma untuk blokir total lewat requireAdmin().
 *
 * Akun lama tanpa baris staff_profiles diperlakukan sebagai admin, sama
 * seperti requireAdmin() — konsisten dengan aturan backward-compat.
 */
export async function getUserRole(request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: profile } = await supabase
      .from('staff_profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    return profile?.role || 'admin';
  } catch (err) {
    console.error('getUserRole error:', err);
    return null;
  }
}

/**
 * Field vehicles yang RAHASIA (data investor & harga beli internal) —
 * TIDAK PERNAH boleh dikirim ke akun Driver, walaupun mereka boleh baca
 * data motor lain (nama, plat, tarif) untuk keperluan Booking/Kontrak.
 */
const CONFIDENTIAL_VEHICLE_FIELDS = [
  'owner_type', 'owner_name', 'owner_contact', 'revenue_share_percentage',
  'purchase_date', 'purchase_price',
];

/** Hapus field rahasia dari satu atau banyak record vehicles sebelum dikirim ke Driver. */
export function redactVehicleFields(data) {
  const strip = (row) => {
    if (!row || typeof row !== 'object') return row;
    const clean = { ...row };
    for (const f of CONFIDENTIAL_VEHICLE_FIELDS) delete clean[f];
    return clean;
  };
  return Array.isArray(data) ? data.map(strip) : strip(data);
}

/** Ambil body JSON dengan aman → null jika tidak valid (400). */
export async function readJsonBody(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

/** Angka non-negatif; fallback jika kosong / NaN / negatif. */
export function toNonNegativeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/** Daftar field wajib yang kosong. */
export function missingFields(body, fields) {
  return fields.filter(
    (f) => body[f] === undefined || body[f] === null || String(body[f]).trim() === ''
  );
}
