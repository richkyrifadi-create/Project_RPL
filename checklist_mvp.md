# Checklist Fitur MVP PraditaCare

Tanggal uji: 3 November 2026 · Kode: folder [`praditacare/`](praditacare/) · Spesifikasi: [`Dok_Arsitektur.md`](Dok_Arsitektur.md) · Cara menjalankan: [`HowToRun.md`](HowToRun.md) · Video: [`demo.mp4`](demo.mp4)

## Ringkasan hasil pengujian

| Jenis uji | Perintah | Hasil |
| --- | --- | --- |
| Unit test (Vitest, 15 file) | `npm test` | **PASSED** 119/119 (4 Nov: +23 test security) |
| Typecheck + build (shared, api, web) | `npm run typecheck`, `npm run build` | **PASSED** 0 error |
| E2E API (alur lengkap semua peran) | `node docs/e2e-test.mjs` | **PASSED** 42/42 |
| Verifikasi Fitur 1 Lokasi laporan | `node docs/mvp-v1/verify-fitur-1.mjs` | **PASSED** 13/13 |
| Verifikasi Fitur 2 Lokasi rawan | `node docs/mvp-v1/verify-fitur-2.mjs` | **PASSED** 13/13 |
| Verifikasi 5 user story | `node docs/mvp-penyempurnaan/verify-user-stories.mjs` | **PASSED** 29/29 |
| UI: input salah, kosong, loading, gagal (browser) | `node docs/demo/verify-ui-states.cjs` | **PASSED** 18/18 |
| Cek tambahan (password, prioritas, pindah kategori, master data, input tidak valid) | `node docs/mvp-final/verify-tambahan.mjs` | **PASSED** 20/20 |
| Uji security lewat HTTP (4 Nov) | `node docs/security/verify-security.mjs` | **PASSED** 39/39 |
| Fresh clone → install → test → build → deploy → regresi (4 Nov) | `bash docs/verifikasi-fresh-clone/verify-fresh.sh` | **PASSED**, bukti di [`verifikasi-fresh-clone/`](praditacare/docs/verifikasi-fresh-clone/RINGKASAN.md) |
| Demo alur lengkap di browser | `node docs/demo/record-demo.cjs` → `demo.mp4` | **PASSED** (berjalan tanpa error) |

Log lengkap tiap pengujian ada di [`praditacare/docs/mvp-final/bukti/`](praditacare/docs/mvp-final/bukti/). Skrip E2E dan verifikasi dijalankan masing-masing pada database yang baru di-seed.

## Daftar fitur MVP dan status pengujian

Kolom **Unit test** menunjuk file `*.test.ts`; kolom **Uji integrasi/E2E** menunjuk skrip yang menguji fitur lewat API atau browser sungguhan.

### A. Autentikasi & akun

| # | Fitur | Unit test | Uji integrasi / E2E | Status |
| --- | --- | --- | --- | --- |
| A1 | Login email + password, redirect sesuai peran | `validation/LoginSchema.test.ts` | e2e "login semua peran"; demo | PASSED |
| A2 | Login salah / kosong / server mati ditampilkan dengan pesan jelas | `LoginSchema.test.ts` | e2e "login salah -> 401"; ui-state 3 cek | PASSED |
| A3 | Endpoint tanpa token / token kedaluwarsa → 401, kembali ke login | - | e2e "tanpa token -> 401" | PASSED |
| A4 | Hak akses per peran (mahasiswa tidak bisa akses admin/dashboard) | - | e2e "mahasiswa akses /users -> 403", "akses dashboard -> 403" | PASSED |
| A5 | Ganti password (halaman Akun), password lama salah / terlalu pendek ditolak | - | verify-tambahan 4 cek | PASSED |

### B. Laporan / tiket (mahasiswa)

| # | Fitur | Unit test | Uji integrasi / E2E | Status |
| --- | --- | --- | --- | --- |
| B1 | Buat tiket: kategori, judul, deskripsi, prioritas, anonim | `rules/TicketCreationRules.test.ts` | e2e "buat tiket + lampiran -> 201"; demo | PASSED |
| B2 | Unit tujuan otomatis dari kategori | `TicketCreationRules.test.ts` (US1 CheckNewTicket) | e2e "unit otomatis dari kategori"; user-story US1 | PASSED |
| B3 | Batas SLA (DueAt) = waktu buat + SLA kategori | `TicketCreationRules.test.ts` (CalculateDueAt) | e2e "DueAt = CreatedAt + SLA" | PASSED |
| B4 | Nomor tiket `PC-YYYY-NNNNNN` berurutan | `TicketCreationRules.test.ts` (FormatTicketNumber) | e2e "nomor tiket format" | PASSED |
| B5 | Lokasi wajib untuk kategori fasilitas | `utils/TicketLocation.test.ts` | verify-fitur-1 13 cek; demo | PASSED |
| B6 | Lampiran JPG/PNG/PDF, maks 5 file × 5 MB, file kosong ditolak | `rules/UploadRules.test.ts` | e2e "lampiran .txt ditolak -> 400"; ui-state 2 cek; uji 6 MB → 413 | PASSED |
| B7 | Validasi form (field wajib, panjang minimal) | `TicketLocation.test.ts`, `TicketCreationRules.test.ts` | e2e "validasi gagal -> 422"; demo | PASSED |
| B8 | Tiket Saya: daftar tiket sendiri + filter status + pagination | - | e2e "filter+keyword+pagination"; ui-state empty & loading | PASSED |
| B9 | Mahasiswa hanya melihat tiketnya sendiri | - | e2e "mahasiswa lain tidak bisa lihat -> 404" | PASSED |

### C. Penanganan tiket (staf & admin)

| # | Fitur | Unit test | Uji integrasi / E2E | Status |
| --- | --- | --- | --- | --- |
| C1 | Antrian: tab Belum Ditugaskan / Tugas Saya / Semua, filter, cari, urut SLA | - | e2e "filter+keyword+pagination"; demo | PASSED |
| C2 | Staf hanya melihat tiket unitnya | - | e2e "staf unit lain tidak bisa lihat -> 404" | PASSED |
| C3 | Alur status sesuai tabel (transisi ilegal ditolak 409) | `constants/TicketStatusTransitions.test.ts`, `rules/StatusChangeRules.test.ts` | e2e "transisi ilegal -> 409"; user-story US2 | PASSED |
| C4 | Catatan wajib untuk Selesai, Ditolak, Menunggu Pelapor | `StatusChangeRules.test.ts` (catatan wajib) | e2e "RESOLVED tanpa catatan -> 422"; demo | PASSED |
| C5 | Petugas otomatis saat staf memproses; assign hanya staf unit sama | `StatusChangeRules.test.ts` (petugas otomatis, CheckAssignee) | e2e "assign ke staf unit lain -> 422" | PASSED |
| C6 | Waktu respons pertama, selesai, tutup tercatat | `StatusChangeRules.test.ts` (StatusTimestampsFor), `ReporterInteractionRules.test.ts` | e2e "IN_PROGRESS -> RESOLVED + ResolvedAt" | PASSED |
| C7 | Ubah prioritas, pindah kategori/unit (DueAt tetap) dengan dialog konfirmasi | - | verify-tambahan 5 cek; demo (dialog konfirmasi) | PASSED |
| C8 | Badge status & SLA (Sesuai Jadwal, Berisiko, Terlambat, Terpenuhi, Terlewat) | `utils/GetSlaStatus.test.ts` | demo | PASSED |

### D. Komentar, lampiran, riwayat

| # | Fitur | Unit test | Uji integrasi / E2E | Status |
| --- | --- | --- | --- | --- |
| D1 | Komentar pelapor & staf, timeline gabungan komentar + riwayat status | - | e2e "riwayat status lengkap"; demo | PASSED |
| D2 | Catatan internal tidak pernah terkirim ke pelapor | `rules/PrivacyRules.test.ts` (komentar internal), `ReporterInteractionRules.test.ts` | e2e "komentar internal tidak terkirim ke pelapor", "mahasiswa tidak bisa buat komentar internal" | PASSED |
| D3 | Balasan pelapor saat Menunggu Pelapor → otomatis Diproses | `ReporterInteractionRules.test.ts` (ShouldResumeAfterReply) | e2e "balasan pelapor -> otomatis IN_PROGRESS"; demo | PASSED |
| D4 | Tiket Ditutup/Ditolak tidak bisa dikomentari | `ReporterInteractionRules.test.ts` (CanComment) | e2e "komentar di tiket CLOSED -> 409" | PASSED |
| D5 | Unduh lampiran lewat endpoint berhak akses (bukan folder statis) | - | e2e "unduh lampiran oleh staf -> 200", "oleh mahasiswa lain -> 404" | PASSED |

### E. Penyelesaian & penilaian

| # | Fitur | Unit test | Uji integrasi / E2E | Status |
| --- | --- | --- | --- | --- |
| E1 | Buka kembali tiket Selesai (≤ 7 hari) | `ReporterInteractionRules.test.ts` (CanReopen) | e2e "pelapor buka kembali -> IN_PROGRESS" | PASSED |
| E2 | Rating 1–5 menutup tiket, hanya sekali | `rules/FeedbackRules.test.ts` (CanGiveFeedback) | e2e "feedback -> CLOSED", "feedback kedua -> 409", "rating 6 -> 422"; demo | PASSED |
| E3 | Rating 1–2 wajib alasan | `FeedbackRules.test.ts` (ValidateFeedbackComment) | user-story US4; demo | PASSED |
| E4 | Tutup otomatis tiket Selesai > 7 hari tanpa rating (job terjadwal) | `FeedbackRules.test.ts` (Tutup otomatis) | user-story US4 auto-close | PASSED |

### F. Privasi

| # | Fitur | Unit test | Uji integrasi / E2E | Status |
| --- | --- | --- | --- | --- |
| F1 | Pelapor anonim tampil "Anonim" bagi staf & admin | `PrivacyRules.test.ts` (pelapor anonim) | e2e "staf konseling: anonim -> nama disembunyikan", "pelapor sendiri melihat namanya" | PASSED |
| F2 | Kategori rahasia: admin hanya lihat nomor, status, SLA | `PrivacyRules.test.ts` (kategori rahasia) | e2e "admin: tiket rahasia tanpa judul/deskripsi", "admin: komentar tiket rahasia -> 403" | PASSED |

### G. Dashboard

| # | Fitur | Unit test | Uji integrasi / E2E | Status |
| --- | --- | --- | --- | --- |
| G1 | Kartu ringkasan (total, terbuka, diproses, selesai, terlambat, rata-rata respons & penyelesaian, kepatuhan SLA, rating) | `GetSlaStatus.test.ts` | e2e "dashboard admin semua unit"; demo | PASSED |
| G2 | Tabel per unit & per kategori, filter tanggal & unit | - | e2e "dashboard staf hanya unitnya" | PASSED |
| G3 | Lokasi paling sering bermasalah (top 5) | `utils/LocationHotspots.test.ts` | verify-fitur-2 13 cek; demo | PASSED |
| G4 | Jumlah tiket "Perlu tindakan" di navbar | - | e2e "action-count mahasiswa"; demo | PASSED |

### H. Admin: master data

| # | Fitur | Unit test | Uji integrasi / E2E | Status |
| --- | --- | --- | --- | --- |
| H1 | Manajemen unit: tambah, edit, nonaktifkan | - | e2e (seed & akses admin); ui-state (gagal muat + coba lagi); demo | PASSED |
| H2 | Manajemen kategori: unit tujuan, SLA, rahasia, wajib lokasi, nonaktifkan | - | verify-tambahan (nonaktif/aktif, SLA 0 ditolak); ui-state; demo | PASSED |
| H3 | Manajemen user: filter peran/unit, tambah, edit, nonaktifkan, reset password | - | verify-tambahan (reset password); ui-state (gagal muat, hasil kosong); demo | PASSED |

### I. Penanganan state UI (diselesaikan di tahap ini)

| # | Kondisi | Unit test | Uji integrasi / E2E | Status |
| --- | --- | --- | --- | --- |
| I1 | Loading: spinner "Memuat..." selama data diambil | - | ui-state "respons lambat -> spinner" | PASSED |
| I2 | Data kosong: empty state di Tiket Saya, Antrian, Dashboard, Unit, Kategori, User, Buat Tiket (tanpa kategori aktif) | - | ui-state "tiket saya kosong", "/admin/user tanpa hasil" | PASSED |
| I3 | Gagal memuat: pesan error + tombol **Coba lagi** (sebelumnya halaman admin dan Buat Tiket berputar selamanya) | - | ui-state 9 cek (buat tiket, detail, unit, kategori, user, dashboard) | PASSED |
| I4 | Gagal aksi (nonaktifkan, reset password, unduh lampiran) menampilkan pesan, tidak diam | - | typecheck + tinjauan kode (belum ada skrip browser khusus) | PASSED (tinjauan) |
| I5 | Server tidak terjangkau → "Tidak dapat terhubung ke server" | - | ui-state | PASSED |
| I6 | Input tidak valid di API → 400/404/413/422 dengan pesan Bahasa Indonesia (Id salah, JSON rusak, file 6 MB) | - | verify-tambahan 5 cek; uji curl file 6 MB → 413 | PASSED |

## Perubahan pada tahap penuntasan MVP

1. Komponen `ErrorState` + `ErrorMessage` baru; dipakai di halaman Buat Tiket, Detail Tiket, Unit, Kategori, User. Error aksi (nonaktifkan unit/kategori, reset password) kini ditampilkan.
2. Aturan baru `rules/UploadRules.ts` (`ValidateUploadFiles`): jenis, ekstensi, ukuran, file kosong, jumlah; dipakai form Buat Tiket dan komentar. 7 unit test.
3. Validasi email kosong kini menampilkan "Email wajib diisi" (sebelumnya "Format email tidak valid"). 4 unit test `LoginSchema`.
4. Empty state untuk daftar kategori, user, dan Buat Tiket tanpa kategori aktif.
5. Tombol bintang rating diberi label aksesibilitas (`Rating 1`–`Rating 5`).
6. Skrip `docs/demo/verify-ui-states.cjs` (18 cek browser), `docs/mvp-final/verify-tambahan.mjs` (20 cek API), dan `docs/demo/record-demo.cjs` (perekam demo).

## Perubahan pada tahap uji security (4 November 2026)

Rate limit login, header keamanan (helmet), cek isi file upload, log aman tanpa data sensitif, 503 saat database mati, pengaman `JWT_SECRET` di production, mode deploy satu port (`npm start`), dan upgrade dependency rentan (npm audit 13 → 3 temuan). Rincian: [`HASIL-UJI-SECURITY.md`](praditacare/docs/security/HASIL-UJI-SECURITY.md) dan [`LOG-AMAN-DAN-ERROR.md`](praditacare/docs/security/LOG-AMAN-DAN-ERROR.md).

## Di luar lingkup MVP (sesuai spesifikasi versi pertama)

Notifikasi email/push, grafik/chart, registrasi mandiri, dan aplikasi mobile native tidak termasuk MVP.
