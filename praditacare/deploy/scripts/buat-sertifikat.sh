#!/usr/bin/env bash
# Membuat sertifikat HTTPS self-signed (berlaku 365 hari) untuk IP atau domain server.
# Pemakaian: bash deploy/scripts/buat-sertifikat.sh <IP-atau-domain> [folder-tujuan]
# Default folder tujuan: deploy/nginx/certs (dipakai Nginx Docker).
# Untuk Nginx di host (systemd): bash deploy/scripts/buat-sertifikat.sh <IP> /etc/nginx/ssl/praditacare
set -euo pipefail
HOST=${1:?Pemakaian: buat-sertifikat.sh <IP-atau-domain> [folder-tujuan]}
DIR=${2:-"$(cd "$(dirname "$0")/.." && pwd)/nginx/certs"}
mkdir -p "$DIR"

if [[ $HOST =~ ^[0-9.]+$ || $HOST == *:* ]]; then SAN="IP:$HOST"; else SAN="DNS:$HOST"; fi

openssl req -x509 -nodes -newkey rsa:2048 -days 365 \
  -keyout "$DIR/privkey.pem" -out "$DIR/fullchain.pem" \
  -subj "/CN=$HOST/O=PraditaCare" \
  -addext "subjectAltName=$SAN,DNS:localhost,IP:127.0.0.1"
chmod 644 "$DIR/fullchain.pem"
chmod 640 "$DIR/privkey.pem" 2>/dev/null || true
# Nginx Docker membaca file sebagai user nginx: izinkan baca bila folder default.
[[ $DIR == */deploy/nginx/certs ]] && chmod 644 "$DIR/privkey.pem"
echo "Sertifikat self-signed untuk $HOST dibuat di $DIR (fullchain.pem, privkey.pem)."
openssl x509 -in "$DIR/fullchain.pem" -noout -subject -enddate
