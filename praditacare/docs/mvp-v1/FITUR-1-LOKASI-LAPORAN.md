# Fitur 1: Lokasi laporan untuk kategori fasilitas

## 1. Brief

**Masalah.** README proyek menyebut PraditaCare sebagai tempat melaporkan masalah fasilitas kampus (AC, Wi-Fi, lampu, toilet) dan pelapor harus memberi *lokasi permasalahan*. Versi sebelumnya hanya punya Judul dan Deskripsi, sehingga lokasi tertulis bebas di deskripsi atau tidak ditulis sama sekali. Akibatnya petugas Sarana Prasarana harus bertanya balik "di ruang mana?", dan lokasi tidak bisa dicari atau dihitung.

**User story.** Sebagai mahasiswa yang melaporkan kerusakan fasilitas, saya ingin mengisi lokasi (gedung, lantai, ruang) di kolom tersendiri, agar petugas bisa langsung menuju tempatnya tanpa bertanya balik.

**Acceptance criteria**

| Kode | Kriteria |
| --- | --- |
| AC1 | Untuk kategori yang mewajibkan lokasi (contoh: Kerusakan Fasilitas), tiket tanpa lokasi ditolak dengan pesan "Lokasi wajib diisi untuk kategori ini" pada field Lokasi, baik di form maupun di API (422). Lokasi berisi spasi saja dianggap kosong. |
| AC2 | Dengan lokasi valid, tiket dibuat dan lokasi disimpan dalam bentuk rapi (spasi berlebih dibuang). |
| AC3 | Kategori yang tidak mewajibkan lokasi (contoh: KRS, Konseling) tetap bisa dibuat tanpa lokasi, dan field lokasi tidak muncul di form. |
| AC4 | Lokasi tampil di detail tiket, di daftar Tiket Saya, dan di Antrian staf, serta bisa dicari lewat kata kunci. |
| AC5 | Lokasi dibatasi 3 sampai 150 karakter. |
| AC6 | Admin bisa mengatur kategori mana yang wajib lokasi (centang "Wajib isi lokasi"), dan pengaturan itu tidak hilang saat kategori diaktifkan/nonaktifkan. |

**Di luar cakupan:** daftar gedung/ruang baku (dropdown), peta, foto wajib.

## 2. Plan

| Lapisan | Perubahan |
| --- | --- |
| Database | `Category.RequiresLocation` (boolean, default false) dan `Ticket.Location` (VARCHAR 150, nullable). Migration `tambah_lokasi_laporan` juga menyalakan flag untuk kategori unit SARPRAS di database lama. |
| Shared | `utils/TicketLocation.ts`: `NormalizeLocation` dan `ValidateTicketLocation` (satu sumber aturan untuk browser dan API). `CreateTicketSchema` mendapat field `Location`. `CategorySchema` mendapat `RequiresLocation`. Model `Ticket` dan `Category` ditambah field. |
| API | `POST /api/tickets`: setelah kategori ditemukan, panggil `ValidateTicketLocation(category.RequiresLocation, Location)` → 422 bila gagal. Simpan `Location`. Pencarian `Keyword` ikut mencari di `Location`. Mapper menyembunyikan lokasi untuk tiket rahasia yang isinya disembunyikan. |
| Web | Form Buat Tiket menampilkan input Lokasi (wajib) hanya untuk kategori yang mewajibkan. Lokasi tampil di detail, Tiket Saya, dan Antrian. Halaman Admin Kategori mendapat kolom dan centang "Wajib isi lokasi". |
| Seed | Kerusakan Fasilitas wajib lokasi; tiket contoh fasilitas/Wi-Fi diberi lokasi. |
| Test | Unit test `TicketLocation.test.ts` + skrip verifikasi API `verify-fitur-1.mjs`. |

Keputusan desain: lokasi berupa teks bebas (bukan dropdown gedung) supaya MVP cepat dipakai; kewajiban lokasi diatur per kategori karena kategori seperti Konseling atau Beasiswa tidak punya lokasi.

## 3. Build

File yang diubah ada di commit `feat: lokasi laporan untuk kategori fasilitas`. Ringkasnya: `schema.prisma`, migration baru, `seed.ts`, `TicketRoutes.ts`, `Mappers.ts`, `packages/shared` (utils, schema, model), dan halaman web `CreateTicketPage`, `TicketDetailPage`, `MyTicketsPage`, `StaffQueuePage`, `AdminCategoriesPage`.

Dua bug yang tertangkap saat review sebelum commit:

1. **Form mengirim teks `"null"`.** Form lama mengirim semua field dengan `String(value)`, sehingga `Location: null` akan terkirim sebagai teks `"null"` dan lolos validasi sebagai lokasi 4 karakter. Diperbaiki: field bernilai `null`/`undefined` tidak ikut dikirim.
2. **Flag hilang saat toggle aktif/nonaktif.** Tombol Aktifkan/Nonaktifkan di Admin Kategori mengirim ulang data kategori tanpa `RequiresLocation`; karena skema memberi default `false`, flag akan terhapus diam-diam. Diperbaiki dengan ikut mengirim `RequiresLocation`.

## 4. Verify

**Unit test** (`npm test`), file `packages/shared/src/utils/TicketLocation.test.ts`: 9 test lulus. Output: [bukti/fitur1-unit-test.txt](bukti/fitur1-unit-test.txt).

**Verifikasi API end-to-end** (`node docs/mvp-v1/verify-fitur-1.mjs` saat `npm run dev` berjalan): 13 PASS, 0 FAIL. Output: [bukti/fitur1-verifikasi-api.txt](bukti/fitur1-verifikasi-api.txt).

| AC | Bukti |
| --- | --- |
| AC1 | Unit test "AC1: kategori fasilitas tanpa lokasi ditolak"; API "AC1 tanpa lokasi -> 422", "pesan error ada di field Location", "spasi saja ditolak"; screenshot [fitur1-01](bukti/fitur1-01-lokasi-wajib-error.png). |
| AC2 | Unit test "merapikan lokasi dari form"; API "AC2 dengan lokasi -> 201", "lokasi tersimpan rapi"; screenshot [fitur1-02](bukti/fitur1-02-detail-dengan-lokasi.png). |
| AC3 | Unit test "AC3: kategori non-fasilitas boleh tanpa lokasi"; API "AC3 ... -> 201", "Location bernilai null". |
| AC4 | API "staf Sarpras melihat lokasi di detail", "pencarian kata kunci menemukan tiket berdasarkan lokasi"; screenshot [fitur1-03](bukti/fitur1-03-tiket-saya-lokasi.png). |
| AC5 | Unit test "terlalu pendek atau terlalu panjang"; API "AC5 lokasi > 150 karakter -> 422". |
| AC6 | API "AC6 admin mengaktifkan wajib lokasi untuk Wi-Fi"; perbaikan bug toggle di bagian Build. |

**Regresi:** `docs/e2e-test.mjs` (tes end-to-end versi sebelumnya) tetap 42 lulus, 0 gagal. `npm run typecheck` bersih.

## 5. Commit

`feat: lokasi laporan untuk kategori fasilitas` (satu commit berisi kode, migration, unit test, skrip verifikasi, dan dokumen ini).
