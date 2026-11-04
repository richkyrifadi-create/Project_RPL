# Deploy PraditaCare ke VPS (`https://<ip>/praditacare`)

Panduan ini membawa PraditaCare dari fresh clone sampai online di **`https://<IP-VPS>/praditacare/`**, sehingga reviewer cukup membuka satu tautan. Ada dua cara: **A. Docker** (disarankan, paling sedikit langkah) dan **B. Tanpa Docker** (Node + MariaDB + Nginx + systemd).

Kedua cara sudah diuji di sandbox Linux x86_64. Bukti lengkap ada di [`bukti/`](bukti/) dan ringkasannya di [README.md](README.md).

## 0. Yang dibutuhkan

| Kebutuhan | Minimal | Catatan |
| --- | --- | --- |
| VPS | 1 vCPU, **1 GB RAM** (2 GB lebih lega), 10 GB disk | Ubuntu 22.04/24.04 atau Debian 12, 64-bit |
| Akses | SSH sebagai user dengan `sudo` | `ssh root@<IP-VPS>` atau `ssh ubuntu@<IP-VPS>` |
| Port terbuka | 22 (SSH), 80 (HTTP), 443 (HTTPS) | Di firewall VPS dan di panel penyedia (security group) |
| Domain | Tidak wajib | Tanpa domain: HTTPS self-signed di IP. Dengan domain: Let's Encrypt (bagian 4) |

Pilihan VPS untuk mahasiswa (cek harga dan ketentuan terbaru di situs penyedia): Oracle Cloud *Always Free* (VM ARM Ampere, gratis, butuh kartu untuk verifikasi), kredit DigitalOcean/Azure dari GitHub Student Developer Pack, atau VPS lokal (IDCloudHost, Biznet Gio, Niagahoster, dsb.) paket 1 GB.

Untuk VPS 1 GB RAM, tambahkan swap dulu supaya `npm ci` dan build tidak kehabisan memori:

```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## A. Deploy dengan Docker (disarankan)

### A1. Pasang Docker dan Git

```bash
sudo apt update && sudo apt install -y git curl openssl
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER && newgrp docker
docker compose version          # harus tampil versi Docker Compose v2
```

### A2. Clone dan isi konfigurasi

```bash
git clone https://github.com/richkyrifadi-create/Project_RPL.git
cd Project_RPL/praditacare
cp deploy/.env.production.example deploy/.env
nano deploy/.env
```

Isi `deploy/.env`:

| Variabel | Isi |
| --- | --- |
| `PUBLIC_HOST` | IP publik VPS, mis. `203.0.113.10` (cek: `curl -4 ifconfig.me`) |
| `JWT_SECRET` | hasil `openssl rand -hex 48` |
| `DB_PASSWORD`, `DB_ROOT_PASSWORD` | masing-masing hasil `openssl rand -hex 16` |
| `SEED_DEMO_DATA` | `true` agar reviewer bisa login dengan akun demo (password `Pradita123!`) |

### A3. Buat sertifikat HTTPS dan nyalakan

```bash
bash deploy/scripts/buat-sertifikat.sh <IP-VPS>
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env up -d --build
```

Build pertama memakan sekitar 3–8 menit. Stack berisi tiga container: `db` (MariaDB 11.4), `app` (Node 22: API + web hasil build), dan `nginx` (HTTPS, sub-path `/praditacare`). Saat `app` menyala, migrasi database dan seed demo berjalan otomatis; seed dilewati bila data sudah ada.

```bash
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env ps     # ketiganya Up, app (healthy)
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env logs app | tail
```

### A4. Buka firewall (bila UFW aktif)

```bash
sudo ufw allow OpenSSH && sudo ufw allow 80/tcp && sudo ufw allow 443/tcp && sudo ufw enable
```

Pada Oracle Cloud/AWS/Azure, buka juga port 80 dan 443 di *security list / security group* panel penyedia.

### A5. Perintah sehari-hari

```bash
C="docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env"
$C logs -f app                  # lihat log aplikasi
$C restart app                  # restart aplikasi
git pull && $C up -d --build    # update ke versi terbaru dari GitHub
$C down                         # matikan (data tetap aman di volume)
```

## B. Deploy tanpa Docker (Node + MariaDB + Nginx + systemd)

```bash
# 1. Paket sistem: Node 22, MariaDB, Nginx
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs mariadb-server nginx git openssl

# 2. Database dan user khusus aplikasi
DBPASS=$(openssl rand -hex 16); echo "Password DB: $DBPASS"
sudo mysql -e "CREATE DATABASE praditacare; CREATE USER 'praditacare'@'localhost' IDENTIFIED BY '$DBPASS'; GRANT ALL ON praditacare.* TO 'praditacare'@'localhost'; FLUSH PRIVILEGES;"

# 3. Kode di /opt/praditacare, dijalankan user sistem "praditacare"
sudo useradd --system --no-create-home --home-dir /opt/praditacare --shell /usr/sbin/nologin praditacare
sudo git clone https://github.com/richkyrifadi-create/Project_RPL.git /opt/praditacare
sudo chown -R praditacare:praditacare /opt/praditacare
cd /opt/praditacare/praditacare

# 4. Konfigurasi .env produksi (isi password DB, JWT_SECRET, CORS_ORIGIN=https://<IP-VPS>)
sudo -u praditacare cp deploy/.env.systemd.example .env
sudo -u praditacare nano .env

# 5. Install, build untuk sub-path, migrasi, seed demo
sudo -u praditacare npm ci
sudo -u praditacare env VITE_BASE_PATH=/praditacare/ npm run build
sudo -u praditacare npm run db:deploy
sudo -u praditacare npm run db:seed          # hanya untuk demo reviewer
sudo -u praditacare mkdir -p apps/api/uploads

# 6. Service systemd
sudo cp deploy/systemd/praditacare.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now praditacare
systemctl status praditacare --no-pager      # active (running)

# 7. HTTPS self-signed + Nginx
sudo bash deploy/scripts/buat-sertifikat.sh <IP-VPS> /etc/nginx/ssl/praditacare
sudo cp deploy/nginx/praditacare-host.conf /etc/nginx/sites-available/praditacare
sudo ln -sf /etc/nginx/sites-available/praditacare /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

`VITE_BASE_PATH=/praditacare/` wajib saat build agar web memuat aset, routing, dan API dari `/praditacare/...`. Tanpa itu web hanya benar bila dibuka di root domain.

Update versi: `cd /opt/praditacare && sudo -u praditacare git pull`, lalu ulangi langkah 5 (tanpa seed) dan `sudo systemctl restart praditacare`.

## 3. Verifikasi (kedua cara)

Dari laptop atau dari VPS itu sendiri:

```bash
bash deploy/scripts/cek-online.sh https://<IP-VPS>/praditacare
```

Hasil yang diharapkan: `Hasil: 13 PASS, 0 FAIL` (redirect HTTP→HTTPS, halaman utama, aset di `/praditacare/assets/`, deep link, API health, login akun demo, header keamanan).

Cek browser + screenshot otomatis (butuh Node dan Playwright di laptop):

```bash
npm i -D playwright && npx playwright install chromium
DEPLOY_URL=https://<IP-VPS>/praditacare node docs/deployment/cek-browser-subpath.cjs ./screenshot-vps
```

Cek manual: buka `https://<IP-VPS>/praditacare/`. Karena sertifikat self-signed, browser menampilkan peringatan; klik **Advanced → Proceed** (Chrome) atau **Lanjutkan**. Login dengan tombol akun demo (Mahasiswa / Staf IT / Admin).

## 4. Opsional: domain + Let's Encrypt (tanpa peringatan browser)

Arahkan record DNS `A` domain ke IP VPS, lalu (cara B, Nginx di host):

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d care.domainanda.id
```

Untuk cara A (Docker), terbitkan sertifikat dengan `certbot certonly --standalone -d care.domainanda.id` saat container nginx dimatikan, salin `fullchain.pem` dan `privkey.pem` dari `/etc/letsencrypt/live/<domain>/` ke `deploy/nginx/certs/`, lalu `up -d`. Ubah `PUBLIC_HOST` ke domain.

## 5. Mengganti nama sub-path

Default `/praditacare`. Untuk sub-path lain (mis. `/care`): ubah `BASE_PATH` di `deploy/.env` (cara A) atau `VITE_BASE_PATH` saat build (cara B), **dan** ganti tiga kemunculan `/praditacare` di file konfigurasi Nginx yang dipakai.

## 6. Masalah umum

| Gejala | Penyebab dan solusi |
| --- | --- |
| Halaman putih, konsol: aset 404 | Web dibuild tanpa `VITE_BASE_PATH=/praditacare/`. Build ulang. |
| `502 Bad Gateway` | Aplikasi belum/ tidak menyala. Cara A: `$C logs app`. Cara B: `journalctl -u praditacare -n 50`. |
| App berhenti dengan "Konfigurasi production tidak aman" | `JWT_SECRET` masih contoh atau kurang dari 32 karakter. |
| Tidak bisa diakses dari luar, di VPS `curl -k https://localhost/praditacare/` berhasil | Port 80/443 belum dibuka di firewall atau security group penyedia. |
| `npm ci` atau build terhenti (killed) | RAM kurang. Tambahkan swap (bagian 0). |
| Upload lampiran gagal `413` | Batas Nginx; konfigurasi sudah `client_max_body_size 30m`, pastikan file Nginx yang dipakai versi repo. |
