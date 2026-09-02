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
