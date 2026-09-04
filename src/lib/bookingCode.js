/**
 * Generate kode booking pendek yang gampang dibaca manusia:
 * [inisial merek][inisial model][2 digit acak], misal "YF43" buat Yamaha
 * Fazzio. Logic ini HARUS sama persis dengan trigger DB
 * `generate_booking_code()` di Supabase — dipakai di sini khusus untuk
 * form booking publik, karena user anonim insert lewat RLS dan nggak bisa
 * baca balik row yang baru dibuat (jadi kodenya perlu udah siap di
 * client sebelum insert, buat ditampilkan & dikirim ke WA).
 */
export function generateBookingCode(vehicleName, vehicleCategory) {
  const firstLetter = (txt) => {
    const trimmed = (txt || '').trim();
    return trimmed ? trimmed[0].toUpperCase() : '?';
  };

  const nameParts = (vehicleName || '').trim().split(/\s+/);
  const brandLetter = firstLetter(vehicleCategory || nameParts[0]);
  const modelWord = nameParts.length > 1 ? nameParts[1] : nameParts[0];
  const modelLetter = firstLetter(modelWord);
  const digits = String(Math.floor(Math.random() * 100)).padStart(2, '0');

  return `${brandLetter}${modelLetter}${digits}`;
}
