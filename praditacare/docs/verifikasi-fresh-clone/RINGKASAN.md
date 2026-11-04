# Verifikasi Fresh Clone PraditaCare

Tanggal: 4 November 2026, 10:04–10:05 UTC. Repo di-clone baru dari GitHub (`richkyrifadi-create/Project_RPL`) ke folder kosong, lalu semua langkah dijalankan otomatis oleh [`verify-fresh.sh`](verify-fresh.sh). Setiap file bukti berisi perintah persis, output terminal asli, dan exit code.

Lingkungan: Linux, Node.js 22.23.4, npm 10.9.9, MariaDB 10.11 (pengganti MySQL 8, user root/root), Chromium + Playwright untuk cek browser.

## Hasil

| # | Langkah | Perintah utama | Hasil | Bukti |
| --- | --- | --- | --- | --- |
| 1 | Fresh clone | `git clone ...Project_RPL.git` | Berhasil; `.env` tidak ikut ter-clone (rahasia tidak ada di repo) | [01-fresh-clone.txt](bukti/01-fresh-clone.txt) |
| 2 | Install | `npm ci` | 348 paket terpasang, exit 0 | [02-install.txt](bukti/02-install.txt) |
| 3 | Unit test | `npm test` | **119/119 PASSED** (15 file) | [03-unit-test.txt](bukti/03-unit-test.txt) |
| 4 | Typecheck + build | `npm run typecheck`, `npm run build` | 0 error; `shared/dist`, `api/dist`, `web/dist` terbentuk | [04-typecheck-build.txt](bukti/04-typecheck-build.txt) |
| 5 | Database | `npm run db:deploy`, `npm run db:seed` | 2 migrasi diterapkan; seed 5 unit, 8 kategori, 9 user, 13 tiket | [05-database.txt](bukti/05-database.txt) |
| 6 | Deploy production | `npm run gen:secret`, `npm start` | Ditolak dulu saat `JWT_SECRET` masih contoh (sesuai rancangan), lalu jalan di :4000; health 200, web 200, rute SPA 200, login API OK, login lewat browser OK tanpa error konsol | [06-deploy-production.txt](bukti/06-deploy-production.txt) |
| 7 | Uji security | `node docs/security/verify-security.mjs` | **39 PASS, 0 FAIL** | [07-uji-security.txt](bukti/07-uji-security.txt) |
| 8 | Regresi end-to-end (tiap skrip di database baru di-seed) | 6 skrip di `docs/` | e2e **42/42**, fitur 1 **13/13**, fitur 2 **13/13**, user story **29/29**, tambahan **20/20**, UI browser **18/18** | [08-regresi-e2e.txt](bukti/08-regresi-e2e.txt) |
| 9 | Run development | `npm run dev` | Vite :5173 200, proxy API 200, login lewat browser OK | [09-run-dev.txt](bukti/09-run-dev.txt) |
| 10 | Audit dependency | `npm audit` | 13 temuan (2 critical, 5 high, 6 moderate) → 3 high (Prisma CLI, lihat [HASIL-UJI-SECURITY.md](../security/HASIL-UJI-SECURITY.md) bagian 4.1) | [sebelum](bukti/10-npm-audit-sebelum.txt), [sesudah](bukti/10-npm-audit-sesudah.txt) |
| 11 | Skenario error | `.env` hilang, port bentrok, database mati, belum migrasi | Semua menghasilkan pesan/log yang jelas dan pulih setelah perbaikan | [11-skenario-error.txt](bukti/11-skenario-error.txt) |
| 12 | Log server production | log `npm start` selama langkah 6–11 | 389 baris; memuat password 0, token JWT 0, `JWT_SECRET` 0, email utuh 0 | [12-log-server-production.txt](bukti/12-log-server-production.txt) |

Semua langkah selesai dengan exit code 0, kecuali tiga yang memang diharapkan gagal dan dicatat di bukti: `npm start` dengan secret contoh (pengaman production), dan dua `npm audit` yang melaporkan sisa 3 temuan Prisma CLI.

## Menjalankan ulang

Butuh Linux/macOS/WSL/Git Bash, Node 20.6+, MySQL/MariaDB dengan user `root`/`root` di `localhost:3306`, `curl`, dan Playwright + Chromium (`npx playwright install chromium`).

```bash
bash praditacare/docs/verifikasi-fresh-clone/verify-fresh.sh main /tmp/praditacare-fresh ./bukti
```

Skrip membuat dan menghapus database `praditacare_fresh` dan `praditacare_kosong`, memakai port 4000 dan 5173, serta mematikan lalu menyalakan ulang MariaDB lokal untuk skenario "database mati" (langkah 11c). Jangan jalankan di server yang dipakai orang lain.
