# PraditaCare – Architecture Spec

## Tujuan dan stack

Bangun aplikasi web full-stack sederhana bernama **PraditaCare**: layanan bantuan dan pengaduan mahasiswa Universitas Pradita. Mahasiswa mengirim tiket (akademik, keuangan, fasilitas, IT, konseling), tiket diteruskan ke unit kampus yang tepat, staf unit menangani tiket sampai selesai, dan admin memantau beban kerja serta pemenuhan SLA lewat dashboard.

Stack:

- Frontend: React + TypeScript + Vite + Tailwind CSS
- Backend: Node.js + TypeScript + Express
- Database: MySQL
- ORM: Prisma
- API style: REST API
- Autentikasi: email + password, JWT (access token) dengan bcrypt untuk hash password
- Upload lampiran: Multer, disimpan di folder lokal `uploads/` (bisa diganti object storage nanti)
- Docker Compose untuk MySQL
- `.env.example` untuk `DATABASE_URL`, `JWT_SECRET`, `UPLOAD_DIR`, `MAX_UPLOAD_MB`

## Aturan kode

- Jangan menambah komentar kecuali benar-benar perlu.
- Gunakan PascalCase untuk semua class, type, interface, enum, komponen React, model database, DTO API, dan nama properti JSON.
- Variabel lokal boleh camelCase.
- Usahakan panjang baris kode di bawah 150 karakter.
- Struktur folder bersih dan sederhana.
- Ada tiga peran: `STUDENT`, `STAFF`, `ADMIN`. Setiap endpoint memeriksa peran lewat middleware, bukan di dalam handler.
- Validasi input request dengan Zod, skema validasi ditaruh di package shared agar dipakai frontend dan backend.
- Semua waktu disimpan dalam UTC dan ditampilkan dalam zona waktu `Asia/Jakarta`.

## Entitas utama

| Entitas | Field |
| --- | --- |
| Unit | Id, Code, Name, Email, IsActive, CreatedAt |
| User | Id, Name, Email, PasswordHash, Role, StudentNumber, StudyProgram, UnitId, IsActive, LastLoginAt, CreatedAt |
| Category | Id, UnitId, Name, Description, SlaHours, IsConfidential, IsActive, CreatedAt |
| Ticket | Id, TicketNumber, ReporterId, CategoryId, UnitId, AssigneeId, Title, Description, Priority, Status, IsAnonymous, DueAt, FirstResponseAt, ResolvedAt, ClosedAt, CreatedAt, UpdatedAt |
| TicketComment | Id, TicketId, AuthorId, Body, IsInternal, CreatedAt |
| TicketAttachment | Id, TicketId, CommentId, UploadedById, FileName, StoredPath, MimeType, SizeBytes, CreatedAt |
| TicketStatusHistory | Id, TicketId, FromStatus, ToStatus, ChangedById, Note, CreatedAt |
| TicketFeedback | Id, TicketId, Rating, Comment, CreatedAt |

Enum:

- `UserRole`: `STUDENT`, `STAFF`, `ADMIN`
- `TicketStatus`: `OPEN`, `IN_PROGRESS`, `WAITING_REPORTER`, `RESOLVED`, `CLOSED`, `REJECTED`
- `TicketPriority`: `LOW`, `MEDIUM`, `HIGH`, `URGENT`
- `SlaStatus` (dihitung, tidak disimpan): `ON_TRACK`, `AT_RISK`, `OVERDUE`, `MET`, `BREACHED`

Catatan relasi: `StudentNumber` dan `StudyProgram` hanya diisi untuk `STUDENT`, `UnitId` wajib untuk `STAFF`. `CommentId` pada lampiran boleh kosong bila lampiran dikirim bersama tiket awal.

## Aturan database

- `User.Email` unik, `User.StudentNumber` unik bila terisi, `Unit.Code` unik.
- `Ticket.TicketNumber` unik dengan format `PC-YYYY-NNNNNN` (contoh `PC-2026-000042`), nomor urut di-reset tiap tahun.
- `TicketFeedback.TicketId` unik: satu tiket hanya punya satu feedback, dengan `Rating` 1 sampai 5.
- Tiket tidak pernah dihapus. Pembatalan dilakukan dengan status `REJECTED` atau `CLOSED` beserta catatan.
- `TicketStatusHistory` bersifat append-only: tidak boleh diubah atau dihapus. Setiap perubahan status wajib menulis satu baris history dalam transaksi yang sama.
- Saat tiket dibuat, `UnitId` diisi dari `Category.UnitId` dan `DueAt` = `CreatedAt` + `Category.SlaHours`.
- `FirstResponseAt` diisi sekali, saat staf pertama kali menulis komentar non-internal atau mengubah status.
- `ResolvedAt` diisi saat status menjadi `RESOLVED`, `ClosedAt` saat menjadi `CLOSED` atau `REJECTED`.
- Unit, kategori, dan user tidak dihapus bila sudah dipakai tiket. Gunakan `IsActive = false`.
- Gunakan Prisma migration dan seed: 5 unit (Akademik, Keuangan, Sarana Prasarana, IT, Konseling), 8 kategori, 1 admin, 5 staf (satu per unit), 3 mahasiswa, dan 10 contoh tiket dengan status beragam.

## Fitur backend

1. Autentikasi
   - Login dengan email dan password, mengembalikan `AccessToken` dan profil `User`.
   - Endpoint profil saat ini dan ganti password.
   - Tidak ada registrasi mandiri. Akun dibuat admin atau lewat seed.
2. CRUD Unit dan Kategori (`ADMIN`)
   - Create, list, detail, update, nonaktifkan.
   - Kategori menentukan unit tujuan, `SlaHours`, dan apakah bersifat rahasia (`IsConfidential`).
3. Manajemen User (`ADMIN`)
   - Create, list dengan filter peran dan unit, update, nonaktifkan, reset password.
4. Tiket
   - `STUDENT` membuat tiket dengan judul, deskripsi, kategori, prioritas, opsi anonim, dan lampiran.
   - `STUDENT` hanya melihat tiket miliknya. `STAFF` melihat tiket unitnya. `ADMIN` melihat semua tiket.
   - Tiket kategori `IsConfidential` hanya terlihat oleh pelapor, staf yang ditugaskan, dan staf unit tersebut. Admin hanya melihat nomor, status, dan SLA, tanpa judul dan deskripsi.
   - Bila `IsAnonymous = true`, identitas pelapor disembunyikan dari staf dan admin di semua response.
   - List tiket mendukung filter status, prioritas, kategori, unit, assignee, rentang tanggal, kata kunci, dan pagination.
5. Penanganan tiket (`STAFF`, `ADMIN`)
   - Assign tiket ke staf di unit yang sama.
   - Ubah prioritas.
   - Ubah status sesuai alur di bawah, dengan catatan wajib untuk `REJECTED` dan `RESOLVED`.
   - Pindahkan tiket ke kategori atau unit lain (mengubah `UnitId`, `DueAt` tidak berubah).
6. Komentar dan lampiran
   - Pelapor dan staf bisa berkomentar. Staf bisa menandai komentar sebagai `IsInternal`, yang tidak pernah dikirim ke pelapor.
   - Lampiran: maksimal 5 file per unggahan, maksimal `MAX_UPLOAD_MB` per file, hanya JPG, PNG, PDF.
   - Unduh lampiran lewat endpoint yang memeriksa hak akses, bukan lewat folder statis.
   - Pelapor membalas tiket `WAITING_REPORTER` akan mengubah status kembali ke `IN_PROGRESS` secara otomatis.
7. Feedback
   - Pelapor memberi rating 1 sampai 5 dan komentar setelah tiket `RESOLVED`. Feedback menutup tiket (`CLOSED`).
   - Tiket `RESOLVED` tanpa feedback ditutup otomatis setelah 7 hari oleh job terjadwal (node-cron).
8. Dashboard API
   - Ringkasan: `TotalTickets`, `OpenTickets`, `InProgressTickets`, `ResolvedTickets`, `OverdueTickets`, `AverageFirstResponseHours`, `AverageResolutionHours`, `SlaComplianceRate`, `AverageRating`.
   - Per unit: `UnitId`, `UnitName`, `OpenTickets`, `OverdueTickets`, `SlaComplianceRate`, `AverageRating`.
   - Per kategori: `CategoryId`, `CategoryName`, `TicketCount`.
   - `STAFF` hanya menerima data unitnya. `ADMIN` menerima semua unit.
   - Mendukung filter rentang tanggal, default 30 hari terakhir.

Alur status yang diizinkan:

| Dari | Ke | Oleh |
| --- | --- | --- |
| `OPEN` | `IN_PROGRESS`, `REJECTED` | Staf, Admin |
| `IN_PROGRESS` | `WAITING_REPORTER`, `RESOLVED`, `REJECTED` | Staf, Admin |
| `WAITING_REPORTER` | `IN_PROGRESS` | Pelapor (lewat komentar), Staf |
| `RESOLVED` | `CLOSED` | Pelapor (feedback), sistem setelah 7 hari |
| `RESOLVED` | `IN_PROGRESS` | Pelapor (buka kembali dalam 7 hari) |

Aturan `SlaStatus`:

- `MET`: selesai (`ResolvedAt`) sebelum atau tepat `DueAt`
- `BREACHED`: selesai setelah `DueAt`
- `OVERDUE`: belum selesai dan sekarang melewati `DueAt`
- `AT_RISK`: belum selesai dan sisa waktu kurang dari 25% dari `SlaHours`
- `ON_TRACK`: belum selesai dan sisa waktu 25% atau lebih

## Halaman frontend

1. Login
   - Form email dan password, pesan error yang jelas, redirect sesuai peran.
2. Mahasiswa: Tiket Saya
   - Daftar tiket milik sendiri dengan nomor, judul, kategori, status, dan tanggal.
   - Tombol `Buat Tiket`.
3. Mahasiswa: Buat Tiket
   - Pilih kategori (tampilkan unit tujuan dan estimasi SLA), judul, deskripsi, prioritas, opsi kirim anonim, unggah lampiran.
   - Kategori rahasia menampilkan keterangan bahwa isi tiket hanya dilihat unit terkait.
4. Detail Tiket (semua peran, isi menyesuaikan hak akses)
   - Info tiket, status badge, SLA badge, sisa waktu atau keterlambatan.
   - Timeline gabungan komentar, lampiran, dan riwayat status.
   - Form komentar dengan lampiran. Staf melihat toggle `Catatan internal`.
   - Staf dan admin: aksi assign, ubah prioritas, ubah status, pindah kategori.
   - Pelapor: tombol `Buka Kembali` dan form rating setelah `RESOLVED`.
5. Staf: Antrian Tiket
   - Tab: `Belum Ditugaskan`, `Tugas Saya`, `Semua Tiket Unit`.
   - Tabel dengan filter, pencarian, urut berdasarkan `DueAt` terdekat secara default.
6. Dashboard (staf dan admin)
   - Filter rentang tanggal, admin bisa memilih unit.
   - Kartu ringkasan: total tiket, terbuka, diproses, selesai, terlambat, rata-rata respons pertama, rata-rata penyelesaian, kepatuhan SLA, rata-rata rating.
   - Tabel per unit dan tabel per kategori.
7. Admin: Manajemen Unit, Kategori, dan User
   - Tabel, form tambah dan edit, toggle aktif, reset password user.

Kebutuhan UI:

- Bahasa Indonesia untuk semua label, tombol, pesan, dan validasi.
- Layout bersih dan responsif. Halaman mahasiswa harus nyaman dipakai di ponsel.
- Gunakan tabel, kartu, badge, form, dialog konfirmasi sebelum aksi yang mengubah status, dan empty state.
- Warna badge status: `OPEN` biru, `IN_PROGRESS` kuning, `WAITING_REPORTER` ungu, `RESOLVED` hijau, `CLOSED` abu-abu, `REJECTED` merah.
- Warna badge SLA: `ON_TRACK` hijau, `AT_RISK` oranye, `OVERDUE` merah, `MET` hijau, `BREACHED` merah.
- Tidak ada chart di versi pertama.
- Tidak ada notifikasi email atau push di versi pertama. Tampilkan jumlah tiket yang butuh tindakan di navbar.

## Route API wajib

| Method | Route | Peran |
| --- | --- | --- |
| POST | `/api/auth/login` | Publik |
| GET | `/api/auth/me` | Semua |
| PUT | `/api/auth/password` | Semua |
| GET | `/api/units` | Semua |
| POST | `/api/units` | Admin |
| PUT | `/api/units/:Id` | Admin |
| GET | `/api/categories` | Semua |
| POST | `/api/categories` | Admin |
| PUT | `/api/categories/:Id` | Admin |
| GET | `/api/users` | Admin |
| POST | `/api/users` | Admin |
| PUT | `/api/users/:Id` | Admin |
| POST | `/api/users/:Id/reset-password` | Admin |
| GET | `/api/tickets` | Semua (terfilter hak akses) |
| POST | `/api/tickets` | Mahasiswa |
| GET | `/api/tickets/:Id` | Semua (terfilter hak akses) |
| PUT | `/api/tickets/:Id/assign` | Staf, Admin |
| PUT | `/api/tickets/:Id/priority` | Staf, Admin |
| PUT | `/api/tickets/:Id/status` | Staf, Admin |
| PUT | `/api/tickets/:Id/category` | Staf, Admin |
| POST | `/api/tickets/:Id/reopen` | Mahasiswa (pelapor) |
| GET | `/api/tickets/:Id/comments` | Semua (terfilter hak akses) |
| POST | `/api/tickets/:Id/comments` | Semua (terfilter hak akses) |
| POST | `/api/tickets/:Id/attachments` | Semua (terfilter hak akses) |
| GET | `/api/attachments/:Id/download` | Semua (terfilter hak akses) |
| GET | `/api/tickets/:Id/history` | Semua (terfilter hak akses) |
| POST | `/api/tickets/:Id/feedback` | Mahasiswa (pelapor) |
| GET | `/api/dashboard` | Staf, Admin |
| GET | `/api/dashboard/action-count` | Semua |

Semua error memakai bentuk `{ "Message": string, "Errors"?: Record<string, string[]> }` dengan status HTTP yang sesuai (400, 401, 403, 404, 409, 413, 422).

## Deliverable dan struktur proyek

Deliverable:

- Source code frontend dan backend lengkap.
- Prisma schema, migration, dan seed data.
- Docker Compose untuk MySQL.
- `.env.example`.
- README berisi instalasi, migrasi database, seed, menjalankan frontend dan backend, penggunaan Docker, daftar akun seed per peran, dan konfigurasi upload.
- Pastikan aplikasi berhasil di-build dan alur dasar berjalan: login tiap peran, buat tiket, assign, komentar, ubah status, feedback, dan dashboard.

Struktur proyek (monorepo TypeScript dengan npm workspaces):

```text
praditacare/
  apps/
    web/
    api/
  packages/
    shared/
```

Kebutuhan shared package:

- Buat `packages/shared` sebagai `@praditacare/shared`.
- Simpan semua model domain, enum, tipe response API, skema validasi Zod, dan konstanta bersama di sini.
- `apps/web` dan `apps/api` wajib mengimpor tipe bersama dari package ini.
- Jangan menduplikasi definisi model domain antara frontend dan backend.

Contoh file shared:

```text
packages/shared/src/
  models/
    User.ts
    Unit.ts
    Category.ts
    Ticket.ts
    TicketComment.ts
    TicketAttachment.ts
    TicketStatusHistory.ts
    TicketFeedback.ts
  enums/
    UserRole.ts
    TicketStatus.ts
    TicketPriority.ts
    SlaStatus.ts
  dto/
    LoginRequest.ts
    LoginResponse.ts
    CreateTicketRequest.ts
    TicketListQuery.ts
    PagedResponse.ts
    DashboardResponse.ts
    ErrorResponse.ts
  validation/
    TicketSchemas.ts
    UserSchemas.ts
  constants/
    TicketStatusTransitions.ts
    UploadLimits.ts
  utils/
    GetSlaStatus.ts
  index.ts
```

Aturan model:

- Definisikan interface atau type TypeScript bersama hanya sekali di `packages/shared`.
- Contoh: `Ticket`, `TicketStatus`, `SlaStatus`, dan `TicketStatusTransitions` diimpor frontend dan backend dari `@praditacare/shared`.
- `GetSlaStatus` dipakai backend untuk dashboard dan frontend untuk badge, agar aturannya hanya ada di satu tempat.
- Model Prisma tetap di backend karena spesifik database.
- Backend memetakan entitas Prisma ke model API bersama sebelum mengirim response, termasuk menghapus `PasswordHash`, identitas pelapor anonim, dan komentar internal sesuai peran.
- Frontend tidak boleh mengimpor tipe Prisma.
- Konfigurasikan TypeScript paths, dependensi workspace, script build, dan script development agar semua package berhasil dikompilasi.
