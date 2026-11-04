#!/bin/sh
# Dijalankan setiap container app menyala: migrasi database, seed demo (opsional), lalu nyalakan server.
set -e
cd /app/apps/api

echo "[entrypoint] Menjalankan migrasi database (prisma migrate deploy)..."
i=0
until npx --no-install prisma migrate deploy; do
  i=$((i + 1))
  if [ "$i" -ge 20 ]; then echo "[entrypoint] Database tidak siap setelah 20 percobaan, berhenti."; exit 1; fi
  echo "[entrypoint] Database belum siap, coba lagi dalam 3 detik ($i/20)..."
  sleep 3
done

if [ "${SEED_DEMO_DATA:-false}" = "true" ]; then
  # seed.ts otomatis dilewati bila data sudah ada, jadi aman dijalankan ulang.
  echo "[entrypoint] SEED_DEMO_DATA=true: mengisi data demo (akun reviewer)..."
  npx --no-install tsx prisma/seed.ts
fi

echo "[entrypoint] Menyalakan PraditaCare di port ${PORT:-4000}"
exec node dist/index.js
