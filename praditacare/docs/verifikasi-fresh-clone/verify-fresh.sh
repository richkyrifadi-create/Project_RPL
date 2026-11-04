#!/usr/bin/env bash
# Verifikasi nyata PraditaCare dari FRESH CLONE: clone -> install -> unit test -> build -> database -> deploy
# production -> uji security -> regresi e2e -> mode dev -> npm audit -> skenario error. Setiap langkah ditulis ke
# file bukti (perintah + output + exit code).
#
# Pemakaian (Linux/macOS/WSL/Git Bash, butuh Node 20.6+, MySQL/MariaDB root/root di localhost:3306, curl,
# dan Playwright+Chromium untuk cek browser):
#   bash verify-fresh.sh <branch> <folder-kerja-kosong> <folder-bukti>
# Contoh: bash verify-fresh.sh main /tmp/praditacare-fresh ./bukti
set -u
BRANCH=$1; WORK=$2; OUT=$3
REPO=${REPO_URL:-https://github.com/richkyrifadi-create/Project_RPL.git}
DB=praditacare_fresh
APP="$WORK/Project_RPL/praditacare"
LOGIN_CHECK="$APP/docs/verifikasi-fresh-clone/login-check.cjs"
mkdir -p "$OUT"; OUT=$(cd "$OUT" && pwd); rm -rf "$WORK"; mkdir -p "$WORK"

# run <file> <perintah>: tulis perintah, output, dan exit code ke file bukti
run() { local f="$OUT/$1"; shift; echo "\$ $*" >> "$f"; bash -c "$*" >> "$f" 2>&1; local rc=$?; echo "[exit code: $rc]" >> "$f"; echo >> "$f"; return $rc; }
note() { echo "## $2" >> "$OUT/$1"; }
header() { { echo "# $2"; echo "# Waktu: $(date -u '+%Y-%m-%d %H:%M:%S UTC') | OS: $(uname -sr) | Folder kerja: $WORK"; echo; } > "$OUT/$1"; }
seed_db() { mysql -uroot -proot -e "DROP DATABASE IF EXISTS $DB; CREATE DATABASE $DB;" && (cd "$APP" && npm run -s db:deploy >/dev/null 2>&1 && npm run -s db:seed 2>&1 | tail -1); }
stop_server() { pkill -f "node --env-file=../../.env dist/index.js"; pkill -f "concurrently -n shared,api,web"; pkill -f "bin/vite"; pkill -f "tsx watch"; sleep 1; } 2>/dev/null
wait_health() { for _ in $(seq 1 60); do curl -sf "$1" >/dev/null && return 0; sleep 1; done; return 1; }
start_prod() { (cd "$APP" && nohup npm start >> "$SERVER_LOG" 2>&1 &); wait_health http://localhost:4000/api/health; }
SERVER_LOG="$OUT/12-log-server-production.txt"
stop_server

header 01-fresh-clone.txt "Langkah 1: fresh clone repo dari GitHub (branch $BRANCH)"
run 01-fresh-clone.txt "cd $WORK && git clone --branch $BRANCH $REPO"
run 01-fresh-clone.txt "cd $WORK/Project_RPL && git log --oneline -3 && ls"
run 01-fresh-clone.txt "cd $APP && ls -a && test ! -e .env && echo '.env tidak ikut ter-clone: benar, rahasia tidak disimpan di repo'"

header 02-install.txt "Langkah 2: install dependency persis sesuai package-lock.json (npm ci)"
run 02-install.txt "node -v && npm -v"
run 02-install.txt "cd $APP && npm ci --no-fund"

header 03-unit-test.txt "Langkah 3: seluruh unit test (Vitest, tidak butuh database)"
run 03-unit-test.txt "cd $APP && npm test"

header 04-typecheck-build.txt "Langkah 4: typecheck dan build production (shared + api + web)"
run 04-typecheck-build.txt "cd $APP && npm run typecheck"
run 04-typecheck-build.txt "cd $APP && npm run build"
run 04-typecheck-build.txt "cd $APP && ls -la packages/shared/dist/index.js apps/api/dist/index.js apps/web/dist/index.html"

header 05-database.txt "Langkah 5: .env dan database (migrasi + seed)"
run 05-database.txt "cd $APP && cp .env.example .env && sed -i 's#/praditacare\"#/$DB\"#' .env && grep DATABASE_URL .env"
run 05-database.txt "mysql -uroot -proot -e 'DROP DATABASE IF EXISTS $DB; CREATE DATABASE $DB;' && echo 'database kosong $DB dibuat'"
run 05-database.txt "cd $APP && npm run db:deploy"
run 05-database.txt "cd $APP && npm run db:seed"

header 06-deploy-production.txt "Langkah 6: deploy production (npm start: web + API di satu port 4000)"
note 06-deploy-production.txt "6a. Pengaman: production DITOLAK bila JWT_SECRET masih nilai contoh"
run 06-deploy-production.txt "cd $APP && sed -i 's/^NODE_ENV=.*/NODE_ENV=\"production\"/' .env && npm start; echo \"(npm start berhenti dengan exit code \$?, sesuai harapan)\""
note 06-deploy-production.txt "6b. Buat JWT_SECRET acak (npm run gen:secret), atur CORS, lalu deploy"
run 06-deploy-production.txt "cd $APP && SECRET=\$(npm run -s gen:secret) && sed -i \"s/^JWT_SECRET=.*/JWT_SECRET=\\\"\$SECRET\\\"/\" .env && sed -i 's#^CORS_ORIGIN=.*#CORS_ORIGIN=\"http://localhost:4000\"#' .env && grep -v '^#' .env | sed -E 's/(JWT_SECRET=\")(.{6}).*(\")/\\1\\2...disamarkan...\\3/'"
header 12-log-server-production.txt "Log asli server production selama langkah 6-8 dan 11 (format log aman, ditulis oleh npm start)"
run 06-deploy-production.txt "echo 'npm start dijalankan di latar belakang; log server -> 12-log-server-production.txt'"
start_prod && echo "server siap (health OK)" >> "$OUT/06-deploy-production.txt"
run 06-deploy-production.txt "curl -s -i http://localhost:4000/api/health"
run 06-deploy-production.txt "curl -s http://localhost:4000/ | head -c 420; echo"
run 06-deploy-production.txt "curl -s -o /dev/null -w 'GET /tiket-saya (rute web, SPA fallback) -> HTTP %{http_code}\n' http://localhost:4000/tiket-saya"
run 06-deploy-production.txt "curl -s -X POST http://localhost:4000/api/auth/login -H 'Content-Type: application/json' -d '{\"Email\":\"admin@pradita.ac.id\",\"Password\":\"Pradita123!\"}' | node -e 'const j=JSON.parse(require(\"fs\").readFileSync(0));console.log(\"login admin OK, role:\",j.User.Role,\"| token diterima (\"+j.AccessToken.length+\" karakter, tidak ditampilkan)\")'"
run 06-deploy-production.txt "WEB_URL=http://localhost:4000 node $LOGIN_CHECK"

header 07-uji-security.txt "Langkah 7: uji security lewat HTTP terhadap server production (database baru di-seed)"
run 07-uji-security.txt "cd $APP && API_URL=http://localhost:4000/api node docs/security/verify-security.mjs"

header 08-regresi-e2e.txt "Langkah 8: regresi semua skrip end-to-end terhadap server production; tiap skrip memakai database yang baru di-seed karena skrip mengubah data"
mkdir -p "$WORK/pdf" && printf '%%PDF-1.4\n%%bukti\n' > "$WORK/pdf/bukti.pdf"
for S in "docs/e2e-test.mjs $WORK/pdf" docs/mvp-v1/verify-fitur-1.mjs docs/mvp-v1/verify-fitur-2.mjs docs/mvp-penyempurnaan/verify-user-stories.mjs docs/mvp-final/verify-tambahan.mjs docs/demo/verify-ui-states.cjs; do
  stop_server; seed_db >> "$OUT/08-regresi-e2e.txt"; start_prod
  run 08-regresi-e2e.txt "cd $APP && API_URL=http://localhost:4000/api WEB_URL=http://localhost:4000 node $S 2>&1 | tail -3"
done
stop_server

header 09-run-dev.txt "Langkah 9: mode development (npm run dev): web Vite :5173 + API :4000"
run 09-run-dev.txt "cd $APP && sed -i 's/^NODE_ENV=.*/NODE_ENV=\"development\"/' .env && sed -i 's#^CORS_ORIGIN=.*#CORS_ORIGIN=\"http://localhost:5173\"#' .env && grep -E '^(NODE_ENV|CORS_ORIGIN)' .env"
seed_db > /dev/null
(cd "$APP" && nohup npm run dev > "$WORK/dev.log" 2>&1 &)
wait_health http://localhost:5173/api/health
run 09-run-dev.txt "grep -E 'berjalan|VITE|Local:|server.start' $WORK/dev.log | sed 's/\x1b\[[0-9;]*m//g'"
run 09-run-dev.txt "curl -s -o /dev/null -w 'GET http://localhost:5173/ (web Vite) -> HTTP %{http_code}\n' http://localhost:5173/"
run 09-run-dev.txt "curl -s -w '  <- GET http://localhost:5173/api/health (proxy Vite ke API) HTTP %{http_code}\n' http://localhost:5173/api/health"
run 09-run-dev.txt "WEB_URL=http://localhost:5173 node $LOGIN_CHECK"
stop_server

header 10-npm-audit-sesudah.txt "Langkah 10: audit dependency setelah perbaikan"
run 10-npm-audit-sesudah.txt "cd $APP && npm audit --omit=dev; echo \"(exit code npm audit --omit=dev: \$?)\""
run 10-npm-audit-sesudah.txt "cd $APP && npm audit; echo \"(exit code npm audit: \$?; sisa temuan ada di Prisma CLI, lihat HASIL-UJI-SECURITY.md)\""

header 11-skenario-error.txt "Langkah 11: skenario error nyata, log aman yang muncul, dan perbaikannya"
cd "$APP"; sed -i 's/^NODE_ENV=.*/NODE_ENV="production"/; s#^CORS_ORIGIN=.*#CORS_ORIGIN="http://localhost:4000"#' .env; seed_db > /dev/null
note 11-skenario-error.txt "11a. File .env tidak ada"
run 11-skenario-error.txt "cd $APP && mv .env .env.simpan && npm start 2>&1 | grep -v '^npm error' ; mv .env.simpan .env && echo 'PERBAIKAN: cp .env.example .env lalu isi nilainya'"
note 11-skenario-error.txt "11b. Port 4000 sudah dipakai (server dijalankan dua kali)"
start_prod
run 11-skenario-error.txt "cd $APP && npm start 2>&1 | grep -E 'server.start_failed' ; echo 'PERBAIKAN: hentikan proses lama (Ctrl+C / kill) atau ubah PORT di .env'"
note 11-skenario-error.txt "11c. Database mati saat aplikasi berjalan"
run 11-skenario-error.txt "mysqladmin -uroot -proot shutdown && sleep 2 && echo 'database dimatikan'"
run 11-skenario-error.txt "curl -s -w '  <- HTTP %{http_code}\n' -X POST http://localhost:4000/api/auth/login -H 'Content-Type: application/json' -d '{\"Email\":\"budi@student.pradita.ac.id\",\"Password\":\"Pradita123!\"}'"
run 11-skenario-error.txt "sleep 1; grep -E 'db.unavailable' $SERVER_LOG | tail -1"
run 11-skenario-error.txt "(mysqld_safe --user=mysql > /dev/null 2>&1 &) ; for i in \$(seq 1 30); do mysqladmin -uroot -proot ping >/dev/null 2>&1 && break; sleep 1; done; echo 'PERBAIKAN: database dinyalakan lagi (docker compose up -d / service mysql start)'"
run 11-skenario-error.txt "for n in 1 2; do curl -s -o /dev/null -w \"login ke-\$n setelah database hidup lagi -> HTTP %{http_code}\n\" -X POST http://localhost:4000/api/auth/login -H 'Content-Type: application/json' -d '{\"Email\":\"budi@student.pradita.ac.id\",\"Password\":\"Pradita123!\"}'; done; echo '(tanpa restart aplikasi; percobaan pertama bisa 503 P1017 karena koneksi lama di pool sudah diputus database)'"
run 11-skenario-error.txt "grep -E 'db.unavailable' $SERVER_LOG | tail -1"
stop_server
note 11-skenario-error.txt "11d. Database baru dibuat tetapi migrasi belum dijalankan"
run 11-skenario-error.txt "mysql -uroot -proot -e 'DROP DATABASE IF EXISTS praditacare_kosong; CREATE DATABASE praditacare_kosong;' && echo 'database kosong praditacare_kosong dibuat'"
(cd "$APP" && DATABASE_URL="mysql://root:root@localhost:3306/praditacare_kosong" nohup npm start >> "$SERVER_LOG" 2>&1 &); wait_health http://localhost:4000/api/health
run 11-skenario-error.txt "curl -s -w '  <- HTTP %{http_code}\n' -X POST http://localhost:4000/api/auth/login -H 'Content-Type: application/json' -d '{\"Email\":\"budi@student.pradita.ac.id\",\"Password\":\"Pradita123!\"}'"
run 11-skenario-error.txt "sleep 1; grep 'http.unhandled_error' $SERVER_LOG | tail -1"
run 11-skenario-error.txt "cd $APP && DATABASE_URL='mysql://root:root@localhost:3306/praditacare_kosong' npx -w @praditacare/api prisma migrate deploy 2>&1 | tail -1 && echo 'PERBAIKAN: npm run db:deploy (lalu npm run db:seed bila perlu data contoh)'"
run 11-skenario-error.txt "curl -s -w '  <- HTTP %{http_code} (akun belum ada karena belum di-seed, tapi tidak error 500 lagi)\n' -X POST http://localhost:4000/api/auth/login -H 'Content-Type: application/json' -d '{\"Email\":\"budi@student.pradita.ac.id\",\"Password\":\"Pradita123!\"}'"
stop_server
mysql -uroot -proot -e 'DROP DATABASE IF EXISTS praditacare_kosong;'

note 12-log-server-production.txt "Cek otomatis: log TIDAK memuat password, token JWT, JWT_SECRET, atau email utuh"
SECRET=$(grep '^JWT_SECRET=' "$APP/.env" | cut -d'"' -f2)
{
  echo "jumlah baris log            : $(grep -c '' "$SERVER_LOG")"
  echo "memuat password 'Pradita123!': $(grep -c 'Pradita123!' "$SERVER_LOG")"
  echo "memuat token JWT (eyJ...)    : $(grep -c 'eyJ' "$SERVER_LOG")"
  echo "memuat nilai JWT_SECRET      : $(grep -cF "$SECRET" "$SERVER_LOG")"
  echo "memuat email utuh            : $(grep -cE '[A-Za-z0-9._%+-]{2,}@[a-z0-9.-]+\.[a-z]{2,}' "$SERVER_LOG")"
} >> "$SERVER_LOG"
echo SELESAI
