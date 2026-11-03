# Penyempurnaan MVP PraditaCare: 5 User Story

**MVP-nya apa?** PraditaCare adalah aplikasi layanan pengaduan dan bantuan mahasiswa Universitas Pradita, terutama untuk masalah fasilitas kampus. Mahasiswa melapor, laporan otomatis diteruskan ke unit yang tepat dengan batas waktu (SLA), staf unit memproses sampai selesai, lalu mahasiswa menilai penanganannya.

Pada penyempurnaan ini, setiap aturan bisnis dari 5 user story dipindahkan ke fungsi murni di `packages/shared/src/rules/`. Fungsi yang sama dipakai oleh API (validasi akhir) dan web (validasi form / tombol), sehingga aturannya hanya ada di satu tempat dan bisa diuji tanpa database.

| US | File aturan | File unit test |
| --- | --- | --- |
| US1 Membuat laporan | `rules/TicketCreationRules.ts` | `rules/TicketCreationRules.test.ts` |
| US2 Staf memproses laporan | `rules/StatusChangeRules.ts` | `rules/StatusChangeRules.test.ts` |
| US3 Pelapor membalas & membuka kembali | `rules/ReporterInteractionRules.ts` | `rules/ReporterInteractionRules.test.ts` |
| US4 Penilaian & tutup otomatis | `rules/FeedbackRules.ts` | `rules/FeedbackRules.test.ts` |
| US5 Privasi anonim & rahasia | `rules/PrivacyRules.ts` | `rules/PrivacyRules.test.ts` |

---

## US1: Mahasiswa membuat laporan

> Sebagai **mahasiswa**, saya ingin **melaporkan masalah dengan memilih kategori**, agar **laporan langsung sampai ke unit yang bertanggung jawab dan saya tahu batas waktu penanganannya**.

| AC | Kriteria |
| --- | --- |
| US1-AC1 | Unit tujuan otomatis mengikuti unit pemilik kategori. |
| US1-AC2 | Batas waktu (DueAt) = waktu dibuat + SLA kategori dalam jam. SLA tidak valid (< 1 jam / bukan bulat) ditolak. |
| US1-AC3 | Nomor tiket berformat `PC-YYYY-NNNNNN`, berurutan per tahun. |
| US1-AC4 | Kategori nonaktif, atau kategori yang unitnya nonaktif, ditolak dengan pesan "Kategori tidak tersedia". |
| US1-AC5 | Kategori yang mewajibkan lokasi menolak laporan tanpa lokasi (pesan pada field Lokasi). |

Dipakai di: `POST /api/tickets` (`CheckNewTicket`, `CalculateDueAt`), `NextTicketNumber` (`FormatTicketNumber`).

## US2: Staf memproses laporan sesuai alur status

> Sebagai **staf unit**, saya ingin **mengubah status laporan mengikuti alur yang jelas**, agar **pelapor tahu perkembangan dan tidak ada status yang melompat**.

| AC | Kriteria |
| --- | --- |
| US2-AC1 | Hanya transisi berikut yang boleh: Terbuka → Diproses/Ditolak; Diproses → Menunggu Pelapor/Selesai/Ditolak; Menunggu Pelapor → Diproses. Lainnya ditolak (409). |
| US2-AC2 | Status Selesai, Ditolak, dan **Menunggu Pelapor** wajib catatan. *(Penyempurnaan: Menunggu Pelapor sebelumnya tidak wajib, padahal pelapor perlu tahu informasi apa yang diminta.)* |
| US2-AC3 | Staf unit terkait yang memproses tiket tanpa petugas otomatis menjadi petugas; staf yang sudah ada petugasnya, admin, atau staf unit lain tidak. |
| US2-AC4 | Waktu Selesai/Ditutup dicatat sesuai status, dan respons pertama hanya dicatat sekali. |
| US2-AC5 | Petugas hanya boleh staf aktif dari unit yang sama dengan tiket. |

Dipakai di: `PUT /api/tickets/:Id/status` (`PlanStatusChange`), `ApplyStatusChange` (`StatusTimestampsFor`), `PUT /api/tickets/:Id/assign` (`CheckAssignee`), dialog ubah status di web (`StatusesRequiringNote`).

## US3: Pelapor membalas dan membuka kembali laporan

> Sebagai **mahasiswa pelapor**, saya ingin **membalas pertanyaan staf dan membuka kembali laporan yang ternyata belum beres**, agar **masalah saya benar-benar tuntas**.

| AC | Kriteria |
| --- | --- |
| US3-AC1 | Balasan pelapor saat status Menunggu Pelapor otomatis mengembalikan tiket ke Diproses. |
| US3-AC2 | Tiket Selesai bisa dibuka kembali oleh pelapor paling lama 7 hari setelah diselesaikan; lewat dari itu ditolak. |
| US3-AC3 | Tiket yang sudah Ditutup/Ditolak tidak bisa dikomentari; mahasiswa lain tidak bisa berkomentar di tiket orang lain. |
| US3-AC4 | Mahasiswa tidak bisa membuat komentar internal walaupun mengirim `IsInternal=true`. |
| US3-AC5 | Komentar publik pertama dari staf dicatat sebagai respons pertama (metrik SLA); komentar internal tidak. |

Dipakai di: `POST /api/tickets/:Id/comments`, `POST /api/tickets/:Id/reopen`, tombol "Buka kembali" di web (`CanReopen`).

## US4: Mahasiswa menilai penanganan, tiket ditutup otomatis bila tidak dinilai

> Sebagai **mahasiswa**, saya ingin **memberi rating 1–5 setelah laporan selesai**, agar **kampus tahu kualitas layanan tiap unit**.

| AC | Kriteria |
| --- | --- |
| US4-AC1 | Penilaian hanya untuk tiket berstatus Selesai, dan hanya sekali. Setelah dinilai, tiket Ditutup. |
| US4-AC2 | Rating 1 sampai 5. |
| US4-AC3 | **Rating 1–2 wajib disertai komentar minimal 5 karakter.** *(Penyempurnaan: tanpa alasan, rating rendah tidak bisa ditindaklanjuti unit.)* |
| US4-AC4 | Tiket Selesai tanpa penilaian lebih dari 7 hari ditutup otomatis oleh sistem; yang belum 7 hari atau sudah dinilai tidak disentuh. |

Dipakai di: `POST /api/tickets/:Id/feedback` (`CanGiveFeedback`, `FeedbackSchema`), `AutoCloseJob` (`AutoCloseThreshold`), form penilaian di web (`ValidateFeedbackComment`).

## US5: Privasi pelapor anonim dan kategori rahasia

> Sebagai **mahasiswa**, saya ingin **melapor secara anonim atau memakai kategori rahasia (Konseling)**, agar **saya merasa aman menyampaikan masalah pribadi**.

| AC | Kriteria |
| --- | --- |
| US5-AC1 | Nama pelapor anonim tampil "Anonim" bagi siapa pun selain pelapor itu sendiri. |
| US5-AC2 | Isi tiket kategori rahasia (judul, deskripsi, lokasi, lampiran) disembunyikan dari admin; staf unit terkait tetap melihat. |
| US5-AC3 | Bila isi tiket disembunyikan, nama pelapor ikut disembunyikan. |
| US5-AC4 | Komentar internal staf tidak pernah terlihat oleh mahasiswa. |
| US5-AC5 | Tiket rahasia tidak ikut dihitung di dashboard lokasi. |

Dipakai di: `Mappers.ts` (`IsContentHidden`, `IsReporterHidden`, `ReporterDisplayName`), `GET /api/tickets/:Id/comments` (`CanSeeInternalComments`), `GetLocationHotspots`.
