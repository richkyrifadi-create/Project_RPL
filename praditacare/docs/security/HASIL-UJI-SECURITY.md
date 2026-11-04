# Hasil Uji Security PraditaCare

Tanggal uji: 4 November 2026. Versi yang diuji: branch `main` setelah PR #4 (commit `40763fa`), lalu diuji ulang setelah perbaikan.

Dokumen ini berisi apa yang diuji, temuan, perbaikan yang dilakukan, dan risiko yang masih tersisa. Semua angka di bawah berasal dari perintah yang benar-benar dijalankan; outputnya ada di folder [`../verifikasi-fresh-clone/bukti/`](../verifikasi-fresh-clone/bukti/).

## 1. Ringkasan

| | Sebelum | Sesudah |
| --- | --- | --- |
| `npm audit` (semua dependency) | 13 temuan: 2 critical, 5 high, 6 moderate | 3 high, semuanya di Prisma CLI (lihat 4.1) |
| Rate limit login | tidak ada | 5 gagal per akun+IP dan 30 gagal per IP dalam 15 menit, lalu 429 |
| Header keamanan HTTP | tidak ada, `X-Powered-By: Express` terlihat | CSP, `nosniff`, `X-Frame-Options`, `Referrer-Policy`, HSTS di production |
| Cek isi file upload | hanya MIME dan ekstensi dari browser (bisa dipalsukan) | magic bytes JPG/PNG/PDF diperiksa di server |
| Log server | `console.error(err)` mentah, tanpa id request | log satu baris `key=value`, email disamarkan, token/password tidak pernah dicatat |
| Uji security otomatis | tidak ada | `docs/security/verify-security.mjs`: **39 PASS, 0 FAIL** |
| Unit test | 96 | **119 PASS** (23 baru untuk aturan security) |

## 2. Cara menguji

1. **Audit dependency**: `npm audit` sebelum dan sesudah perbaikan ([10-npm-audit-sebelum.txt](../verifikasi-fresh-clone/bukti/10-npm-audit-sebelum.txt), [10-npm-audit-sesudah.txt](../verifikasi-fresh-clone/bukti/10-npm-audit-sesudah.txt)).
2. **Review kode** bagian yang menerima input dari luar: login dan token (`middleware/Auth.ts`, `routes/AuthRoutes.ts`), validasi Zod (`packages/shared/src/validation`), upload (`middleware/Upload.ts`), unduh lampiran, penanganan error, konfigurasi `.env`.
3. **Uji serangan lewat HTTP** dengan skrip `docs/security/verify-security.mjs` terhadap server production yang baru di-deploy dari fresh clone: token palsu, `alg=none`, akses data orang lain (IDOR), peran yang salah, SQL injection, XSS, mass assignment, JSON rusak/besar, file palsu, path traversal nama file, brute force login.
4. **Unit test** untuk setiap aturan security baru (tidak butuh database).
5. **Cek log**: skrip verifikasi menghitung otomatis apakah log server memuat password, token JWT, nilai `JWT_SECRET`, atau email utuh. Hasilnya 0 untuk semuanya ([12-log-server-production.txt](../verifikasi-fresh-clone/bukti/12-log-server-production.txt), bagian akhir).

Menjalankan ulang uji security (server harus menyala, database baru di-seed):

```bash
cd praditacare
npm test                                   # termasuk unit test security
node docs/security/verify-security.mjs     # default http://localhost:4000/api, ubah dengan API_URL=...
npm audit
```

## 3. Temuan dan perbaikan

| ID | Area | Temuan | Risiko | Status dan perubahan |
| --- | --- | --- | --- | --- |
| S-01 | Dependency | 13 kerentanan dari `npm audit`, termasuk 2 critical (`vitest`/`tinypool`) dan high di `zod` (runtime, memvalidasi input pengguna) | Tinggi | **Diperbaiki sebagian**: zod 3→4, vitest 3→4, vite 5→6, react-router-dom 6→7, node-cron 3→4. Sisa 3 high di Prisma CLI (lihat 4.1). |
| S-02 | Login | Tidak ada batas percobaan login, password bisa ditebak terus-menerus (brute force) | Tinggi | **Diperbaiki**: `AttemptLimiter`. Setelah 5 kali gagal untuk akun+IP yang sama (atau 30 kali dari satu IP) dalam 15 menit, login dibalas `429` + header `Retry-After`. Hanya percobaan gagal yang dihitung. Ganti password juga dibatasi 5 kali salah. |
| S-03 | Login | Bila email tidak terdaftar, bcrypt dilewati sehingga respons jauh lebih cepat; penyerang bisa menebak email mana yang terdaftar dari waktu respons | Sedang | **Diperbaiki**: password tetap dibandingkan dengan hash tiruan, waktu respons sama (~70 ms, terlihat di log). Pesan error memang sudah sama sejak awal. |
| S-04 | HTTP | Tidak ada header keamanan; `X-Powered-By: Express` membocorkan teknologi server | Sedang | **Diperbaiki**: `helmet` (CSP `default-src 'self'`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: no-referrer`, HSTS hanya di production). |
| S-05 | Upload | Jenis file hanya dicek dari MIME type dan ekstensi yang dikirim browser. File HTML berisi `<script>` yang diganti nama menjadi `foto.png` diterima | Sedang | **Diperbaiki**: `IsFileContentValid` membaca 8 byte awal file (magic bytes) dan menolak bila isinya bukan JPG/PNG/PDF yang sesuai klaim. File kosong juga ditolak. |
| S-06 | Upload | Nama file asli disimpan apa adanya: bisa berisi `../`, karakter kontrol, atau lebih dari 255 karakter (membuat error 500 dari database) | Rendah | **Diperbaiki**: `SanitizeFileName` membuang path dan karakter berbahaya, memotong sampai 200 karakter dengan ekstensi tetap. File di disk selalu bernama UUID acak (sudah begitu sejak awal). |
| S-07 | Unduh lampiran | Cek path lampiran memakai `startsWith(uploads)` tanpa pemisah folder, sehingga folder bernama `uploads-lain` ikut lolos | Rendah | **Diperbaiki**: dicek terhadap `uploads` + pemisah folder. |
| S-08 | Input | Body JSON lebih dari 1 MB menghasilkan error 500 dan tercatat sebagai bug server | Rendah | **Diperbaiki**: dibalas `413 Data yang dikirim terlalu besar`. |
| S-09 | Token | Algoritma JWT tidak dikunci | Rendah | **Diperkuat**: token dibuat dan diverifikasi hanya dengan `HS256`. Token `alg=none` dan token dengan secret salah ditolak `401` (diuji). |
| S-10 | Secret | `JWT_SECRET` contoh dari `.env.example` bisa terbawa ke server sungguhan, sehingga siapa pun bisa membuat token admin | Tinggi (saat deploy) | **Diperbaiki**: dengan `NODE_ENV=production`, server menolak menyala bila `JWT_SECRET` masih nilai contoh, kurang dari 32 karakter, atau `CORS_ORIGIN='*'`. Di development hanya peringatan. `npm run gen:secret` membuat secret acak. |
| S-11 | Log | Error tak terduga dicetak mentah (`console.error(err)`), termasuk stack dan pesan Prisma yang memuat potongan kode; tidak ada id request; login gagal tidak tercatat | Sedang | **Diperbaiki**: modul `SafeLog`. Lihat [LOG-AMAN-DAN-ERROR.md](LOG-AMAN-DAN-ERROR.md). Error 500 mengembalikan `RequestId` agar laporan pengguna bisa dicocokkan dengan log. |
| S-12 | Ketersediaan | Database mati menghasilkan `500 Terjadi kesalahan pada server`, tidak bisa dibedakan dari bug | Rendah | **Diperbaiki**: kode Prisma P1001/P1002/P1008/P1017 dibalas `503` dengan pesan jelas dan log `db.unavailable`. |
| S-13 | Ketersediaan | Port 4000 sudah dipakai membuat server crash dengan stack trace panjang | Rendah | **Diperbaiki**: log `server.start_failed` dengan petunjuk perbaikan, keluar dengan kode 1. |

### Yang diuji dan sudah aman sejak awal (tidak diubah)

| Area | Hasil uji |
| --- | --- |
| Otorisasi peran | Mahasiswa ke `/users` dan `/dashboard` → 403; staf membuat unit → 403; mahasiswa mengubah status → 403. |
| Akses data orang lain (IDOR) | Siti membuka/mengomentari tiket Budi → 404; staf IT membuka tiket unit Sarpras → 404; Siti mengunduh lampiran Budi → 404. Pembatasan ada di `TicketScope` untuk setiap query. |
| SQL injection | Prisma memakai query berparameter; satu-satunya raw query memakai tagged template (`$executeRaw\`...\``), bukan string gabungan. `Keyword=' OR 1=1 --` tidak membocorkan tiket orang lain. |
| XSS | Tidak ada `dangerouslySetInnerHTML`; React meng-escape semua teks. Judul `<script>alert(1)</script>` tersimpan sebagai teks biasa. |
| Mass assignment | Skema Zod membuang field yang tidak dikenal: `Status: "CLOSED"` dan `ReporterId: 999` saat membuat tiket diabaikan. |
| Password | Disimpan sebagai hash bcrypt (cost 10), tidak pernah dikirim di respons (`/auth/me` dan `/users` dicek tidak memuat `PasswordHash`). |
| Secret di repo | `.env` ada di `.gitignore`, tidak pernah ada di riwayat git (`git log --all -- '*.env'` kosong), dan tidak ikut saat fresh clone ([01-fresh-clone.txt](../verifikasi-fresh-clone/bukti/01-fresh-clone.txt)). |
| CORS | Hanya origin dari `CORS_ORIGIN`. |
| Komentar internal | Tidak terlihat oleh mahasiswa (diuji di `verify-user-stories.mjs`). |

## 4. Risiko yang masih tersisa dan rekomendasi

1. **Prisma CLI (3 high, `deepmerge-ts`)**. Rantai `prisma` → `@prisma/config` → `deepmerge-ts`. Hanya dipakai oleh perintah `prisma generate` / `migrate` saat build dan deploy, dengan input dari file konfigurasi proyek sendiri, bukan dari pengguna aplikasi. Perbaikannya hanya tersedia di Prisma 7 yang mengubah cara koneksi database (driver adapter), sehingga **diterima sementara** dan dijadwalkan sebagai pekerjaan terpisah. Override `deepmerge-ts@8` sudah dicoba tetapi tidak didukung oleh `@prisma/config` 6.
2. **Token login disimpan di `localStorage`**. Bila suatu saat ada celah XSS, token bisa dicuri. Dikurangi oleh CSP dan React yang meng-escape teks. Alternatif ke depan: cookie `HttpOnly` + proteksi CSRF.
3. **Rate limit tersimpan di memori satu proses**. Cukup untuk satu server. Bila dijalankan lebih dari satu instance, pakai penyimpanan bersama (mis. Redis). Bila di belakang reverse proxy, isi `TRUST_PROXY=1` agar IP asli yang dihitung.
4. **HTTPS** harus disediakan oleh reverse proxy (Nginx, Caddy, atau layanan hosting). HSTS hanya berlaku lewat HTTPS.
5. **Akun seed** (`Pradita123!`) hanya untuk demo. Untuk server sungguhan jangan jalankan `db:seed`, atau segera ganti semua password.
6. **Token tidak bisa dicabut sebelum kedaluwarsa** (8 jam). Menonaktifkan akun tetap langsung memblokir akses karena status akun dicek setiap request.
7. **Lampiran tidak dipindai antivirus**. Risiko dikurangi oleh cek isi file, batas 5 MB, dan header `nosniff`.

## 5. Catatan perubahan (changelog) yang relevan

Semua perubahan ada di folder `praditacare/`.

**Dependency** (`package.json`, `apps/*/package.json`, `packages/shared/package.json`, `package-lock.json`)
- `zod` ^3.23.8 → ^4.6.7 (shared + api). Skema disesuaikan ke API Zod 4: `required_error`/`invalid_type_error`/`errorMap` diganti `error`, `z.ZodIssueCode.custom` diganti `"custom"`. Semua pesan validasi bahasa Indonesia tetap sama (unit test lama tetap lulus).
- `vitest` ^3.2.4 → ^4.1.12, `vite` ^5.4.11 → ^6.4.5, `react-router-dom` ^6.28.0 → ^7.18.5, `node-cron` ^3.0.3 → ^4.6.0 (`@types/node-cron` dihapus karena tipe sudah bawaan), tambah `helmet` ^8.

**API** (`apps/api/src`)
- Baru: `security/AttemptLimiter.ts`, `security/SafeLog.ts`, `security/ConfigChecks.ts`, `middleware/RequestLogger.ts`, masing-masing dengan unit test.
- `routes/AuthRoutes.ts`: rate limit login dan ganti password, hash tiruan, log `auth.*`.
- `middleware/Auth.ts`: JWT dikunci ke HS256.
- `middleware/Upload.ts`: `UploadFiles` sekarang dua tahap (terima file lalu cek isi), nama file dibersihkan, perbaikan cek path, batas jumlah field form.
- `middleware/ErrorHandler.ts`: 413 untuk body besar, 503 untuk database tidak terjangkau, `Retry-After` untuk 429, log aman + `RequestId` untuk 500.
- `App.ts`: `helmet`, request logger, `trust proxy`, dan di production menyajikan web hasil build (deploy satu port).
- `Config.ts`: `NODE_ENV`, `TRUST_PROXY`, `SERVE_WEB`, pemeriksaan secret saat start.
- `index.ts`, `jobs/AutoCloseJob.ts`: memakai log aman; log `server.start_failed` untuk port bentrok.

**Shared** (`packages/shared/src`)
- Baru: `rules/FileSignatureRules.ts` (`DetectFileType`, `IsFileContentValid`, `SanitizeFileName`) + unit test.
- `dto/ErrorResponse.ts`: field opsional `RequestId`.

**Konfigurasi dan skrip**
- `.env.example`: komentar penjelasan, `NODE_ENV`, `TRUST_PROXY`, `SERVE_WEB`.
- Skrip npm baru: `npm start` (deploy), `npm run gen:secret`, `npm run audit:prod`.
- Skrip uji baru: `docs/security/verify-security.mjs` (39 cek), `docs/verifikasi-fresh-clone/verify-fresh.sh` (verifikasi penuh dari fresh clone).
- `docs/e2e-test.mjs` kini bisa diarahkan dengan `API_URL`.
