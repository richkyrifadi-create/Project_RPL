# Cara Menjalankan PraditaCare (MVP Final)

PraditaCare adalah aplikasi web layanan pengaduan dan bantuan mahasiswa Universitas Pradita. Seluruh kode ada di folder [`praditacare/`](praditacare/).

| Bagian | Teknologi | Port |
| --- | --- | --- |
| Web (frontend) | React + TypeScript + Vite + Tailwind | 5173 |
| API (backend) | Node.js + Express + TypeScript + Prisma | 4000 |
| Database | MySQL 8 (Docker) atau MariaDB 10.11+ | 3306 |
| Kode bersama | `@praditacare/shared` (model, validasi Zod, aturan bisnis) | - |

## 1. Prasyarat

- Node.js 20.6 atau lebih baru (disarankan 22), npm 10+
- Docker Desktop (untuk MySQL), **atau** MySQL/MariaDB yang sudah terpasang dengan user `root` password `root`
- Git

## 2. Langkah instalasi (sekali saja)

```bash
git clone https://github.com/richkyrifadi-create/Project_RPL.git
cd Project_RPL/praditacare

cp .env.example .env          # Windows: copy .env.example .env
docker compose up -d          # menyalakan MySQL (database "praditacare", root/root)
npm install                   # sekaligus menjalankan prisma generate
npm run build:shared          # wajib sebelum api/web dijalankan
npm run db:deploy             # membuat tabel (Prisma migration)
npm run db:seed               # mengisi data contoh: 5 unit, 8 kategori, 9 user, 13 tiket
```

Tanpa Docker: buat database kosong `praditacare` di MySQL/MariaDB Anda, lalu sesuaikan `DATABASE_URL` di `.env`, misalnya `mysql://root:passwordanda@localhost:3306/praditacare`.

## 3. Menjalankan aplikasi

```bash
npm run dev
```

Perintah ini menyalakan tiga proses sekaligus: shared (watch), API di http://localhost:4000, dan web di http://localhost:5173. Buka **http://localhost:5173** di browser. Tunggu sampai log menampilkan `PraditaCare API berjalan di http://localhost:4000`.

## 4. Akun untuk mencoba

Semua password: **`Pradita123!`** (halaman login juga punya tombol akun demo).

| Peran | Email | Yang bisa dicoba |
| --- | --- | --- |
| Mahasiswa | budi@student.pradita.ac.id | Buat tiket, balas, buka kembali, beri rating |
| Mahasiswa | siti@student.pradita.ac.id, andi@student.pradita.ac.id | Sama seperti di atas |
| Staf Sarana Prasarana | staf.sarpras@pradita.ac.id | Antrian & proses laporan fasilitas |
| Staf IT | staf.it@pradita.ac.id | Antrian & proses tiket IT |
| Staf Akademik / Keuangan / Konseling | staf.akademik@ / staf.keuangan@ / staf.konseling@pradita.ac.id | Antrian unit masing-masing |
| Admin | admin@pradita.ac.id | Dashboard semua unit, manajemen unit, kategori, user |

## 5. Alur demo singkat (sama dengan `demo.mp4`)

1. Login sebagai **budi** → **Buat Tiket** → kategori *Kerusakan Fasilitas* → isi lokasi, judul, deskripsi, lampiran foto → **Kirim Tiket**.
2. Login sebagai **staf.sarpras** → **Antrian Tiket** → buka tiket → **Diproses** → tulis komentar (bisa *Catatan internal*) → **Menunggu Pelapor** (catatan wajib).
3. Login sebagai **budi** → balas komentar → status otomatis kembali **Diproses**.
4. Login sebagai **staf.sarpras** → **Selesai** (catatan wajib).
5. Login sebagai **budi** → beri rating 1–5 → tiket **Ditutup**.
6. Login sebagai **admin** → **Dashboard**, **Antrian Tiket**, **Unit**, **Kategori**, **User**.

## 6. Menjalankan pengujian

Dari folder `praditacare/`:

```bash
npm test               # 96 unit test (Vitest), tidak butuh database
npm run typecheck      # cek tipe TypeScript shared + api + web
```

Pengujian end-to-end (butuh `npm run dev` menyala dan **database yang baru di-seed**, karena skrip ini mengubah data):

```bash
node docs/e2e-test.mjs <folder-berisi-bukti.pdf>        # 42 cek API (folder harus berisi file bukti.pdf apa saja): login, tiket, status, privasi, dashboard
node docs/mvp-v1/verify-fitur-1.mjs                       # 13 cek lokasi laporan
node docs/mvp-v1/verify-fitur-2.mjs                       # 13 cek dashboard lokasi rawan
node docs/mvp-penyempurnaan/verify-user-stories.mjs       # 29 cek 5 user story
node docs/demo/verify-ui-states.cjs                       # 18 cek UI: input salah, kosong, loading, gagal (butuh Playwright)
node docs/mvp-final/verify-tambahan.mjs                  # 20 cek: ganti password, prioritas, pindah kategori, master data, input salah
```

Untuk mengulang data dari nol (menghapus semua data, **hanya untuk database development**):

```bash
npm run db:reset -w @praditacare/api
```

## 7. Merekam ulang video demo (opsional)

Butuh Playwright + Chromium (`npx playwright install chromium`) dan ffmpeg, dengan database yang baru di-seed:

```bash
DEMO_PACE=1.4 node docs/demo/record-demo.cjs demo-out
ffmpeg -i demo-out/demo.webm -c:v libx264 -crf 26 -pix_fmt yuv420p -movflags +faststart demo.mp4
```

## 8. Konfigurasi `.env`

| Variabel | Default | Keterangan |
| --- | --- | --- |
| `DATABASE_URL` | `mysql://root:root@localhost:3306/praditacare` | Koneksi MySQL |
| `JWT_SECRET` | (ganti) | Kunci tanda tangan token login |
| `JWT_EXPIRES_IN` | `8h` | Masa berlaku sesi |
| `UPLOAD_DIR` | `uploads` | Folder lampiran (relatif ke `apps/api`) |
| `MAX_UPLOAD_MB` | `5` | Ukuran maksimal per file |
| `PORT` | `4000` | Port API |
| `CORS_ORIGIN` | `http://localhost:5173` | Asal web yang diizinkan |

## 9. Masalah umum

| Gejala | Penyebab & solusi |
| --- | --- |
| `Can't reach database server` | MySQL belum menyala. Jalankan `docker compose up -d`, tunggu ±20 detik. |
| Login berhasil tapi halaman kosong / error modul `@praditacare/shared` | Jalankan `npm run build:shared` sekali. |
| "Tidak dapat terhubung ke server" di web | API (port 4000) belum jalan atau crash; lihat log `npm run dev`. |
| `Database sudah berisi data` saat seed | Seed hanya untuk database kosong; pakai `npm run db:reset -w @praditacare/api`. |
| Port 3306 sudah dipakai | Matikan MySQL lokal lain, atau ubah port di `docker-compose.yml` dan `DATABASE_URL`. |
