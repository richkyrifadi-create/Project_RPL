#!/usr/bin/env bash
# Smoke test deploy: memastikan https://<host>/praditacare hidup dan bekerja end-to-end.
# Pemakaian: bash deploy/scripts/cek-online.sh https://<ip>/praditacare
# Self-signed diterima (-k). Login memakai akun demo bila SEED_DEMO_DATA=true.
set -u
BASE=${1:?Pemakaian: cek-online.sh https://<ip>/praditacare}
BASE=${BASE%/}
EMAIL=${CEK_EMAIL:-budi@student.pradita.ac.id}
PASSWORD=${CEK_PASSWORD:-Pradita123!}
PASS=0; FAIL=0
cek() { if [ "$2" = "$3" ]; then echo "PASS  $1"; PASS=$((PASS+1)); else echo "FAIL  $1 (dapat: $3, harap: $2)"; FAIL=$((FAIL+1)); fi; }
code() { curl -k -s -o /dev/null -w '%{http_code}' "$@"; }
ORIGIN=$(echo "$BASE" | sed -E 's#^(https?://[^/]+).*#\1#')
HTTP_ORIGIN=$(echo "$ORIGIN" | sed 's#^https://#http://#')

echo "Cek deploy: $BASE  ($(date -u '+%Y-%m-%d %H:%M:%S UTC'))"
cek "HTTP dialihkan ke HTTPS"                   "301" "$(code "$HTTP_ORIGIN/praditacare/")"
cek "Root / dialihkan ke /praditacare/"          "302" "$(code "$ORIGIN/")"
cek "/praditacare tanpa garis miring dialihkan"  "301" "$(code "$BASE")"
cek "Halaman utama /praditacare/ (200)"          "200" "$(code "$BASE/")"
HTML=$(curl -k -s "$BASE/")
cek "HTML memuat aset dari /praditacare/assets/" "ya" "$(echo "$HTML" | grep -q 'src="/praditacare/assets/' && echo ya || echo tidak)"
ASSET=$(echo "$HTML" | grep -o '/praditacare/assets/[^"]*\.js' | head -1)
cek "File JavaScript aplikasi termuat"           "200" "$(code "$ORIGIN$ASSET")"
cek "Route React langsung (/praditacare/login)"  "200" "$(code "$BASE/login")"
cek "API health /praditacare/api/health"         '{"Status":"OK"}' "$(curl -k -s "$BASE/api/health")"
cek "API tanpa token ditolak (401)"              "401" "$(code "$BASE/api/tickets")"
TOKEN=$(curl -k -s -X POST "$BASE/api/auth/login" -H 'Content-Type: application/json' \
  -d "{\"Email\":\"$EMAIL\",\"Password\":\"$PASSWORD\"}" | sed -n 's/.*"AccessToken":"\([^"]*\)".*/\1/p')
cek "Login akun demo $EMAIL"                     "ada" "$([ -n "$TOKEN" ] && echo ada || echo kosong)"
cek "Daftar tiket dengan token (200)"            "200" "$(code -H "Authorization: Bearer $TOKEN" "$BASE/api/tickets")"
cek "Header keamanan HSTS ada"                   "ya" "$(curl -k -sI "$BASE/" | grep -qi '^strict-transport-security' && echo ya || echo tidak)"
cek "Versi Nginx disembunyikan"                  "ya" "$(curl -k -sI "$BASE/" | grep -i '^server:' | grep -qv '[0-9]' && echo ya || echo tidak)"
echo "Hasil: $PASS PASS, $FAIL FAIL"
[ "$FAIL" -eq 0 ]
