/**
 * Kirim PDF ke customer tertentu di WhatsApp. Browser TIDAK BISA langsung
 * nge-attach file ke chat WA tertentu tanpa persetujuan user (ini proteksi
 * keamanan OS/browser, semua app kena aturan sama — bukan celah yang bisa
 * di-skip dari sisi web).
 *
 * PENTING soal urutan: share file itu HARUS jadi aksi PERTAMA yang
 * dieksekusi, sedeket mungkin ke klik tombolnya. Browser cuma ngizinin
 * navigator.share() jalan selama "aktivasi user" masih hidup (jendela
 * waktu singkat setelah user beneran nge-klik). Kalau kita buka tab/window
 * lain (window.open buat WA) DULU baru nyusul share(), aktivasi itu udah
 * keburu habis/kepake — hasilnya share() diam-diam gagal dan jatuh ke
 * fallback (cuma buka PDF di tab baru, TIDAK ke-attach kemana-mana),
 * padahal pesan WA-nya sempat kekirim duluan. Makanya urutannya dibalik:
 * share dulu (WhatsApp App sendiri nanti nawarin milih kontak begitu
 * dipilih dari share sheet), window.open ke wa.me cuma dipakai kalau
 * share file-nya beneran nggak didukung sama sekali di device ini.
 */
export async function sharePdfToWhatsApp(pdfUrl, filename, phone, waMessage, shareTitle, shareText) {
  const result = await sharePdfFile(pdfUrl, filename, shareTitle, shareText);
  if (!result.shared && !result.cancelled && phone && waMessage) {
    const cleanPhone = phone.replace(/[^\d+]/g, '');
    window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(waMessage)}`, '_blank');
  }
  return result;
}

/**
 * Share a PDF (or any file) via the device's native share sheet — on mobile
 * this lets the user pick WhatsApp and send the actual PDF file as an
 * attachment, not just a text link. Falls back to opening the PDF in a new
 * tab on browsers/devices that don't support file sharing (e.g. desktop).
 */
export async function sharePdfFile(pdfUrl, filename, shareTitle, shareText) {
  try {
    const res = await fetch(pdfUrl);
    if (!res.ok) throw new Error('Gagal mengambil file PDF.');
    const blob = await res.blob();
    const file = new File([blob], filename, { type: 'application/pdf' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: shareTitle, text: shareText });
      return { shared: true };
    }
  } catch (err) {
    // AbortError = user cancelled the share sheet themselves, not a real failure.
    if (err?.name === 'AbortError') return { shared: false, cancelled: true };
    console.error('sharePdfFile error:', err);
  }

  // Fallback: buka PDF di tab baru — user bisa download lalu kirim manual.
  window.open(pdfUrl, '_blank');
  return { shared: false };
}
