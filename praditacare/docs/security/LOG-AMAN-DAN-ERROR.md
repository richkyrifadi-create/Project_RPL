# Log Aman, Penyebab Error, dan Tindakan Perbaikan

Dokumen ini menjelaskan format log server PraditaCare, contoh log asli yang aman dibagikan, dan daftar error yang benar-benar muncul selama pengujian beserta penyebab dan perbaikannya. Contoh log diambil apa adanya dari [`12-log-server-production.txt`](../verifikasi-fresh-clone/bukti/12-log-server-production.txt) dan [`11-skenario-error.txt`](../verifikasi-fresh-clone/bukti/11-skenario-error.txt).

## 1. Format log

Satu kejadian = satu baris, mudah dibaca manusia dan mudah dicari dengan `grep`:

```text
<waktu UTC ISO>  <LEVEL>  <kejadian>  kunci=nilai kunci=nilai ...
```

- `LEVEL`: `INFO` (normal), `WARN` (ditolak / input salah / percobaan mencurigakan), `ERROR` (perlu ditangani admin).
- `reqId`: id 8 karakter yang juga dikirim ke browser di header `X-Request-Id`. Pada error 500/503 id ini juga ada di body respons (`RequestId`), sehingga keluhan pengguna bisa dicocokkan dengan satu baris log.
- Kode: `apps/api/src/security/SafeLog.ts`, `apps/api/src/middleware/RequestLogger.ts`.

### Yang tidak pernah dicatat

| Data | Cara dijaga |
| --- | --- |
| Password, token, `Authorization`, secret, cookie, `DATABASE_URL` | Kunci yang namanya mengandung kata-kata ini selalu ditulis `[REDACTED]`. |
| Token JWT atau `Bearer ...` yang terselip di pesan error | Diganti `[TOKEN]`. |
| Connection string database (`mysql://user:pass@...`) | Diganti `mysql://[REDACTED]`. |
| Email | Disamarkan: `b***@student.pradita.ac.id`. |
| Isi tiket, komentar, body request, query string (kata kunci pencarian) | Tidak pernah dimasukkan ke log; path dicatat tanpa `?query`. |
| Stack trace | Hanya di development; di production cukup nama error, kode, dan pesan singkat. |

Cek otomatis pada log uji production (389 baris, setelah 7 skrip uji dan skenario error): memuat `Pradita123!` **0**, token JWT **0**, nilai `JWT_SECRET` **0**, email utuh **0**.

## 2. Contoh log aman (asli dari server production)

**Server menyala**
```text
2026-11-04T10:04:14.976Z INFO  server.start mode=production port=4000 web="disajikan oleh API"
```

**Request normal** (id user dicatat, bukan nama/email)
```text
2026-11-04T10:04:16.902Z INFO  http.request reqId=6a670f6d method=GET path=/api/dashboard/action-count status=200 ms=6 user=7
```

**Login berhasil dan gagal** (email disamarkan, password tidak ada; waktu respons sama ~70 ms untuk email terdaftar maupun tidak)
```text
2026-11-04T10:04:16.884Z INFO  auth.login_success reqId=f1feab39 user=7 role=STUDENT
2026-11-04T10:04:17.107Z WARN  auth.login_failed reqId=2ec3cd45 ip=127.0.0.1 email=b***@student.pradita.ac.id reason="password salah"
2026-11-04T10:04:17.108Z WARN  http.request reqId=2ec3cd45 method=POST path=/api/auth/login status=401 ms=67
2026-11-04T10:04:17.178Z WARN  auth.login_failed reqId=d7ca14cd ip=127.0.0.1 email=t***@pradita.ac.id reason="email tidak terdaftar"
```

**Brute force diblokir**
```text
2026-11-04T10:04:17.947Z WARN  auth.login_blocked reqId=fa39b529 ip=127.0.0.1 email=p***@pradita.ac.id retryAfter=900
```

**Upload file palsu ditolak**
```text
2026-11-04T10:04:17.566Z WARN  upload.rejected reqId=74eaf74b user=7 declared=image/png reason="isi file tidak sesuai jenisnya"
```

**Ganti password**
```text
2026-11-04T10:04:38.661Z WARN  auth.change_password_failed reqId=12fa9520 user=9 reason="password lama salah"
2026-11-04T10:04:38.809Z INFO  auth.password_changed reqId=2adcdd64 user=9
```

**Error yang perlu ditangani admin** (database mati, koneksi lama diputus, tabel belum dimigrasi; tanpa stack trace, tanpa connection string)
```text
2026-11-04T10:05:04.704Z ERROR db.unavailable reqId=d1ecec1b method=POST path=/api/auth/login error=PrismaClientKnownRequestError code=P1001 message="Please make sure your database server is running at `localhost:3306`."
2026-11-04T10:05:06.732Z ERROR db.unavailable reqId=84a4ec43 method=POST path=/api/auth/login error=PrismaClientKnownRequestError code=P1017 message="Server has closed the connection."
2026-11-04T10:05:08.883Z ERROR http.unhandled_error reqId=93683d9b method=POST path=/api/auth/login error=PrismaClientKnownRequestError code=P2021 message="The table `User` does not exist in the current database."
```

Membaca log dengan cepat:

```bash
npm start 2>&1 | tee server.log          # simpan log saat deploy
grep ' ERROR ' server.log                 # semua error yang perlu ditangani
grep 'reqId=d1ecec1b' server.log          # cari satu request dari RequestId yang dilaporkan pengguna
grep 'auth.login_blocked' server.log      # percobaan brute force
```

## 3. Error yang muncul, penyebab, dan tindakan perbaikan

### 3a. Error saat aplikasi berjalan (direkam di [11-skenario-error.txt](../verifikasi-fresh-clone/bukti/11-skenario-error.txt))

| Gejala / log | Penyebab | Tindakan perbaikan |
| --- | --- | --- |
| `node: ../../.env: not found` saat `npm start` / `npm run dev` | File `.env` belum dibuat (memang tidak ikut di repo karena berisi rahasia) | `cp .env.example .env` (Windows: `copy .env.example .env`), lalu isi nilainya. |
| `Error: Konfigurasi production tidak aman: JWT_SECRET masih memakai nilai contoh dari .env.example` | `NODE_ENV=production` tetapi `JWT_SECRET` belum diganti | `npm run gen:secret`, tempel hasilnya ke `JWT_SECRET` di `.env`. Pengaman ini disengaja. |
| `ERROR server.start_failed error=Error code=EADDRINUSE message="listen EADDRINUSE: address already in use 0.0.0.0:4000" hint="port 4000 sudah dipakai proses lain; ..."` | Server dijalankan dua kali, atau aplikasi lain memakai port 4000 | Hentikan proses lama (Ctrl+C, atau `npx kill-port 4000`), atau ubah `PORT` di `.env`. |
| Respons `503 {"Message":"Database sedang tidak dapat dihubungi. Coba lagi beberapa saat lagi.","RequestId":"d1ecec1b"}` dan log `ERROR db.unavailable reqId=d1ecec1b ... code=P1001 message="Please make sure your database server is running at \`localhost:3306\`."` | MySQL/MariaDB mati atau belum menyala | `docker compose up -d` (atau nyalakan service MySQL). Aplikasi tidak perlu di-restart; tersambung lagi otomatis. |
| Log `ERROR db.unavailable ... code=P1017 message="Server has closed the connection."` pada request pertama setelah database dinyalakan ulang | Koneksi lama di pool Prisma sudah diputus oleh database | Tidak perlu tindakan; request berikutnya berhasil (`200`). Bila sering terjadi, periksa kestabilan server database. |
| Respons `500 {"Message":"Terjadi kesalahan pada server","RequestId":"93683d9b"}` dan log `ERROR http.unhandled_error reqId=93683d9b ... code=P2021 message="The table \`User\` does not exist in the current database."` | Database baru dibuat tetapi migrasi belum dijalankan | `npm run db:deploy`, lalu `npm run db:seed` bila perlu data contoh. |
| Respons `429 Terlalu banyak percobaan gagal. Coba lagi dalam 15 menit.` + log `auth.login_blocked` | 5 kali salah password untuk akun yang sama dari IP yang sama (atau 30 kali dari satu IP) | Pengguna menunggu sesuai `Retry-After`. Bila pengguna benar-benar lupa password, admin me-reset lewat menu User. Restart server menghapus hitungan (khusus darurat). |
| Respons `400 File "foto.png" ditolak: isi file bukan JPG, PNG, atau PDF yang valid.` + log `upload.rejected` | Isi file tidak cocok dengan jenisnya (mis. file lain yang diganti nama) | Pengguna mengunggah foto/PDF asli. |
| Respons `413 Data yang dikirim terlalu besar` / `Ukuran file maksimal 5 MB` | Body JSON > 1 MB atau lampiran > `MAX_UPLOAD_MB` | Perkecil file, atau naikkan `MAX_UPLOAD_MB` bila memang diperlukan. |
| Log `WARN config.insecure detail="JWT_SECRET masih memakai nilai contoh ..."` saat `npm run dev` | Development memakai `.env` contoh | Aman untuk lokal. Wajib diganti sebelum deploy. |

### 3b. Error yang muncul saat pengerjaan dan cara memperbaikinya

| Gejala | Penyebab | Tindakan yang dilakukan |
| --- | --- | --- |
| `npm install` gagal: `npm error Cannot read properties of null (reading 'edgesOut')` saat menaikkan vitest ke 4 | Bug resolusi peer dependency di npm 10.9 untuk grafik dependency vitest 4 + vite | `package-lock.json` dibuat ulang dengan npm 11 (`npx npm@11 install`). Hasilnya dicek bisa dipasang dengan npm 10 biasa (`npm ci`, lihat [02-install.txt](../verifikasi-fresh-clone/bukti/02-install.txt)). Mahasiswa cukup memakai `npm ci`. |
| Build shared gagal: `TS2345 ... Type 'unknown' is not assignable to ...` di `UserSchemas.ts` setelah upgrade Zod 4 | Di Zod 4, `z.ZodTypeAny` tidak lagi membawa tipe output, sehingga callback `superRefine` kehilangan tipe data | Parameter generik diganti `z.ZodType<z.infer<typeof UserBaseSchema>>`. |
| Body JSON > 1 MB menghasilkan `500` | Error `entity.too.large` dari Express tidak ditangani | Ditangani di `ErrorHandler` menjadi `413` (temuan S-08). |
| Cek login di browser pada `npm run dev` gagal timeout pada percobaan pertama | Saat dibuka pertama kali, Vite menyusun ulang dependency lalu me-reload halaman sehingga isian login hilang | Skrip cek browser menunggu halaman benar-benar siap (`networkidle`) sebelum mengisi form. Untuk pengguna: bila halaman berkedip sekali pada pembukaan pertama `npm run dev`, isi ulang form login. |
| Peringatan `The configuration property package.json#prisma is deprecated` saat build | Prisma 6 menyarankan `prisma.config.ts` untuk Prisma 7 | Hanya peringatan, tidak memengaruhi build. Akan ditangani saat upgrade Prisma 7. |
| Peringatan Rollup `contains an annotation that Rollup cannot interpret` (file `zod/v4/core/regexes.js`) saat build web | Komentar anotasi di dalam paket Zod 4 | Hanya peringatan dari pihak ketiga; hasil build normal. |
