# PraditaCare: Penjelasan Komponen, Alur Data, dan Log Perbaikan

Catatan jujur soal proses: tugas meminta Gemini untuk generate kode. Kode di repositori ini dibuat oleh Claude (bukan Gemini) langsung dari `ARCHITECTURE.md`, lalu dijalankan, diuji, dan diperbaiki. Proses studi struktur, menjalankan, mencari penyebab error, memperbaiki, dan menguji ulang tetap dilakukan dan dicatat di bagian akhir.

## 1. Gambaran besar

```text
Browser (React, :5173)
   │  fetch /api/... + header Authorization: Bearer <JWT>
   ▼
Vite dev proxy ──► Express API (:4000)
                     │  middleware: CORS → JSON → Authenticate → RequireRole → Multer → ValidateBody (Zod)
                     │  route handler → service (TicketService, Mappers)
                     ▼
                  Prisma Client ──► MySQL/MariaDB (tabel Unit, User, Category, Ticket, ...)
                     │
                     └─► folder uploads/ (file lampiran)

packages/shared (@praditacare/shared) dipakai di KEDUA sisi:
   tipe model, enum, skema Zod, aturan transisi status, GetSlaStatus, label Bahasa Indonesia
```

## 2. Komponen

### packages/shared
| File | Fungsi |
| --- | --- |
| `enums/*` | Daftar nilai `UserRole`, `TicketStatus`, `TicketPriority`, `SlaStatus` sebagai array `as const` plus tipe. |
| `models/*` | Bentuk JSON yang dikirim API (PascalCase). Ini kontrak antara backend dan frontend. Tidak ada `PasswordHash`. |
| `dto/*` | Bentuk request/response: `LoginResponse`, `PagedResponse<T>`, `DashboardResponse`, `ErrorResponse`. |
| `validation/*` | Skema Zod. Backend memakainya di middleware `ValidateBody`; frontend memakainya untuk validasi form sebelum kirim. Pesan error berbahasa Indonesia. |
| `constants/TicketStatusTransitions.ts` | Tabel alur status yang boleh dilakukan staf/admin, status yang wajib catatan, batas 7 hari. |
| `utils/GetSlaStatus.ts` | Satu-satunya tempat aturan SLA (ON_TRACK, AT_RISK, OVERDUE, MET, BREACHED). Dipakai backend (response & dashboard) dan frontend (badge, teks sisa waktu). |
| `utils/FormatDate.ts` | Menampilkan waktu UTC dalam zona `Asia/Jakarta`. |

### apps/api
| Bagian | Fungsi |
| --- | --- |
| `prisma/schema.prisma` | Model database. Nama field PascalCase sama dengan JSON. Index untuk filter umum (UnitId+Status, DueAt). |
| `prisma/migrations` | SQL migration hasil `prisma migrate dev`. |
| `prisma/seed.ts` | Data contoh. Timeline tiket (history, komentar, feedback) dibuat konsisten dengan waktu mundur dari sekarang. |
| `middleware/Auth.ts` | `Authenticate` memverifikasi JWT dan memuat user aktif ke `req.AuthUser`. `RequireRole(...)` menolak peran yang tidak cocok (403). Pengecekan peran tidak ada di handler. |
| `middleware/Validate.ts` | Menjalankan skema Zod pada body; gagal → `ZodError` → 422. |
| `middleware/Upload.ts` | Multer: simpan ke `uploads/YYYY/MM/<uuid>.ext`, filter JPG/PNG/PDF, batas ukuran & jumlah. |
| `middleware/ErrorHandler.ts` | Mengubah semua error ke format `{ Message, Errors? }` dengan status 400/401/403/404/409/413/422, dan menghapus file yang sudah terunggah bila request gagal. |
| `services/TicketService.ts` | `TicketScope` (filter hak akses per peran), `LoadTicket`, `NextTicketNumber`, `ApplyStatusChange` (ubah status + tulis history dalam satu transaksi). |
| `services/Mappers.ts` | Mengubah entitas Prisma ke model shared sambil menyaring data: sembunyikan pelapor anonim, sembunyikan judul/deskripsi tiket rahasia dari admin. |
| `routes/*` | Satu file per resource: Auth, Unit, Category, User, Ticket, Attachment, Dashboard. |
| `jobs/AutoCloseJob.ts` | node-cron tiap jam menutup tiket RESOLVED tanpa feedback > 7 hari. |

### apps/web
| Bagian | Fungsi |
| --- | --- |
| `api/Client.ts` | Wrapper `fetch`: menambahkan token, mengubah error API menjadi `ApiError` (berisi `Errors` per field), logout otomatis saat 401, unduh lampiran sebagai blob. |
| `auth/AuthContext.tsx` | Menyimpan user login dan token (localStorage), `Login`, `Logout`, redirect sesuai peran. |
| `App.tsx` | Routing + guard `RequireRole` di sisi UI (backend tetap memeriksa ulang). |
| `components/Layout.tsx` | Navbar per peran + badge "Perlu tindakan" dari `/api/dashboard/action-count`. Menu hamburger di ponsel. |
| `components/Badges.tsx` | Badge status & SLA dengan warna sesuai spesifikasi. |
| `components/Ui.tsx` | Modal, ConfirmDialog, EmptyState, Alert, Pagination, StatCard. |
| `pages/*` | Login, Tiket Saya, Buat Tiket, Detail Tiket, Antrian Staf, Dashboard, Admin Unit/Kategori/User, Akun (ganti password). |

## 3. Data yang mengalir: contoh alur lengkap

**a. Login**
1. Form mengirim `{ Email, Password }` → validasi `LoginSchema` di browser.
2. `POST /api/auth/login` → `ValidateBody(LoginSchema)` → cari user, `bcrypt.compare` → update `LastLoginAt`.
3. Response `{ AccessToken, User }`. Token disimpan di localStorage, user diarahkan: mahasiswa ke Tiket Saya, staf ke Antrian, admin ke Dashboard.

**b. Mahasiswa membuat tiket**
1. Halaman Buat Tiket memuat `GET /api/categories` → menampilkan unit tujuan & estimasi SLA; kategori rahasia memunculkan keterangan.
2. Form dikirim sebagai `multipart/form-data` (`Title, Description, CategoryId, Priority, IsAnonymous, Files[]`).
3. API: `Authenticate` → `RequireRole("STUDENT")` → Multer menyimpan file → `ValidateBody(CreateTicketSchema)` (string "true"/"3" dikonversi ke boolean/angka).
4. Dalam satu transaksi: nomor `PC-2026-000011` dari `TicketSequence`, `UnitId` = `Category.UnitId`, `DueAt` = sekarang + `SlaHours`, baris history `null → OPEN`, baris lampiran.
5. Response model `Ticket` → browser pindah ke halaman detail.

**c. Staf menangani**
1. Antrian: `GET /api/tickets?AssigneeId=none&ActiveOnly=true&SortBy=DueAt` → `TicketScope` membatasi ke unit staf.
2. Klik "Diproses" → dialog konfirmasi → `PUT /api/tickets/:Id/status` → cek `CanTransition` → `ApplyStatusChange` mengisi `FirstResponseAt` (sekali) dan menulis history. Bila belum ada petugas, staf otomatis jadi petugas.
3. Komentar: `POST /api/tickets/:Id/comments`. Bila `IsInternal`, komentar tidak pernah dikirim ke mahasiswa (difilter di query).
4. "Menunggu Pelapor" → mahasiswa membalas → status otomatis kembali `IN_PROGRESS`.
5. "Selesai" wajib catatan → `ResolvedAt` diisi.

**d. Mahasiswa menutup**
- Feedback `POST /api/tickets/:Id/feedback` (rating 1–5) → buat `TicketFeedback` + status `CLOSED` dalam satu transaksi.
- Atau "Buka Kembali" dalam 7 hari → `IN_PROGRESS`, `ResolvedAt` dikosongkan.
- Tanpa tindakan 7 hari → job auto-close menutup tiket, history dicatat oleh "Sistem".

**e. Dashboard**
- `GET /api/dashboard?From&To&UnitId` → ambil tiket dalam rentang (default 30 hari) → hitung `GetSlaStatus` per tiket → ringkasan, per unit, per kategori. Staf dipaksa ke unitnya sendiri.

### Aturan privasi yang diterapkan di Mappers
| Kasus | Mahasiswa pelapor | Staf unit | Admin |
| --- | --- | --- | --- |
| Tiket anonim | Lihat nama sendiri | "Anonim" | "Anonim" |
| Tiket kategori rahasia | Lihat semua | Lihat semua | Hanya nomor, status, SLA (judul, deskripsi, komentar, lampiran disembunyikan) |
| Komentar internal | Tidak pernah dikirim | Terlihat | Terlihat |

## 4. Log menjalankan, error, dan perbaikan

| # | Gejala / masalah | Penyebab | Perbaikan |
| --- | --- | --- | --- |
| 1 | `docker compose up` tidak bisa dipakai di lingkungan uji | Docker client ada tetapi daemon tidak berjalan | Memasang MariaDB 10.11 (kompatibel MySQL) secara lokal, membuat database `praditacare` dan user root berpassword. `docker-compose.yml` tetap disediakan untuk dipakai di laptop. |
| 2 | Staf tidak punya cara mengisi dropdown "Petugas" | Spesifikasi membatasi `GET /api/users` hanya untuk Admin | Menambah `GET /api/tickets/:Id/assignees` (Staf, Admin) yang mengembalikan staf aktif di unit tiket. |
| 3 | Risiko nomor tiket kembar saat dua tiket dibuat bersamaan | Menghitung `COUNT(*)+1` tidak atomik | Tabel `TicketSequence` + `INSERT ... ON DUPLICATE KEY UPDATE LastNumber = LastNumber + 1` di dalam transaksi pembuatan tiket. |
| 4 | Form multipart mengirim `"true"` dan `"3"` sebagai string sehingga Zod menolak | `FormData` selalu string | Skema shared memakai `BooleanLike` (preprocess) dan `z.coerce.number()`. |
| 5 | File tetap tertinggal di `uploads/` ketika validasi gagal setelah upload | Multer menyimpan file sebelum handler berjalan | `ErrorHandler` menghapus `req.files` di setiap error. |
| 6 | Uji end-to-end: 1 dari 42 cek gagal ("riwayat 7 baris") | Ekspektasi di skrip uji salah; alurnya memang menghasilkan 8 baris (ada buka kembali lalu selesai lagi) | Membetulkan ekspektasi skrip uji menjadi 8; hasil akhir 42/42 lulus. |
| 7 | `prisma migrate reset` ditolak saat dijalankan agen AI | Prisma 6 memblokir reset database oleh agen tanpa persetujuan user | Tidak di-reset. Database dibiarkan apa adanya (data seed + 1 tiket hasil uji). Perintah `db:reset` tetap tersedia untuk dijalankan manual. |
| 8 | Setelah uji job auto-close, rata-rata penyelesaian di dashboard janggal | Saat menguji, `ResolvedAt` satu tiket dimundurkan 8 hari (lebih awal dari `CreatedAt`) | Mengembalikan `ResolvedAt` ke `CreatedAt + 20 jam`. Job terbukti menutup 1 tiket dan menulis history "Sistem". |

Hasil akhir yang sudah diverifikasi:
- `npm run build` sukses untuk shared, api, dan web (TypeScript strict, tanpa error).
- API berjalan, migration & seed sukses, 42 cek end-to-end lulus (login tiap peran, buat tiket + lampiran, tolak file .txt, hak akses, assign, transisi ilegal ditolak, komentar internal, balasan pelapor, resolve, buka kembali, feedback, rahasia/anonim, dashboard).
- UI tampil di desktop dan ponsel, tanpa error di console browser (lihat folder `screenshots/`).
