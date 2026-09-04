# 🏍️ DEMO RENTAL PREVIEW — Platform Persewaan Motor & Enterprise Management System

Selamat datang di repository **Demo Rental Preview**, platform web persewaan motor modern yang memadukan **Katalog Publik Pelanggan (Sharp Aesthetics)** dengan **Sistem Manajemen Operasional & Keuangan Internal (Admin Dashboard)**. Repo ini adalah environment demo/preview yang berdiri sendiri, terisolasi penuh dari data production manapun.

Aplikasi ini dikembangkan menggunakan stack teknologi terbaik: **Next.js 16 (App Router)**, **Supabase Cloud Database & Auth**, **XLSX Multi-Sheet Engine**, **Font Awesome v6 Vector Icons**, dan di-host secara live pada infrastruktur **Vercel Cloud (`.vercel.app`)**.

---

## 🚀 AKSES WEB LIVE & AKUN LOGIN

- 🌐 **Katalog Publik**: [https://dupl-rent-vehicles.vercel.app](https://dupl-rent-vehicles.vercel.app)
- 🔑 **Login Panel**: [https://dupl-rent-vehicles.vercel.app/login](https://dupl-rent-vehicles.vercel.app/login)

> ⚠️ **Kredensial di bawah sengaja ditulis terbuka** karena environment ini murni untuk demo/testing (database Supabase terpisah `zniummuqsiobmxffhpzl`). Repo ini bersifat publik — jangan pakai kombinasi email/password yang sama untuk akun penting lainnya.

| Role | Email | Password | Bisa Coba |
|---|---|---|---|
| **Admin** | `admin@preview.com` | `Preview!` | Semua fitur — kelola motor, transaksi, booking, kontrak, keuangan, laporan, employee, pengaturan |
| **Driver** | `driver@preview.com` | `Preview!` | Dashboard, Booking (yang ditugaskan), buat Kontrak, Tracking Sewa, History Pendapatan sendiri |



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
  - Opsi status unit: *Milik Internal Rental* vs *Titipan Investor (Bagi Hasil)*.
  - Pendataan nama investor, nomor WA, dan persentase bagi hasil (misal: 70% Investor / 30% Rental).
  - **100% Terisolasi Rahasia**: Data investor disimpan khusus di Admin Panel dan **TIDAK PERNAH BOCOR** ke halaman publik pelanggan.
- **📊 Directory & Rekap Investor**: Tab khusus rekapitulasi jumlah investor aktif, unit titipan per investor, serta tombol kontak WhatsApp langsung.

#### 📋 Manajemen Transaksi Rental (`/transactions`)
- **Kode Otomatis yang Gampang Dibaca**: setiap Booking dan Transaksi dapat kode singkat otomatis dari database (bukan UUID panjang) — Booking format `[Inisial Merek][Inisial Model][2 digit]` (misal `YF43` untuk Yamaha Fazzio), Transaksi format `T[3 digit]` (misal `T123`). Dijamin unik lewat trigger database, jadi berlaku otomatis dari mana pun record dibuat (form admin maupun booking publik).
- **Dua Jenis Pencatatan**: Setiap transaksi baru wajib memilih salah satu — **Transaksi Langsung** (sewa mulai sekarang, walk-in) atau **Booking (Reservasi)** (untuk tanggal lain, motor tetap tersedia sampai dikonfirmasi). Tidak ada default; admin harus memilih secara sadar.
- **Ambil di Toko / Diantar**: Kedua mode di atas mendukung pilihan fulfillment — selalu tampil dari awal, tidak menunggu Jenis Pencatatan dipilih dulu. Kalau Diantar, admin memilih zona delivery (Hijau/Biru/Kuning, sesuai peta zona) dan menugaskan driver langsung dari form ini.
- **Transaksi Sekarang + Diantar + Driver** secara otomatis membuat record Booking (status **Pending**, bukan langsung Confirmed) yang saling terhubung — admin tetap wajib klik Confirm di halaman Booking supaya status motor di Fleet publik ikut ter-update jadi Booked. Transaksi aktifnya sendiri (dan hitungan mundur Tracking Sewa) baru benar-benar dibuat setelah driver konfirmasi delivery, bukan sejak form disimpan — jadi jam sewa tidak mulai lebih dulu dari serah terima fisik.
- **Atribut / Perlengkapan Tambahan**: admin bisa centang aksesoris tambahan (Box Shad, Surf Rack, dll — lihat bagian Data Master Atribut Motor) langsung dari form yang sama persis dengan yang dilihat customer di halaman booking publik, termasuk quantity stepper untuk atribut seperti Raincoat.
- **Status Pembayaran 3 Tingkat**: Lunas / **Down Payment** (wajib isi nominal DP, sisa tagihan dihitung otomatis) / Belum Bayar. Ringkasan Pembayaran (kartu berwarna sesuai status) selalu menunjukkan sisa yang harus dibayar dan otomatis sinkron begitu status pembayaran transaksi terkait berubah — termasuk untuk booking yang sudah dikonversi jadi transaksi aktif.
- **No. KTP/Paspor/SIM wajib diisi** di semua transaksi — data ini otomatis mengisi form Kontrak nanti, jadi customer tidak perlu mengisi ulang saat tanda tangan.
- **Tampilan Detail Terstruktur**: Merk Motor, Nama Motor, Plat Motor, Status Motor, Status Pembayaran, Kontrak, Driver, Zona Delivery, Atribut Tambahan, Catatan, dan Ringkasan Pembayaran masing-masing punya kolom sendiri yang jelas — tidak lagi ditumpuk jadi satu.
- **List Gabungan dengan Booking**: Reservasi yang dibuat lewat mode Booking langsung tampil juga di daftar Transaksi (ditandai ungu, status "Booking (Pending/Confirmed)"), jadi admin punya satu tempat untuk melihat semuanya — baik sudah ada transaksi aktifnya maupun belum.

#### 💰 Keuangan & Arus Kas (`/expenses`)
- **Pencatatan Pemasukan & Pengeluaran**: Pengelompokan kategori (Gaji, Bensin, Servis, Sparepart, Layanan Tambahan).
- **Alokasi Per Unit Motor**: Biaya servis/perawatan dapat dihubungkan langsung ke unit motor investor terkait.
- **Registrasi Otomatis Denda Damage**: Klaim denda kerusakan dari transaksi sewa selesai otomatis tercatat sebagai Pemasukan Keuangan.

#### 📈 Laporan Bagi Hasil Investor & Export Excel (`/reports`)
- **Engine Kalkulasi Investor**: Otomatis mengkalkulasi Omset Kotor Motor Investor, Potongan Biaya Servis Motor, Laba Operasional Bersih, **Transfer Net Payout ke Investor (70%)**, dan Komisi Rental (30%).
- **Cari & Pilih Nama Investor**: Kolom pencarian cepat `🔍 Ketik nama investor...` untuk menyaring daftar investor secara real-time.
- **📥 Export File Excel Resmi Investor (`.xlsx`)**: Menghasilkan file Excel profesional 3 Sheet:
  - *Sheet 1: Ringkasan Bagi Hasil & Kop Laporan Resmi* (Kolom lapang 45ch tanpa teks terpotong).
  - *Sheet 2: Rincian Transaksi Sewa Motor Investor*.
  - *Sheet 3: Rincian Biaya Perawatan & Servis Motor*.

#### 🎒 Data Master Atribut Motor (`/attributes`)
- Kelola aksesoris tambahan yang bisa dipilih customer maupun admin saat booking/transaksi: **Helmet & Phone Holder** (selalu disertakan gratis, tampil sebagai info — bukan pilihan), **Raincoat** (gratis, opsional, mendukung quantity 1–2 lewat stepper +/-), **Box Shad & Surf Rack** (berbayar flat Rp200.000, berlaku sampai motor dikembalikan).
- Tiap atribut punya **stok (quantity)**, **harga**, flag **selalu disertakan / opsional**, ikon, dan **urutan tampil** yang bisa diatur — otomatis kehabisan stok akan mem-block pilihan tersebut di form (tombol jadi disabled) baik di halaman publik maupun form admin.
- Wajib memilih minimal satu atribut ATAU tombol **"I Don't Need Any Additional Equipment"** di halaman booking publik sebelum lanjut ke Review — kalau customer berubah pikiran dan meng-uncheck opsi itu, pilihan sebelumnya otomatis dikembalikan (bukan direset ulang).

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
- Customer mengisi form lengkap: nama, No. KTP/Paspor, WhatsApp (dengan kode negara), alamat (wajib), pilih **Ambil di Toko** atau **Delivery**, metode pembayaran, dan atribut tambahan — semuanya wajib dipilih, tidak ada yang default otomatis.
- Setelah submit, booking otomatis tersimpan ke database dengan **Kode Booking** otomatis (misal `HS19`) dan tersedia di menu **Booking Confirmation** pada Admin Panel berstatus **Pending** — lengkap dengan tombol untuk mengirim notifikasi WhatsApp ke pengelola.
- Admin klik **Confirm** untuk mengonfirmasi booking — begitu dikonfirmasi, status motor di halaman Fleet publik otomatis berubah jadi **Booked** (tidak bisa dipilih customer lain lagi). Admin juga bisa mengedit detail booking (nama, tanggal, motor, dll.) lewat tombol Edit — form edit sekarang selengkap form Tambah Transaksi (termasuk pemilihan motor, zona delivery, dan status pembayaran).
- Data booking dilindungi Row Level Security: publik hanya bisa **mengirim** booking, tidak bisa membaca data booking milik orang lain.

### 👥 2. Sistem Role Staff — Admin & Driver (`/settings?tab=staff`)
- Login sekarang punya pilihan peran: **Admin** (akses penuh) atau **Driver** (akses terbatas).
- Admin bisa membuat, mengedit, dan menghapus akun staff dari **Settings → Akun Staff**.
- Batasan akses akun **Driver** — hanya bisa membuka Dashboard, Booking, Tracking Sewa, Kontrak, dan History Pendapatan:
  | Halaman | Akses Driver |
  |---|---|
  | Booking Confirmation | Lihat booking yang ditugaskan ke dirinya sendiri saja; bisa Confirm Delivered, tidak bisa ubah status/edit/hapus/Konfirmasi Transaksi |
  | Kontrak | Picker hanya menampilkan booking miliknya sendiri yang belum ditandatangani; bisa membuat kontrak (foto + TTD) |
  | Tracking Sewa | Lihat saja (hitungan mundur sewa aktif) |
  | History Pendapatan | Lihat riwayat pendapatan dirinya sendiri (ongkos delivery otomatis + gaji/bonus dari admin) |
  | Transaksi, Keuangan, Data Motor, Customer, Laporan, Pengaturan, Maintenance, Galeri, Employee | Tidak dapat diakses sama sekali (otomatis dialihkan) |
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

## 🔄 ALUR PENGGUNAAN SISTEM (END-TO-END)

Bagian ini menjelaskan urutan langkah nyata dari sudut pandang tiap peran — dari customer booking sampai transaksi selesai.

### 👤 A. Alur Customer — Booking dari Halaman Publik

1. Buka **`/fleet`**, pilih tanggal sewa di kalkulator harga → sistem hitung estimasi otomatis (Harian/Mingguan/Bulanan, mana yang lebih murah).
2. Pilih motor yang tersedia (badge **Available Now**; motor yang sedang disewa/dibooking tampil **Rented/Booked** dan tidak bisa dipilih) → klik **Book Now**.
3. Diarahkan ke **`/booking`** (bukan langsung WhatsApp) — isi form berurutan: Nama Lengkap, No. KTP/Paspor (buat pre-fill Kontrak nanti), No. WhatsApp (dengan kode negara + bendera), Alamat (selalu wajib).
4. Pilih **Fulfillment** (Self Pickup / Delivery — wajib pilih salah satu, tidak ada default). Kalau Delivery: isi alamat lengkap + pilih zona di peta.
5. Pilih **Payment Method** (wajib pilih, tidak ada default) — pembayaran sendiri baru dilakukan tunai/QRIS/kartu langsung ke driver saat motor diantar/diambil, bukan di form ini.
6. Pilih **Additional Equipment** — wajib centang minimal satu ATAU pilih "I Don't Need Any Additional Equipment". Atribut berbayar (Box Shad, Surf Rack) otomatis masuk ke total harga; Raincoat pakai stepper quantity.
7. Klik **Review Booking** → cek ringkasan lengkap (motor, tanggal, delivery fee, extras, T&C) → centang persetujuan → **Confirm Booking**.
8. Booking tersimpan dengan **Kode Booking** otomatis (misal `HS19`) berstatus **Pending** — customer dapat notifikasi WhatsApp ke pemilik rental untuk konfirmasi lebih cepat (tombol "Notify via WhatsApp" di layar sukses).

### 🛡️ B. Alur Admin — Mengelola Booking Masuk

1. Buka **`/bookings`** — booking baru (dari publik maupun dari form admin mode Booking) muncul dengan status **Pending**.
2. Klik ✓ **Confirm** — status jadi **Confirmed**, dan **motor otomatis berubah jadi "Booked" di halaman Fleet publik** (tidak bisa dipilih customer lain lagi). *(Motor baru benar-benar "Rented" saat driver konfirmasi delivery, bukan saat Confirm booking.)*
3. Kalau metode Delivery: tugaskan **Driver** dari dropdown assignment di kolom Driver.
4. Driver kemudian membuat **Kontrak** (lihat alur C) dan **Confirm Delivered** dari HP-nya sendiri — status "Status Kontrak" dan "Status Delivery" di baris booking ini akan ter-update otomatis begitu driver menyelesaikan langkahnya.
5. Setelah delivery dikonfirmasi, tombol **Konfirmasi Transaksi** aktif — klik ini untuk mengonversi booking jadi transaksi aktif sungguhan (mengisi KM Awal, mengonfirmasi/menyesuaikan status pembayaran final, dll). Transaksi barunya otomatis dapat **Kode Transaksi** (misal `T650`) dan langsung tampil normal di `/transactions`.

### ✍️ C. Alur Driver — Kontrak & Konfirmasi Delivery

1. Login sebagai Driver → Dashboard hanya menampilkan menu yang relevan (Booking, Kontrak, Tracking Sewa, History Pendapatan).
2. Buka **Booking** — hanya melihat booking yang ditugaskan ke dirinya sendiri.
3. Buka **Kontrak** → pilih dari daftar booking yang belum ditandatangani (bukan form kosong) → data customer, motor, dan No. KTP **sudah otomatis terisi** dari data booking.
4. Ambil foto Passport/KTP dan foto Customer + Motor langsung dari HP, minta customer tanda tangan di layar (canvas sentuh) → **Save Contract**.
5. Layar sukses menampilkan tombol **"Go to Booking — Confirm Delivery"** (langsung lanjut ke langkah berikutnya) atau kembali ke Dashboard.
6. Di halaman Booking, klik **Confirm Delivered** (tombol hanya aktif kalau Kontrak sudah dibuat) — ongkos delivery otomatis tercatat sebagai pendapatan driver (status belum dibayar).
7. Driver bisa cek riwayat pendapatannya sendiri (ongkos delivery otomatis + gaji/bonus dari admin) di **History Pendapatan**.

### 💵 D. Alur Admin — Transaksi Langsung (Walk-in, Tanpa Booking)

1. Buka **`/transactions`** → **Transaksi Baru** → pilih **Transaksi Langsung**.
2. Pilih **Ambil di Toko** (motor langsung berstatus Disewa begitu form disimpan) atau **Diantar** (perlu tugaskan driver — ini otomatis membuat Booking status Pending di belakang layar, ikuti alur B mulai dari langkah 2).
3. Isi data customer, pilih motor, atribut tambahan, dan status pembayaran seperti biasa → Simpan.

### 🔁 E. Siklus Penuh Satu Transaksi (Ringkasan)

```
Booking Pending → Admin Confirm (motor jadi Booked di Fleet)
    → Driver buat Kontrak (foto + TTD)
    → Driver Confirm Delivered (motor jadi Rented, income driver tercatat)
    → Admin Konfirmasi Transaksi (jadi transaksi aktif, Kode Transaksi digenerate)
    → Sewa berjalan (Tracking Sewa menghitung mundur)
    → Admin "Selesaikan Transaksi" saat motor kembali (isi KM Akhir, denda kalau ada)
    → Motor kembali Available di Fleet, transaksi Completed
```

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

*Environment demo/preview — Demo Rental Preview.*
