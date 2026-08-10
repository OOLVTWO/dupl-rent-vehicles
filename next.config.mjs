/**
 * Konfigurasi Next.js — Boss Rent Pererenan.
 *
 * NEXT_PUBLIC_* di-inject saat build (nilainya PUBLIK — memang dikirim ke browser).
 * TIDAK ada fallback hardcode di sini — env WAJIB di-set di Vercel/host.
 * (Sebelumnya ada fallback berisi URL & anon key produksi asli, langsung di
 * source code di repo publik. Anon key memang didesain publik, tapi tidak
 * ada alasan baik untuk menaruhnya di git history selain env var Vercel.)
 * SUPABASE_SERVICE_ROLE_KEY TIDAK pernah di-hardcode — server-side only.
 */
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.warn(
    '[next.config] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY belum di-set. ' +
    'Set di Environment Variables Vercel — situs tidak akan bisa konek ke database tanpa ini.'
  );
}

const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
        ],
      },
    ];
  },
};

export default nextConfig;
