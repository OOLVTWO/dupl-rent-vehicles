/**
 * Next.js 16 Proxy (konvensi baru; `middleware.js` deprecated sejak Next 16).
 *
 * Fungsi:
 *  1. Refresh session Supabase (access token) di setiap request.
 *  2. Proteksi login — user belum login diarahkan ke /login.
 *  3. Proteksi ROLE — akun Driver hanya boleh buka halaman yang diizinkan
 *     (Dashboard, Booking Confirmation, Tracking Sewa, Pengeluaran, dan
 *     Buat Kontrak Baru). Selain itu (Laporan Kontrak, Ketersediaan,
 *     Transaksi, Data Motor, Customer, Laporan, Pengaturan, Maintenance,
 *     Gallery) otomatis diarahkan balik ke /dashboard.
 *
 * Sebelum file ini ada, token tidak pernah di-refresh: setelah ±1 jam
 * halaman client (vehicles, transactions, dll.) gagal fetch diam-diam
 * dan data tampak "hilang" padahal masih ada di database.
 */
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

// Prefix path yang boleh diakses akun Driver.
const DRIVER_ALLOWED_PREFIXES = [
  '/dashboard',
  '/bookings',
  '/tracking',
  '/contracts/new',
  '/driver-income',
];

const PROTECTED_PREFIXES = [
  '/dashboard',
  '/vehicles',
  '/transactions',
  '/bookings',
  '/tracking',
  '/availability',
  '/expenses',
  '/customers',
  '/reports',
  '/settings',
  '/maintenance',
  '/gallery',
  '/contracts',
];

export async function proxy(request) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // PENTING: getUser() (bukan getSession()) — validasi + refresh token.
  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some(p => pathname.startsWith(p));

  // Area admin/staff wajib login
  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirectedFrom', pathname);
    return NextResponse.redirect(url);
  }

  // Sudah login tapi membuka /login → arahkan sesuai role
  if (user && pathname === '/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  // Proteksi role: Driver hanya boleh buka halaman yang diizinkan.
  if (user && isProtected) {
    const { data: profile } = await supabase
      .from('staff_profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    // Akun lama tanpa baris staff_profiles diperlakukan sebagai admin.
    const role = profile?.role || 'admin';

    if (role === 'driver') {
      const allowed = DRIVER_ALLOWED_PREFIXES.some(p => pathname.startsWith(p));
      if (!allowed) {
        const url = request.nextUrl.clone();
        url.pathname = '/dashboard';
        return NextResponse.redirect(url);
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/login',
    '/dashboard/:path*',
    '/vehicles/:path*',
    '/transactions/:path*',
    '/bookings/:path*',
    '/tracking/:path*',
    '/availability/:path*',
    '/expenses/:path*',
    '/customers/:path*',
    '/reports/:path*',
    '/settings/:path*',
    '/maintenance/:path*',
    '/gallery/:path*',
    '/contracts/:path*',
    '/driver-income/:path*',
  ],
};
