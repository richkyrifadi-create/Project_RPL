# Deploy PraditaCare ke Raspberry Pi / Orange Pi (`https://<ip>/praditacare`)

Raspberry Pi dan Orange Pi memakai prosesor **ARM**. Paket deploy PraditaCare sama dengan VPS (Docker atau systemd), jadi langkah intinya ada di [DEPLOY-VPS.md](DEPLOY-VPS.md). Dokumen ini berisi hal yang **berbeda** untuk board ARM.

## 1. Board dan OS yang didukung

| Board | Status | OS yang disarankan |
| --- | --- | --- |
| Raspberry Pi 5 / 4 (2 GB RAM ke atas) | Didukung | Raspberry Pi OS Lite **64-bit** (Bookworm) atau Ubuntu Server 24.04 arm64 |
| Raspberry Pi 3B/3B+ (1 GB) | Bisa, lambat | Raspberry Pi OS Lite **64-bit** + swap 2 GB |
| Orange Pi 5 / 3 / Zero 3 (arm64) | Didukung | Armbian atau Ubuntu Server arm64 dari situs Orange Pi |
| Board / OS **32-bit** (armv7, mis. Pi 2, Raspberry Pi OS 32-bit) | **Tidak didukung** | Prisma (ORM database) tidak menyediakan engine untuk ARM 32-bit |

Cek arsitektur sebelum mulai:

```bash
uname -m            # harus aarch64 (64-bit). Jika armv7l, pasang ulang OS versi 64-bit.
free -h             # RAM; 2 GB ke atas paling nyaman
```

## 2. Persiapan board

1. Tulis OS 64-bit ke microSD/SSD dengan **Raspberry Pi Imager** (untuk Orange Pi: balenaEtcher + image Armbian). Di Imager, aktifkan SSH dan buat user lewat menu *Edit settings*.
2. Nyalakan board, sambungkan ke router dengan **kabel LAN** (lebih stabil daripada Wi-Fi), lalu cari IP-nya dari halaman admin router atau `ping raspberrypi.local`.
3. SSH dan perbarui sistem:

```bash
ssh pi@<IP-board>
sudo apt update && sudo apt full-upgrade -y
```

4. Tambah swap (wajib untuk RAM 1–2 GB, karena `npm ci` dan build web cukup berat):

```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

Di Raspberry Pi OS yang memakai `dphys-swapfile`, cara alternatifnya: ubah `CONF_SWAPSIZE=2048` di `/etc/dphys-swapfile`, lalu `sudo systemctl restart dphys-swapfile`.

## 3. Deploy

Ikuti **[DEPLOY-VPS.md](DEPLOY-VPS.md) bagian A (Docker)** persis, dengan `PUBLIC_HOST` = IP board. Tidak ada yang perlu diubah untuk ARM:

- `node:22-bookworm-slim`, `mariadb:11.4`, dan `nginx:1.27-alpine` semuanya tersedia untuk `linux/arm64`, dan Docker otomatis memilih versi ARM.
- Image aplikasi dibuild **langsung di board**, sehingga Prisma mengunduh engine `linux-arm64-openssl-3.0.x` yang cocok.
- Build pertama di Raspberry Pi 4 sekitar 10–20 menit (di Pi 5 lebih cepat). Ini normal.

Cara B (tanpa Docker) juga berjalan: Node 22 dari NodeSource tersedia untuk arm64, MariaDB dan Nginx dari `apt`. Pada RAM 1–2 GB, cara B sedikit lebih hemat memori karena tidak ada overhead Docker.

Agar hemat memori di board kecil, MariaDB bisa dibatasi dengan membuat `/etc/mysql/conf.d/hemat.cnf` (cara B) berisi:

```ini
[mysqld]
innodb_buffer_pool_size = 64M
max_connections = 30
performance_schema = OFF
```

## 4. Supaya reviewer bisa membuka dari internet

Berbeda dengan VPS, board di rumah/kampus berada **di belakang router (NAT)**. IP seperti `192.168.x.x` hanya bisa dibuka dari jaringan yang sama.

| Kondisi | Cara |
| --- | --- |
| Reviewer berada di jaringan yang sama (mis. demo di kelas, satu Wi-Fi) | Cukup `https://<IP-LAN-board>/praditacare/`, tanpa langkah tambahan |
| Internet rumah punya **IP publik** | Di router, buat *port forwarding* TCP 80 dan 443 ke IP LAN board. Atur IP LAN board statis (DHCP reservation). Tautan reviewer: `https://<IP-publik>/praditacare/` (cek IP publik: `curl -4 ifconfig.me`) |
| ISP memakai **CGNAT** (umum di IndiHome/ISP seluler; port forwarding tidak berhasil) | Pakai tunnel, mis. Cloudflare Tunnel atau Tailscale Funnel. Hasilnya berupa domain (`https://nama.trycloudflare.com/praditacare/`), bukan IP. Bila format `https://<ip>/...` wajib, pakai VPS. |

Cara mengecek CGNAT: bandingkan IP WAN di halaman router dengan hasil `curl -4 ifconfig.me`. Jika berbeda (atau IP WAN berawalan `100.64.`–`100.127.`), berarti CGNAT.

## 5. Verifikasi

Sama dengan VPS:

```bash
bash deploy/scripts/cek-online.sh https://<IP-board>/praditacare        # harus 13 PASS, 0 FAIL
DEPLOY_URL=https://<IP-board>/praditacare node docs/deployment/cek-browser-subpath.cjs ./screenshot-pi
```

Pantau suhu dan memori saat demo: `vcgencmd measure_temp` (Raspberry Pi) dan `free -h`. Suhu di atas ~80°C membuat CPU melambat; gunakan heatsink atau kipas.

## 6. Masalah khusus ARM

| Gejala | Penyebab dan solusi |
| --- | --- |
| `exec format error` | Image dibuat di mesin lain (x86). Build ulang di board: `up -d --build`. |
| Prisma: `could not find engine for linux-arm` atau `armv7` | OS 32-bit. Pasang ulang OS **64-bit**. |
| Build berhenti `Killed` / board hang | RAM habis. Tambah swap 2 GB, tutup aplikasi lain, atau build di Pi 4/5. |
| Jam salah sehingga sertifikat "belum berlaku" | Board tanpa baterai RTC. Pastikan NTP aktif: `timedatectl` (System clock synchronized: yes). |
