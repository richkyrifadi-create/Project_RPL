# PraditaCare

Layanan bantuan dan pengaduan mahasiswa Universitas Pradita. Mahasiswa mengirim tiket, tiket diteruskan otomatis ke unit kampus sesuai kategori, staf menangani sampai selesai, dan admin memantau SLA lewat dashboard.

Stack: React + TypeScript + Vite + Tailwind (web), Node.js + Express + TypeScript (api), MySQL + Prisma, Zod di package bersama `@praditacare/shared`, monorepo npm workspaces.

```text
praditacare/
  apps/api        Express REST API, Prisma schema, migration, seed, job auto-close
  apps/web        React SPA (Vite)
  packages/shared Model domain, enum, DTO, skema Zod, konstanta, GetSlaStatus
```

## Prasyarat

- Node.js 20.6+ (dipakai untuk `--env-file`), npm 10+
- MySQL 8 (lewat Docker Compose) atau MariaDB 10.11+

## Instalasi

```bash
cp .env.example .env          # sesuaikan DATABASE_URL dan JWT_SECRET
docker compose up -d          # menjalankan MySQL di port 3306 (user root / root, database praditacare)
npm install
npm run build:shared          # wajib sekali sebelum api/web, karena keduanya mengimpor dist shared
npm run db:deploy             # menerapkan migration Prisma (pakai db:migrate saat mengubah schema)
npm run db:seed               # isi data contoh
```

## Menjalankan (development)

```bash
npm run dev        # shared (watch) + api :4000 + web :5173 sekaligus
# atau terpisah:
npm run dev:api
npm run dev:web
```

Buka http://localhost:5173. Vite mem-proxy `/api` ke `http://localhost:4000`.

## MVP v1 (Pertemuan 5)

Dua fitur inti yang ditambahkan secara iteratif (lokasi laporan dan dashboard lokasi paling sering bermasalah), lengkap dengan brief, acceptance criteria, bukti verifikasi, dan skrip demo: [docs/mvp-v1/README.md](docs/mvp-v1/README.md).

## Unit test

```bash
npm test           # menjalankan semua unit test (Vitest), tidak butuh database
npm run test:watch # mode watch saat mengembangkan
```

File test berada di samping kode yang diuji (`*.test.ts`) di `packages/shared/src` dan `apps/api/src`.

Build produksi: `npm run build`, lalu `npm run start -w @praditacare/api` dan sajikan `apps/web/dist` sebagai file statis.

## Akun seed

Password semua akun: `Pradita123!`

| Peran | Email |
| --- | --- |
| Admin | admin@pradita.ac.id |
| Staf Akademik | staf.akademik@pradita.ac.id |
| Staf Keuangan | staf.keuangan@pradita.ac.id |
| Staf Sarana Prasarana | staf.sarpras@pradita.ac.id |
| Staf IT | staf.it@pradita.ac.id |
| Staf Konseling | staf.konseling@pradita.ac.id |
| Mahasiswa | budi@student.pradita.ac.id, siti@student.pradita.ac.id, andi@student.pradita.ac.id |

Seed berisi 5 unit, 8 kategori (Konseling Pribadi bersifat rahasia), dan 13 tiket dengan status beragam (sebagian laporan fasilitas berisi lokasi). Seed dilewati bila database sudah berisi data; untuk mengulang dari nol jalankan `npm run db:reset -w @praditacare/api` (menghapus semua data, hanya untuk database development).

## Upload lampiran

- `UPLOAD_DIR` (default `uploads`, relatif terhadap `apps/api`) dan `MAX_UPLOAD_MB` (default 5) diatur di `.env`.
- Maksimal 5 file per unggahan, hanya JPG, PNG, PDF.
- File tidak disajikan sebagai folder statis. Unduh lewat `GET /api/attachments/:Id/download` yang memeriksa hak akses.

## Job terjadwal

Tiket `RESOLVED` tanpa feedback ditutup otomatis setelah 7 hari. Job berjalan tiap jam (node-cron) saat API hidup, dan bisa dipicu manual dengan `npm run job:auto-close -w @praditacare/api`.

## Catatan

- Dokumentasi komponen, alur data, dan log perbaikan ada di `docs/PENJELASAN.md`.
- Endpoint tambahan di luar daftar wajib: `GET /api/tickets/:Id/assignees` (daftar staf unit untuk dropdown assign, karena `/api/users` khusus admin) dan `GET /api/health`.
- Tabel tambahan `TicketSequence` menyimpan nomor urut tiket per tahun agar format `PC-YYYY-NNNNNN` aman dari tabrakan.
