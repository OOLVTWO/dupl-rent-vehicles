/**
 * Kamus terjemahan aplikasi, terorganisir per-namespace supaya bisa
 * ditambah bertahap. Struktur: translations[lang][namespace][key].
 *
 * Cakupan saat ini: elemen struktural halaman Fleet publik (header, 3-step
 * guide, Pick Your Dates). Ini fondasi awal — LanguageContext.t() otomatis
 * fallback ke English kalau ada key yang belum diterjemahkan ke Indonesia,
 * jadi aman untuk terus diperluas ke bagian lain (Booking, Admin, Driver)
 * tanpa merusak yang sudah ada.
 */
export const translations = {
  en: {
    common: {
      bookNow: 'Book Now',
    },
    fleet: {
      bookNow: 'Book Now',
      heroSubtitle: 'Sample Scooter Rental Platform • Live Preview Build',
      googleRating: '{rating} Google Rating ({count} Reviews)',
      stepsTitle: 'Booking In 3 Simple Steps',
      step1Title: 'Pick Your Dates',
      step1Desc: 'Select pickup and return dates — daily, weekly, and monthly rates auto-calculated.',
      step2Title: 'Choose Your Scooter',
      step2Desc: 'Browse available scooters for your dates and pick the model that fits your trip.',
      step3Title: 'Book Via WhatsApp',
      step3Desc: 'Confirm instantly over WhatsApp. Pay on pickup, no deposit surprises.',
      stepLabel: 'Step {n}',
      scheduleEyebrow: 'Schedule Your Rental',
      pickYourDates: 'Pick Your Dates',
      whereToPickUp: 'Where To Pick Up',
      pickupDate: 'Pickup Date',
      returnDate: 'Return Date',
      search: 'Search',
      availableFleetEyebrow: 'Daily, Weekly, & Monthly rate tiers automatically calculated for best savings.',
      availableFleetTitle: 'Available Fleet & Smart Pricing',
      allScooters: 'All Scooters',
      searchModel: 'Search model...',
    },
  },
  id: {
    common: {
      bookNow: 'Pesan Sekarang',
    },
    fleet: {
      bookNow: 'Pesan Sekarang',
      heroSubtitle: 'Contoh Platform Sewa Motor • Build Live Preview',
      googleRating: 'Rating Google {rating} ({count} Ulasan)',
      stepsTitle: 'Pesan Dalam 3 Langkah Mudah',
      step1Title: 'Pilih Tanggal Sewa',
      step1Desc: 'Pilih tanggal ambil & kembali — tarif harian, mingguan, dan bulanan otomatis terhitung.',
      step2Title: 'Pilih Motor Anda',
      step2Desc: 'Lihat motor yang tersedia untuk tanggal Anda dan pilih model yang cocok untuk perjalanan Anda.',
      step3Title: 'Pesan Lewat WhatsApp',
      step3Desc: 'Konfirmasi langsung lewat WhatsApp. Bayar saat ambil motor, tanpa kejutan deposit.',
      stepLabel: 'Langkah {n}',
      scheduleEyebrow: 'Jadwalkan Sewa Anda',
      pickYourDates: 'Pilih Tanggal Sewa',
      whereToPickUp: 'Lokasi Pengambilan',
      pickupDate: 'Tanggal Ambil',
      returnDate: 'Tanggal Kembali',
      search: 'Cari',
      availableFleetEyebrow: 'Tarif harian, mingguan, & bulanan otomatis terhitung untuk penghematan terbaik.',
      availableFleetTitle: 'Motor Tersedia & Harga Pintar',
      allScooters: 'Semua Motor',
      searchModel: 'Cari model...',
    },
  },
};
