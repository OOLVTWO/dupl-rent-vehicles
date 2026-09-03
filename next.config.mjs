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
  // pdfkit baca file font (.afm) internal via path.join(__dirname, ...).
  // Kalau Next.js nge-bundle pdfkit lewat webpack (perilaku default),
  // __dirname-nya jadi rusak/diganti jadi path palsu (mis. "/ROOT/...")
  // yang gak match sama lokasi asli file di node_modules — makanya
  // error "ENOENT .../pdfkit/js/data/Helvetica.afm" walau file-nya
  // sebenarnya ada. Fix-nya: jangan bundle pdfkit sama sekali, biarkan
  // dia jalan sebagai require() biasa ke node_modules aslinya.
  serverExternalPackages: ['pdfkit'],
  // Extra safety net: pastikan file .afm tetap ke-trace ke bundle
  // serverless (kalau-kalau Vercel butuh referensi eksplisit ini juga).
  outputFileTracingIncludes: {
    '/api/contracts/[id]/pdf': ['./node_modules/pdfkit/js/data/**'],
  },
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
