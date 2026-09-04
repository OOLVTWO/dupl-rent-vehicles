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
- **Dua Jenis Pencatatan**: Setiap transaksi baru wajib memilih salah satu — **Transaksi Langsung** (sewa mulai sekarang, walk-in) atau **Booking (Reservasi)** (untuk tanggal lain, motor tetap tersedia sampai dikonfirmasi). Tidak ada default; admin harus memilih secara sadar.
- **Ambil di Toko / Diantar**: Kedua mode di atas mendukung pilihan fulfillment. Kalau Diantar, admin memilih zona delivery (Hijau/Biru/Kuning, sesuai peta zona) dan menugaskan driver langsung dari form ini.
- **Transaksi Sekarang + Diantar + Driver** secara otomatis membuat record Booking (status Confirmed) yang saling terhubung — supaya driver bisa melihatnya di halaman Booking, tanda tangan kontrak, dan konfirmasi delivery dari sana. Transaksi aktifnya sendiri (dan hitungan mundur Tracking Sewa) baru benar-benar dibuat setelah driver konfirmasi delivery, bukan sejak form disimpan — jadi jam sewa tidak mulai lebih dulu dari serah terima fisik.
- **Status Pembayaran 3 Tingkat**: Lunas / **Down Payment** (wajib isi nominal DP, sisa tagihan dihitung otomatis) / Belum Bayar.
- **No. KTP/Paspor/SIM wajib diisi** di semua transaksi — data ini otomatis mengisi form Kontrak nanti, jadi customer tidak perlu mengisi ulang saat tanda tangan.
- **Tampilan Detail Terstruktur**: Status Motor, Status Pembayaran, Kontrak, Driver, Zona Delivery, dan Ringkasan Pembayaran (Total/DP/Sisa) masing-masing punya bagian sendiri yang jelas — tidak lagi ditumpuk jadi satu kolom.
- **List Gabungan dengan Booking**: Reservasi yang dibuat lewat mode Booking langsung tampil juga di daftar Transaksi (ditandai ungu, status "Booking (Pending/Confirmed)"), jadi admin punya satu tempat untuk melihat semuanya.

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

#### 🙋 Data Customer (`/customers`)
- Daftar master customer dengan agregasi otomatis dari histori transaksi (nama, telepon, jumlah sewa, total belanja).
- Tombol **Edit** dan **Hapus** per baris. Penghapusan hanya berlaku untuk data yang sudah tersimpan permanen di tabel Customer — data hasil agregasi otomatis dari transaksi lama yang belum disinkronkan tidak bisa dihapus dari sini (perlu klik "Sinkronkan" dulu).

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

### ✍️ 3. Kontrak Sewa Digital — Picker-First & Tanda Tangan (`/contracts`, `/contracts/new`)
- **Tidak ada lagi form kosong**: membuka Kontrak tanpa memilih transaksi/booking dulu akan menampilkan **daftar customer yang sudah transaksi/booking tapi belum tanda tangan** — bukan form isi manual dari nol. Ini berlaku sama di tampilan Admin maupun Driver (Driver hanya melihat yang ditugaskan ke dirinya).
- Memilih salah satu dari daftar akan membuka form yang **sudah terisi otomatis** (nama, telepon, alamat, motor, tanggal sewa, dan No. KTP/Paspor — karena field ini sekarang wajib diisi sejak tahap Transaksi/Booking).
- **Ambil foto langsung dari HP**: foto passport/KTP dan foto customer bersama motor yang disewa (khusus di form Kontrak — form Transaksi tidak lagi punya upload foto ganda).
- **Tanda tangan digital di layar** (kanvas HTML5, bisa pakai jari di HP atau mouse di desktop) — tidak pakai library eksternal.
- **Buat Kontrak Dulu terkunci** sampai tanggal mulai sewa benar-benar tiba — mencegah driver membuat kontrak untuk booking yang masih di masa depan.
- **Laporan Kontrak** otomatis sinkron karena berbasis data Transaksi — tidak mungkin ada entri kontrak "yatim" tanpa transaksi/booking valid.
- **PDF Invoice Otomatis**: setiap kontrak yang sudah ditandatangani bisa digenerate jadi PDF (via `pdfkit`, server-side) berisi detail sewa, 2 foto, dan tanda tangan customer. Dari halaman Transaksi, admin bisa langsung mengirim PDF ini ke customer lewat WhatsApp menggunakan Web Share API (membuka share sheet HP, memilih WhatsApp, file terlampir langsung).

### 🗺️ 4. Zona Delivery & Peta Interaktif
- Halaman booking publik (`/booking`) menampilkan pilihan **Ambil di Toko** atau **Diantar**. Kalau Diantar, customer memilih zona (Hijau/Biru/Kuning) dengan harga masing-masing yang tampil ringkas — tanpa daftar lokasi panjang yang memenuhi layar.
- Tombol **View Zone Map** membuka peta zona sebagai overlay yang benar-benar center di layar (dirender lewat React Portal, lepas dari elemen halaman manapun, supaya tidak ketarik oleh header atau elemen `position: sticky` lain).
- Sebelum konfirmasi, ada tahap **Review Your Booking** berisi ringkasan lengkap (termasuk rincian harga sewa motor terpisah dari ongkos delivery), **Terms & Conditions**, dan kotak centang persetujuan wajib — tombol konfirmasi terkunci (abu-abu) sampai kotak dicentang.
- Admin bisa mengatur harga & label tiap zona dari **Pengaturan → Zona Delivery**.

### 🚗 5. Ekosistem Driver — Booking, Kontrak, Delivery, Pendapatan
- **Booking Confirmation** (`/bookings`) menampilkan kolom terpisah untuk Driver, Status Kontrak, dan Status Delivery — masing-masing punya aksi & indikator sendiri, tidak ditumpuk jadi satu.
- Tombol **Confirm Delivered** terkunci dengan pesan jelas selama kontrak belum dibuat, dan selama tanggal mulai sewa belum tiba.
- Ongkos delivery otomatis tercatat sebagai **pendapatan driver** (status "belum dibayar") begitu delivery dikonfirmasi.
- **History Pendapatan** (`/driver-income`) — driver bisa melihat riwayat pendapatannya sendiri (ongkos delivery otomatis + gaji/bonus manual dari admin).
- Pesan konfirmasi booking ke customer menyertakan nama **dan nomor WhatsApp driver** yang bertugas.

### 👔 6. Manajemen Employee — Input Pendapatan & Konfirmasi Pembayaran (`/settings` → Employee)
- **Akun Staff**: kelola akun Admin/Driver seperti biasa.
- **Input Pendapatan**: admin bisa mencatat gaji/bonus untuk tiap driver dari satu tempat, tanpa perlu klik masuk ke akun driver satu per satu.
- **Konfirmasi Pembayaran**: daftar semua pembayaran driver yang belum lunas dalam satu layar, dengan aksi ✓ (tandai lunas) atau ✗ (tolak & hapus entri) per baris.
- Admin juga bisa membuka **riwayat pendapatan lengkap** tiap driver langsung dari baris Akun Staff, termasuk menghapus entri yang keliru.
- Kalau transaksi/booking sumber dari suatu catatan pendapatan dihapus, catatan pendapatannya ikut terhapus otomatis — tidak ada riwayat "nyangkut" dari data yang sudah tidak ada.

### 🔔 7. Notifikasi Badge di Sidebar
Sidebar menampilkan badge angka real-time (polling tiap 60 detik) pada beberapa menu:
- **Booking** — jumlah booking berstatus Pending.
- **Tracking Sewa** — jumlah sewa aktif yang sudah lewat tanggal kembali.
- **Kontrak** — jumlah transaksi/booking yang belum ada kontraknya (Admin melihat semua; Driver hanya melihat yang ditugaskan ke dirinya sendiri dan sudah bisa dikerjakan).
- **Konfirmasi Pembayaran** — jumlah pendapatan driver yang belum dikonfirmasi lunas.

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
