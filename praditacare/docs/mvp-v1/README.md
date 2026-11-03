# MVP Version 1 PraditaCare (Tugas Pertemuan 5)

Dokumen ini merangkum pengerjaan MVP v1 secara iteratif, fitur demi fitur, dengan bantuan AI Agent (Claude). Detail tiap fitur ada di:

- [FITUR-1-LOKASI-LAPORAN.md](FITUR-1-LOKASI-LAPORAN.md): pelapor fasilitas wajib mengisi lokasi.
- [FITUR-2-LOKASI-RAWAN.md](FITUR-2-LOKASI-RAWAN.md): dashboard lokasi paling sering bermasalah.

## 1. Titik awal dan pilihan fitur

Aplikasi dasar PraditaCare (login per peran, buat tiket, antrian staf, alur status, SLA, dashboard) sudah ada di `main` lewat PR #1. MVP v1 ini **tidak membangun ulang aplikasi**, tetapi menambah dua fitur inti yang membuat aplikasi sesuai dengan ide di README proyek: *melaporkan masalah fasilitas kampus beserta lokasinya* dan *memberi pihak kampus data masalah yang sering terjadi*.

| Fitur | Kenapa inti untuk MVP |
| --- | --- |
| 1. Lokasi laporan | README menyebut lokasi sebagai informasi wajib laporan fasilitas. Tanpa lokasi, petugas harus bertanya balik dan laporan lambat ditangani. |
| 2. Lokasi paling sering bermasalah | README menjanjikan "data mengenai permasalahan fasilitas yang sering terjadi". Fitur ini memakai data lokasi dari Fitur 1. |

## 2. Riwayat commit

| Commit | Isi |
| --- | --- |
| `chore: siapkan unit test Vitest dan prisma generate otomatis` | Fondasi: `npm test`, unit test untuk logika SLA & transisi status yang sudah ada, perbaikan `postinstall: prisma generate` (tanpa ini `npm run db:seed` gagal di clone baru). |
| `feat: lokasi laporan untuk kategori fasilitas` | Fitur 1 lengkap: migration, API, UI, unit test, skrip verifikasi, bukti. |
| `feat: dashboard lokasi paling sering bermasalah` | Fitur 2 lengkap: logika pengelompokan, API, UI, unit test, skrip verifikasi, bukti. |
| `docs: ringkasan MVP v1 dan skrip demo` | Dokumen ini. |

Setiap commit fitur mengikuti siklus **Brief → Plan → Build → Verify → Commit**, dan dokumennya ikut di commit yang sama.

## 3. Cara menjalankan dan menguji

```bash
cd praditacare
cp .env.example .env
docker compose up -d        # atau MySQL/MariaDB lokal
npm install                 # otomatis menjalankan prisma generate
npm run build:shared
npm run db:deploy           # menerapkan migration termasuk tambah_lokasi_laporan
npm run db:seed             # 13 tiket contoh, sebagian berlokasi
npm run dev                 # web http://localhost:5173, api :4000

# terminal lain
npm test                                  # 28 unit test, tanpa database
node docs/mvp-v1/verify-fitur-1.mjs       # 13 cek acceptance criteria Fitur 1
node docs/mvp-v1/verify-fitur-2.mjs       # 13 cek acceptance criteria Fitur 2 (jalankan pada seed baru)
```

Database lama dari versi sebelumnya: cukup `npm run db:deploy`. Kategori milik unit Sarana Prasarana otomatis menjadi wajib lokasi. Untuk melihat data demo Fitur 2, database perlu di-seed ulang (`npm run db:reset -w @praditacare/api`, menghapus semua data development).

## 4. Ringkasan bukti

| Bukti | Hasil |
| --- | --- |
| Unit test semua ([bukti/unit-test-semua.txt](bukti/unit-test-semua.txt)) | 4 file, 28 test lulus |
| Verifikasi API Fitur 1 ([bukti/fitur1-verifikasi-api.txt](bukti/fitur1-verifikasi-api.txt)) | 13 PASS, 0 FAIL |
| Verifikasi API Fitur 2 ([bukti/fitur2-verifikasi-api.txt](bukti/fitur2-verifikasi-api.txt)) | 13 PASS, 0 FAIL |
| Regresi e2e versi sebelumnya ([bukti/regresi-e2e.txt](bukti/regresi-e2e.txt)) | 42 lulus, 0 gagal |
| `npm run typecheck` dan `npm run build` | bersih |
| Screenshot | [bukti/](bukti/) (form lokasi wajib, detail tiket, Tiket Saya, dashboard admin, dashboard staf) |

## 5. Apa yang dikerjakan AI Agent

- Membaca README, dokumen arsitektur, dan kode yang ada, lalu mengusulkan dua fitur yang menutup celah antara README dan aplikasi.
- Menulis brief, user story, dan acceptance criteria tiap fitur.
- Menyusun rencana perubahan per lapisan (database, shared, API, web, seed, test).
- Menulis kode, migration, unit test (Vitest), dan skrip verifikasi API.
- Menjalankan aplikasi dengan MariaDB lokal, menjalankan test, mengambil screenshot, dan menyimpan output sebagai bukti.
- Menemukan dan memperbaiki masalah saat review: `postinstall` prisma yang hilang, form yang akan mengirim teks `"null"`, toggle kategori yang menghapus flag wajib lokasi, dan skrip verifikasi yang tidak bisa diulang.

## 6. Apa yang harus direview dan diubah oleh mahasiswa

Bagian ini **harus dikerjakan sendiri** oleh mahasiswa, karena tugas menilai pemahaman dan tanggung jawab atas hasil AI. Saran langkahnya:

1. **Jalankan sendiri** langkah di bagian 3 di laptop, pastikan semua angka bukti sama.
2. **Baca diff tiap commit** (`git show 27e19ad`, `git show 21ca8d8`) dan pastikan bisa menjelaskan setiap file yang berubah.
3. **Uji manual** di browser mengikuti skrip demo di bawah, termasuk kasus gagal.
4. **Putuskan dan ubah** minimal satu hal, lalu commit sendiri dengan pesan yang menjelaskan alasannya. Contoh yang realistis:
   - Tambah singkatan yang biasa dipakai di Pradita ke `Abbreviations` di `LocationHotspots.ts` (misal nama gedung lokal), tambahkan test-nya.
   - Putuskan apakah Wi-Fi & Jaringan juga wajib lokasi (centang di Admin Kategori atau ubah seed), dan tulis alasannya.
   - Ubah ambang "Masih aktif" yang ditebalkan (sekarang 2) bila menurut kelompok kurang tepat.
5. **Catat di laporan** apa yang diterima apa adanya, apa yang diubah, dan kenapa.

Pertanyaan yang sebaiknya bisa dijawab saat presentasi:

- Kenapa aturan lokasi ditaruh di `packages/shared`, bukan hanya di API atau hanya di form?
- Kenapa API tetap memvalidasi lokasi walaupun form sudah memvalidasi?
- Kenapa tiket kategori rahasia tidak ikut dihitung di dashboard lokasi?
- Kenapa pengelompokan lokasi dilakukan di kode, bukan `GROUP BY` di SQL, dan kapan keputusan ini perlu diganti?
- Apa beda unit test (`npm test`) dan skrip verifikasi API (`verify-fitur-*.mjs`)?

## 7. Mengapa perubahan ini diperlukan

- **Lokasi wajib**: laporan fasilitas tanpa lokasi tidak bisa ditindaklanjuti; petugas harus bertanya balik sehingga SLA terbuang.
- **Lokasi per kategori, bukan semua**: Konseling, Beasiswa, atau KRS tidak punya lokasi; memaksa semua kategori mengisi lokasi akan mengganggu pelapor.
- **Dashboard lokasi**: lokasi yang berulang kali bermasalah (misal ruang 301) menandakan perlu perbaikan menyeluruh, bukan perbaikan satu per satu.
- **Unit test**: logika lokasi dan pengelompokan adalah aturan bisnis yang mudah rusak saat diubah; test memastikan perubahan berikutnya (termasuk perubahan mahasiswa di poin 6) tidak merusak perilaku yang sudah disepakati.
- **Perbaikan `prisma generate`**: tanpa itu aplikasi tidak runnable di clone baru, padahal "aplikasi runnable" adalah kriteria penilaian.

## 8. Skrip demo singkat (sekitar 5 menit)

Persiapan: database baru di-seed, `npm run dev` berjalan, dua jendela browser (biasa dan incognito).

1. **Pembuka (30 detik).** "MVP v1 menambah dua fitur inti: lokasi laporan dan dashboard lokasi paling sering bermasalah. Keduanya dibangun satu per satu dengan siklus Brief, Plan, Build, Verify, Commit." Tunjukkan `git log --oneline`.
2. **Unit test (30 detik).** Jalankan `npm test`, tunjukkan 28 test lulus, sebut file `TicketLocation.test.ts` dan `LocationHotspots.test.ts`.
3. **Fitur 1, kasus gagal (1 menit).** Login `budi@student.pradita.ac.id` / `Pradita123!` → Buat Tiket → pilih *Kerusakan Fasilitas*. Kolom Lokasi muncul dengan tanda wajib. Isi judul & deskripsi, kosongkan lokasi, klik Kirim → muncul "Lokasi wajib diisi untuk kategori ini".
4. **Fitur 1, kasus berhasil (1 menit).** Isi lokasi `Gd. A R.301` → Kirim → halaman detail menampilkan Lokasi. Kembali ke Buat Tiket, pilih *KRS & Perwalian*: kolom Lokasi tidak muncul.
5. **Fitur 1 dari sisi staf (30 detik).** Di jendela incognito login `staf.sarpras@pradita.ac.id` → Antrian: lokasi tampil di bawah judul. Cari kata kunci `301`.
6. **Fitur 2 (1 menit).** Login `admin@pradita.ac.id` → Dashboard → kartu "Lokasi paling sering bermasalah": *Gedung A Ruang 301* di urutan pertama, padahal ditulis berbeda-beda oleh pelapor (termasuk `Gd. A R.301` yang baru dibuat di langkah 4). Ganti filter unit atau login sebagai staf Sarpras untuk menunjukkan staf hanya melihat unitnya.
7. **Bukti otomatis (30 detik).** Jalankan `node docs/mvp-v1/verify-fitur-2.mjs` (atau tunjukkan file di `docs/mvp-v1/bukti/`) dan sebut bahwa setiap baris PASS memetakan ke acceptance criteria di dokumen fitur.
8. **Penutup.** Jelaskan satu hal yang direview/diubah sendiri oleh kelompok (bagian 6) dan alasannya.
