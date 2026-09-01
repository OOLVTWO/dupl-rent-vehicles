# 🏍️ BOSS RENT PERERENAN — Platform Persewaan Motor & Enterprise Management System

Selamat datang di repository resmi **Boss Rent Pererenan**, platform web persewaan motor modern yang memadukan **Katalog Publik Pelanggan (Sharp Aesthetics)** dengan **Sistem Manajemen Operasional & Keuangan Internal (Admin Dashboard)**.

Aplikasi ini dikembangkan menggunakan stack teknologi terbaik: **Next.js 16 (App Router)**, **Supabase Cloud Database & Auth**, **XLSX Multi-Sheet Engine**, **Font Awesome v6 Vector Icons**, dan di-host secara live pada infrastruktur **Vercel Cloud (`.vercel.app`)**.

---

## 🚀 AKSES WEB LIVE & AKUN LOGIN ADMIN

### 🔵 Production (situs asli)
- 🌐 **Katalog Utama Publik Customer**: [https://bossrentpererenan.vercel.app](https://bossrentpererenan.vercel.app)
- 🔑 **Portal Login Admin Dashboard**: [https://bossrentpererenan.vercel.app/login](https://bossrentpererenan.vercel.app/login) (atau tambahkan `/dashboard`)
- 🔒 **Akses admin dikelola via Supabase Auth** — kredensial TIDAK disimpan di repo. Hubungi pemilik untuk akun.

### 🟡 Demo / Preview (repo & deployment duplikat ini)
- 🌐 **Katalog Publik**: [https://dupl-rent-vehicles.vercel.app](https://dupl-rent-vehicles.vercel.app)
- 🔑 **Login Panel**: [https://dupl-rent-vehicles.vercel.app/login](https://dupl-rent-vehicles.vercel.app/login) — sekarang ada pilihan masuk sebagai **Admin** atau **Driver** (lihat fitur Role Staff di bawah).
- 👤 **Akun Demo** (khusus environment preview ini, database Supabase terpisah `boss-rent-demo-preview` — tidak menyentuh data production):
  - **Admin** — Email: `admin@preview.com` / Password: `Preview!`
  - **Driver** — Email: `driver@preview.com` / Password: `Preview!`
- ⚠️ Kredensial di atas sengaja ditulis terbuka karena environment ini murni untuk demo/testing. Repo ini bersifat publik, jadi jangan pakai kombinasi email/password yang sama di akun production atau akun penting lainnya.

---

## 🌟 FITUR UTAMA APLIKASI

### 🌐 1. Halaman Utama Katalog Publik Customer (`/fleet`)
Halaman depan yang dirancang khusus untuk menarik wisatawan lokal maupun mancanegara yang ingin menyewa motor di area Pererenan & Canggu, Bali:

- **📸 Hero Banner & Interactive Tagline**: Informasi kontak WhatsApp, lokasi Google Maps, dan rating 5.0 Google Reviews.
- **⚡ Smart Rate Estimator (Kalkulator Harga Otomatis)**: Pelanggan dapat memasukkan tanggal mulai dan selesai sewa. Sistem secara otomatis menghitung estimasi total harga dengan menerapkan potongan harga terbaik (Paket Harian, Mingguan, atau Bulanan).
- **🏷️ Filter Merek Motor Dinamis**: Menampilkan filter merek motor (*Honda, Yamaha, Vespa, Suzuki, Kawasaki, dll.*) secara dinamis dari database admin.
- **🏍️ Responsive Available Fleet Matrix**: Menampilkan armada motor yang tersedia dalam grid rapi. Dibatalkan dari menumpuk dengan batas 6 kartu pertama + tombol **`See More Fleet`** untuk membuka seluruh armada.
- **📲 Direct WhatsApp Instant Booking**: Tombol pemesanan langsung terhubung ke WhatsApp pengelola dengan draf pesan otomatis terformat (Nama motor, durasi sewa, tanggal, dan estimasi biaya).
- **🖼️ Bento Photo Gallery & Customer Service Showcase**: Galeri foto armada dan layanan serah terima kunci dengan tombol *See More Photos*.
- **⭐ Infinite Scroll Marquee Google Reviews**: Ulasan asli pelanggan Google Maps 5.0 Star Rating yang berjalan secara halus (smooth marquee loop).
- **❓ FAQ Accordion Tourist Support**: Tanya jawab seputar syarat sewa, antar-jemput villa, dan garansi helm/jas hujan dalam Bahasa Inggris.

---

### 🛡️ 2. Admin Dashboard & Operations Management (`/dashboard`)
Panel kendali khusus pengelola rental yang dilindungi oleh autentikasi **Supabase Server-Side Auth**:

#### 📊 Dashboard Analytics & Bento Cards
- **Statistik KPI Real-Time**: Pendapatan Hari Ini, Total Motor Disewa, Motor Tersedia, dan Unit dalam Perawatan.
- **Bento Rekap Deposit Jaminan**: Tampilan monitoring deposit aktif (Amber Yellow), klaim denda kerusakan (Violet Purple `#A855F7`), dan deposit dikembalikan (Sky Blue).
- **Interactive Revenue Chart**: Grafik tren omset harian dan akumulasi laba bersih.

#### 👑 Data Armada Motor & Privasi Management Investor (`/vehicles`)
- **Manajemen Armada Lengkap**: Tambah, edit, dan hapus unit motor beserta nomor plat, warna, tahun, tarif 3-tier (Harian/Mingguan/Bulanan), kilometer Odometer, serta upload foto motor.
- **Merek Custom**: Pilihan dropdown merek dilengkapi opsi `+ Tambah Merek Baru / Custom...` dengan kolom input berbantu ikon Font Awesome.
- **🔒 Privasi Kepemilikan & Investor Bagi Hasil**:
  - Opsi status unit: *Milik Internal Boss Rent* vs *Titipan Investor (Bagi Hasil)*.
  - Pendataan nama investor, nomor WA, dan persentase bagi hasil (misal: 70% Investor / 30% Boss Rent).
  - **100% Terisolasi Rahasia**: Data investor disimpan khusus di Admin Panel dan **TIDAK PERNAH BOCOR** ke halaman publik pelanggan.
- **📊 Directory & Rekap Investor**: Tab khusus rekapitulasi jumlah investor aktif, unit titipan per investor, serta tombol kontak WhatsApp langsung.

#### 📋 Manajemen Transaksi Rental (`/transactions`)
- **Pencatatan Sewa Cepat**: Input nama penyewa, nomor HP, foto KTP/Paspor, tanggal sewa, deposit, diskon, dan metode bayar (Cash/Transfer/QRIS).
- **Foto Serah Terima Motor**: Upload foto bukti kondisi motor saat diambil dan dikembalikan.
- **Cetak Struk Nota Pembayaran**: Generator nota transaksi yang siap dicetak atau disimpan sebagai bukti sewa.

#### 💰 Keuangan & Arus Kas (`/expenses`)
- **Pencatatan Pemasukan & Pengeluaran**: Pengelompokan kategori (Gaji, Bensin, Servis, Sparepart, Layanan Tambahan).
- **Alokasi Per Unit Motor**: Biaya servis/perawatan dapat dihubungkan langsung ke unit motor investor terkait.
- **Registrasi Otomatis Denda Damage**: Klaim denda kerusakan dari transaksi sewa selesai otomatis tercatat sebagai Pemasukan Keuangan.

#### 📈 Laporan Bagi Hasil Investor & Export Excel (`/reports`)
- **Engine Kalkulasi Investor**: Otomatis mengkalkulasi Omset Kotor Motor Investor, Potongan Biaya Servis Motor, Laba Operasional Bersih, **Transfer Net Payout ke Investor (70%)**, dan Komisi Boss Rent (30%).
- **Cari & Pilih Nama Investor**: Kolom pencarian cepat `🔍 Ketik nama investor...` untuk menyaring daftar investor secara real-time.
- **📥 Export File Excel Resmi Investor (`.xlsx`)**: Menghasilkan file Excel profesional 3 Sheet:
  - *Sheet 1: Ringkasan Bagi Hasil & Kop Laporan Resmi* (Kolom lapang 45ch tanpa teks terpotong).
  - *Sheet 2: Rincian Transaksi Sewa Motor Investor*.
  - *Sheet 3: Rincian Biaya Perawatan & Servis Motor*.

#### 🛠️ Jadwal Servis & Perawatan (`/maintenance`)
- Monitoring odometer KM motor untuk peringatan servis rutin dan ganti oli berkala.

#### ⚙️ Pengaturan Profil Usaha & Dynamic Favicon (`/settings`)
- Pengaturan nama rental, kontak WA, alamat, dan upload Logo Perusahaan.
- **Dynamic Favicon Sync**: Upload logo baru langsung meng-update ikon tab browser (*favicon*) secara instant tanpa tersangkut cache browser.

---

---

## 🆕 FITUR TAMBAHAN (Update Terbaru)

### 📥 1. Booking Confirmation — Booking Online Terintegrasi (`/booking` → `/bookings`)
- Tombol **"Book Now"** di tiap unit motor pada halaman publik (`/fleet`) membuka halaman booking khusus (`/booking`), bukan langsung ke WhatsApp.
- Customer mengisi form: nama, telepon, pilih **Ambil di Toko** atau **Delivery** (+ alamat), lalu konfirmasi.
- Setelah submit, booking otomatis tersimpan ke database dan tersedia di menu **Booking Confirmation** pada Admin Panel — lengkap dengan tombol untuk mengirim notifikasi WhatsApp ke pengelola.
- Admin bisa mengubah status (Pending / Confirmed / Completed / Cancelled) kapan saja secara bebas, serta mengedit detail booking (nama, tanggal, dll.) lewat tombol Edit.
- Data booking dilindungi Row Level Security: publik hanya bisa **mengirim** booking, tidak bisa membaca data booking milik orang lain.

### 👥 2. Sistem Role Staff — Admin & Driver (`/settings?tab=staff`)
- Login sekarang punya pilihan peran: **Admin** (akses penuh) atau **Driver** (akses terbatas).
- Admin bisa membuat, mengedit, dan menghapus akun staff dari **Settings → Akun Staff**.
- Batasan akses akun **Driver**:
  | Halaman | Akses Driver |
  |---|---|
  | Transaksi | Bisa tambah baru; tidak bisa edit/hapus/tandai lunas |
  | Booking Confirmation | Lihat saja |
  | Tracking Sewa & Ketersediaan | Lihat saja |
  | Keuangan | Kelola pengeluaran penuh; pemasukan hanya bisa dilihat |
  | Kontrak | Bisa membuat & melihat laporan |
  | Data Motor, Customer, Laporan, Pengaturan, Maintenance, Galeri | Tidak dapat diakses (otomatis dialihkan) |
- Proteksi berlapis: selain disembunyikan di UI, setiap endpoint API terkait juga divalidasi ulang di server (`requireAdmin()` di `src/lib/apiAuth.js`) dan proxy Next.js (`src/proxy.js`) memblokir akses langsung lewat URL.

### ✍️ 3. Kontrak Sewa Digital — Tanda Tangan & Foto (`/contracts`, `/contracts/new`)
- Form kontrak berisi data diri customer (nama, no. KTP/Paspor, telepon, alamat), unit motor, dan tanggal sewa.
- **Ambil foto langsung dari HP**: foto passport/KTP dan foto customer bersama motor yang disewa.
- **Tanda tangan digital di layar** (kanvas HTML5, bisa pakai jari di HP atau mouse di desktop) — tidak pakai library eksternal.
- Bisa dibuka langsung dari baris Transaksi (tombol ungu ✍️) untuk otomatis mengisi data customer & motor dari transaksi terkait.
- **Laporan Kontrak** menampilkan semua kontrak yang sudah ditandatangani lengkap dengan foto & tanda tangan, bisa diakses Admin maupun Driver.

---

## 🔒 ASPEK KEAMANAN (SECURITY POSTURE)

- **Supabase Auth Guard**: Rute manajemen terlindungi oleh pengecekan sesi server `supabase.auth.getUser()`. User tanpa login otomatis di-redirect ke `/login`.
- **Role-Based Access Control (Admin/Driver)**: Selain login, setiap user punya role di tabel `staff_profiles`. Endpoint sensitif (edit/hapus transaksi & booking, kelola akun staff) wajib lolos guard `requireAdmin()`, sementara `src/proxy.js` mencegah akun Driver membuka halaman admin-only lewat URL langsung.
- **API Route Protection**: Semua endpoint `/api/*` (vehicles, transactions, expenses, bookings, contracts, staff) wajib lolos guard `requireAuth()` / `requireAdmin()` (`src/lib/apiAuth.js`). Request tanpa sesi login valid ditolak dengan **HTTP 401** — wajib karena route memakai service role (bypass RLS).
- **HTTP Security Headers**: Ditambahkan pada level Next.js & Vercel edge:
  - `X-Frame-Options: SAMEORIGIN` (Proteksi Clickjacking & iframe embedding ilegal).
  - `X-Content-Type-Options: nosniff` (Proteksi MIME-type sniffing).
  - `Referrer-Policy: strict-origin-when-cross-origin`.
  - `X-XSS-Protection: 1; mode=block`.
- **Data Sanitization**: Sanitasi otomatis string tanggal `purchase_date` ke `NULL` untuk mencegah SQL syntax error.

---

## 🛠️ STRUKTUR DATABASE SUPABASE (`schema.sql`)

Seluruh skema database tersimpan pada file **`supabase/schema.sql`** (Master Schema v5) yang mencakup tabel `vehicles`, `transactions`, `expenses`, `bookings`, `staff_profiles`, `contracts`, index performa, serta aturan **Row Level Security (RLS)**.

---

## 🚀 PANDUAN RUNNING LOKAL

1. **Clone repository & install dependensi**:
   ```bash
   git clone https://github.com/OOLVTWO/dupl-rent-vehicles.git
   cd dupl-rent-vehicles
   npm install
   ```

2. **Jalankan server pengembangan lokal**:
   ```bash
   npm run dev
   ```
   Aplikasi akan berjalan pada `http://localhost:3000`.

3. **Build Produksi**:
   ```bash
   npx next build
   ```

4. **Jalankan Unit Test** (finance engine & helper tanggal):
   ```bash
   npm test
   ```

---

*Dikembangkan secara khusus & eksklusif untuk Boss Rent Pererenan.*
