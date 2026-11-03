# Penyempurnaan MVP PraditaCare: Jawaban Review

User story lengkap dengan acceptance criteria: [USER-STORIES.md](USER-STORIES.md).

## 1. MVP-nya apa?

**PraditaCare** adalah aplikasi web layanan pengaduan dan bantuan untuk mahasiswa Universitas Pradita, terutama untuk masalah fasilitas kampus (AC, Wi-Fi, lampu, toilet). Alurnya:

1. Mahasiswa membuat laporan, memilih kategori dan mengisi lokasi.
2. Laporan otomatis diteruskan ke unit yang tepat dengan batas waktu (SLA).
3. Staf unit memproses laporan sampai Selesai, dan bisa bertanya balik ke pelapor.
4. Mahasiswa menilai penanganan, lalu tiket Ditutup.
5. Admin memantau dashboard (SLA per unit, kategori, dan lokasi yang paling sering bermasalah).

Lima user story yang disempurnakan:

| US | Ringkasan |
| --- | --- |
| US1 | Mahasiswa membuat laporan → diteruskan ke unit tepat dengan batas waktu SLA |
| US2 | Staf memproses laporan mengikuti alur status yang jelas |
| US3 | Pelapor membalas pertanyaan staf dan membuka kembali laporan yang belum beres |
| US4 | Mahasiswa menilai penanganan; tiket tanpa penilaian ditutup otomatis |
| US5 | Privasi pelapor anonim dan kategori rahasia |

## 2. Cara menjalankan dan cek apakah berjalan

```bash
cd praditacare
cp .env.example .env
docker compose up -d          # MySQL; atau MySQL/MariaDB lokal
npm install
npm run build:shared
npm run db:deploy
npm run db:seed
npm run dev                   # buka http://localhost:5173
```

Akun (password semua `Pradita123!`): `budi@student.pradita.ac.id` (mahasiswa), `staf.sarpras@pradita.ac.id` (staf), `admin@pradita.ac.id` (admin).

**Bukti aplikasi berjalan:** aplikasi dijalankan dengan MariaDB 10.11, lalu tiap user story dicek lewat API aplikasi yang hidup dengan `node docs/mvp-penyempurnaan/verify-user-stories.mjs`. Hasilnya **29 PASS, 0 FAIL** ([bukti/verifikasi-user-story.txt](bukti/verifikasi-user-story.txt)). Tutup otomatis (US4-AC4) dicek dengan menjalankan job `npm run job:auto-close -w @praditacare/api` ([bukti/us4-auto-close.txt](bukti/us4-auto-close.txt)). Screenshot:

- [us2-menunggu-pelapor-wajib-catatan.png](bukti/us2-menunggu-pelapor-wajib-catatan.png): staf tidak bisa mengubah ke Menunggu Pelapor tanpa catatan.
- [us4-rating-rendah-wajib-alasan.png](bukti/us4-rating-rendah-wajib-alasan.png): rating 1 tanpa alasan ditolak.

Tes end-to-end versi sebelumnya tetap **42 lulus, 0 gagal** ([bukti/regresi-e2e.txt](bukti/regresi-e2e.txt)). Catatan: skrip verifikasi dan e2e membuat data baru, jadi masing-masing dijalankan pada database yang baru di-seed.

## 3. Di mana unit test-nya?

Unit test memakai **Vitest**, letaknya di samping kode yang diuji (`*.test.ts`). Lima file baru untuk 5 user story ada di `packages/shared/src/rules/`:

| File unit test | User story | Aturan bisnis yang diuji |
| --- | --- | --- |
| `rules/TicketCreationRules.test.ts` | US1 | Batas waktu dari SLA, format nomor tiket, kategori/unit nonaktif ditolak, lokasi wajib |
| `rules/StatusChangeRules.test.ts` | US2 | Transisi status yang boleh/ditolak, catatan wajib, petugas otomatis, waktu Selesai/Ditutup, validasi petugas |
| `rules/ReporterInteractionRules.test.ts` | US3 | Batas buka kembali 7 hari, balasan pelapor mengembalikan ke Diproses, hak komentar, komentar internal, respons pertama |
| `rules/FeedbackRules.test.ts` | US4 | Penilaian hanya untuk tiket Selesai & sekali, rating rendah wajib alasan, ambang tutup otomatis 7 hari |
| `rules/PrivacyRules.test.ts` | US5 | Pelapor anonim, isi kategori rahasia, nama pelapor tiket rahasia, komentar internal, dashboard lokasi |

Ditambah 4 file dari pertemuan sebelumnya: `utils/GetSlaStatus.test.ts`, `constants/TicketStatusTransitions.test.ts`, `utils/TicketLocation.test.ts`, `utils/LocationHotspots.test.ts`.

Nama test memakai kode acceptance criteria (misal `US2-AC2: WAITING_REPORTER tanpa catatan ditolak`), jadi setiap test bisa ditelusuri ke user story-nya.

## 4. Run semua unit test

```bash
cd praditacare
npm test
```

Hasil: **Test Files 9 passed (9), Tests 85 passed (85)**, semua lulus. Output lengkap: [bukti/unit-test-semua.txt](bukti/unit-test-semua.txt).

**Apakah test-nya bermakna?** Sebagai cek, aturan "Menunggu Pelapor wajib catatan" sengaja dihapus sementara dari kode. Hasilnya `npm test` langsung gagal di `US2-AC2: WAITING_REPORTER tanpa catatan ditolak` (1 failed, 84 passed). Setelah kode dikembalikan, semua lulus lagi. Artinya test benar-benar menjaga aturan bisnis, bukan sekadar lulus.

## 5. Commit

| Commit | Isi |
| --- | --- |
| `feat: aturan bisnis 5 user story MVP dipisah ke modul rules` | **Production code**: 5 modul aturan bisnis di `packages/shared/src/rules`, dipakai API dan web; dua penyempurnaan perilaku (Menunggu Pelapor wajib catatan, rating 1–2 wajib alasan). |
| `test: unit test aturan bisnis 5 user story MVP` | **Unit test**: 5 file test baru, 85 test lulus. |
| `docs: bukti verifikasi penyempurnaan MVP` | Dokumen ini, skrip verifikasi, dan bukti. |

## 6. Kenapa aturan bisnis dipisah ke `rules/`?

Sebelumnya aturan seperti "buka kembali maksimal 7 hari" ditulis langsung di route API dan **diulang** di halaman web. Bila satu diubah dan yang lain lupa, tombol di web bisa muncul padahal API menolak. Sekarang aturannya ada di satu fungsi yang dipakai keduanya, dan fungsi murni (tanpa database) bisa diuji cepat dengan unit test.
