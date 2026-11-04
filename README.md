# PraditaCare

Aplikasi web layanan bantuan dan pengaduan mahasiswa Universitas Pradita. Kode aplikasi ada di folder [`praditacare/`](praditacare/).

**Dokumen penting:** [Cara menjalankan lengkap](HowToRun.md) · [Checklist MVP](checklist_mvp.md) · [Video demo](demo.mp4) · [Hasil uji security](praditacare/docs/security/HASIL-UJI-SECURITY.md) · [Log aman & penanganan error](praditacare/docs/security/LOG-AMAN-DAN-ERROR.md) · [Bukti verifikasi fresh clone](praditacare/docs/verifikasi-fresh-clone/RINGKASAN.md) · [Dokumen arsitektur](Dok_Arsitektur.md)

---

## Instalasi Ulang dari Fresh Clone, Build, Deploy, dan Akses Aplikasi

Langkah di bawah sudah diuji dari clone baru ke folder kosong (Node 22, npm 10, MariaDB 10.11) dan semuanya berhasil: 119 unit test PASSED, build sukses, deploy production jalan, uji security 39/39 PASS, dan 6 skrip regresi end-to-end PASS. Bukti terminalnya ada di [`praditacare/docs/verifikasi-fresh-clone/bukti/`](praditacare/docs/verifikasi-fresh-clone/bukti/).

### 1. Prasyarat

| Kebutuhan | Versi | Catatan |
| --- | --- | --- |
| Git | apa saja | |
| Node.js + npm | Node **20.6+** (disarankan 22), npm 10+ | `node -v` untuk cek |
| Database | MySQL 8 lewat **Docker Desktop**, atau MySQL/MariaDB 10.11+ yang sudah terpasang | default user `root`, password `root`, port 3306 |

### 2. Clone dan install

```bash
git clone https://github.com/richkyrifadi-create/Project_RPL.git
cd Project_RPL/praditacare

cp .env.example .env        # Windows (cmd): copy .env.example .env
docker compose up -d        # menyalakan MySQL; lewati bila memakai MySQL/MariaDB lokal
npm ci                      # install persis sesuai package-lock.json (sekaligus prisma generate)
```

Tanpa Docker: buat database kosong `praditacare` di MySQL/MariaDB Anda, lalu sesuaikan `DATABASE_URL` di `.env`, misalnya `mysql://root:passwordanda@localhost:3306/praditacare`.

### 3. Siapkan database

```bash
npm run db:deploy           # membuat semua tabel (Prisma migration)
npm run db:seed             # data demo: 5 unit, 8 kategori, 9 akun, 13 tiket
```

### 4. Jalankan unit test

```bash
npm test                    # 119 unit test (Vitest), tidak butuh database
npm run typecheck           # cek tipe TypeScript shared + api + web
```

### 5a. Menjalankan untuk development

```bash
npm run dev
```

Buka **http://localhost:5173**. Web (Vite) di port 5173 dan API di port 4000 menyala bersamaan, perubahan kode langsung terlihat.

### 5b. Build dan deploy (mode production)

Di mode production, API sekaligus menyajikan web hasil build, sehingga cukup **satu proses di satu port**.

```bash
npm run build               # build shared + api + web
npm run gen:secret          # buat secret acak, salin hasilnya
```

Lalu ubah `.env`:

```env
NODE_ENV="production"
JWT_SECRET="<tempel hasil gen:secret, minimal 32 karakter>"
CORS_ORIGIN="http://localhost:4000"     # atau alamat domain server, mis. https://care.pradita.ac.id
```

```bash
npm start                   # menyalakan aplikasi di http://localhost:4000
```

Buka **http://localhost:4000**. Server sengaja **menolak menyala** bila `NODE_ENV=production` tetapi `JWT_SECRET` masih nilai contoh.

Untuk server sungguhan (VPS/kampus): jalankan langkah yang sama di server, pasang reverse proxy HTTPS (Nginx/Caddy) yang meneruskan ke port 4000 lalu isi `TRUST_PROXY=1`, jalankan `npm start` dengan pengelola proses (mis. `pm2 start npm --name praditacare -- start`), dan **jangan** jalankan `db:seed` (akun demo memakai password yang diketahui umum).

### 6. Akses aplikasi dan paket demo

| Mode | Alamat |
| --- | --- |
| Development (`npm run dev`) | http://localhost:5173 |
| Production (`npm start`) | http://localhost:4000 |
| Cek API hidup | http://localhost:4000/api/health → `{"Status":"OK"}` |

Akun demo dari seed, semua password **`Pradita123!`** (halaman login juga punya tombol akun demo):

| Peran | Email |
| --- | --- |
| Mahasiswa | budi@student.pradita.ac.id, siti@student.pradita.ac.id, andi@student.pradita.ac.id |
| Staf Sarana Prasarana | staf.sarpras@pradita.ac.id |
| Staf IT | staf.it@pradita.ac.id |
| Staf Akademik / Keuangan / Konseling | staf.akademik@pradita.ac.id, staf.keuangan@pradita.ac.id, staf.konseling@pradita.ac.id |
| Admin | admin@pradita.ac.id |

Paket demo yang tersedia di repo:

- [`demo.mp4`](demo.mp4): video alur lengkap (2 menit 38 detik): mahasiswa membuat tiket, staf memproses, mahasiswa memberi rating, admin melihat dashboard. Alur yang sama tertulis di [HowToRun.md bagian 5](HowToRun.md).
- Data seed di atas: langsung bisa dicoba tanpa input manual.
- Skrip uji yang bisa dijalankan ulang (server menyala + database baru di-seed): `node docs/security/verify-security.mjs`, skrip end-to-end di `docs/`, dan verifikasi penuh dari fresh clone `bash docs/verifikasi-fresh-clone/verify-fresh.sh main /tmp/praditacare-fresh ./bukti`.

### 7. Masalah yang sering muncul

| Gejala | Solusi |
| --- | --- |
| `node: ../../.env: not found` | Belum membuat `.env`: `cp .env.example .env`. |
| `Can't reach database server` / respons 503 "Database sedang tidak dapat dihubungi" | MySQL belum menyala: `docker compose up -d`, tunggu ±20 detik. |
| `The table ... does not exist` | Migrasi belum dijalankan: `npm run db:deploy`. |
| `Database sudah berisi data` saat seed | Seed hanya untuk database kosong; ulangi dengan `npm run db:reset -w @praditacare/api` (menghapus semua data). |
| `EADDRINUSE` / `port 4000 sudah dipakai` | Server lama masih jalan; hentikan, atau ubah `PORT` di `.env`. |
| `Konfigurasi production tidak aman: JWT_SECRET ...` | Ganti `JWT_SECRET` dengan hasil `npm run gen:secret`. |
| Login: "Terlalu banyak percobaan gagal" | Rate limit setelah 5 kali salah password; tunggu 15 menit. |

Daftar lengkap error, contoh log, dan perbaikannya: [LOG-AMAN-DAN-ERROR.md](praditacare/docs/security/LOG-AMAN-DAN-ERROR.md).

---


## Big Picture Permasalahan

Di lingkungan kampus, berbagai permasalahan fasilitas dapat terjadi setiap hari, seperti AC yang tidak berfungsi, Wi-Fi bermasalah, lampu mati, fasilitas kelas rusak, toilet yang kurang terawat, hingga permasalahan pada area kampus.

Saat ini, penyampaian permasalahan tersebut dapat dilakukan melalui berbagai cara, seperti menghubungi pihak terkait secara langsung, melalui grup chat, atau melalui media komunikasi lainnya. Hal tersebut dapat menyebabkan laporan sulit dilacak, terlambat ditangani, atau pelapor tidak mengetahui perkembangan dari laporan yang telah dibuat.

Oleh karena itu, kami melihat adanya kebutuhan akan sebuah sistem yang dapat menjadi tempat terpusat untuk melaporkan dan memantau permasalahan fasilitas kampus.

---

## Kenapa Kami Memilih Judul Ini?

Kami memilih nama **PraditaCare** karena sistem ini dirancang secara khusus untuk lingkungan kampus Pradita.

Nama "Care" menggambarkan kepedulian terhadap kondisi lingkungan kampus. Melalui sistem ini, mahasiswa, dosen, maupun staf dapat ikut berkontribusi dalam menjaga dan meningkatkan kualitas fasilitas kampus dengan melaporkan permasalahan yang mereka temui.

Kami juga memilih konsep ini karena permasalahan fasilitas merupakan sesuatu yang dekat dengan kehidupan sehari-hari di lingkungan kampus dan dapat dirasakan secara langsung oleh berbagai pihak.

---

## Ide yang Kami Tawarkan

**PraditaCare** merupakan website yang memungkinkan pengguna untuk melaporkan permasalahan fasilitas kampus melalui satu platform.

Pengguna dapat memberikan informasi mengenai permasalahan yang ditemukan, seperti:

- Jenis permasalahan
- Lokasi permasalahan
- Deskripsi masalah
- Foto atau bukti permasalahan

Setelah laporan dibuat, pihak yang bertanggung jawab dapat melihat, mengelola, dan menindaklanjuti laporan tersebut.

Pengguna juga dapat memantau perkembangan laporan hingga permasalahan dinyatakan selesai.

---

## Manfaat PraditaCare

### Bagi Mahasiswa, Dosen, dan Staff

- Mempermudah proses pelaporan permasalahan.
- Tidak perlu bingung mencari pihak yang harus dihubungi.
- Dapat mengetahui status laporan.
- Dapat melihat perkembangan penanganan masalah.

### Bagi Pihak Kampus

- Mempermudah pengelolaan laporan.
- Membantu menentukan laporan yang perlu diprioritaskan.
- Mempermudah pembagian laporan kepada pihak yang bertanggung jawab.
- Memiliki riwayat laporan yang lebih terstruktur.
- Mendapatkan data mengenai permasalahan fasilitas yang sering terjadi.

### Bagi Kami sebagai Pengembang

Project ini memberikan kesempatan bagi kami untuk menerapkan konsep Rekayasa Perangkat Lunak dalam sebuah permasalahan yang dekat dengan kehidupan kampus.

Kami dapat mempelajari bagaimana sebuah sistem dirancang mulai dari memahami masalah, menentukan kebutuhan pengguna, merancang solusi, hingga mengimplementasikannya menjadi sebuah aplikasi berbasis web.

---

## Gambaran Fitur

Beberapa fitur yang direncanakan dalam PraditaCare:

- Membuat laporan permasalahan.
- Mengunggah foto sebagai bukti.
- Menentukan kategori dan lokasi permasalahan.
- Melihat status laporan.
- Memantau proses penanganan.
- Pengelolaan laporan oleh pihak kampus.
- Penugasan laporan kepada petugas terkait.
- Riwayat penanganan laporan.
- Rating atau feedback setelah masalah diselesaikan.
- Dashboard untuk melihat data dan statistik laporan.

---

## Contoh Permasalahan

Contoh penggunaan PraditaCare:

> Seorang mahasiswa menemukan AC di salah satu ruang kelas tidak berfungsi.

Mahasiswa membuka PraditaCare dan membuat laporan:

**Kategori:** Fasilitas  
**Masalah:** AC tidak berfungsi  
**Lokasi:** Gedung A, Lantai 3, Ruang 305  
**Deskripsi:** AC tidak menyala sejak pagi  
**Bukti:** Foto AC

Laporan kemudian diterima oleh pihak kampus dan diteruskan kepada petugas yang sesuai.

Mahasiswa dapat memantau status laporan hingga masalah tersebut selesai.

---

## Tujuan Project

Tujuan utama dari PraditaCare adalah membuat proses pelaporan permasalahan fasilitas kampus menjadi lebih **mudah, terstruktur, transparan, dan terdokumentasi**.

Dengan adanya sistem ini, diharapkan permasalahan fasilitas dapat lebih mudah diketahui dan ditindaklanjuti oleh pihak yang bertanggung jawab.

---

## Status Project

**MVP Final: aplikasi sudah berjalan, teruji (119 unit test, uji security, regresi end-to-end), dan siap di-deploy.**

Project ini dibuat untuk memenuhi tugas mata kuliah **Rekayasa Perangkat Lunak**.

Pengembangan PraditaCare akan dilakukan secara bertahap berdasarkan kebutuhan pengguna dan hasil analisis permasalahan yang ditemukan.