# Fitur 2: Lokasi paling sering bermasalah di dashboard

## 1. Brief

**Masalah.** README proyek menjanjikan bahwa pihak kampus "mendapatkan data mengenai permasalahan fasilitas yang sering terjadi". Dashboard versi sebelumnya hanya menghitung per unit dan per kategori, jadi admin tahu "Kerusakan Fasilitas ada 7 laporan" tetapi tidak tahu *di mana*. Setelah Fitur 1 menyimpan lokasi, data itu bisa diolah.

Tantangannya: lokasi diketik bebas oleh mahasiswa. "Gedung A Ruang 301", "gedung a, ruang 301", dan "Gd. A R.301" adalah tempat yang sama, dan harus dihitung sebagai satu lokasi.

**User story.** Sebagai admin atau staf Sarana Prasarana, saya ingin melihat lokasi dengan laporan terbanyak, agar bisa memprioritaskan perbaikan menyeluruh di lokasi yang berulang kali bermasalah.

**Acceptance criteria**

| Kode | Kriteria |
| --- | --- |
| AC1 | Penulisan lokasi yang berbeda huruf besar/kecil, tanda baca, spasi, atau singkatan umum (Gd., Lt., R.) dihitung sebagai satu lokasi. |
| AC2 | Dashboard menampilkan maksimal 5 lokasi, diurutkan dari jumlah laporan terbanyak, pada rentang tanggal yang dipilih. |
| AC3 | Setiap lokasi menampilkan jumlah laporan total dan jumlah yang masih aktif (Terbuka, Diproses, Menunggu Pelapor); angka langsung bertambah saat ada laporan baru. |
| AC4 | Staf hanya melihat lokasi dari tiket unitnya; admin melihat semua unit. Tiket tanpa lokasi dan tiket kategori rahasia tidak dihitung. |
| AC5 | Mahasiswa tetap tidak bisa membuka dashboard (403). |

**Di luar cakupan:** peta/denah, master data gedung, notifikasi otomatis saat lokasi melewati ambang.

## 2. Plan

| Lapisan | Perubahan |
| --- | --- |
| Shared | `utils/LocationHotspots.ts`: `LocationKey` (kunci pembanding: huruf kecil, tanpa tanda baca, singkatan diseragamkan) dan `GetLocationHotspots` (kelompokkan, hitung total & aktif, urutkan, ambil 5). Fungsi murni sehingga mudah diuji tanpa database. DTO `DashboardResponse` mendapat `Locations`. |
| API | `GET /api/dashboard` memanggil `GetLocationHotspots` pada tiket yang sudah difilter rentang tanggal dan unit (filter unit staf sudah ada, jadi AC4 otomatis ikut). Tidak ada perubahan database. |
| Web | Kartu "Lokasi paling sering bermasalah" di halaman Dashboard. Angka "Masih aktif" ditebalkan bila 2 atau lebih. |
| Seed | 3 laporan fasilitas tambahan, dua di antaranya ruang 301 dengan penulisan berbeda, untuk demo. |
| Test | Unit test `LocationHotspots.test.ts` + skrip verifikasi API `verify-fitur-2.mjs`. |

Keputusan desain: pengelompokan dilakukan di aplikasi (bukan `GROUP BY` SQL) karena aturan penyeragaman singkatan sulit ditulis di SQL dan jumlah tiket per 30 hari untuk satu kampus masih kecil. Nama yang ditampilkan adalah penulisan yang paling sering dipakai pelapor.

## 3. Build

File yang diubah ada di commit `feat: dashboard lokasi paling sering bermasalah`: `packages/shared/src/utils/LocationHotspots.ts` (+ test), `dto/DashboardResponse.ts`, `index.ts`, `apps/api/src/routes/DashboardRoutes.ts`, `apps/api/prisma/seed.ts`, `apps/web/src/pages/DashboardPage.tsx`, `README.md`.

Hal yang dicek saat review:

1. **Privasi tiket rahasia.** Lokasi tiket kategori rahasia (misalnya Konseling) bisa membocorkan informasi, jadi `GetLocationHotspots` melewatinya. Ada unit test khusus (AC4).
2. **"R301" tanpa titik dan nama tampilan.** Mahasiswa sering menulis "R301" tanpa spasi, jadi `LocationKey` memisahkan huruf dan angka sebelum menyeragamkan singkatan (ada test "Gd A R301"). Bila beberapa penulisan sama seringnya, yang ditampilkan adalah yang pertama dilaporkan.
3. **Skrip verifikasi bisa diulang.** Pengecekan AC1 memakai `>= 3` agar skrip tidak gagal saat dijalankan kedua kali (karena AC3 menambah tiket).

## 4. Verify

**Unit test** (`npm test`), file `packages/shared/src/utils/LocationHotspots.test.ts`: 9 test lulus. Output: [bukti/fitur2-unit-test.txt](bukti/fitur2-unit-test.txt).

**Verifikasi API end-to-end** (`node docs/mvp-v1/verify-fitur-2.mjs` pada database yang baru di-seed, saat `npm run dev` berjalan): 13 PASS, 0 FAIL. Output: [bukti/fitur2-verifikasi-api.txt](bukti/fitur2-verifikasi-api.txt).

| AC | Bukti |
| --- | --- |
| AC1 | Unit test "LocationKey ...", "AC1: penulisan berbeda ... dihitung jadi satu"; API "tiga penulisan berbeda ruang 301 digabung jadi satu baris"; screenshot [fitur2-01](bukti/fitur2-01-dashboard-admin.png) (Gedung A Ruang 301 = 4 laporan). |
| AC2 | Unit test "AC2: diurutkan ... dibatasi 5"; API "urut menurun", "maksimal 5 lokasi". |
| AC3 | Unit test "AC3: menghitung tiket yang masih aktif"; API "jumlah laporan/aktif ruang 301 naik 1" setelah membuat laporan "GEDUNG A - RUANG 301". |
| AC4 | Unit test "AC4: tanpa lokasi dan rahasia tidak dihitung"; API "staf Sarpras tidak melihat lokasi Wi-Fi milik unit IT", "staf Akademik tidak punya lokasi"; screenshot [fitur2-02](bukti/fitur2-02-dashboard-staf-sarpras.png). |
| AC5 | API "mahasiswa akses dashboard -> 403". |

**Regresi:** `docs/e2e-test.mjs` tetap 42 lulus, 0 gagal ([bukti/regresi-e2e.txt](bukti/regresi-e2e.txt)); verifikasi Fitur 1 tetap 13 PASS; `npm run typecheck` bersih; total unit test 28 lulus.

## 5. Commit

`feat: dashboard lokasi paling sering bermasalah` (satu commit berisi kode, unit test, skrip verifikasi, bukti, dan dokumen ini).
