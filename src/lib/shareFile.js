/**
 * Kirim PDF ke customer tertentu di WhatsApp. Browser TIDAK BISA langsung
 * nge-attach file ke chat WA tertentu tanpa persetujuan user (ini proteksi
 * keamanan OS/browser, semua app kena aturan sama — bukan celah yang bisa
 * di-skip dari sisi web). Yang bisa dilakukan: buka dulu chat WA customer
 * yang dituju (jadi konteksnya udah pas), baru langsung susul minta pilih
 * app buat lampirin PDF-nya — biasanya begitu WhatsApp dipilih dari share
 * sheet, dia otomatis nyambung ke chat yang baru saja dibuka/paling baru.
 */
export async function sharePdfToWhatsApp(pdfUrl, filename, phone, waMessage, shareTitle, shareText) {
  if (phone && waMessage) {
    const cleanPhone = phone.replace(/[^\d+]/g, '');
    window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(waMessage)}`, '_blank');
  }
  return sharePdfFile(pdfUrl, filename, shareTitle, shareText);
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
