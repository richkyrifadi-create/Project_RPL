// Merekam video demo alur lengkap PraditaCare dengan Playwright (headless Chromium).
// Prasyarat: database baru di-seed (npm run db:reset) dan `npm run dev` berjalan (web :5173).
// Jalankan: node docs/demo/record-demo.cjs <folder-output>
// Hasil: <folder-output>/demo.webm. Konversi ke mp4: lihat docs/demo/README.md.
const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const Web = process.env.WEB_URL ?? "http://localhost:5173";
const Out = path.resolve(process.argv[2] ?? "demo-out");
const Password = "Pradita123!";
const Pace = Number(process.env.DEMO_PACE ?? 1); // >1 = lebih lambat

fs.mkdirSync(Out, { recursive: true });
const photo = path.join(Out, "foto-ac-bocor.png");
// Foto contoh untuk lampiran (gambar polos dibuat dengan ffmpeg).
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "lavfi", "-i", "color=c=0x5b7fa6:s=640x480", "-frames:v", "1", photo]);

const wait = (ms) => new Promise((r) => setTimeout(r, ms * Pace));

async function Caption(page, title, sub = "") {
  await page.evaluate(
    ([t, s]) => {
      let box = document.getElementById("demo-caption");
      if (!box) {
        box = document.createElement("div");
        box.id = "demo-caption";
        box.style.cssText =
          "position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:99999;max-width:900px;" +
          "background:rgba(15,23,42,.92);color:#fff;padding:12px 22px;border-radius:12px;font:600 18px/1.35 system-ui,sans-serif;" +
          "box-shadow:0 8px 24px rgba(0,0,0,.25);text-align:center;pointer-events:none";
        document.body.appendChild(box);
      }
      box.innerHTML = `${t}${s ? `<div style="font-weight:400;font-size:14px;opacity:.85;margin-top:4px">${s}</div>` : ""}`;
    },
    [title, sub]
  );
}

// Caption ikut hilang saat pindah halaman (SPA tetap, tapi login/logout bisa memuat ulang); helper ini memasang lagi.
async function Step(page, title, sub, ms = 2600) {
  await Caption(page, title, sub);
  await wait(ms);
}

async function Type(locator, text) {
  await locator.click();
  await locator.pressSequentially(text, { delay: 25 * Pace });
}

async function Login(page, email, who) {
  await page.goto(`${Web}/login`);
  await page.waitForSelector("#email");
  await Step(page, `Login sebagai ${who}`, email, 1500);
  await Type(page.locator("#email"), email);
  await Type(page.locator("#password"), Password);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
  await page.waitForLoadState("networkidle");
}

async function Logout(page) {
  await page.getByRole("button", { name: "Keluar" }).click();
  await page.waitForURL(/\/login/);
}

async function OpenTicket(page, title) {
  await page.getByText(title).first().click();
  await page.waitForURL(/\/tiket\/\d+/);
  await page.waitForLoadState("networkidle");
}

async function ChangeStatus(page, label, note) {
  await page.getByRole("button", { name: label, exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.waitFor();
  if (note) await Type(dialog.locator("textarea"), note);
  await wait(800);
  await dialog.getByRole("button", { name: /Ya, lanjutkan|Simpan|Ubah/ }).click();
  await dialog.waitFor({ state: "detached" });
  await page.waitForLoadState("networkidle");
}

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 760 },
    recordVideo: { dir: Out, size: { width: 1280, height: 760 } }
  });
  const page = await context.newPage();
  const title = "AC ruang 301 bocor dan meneteskan air";

  // 1. Login gagal lalu berhasil (mahasiswa)
  await page.goto(`${Web}/login`);
  await page.waitForSelector("#email");
  await Step(page, "PraditaCare: layanan pengaduan & bantuan mahasiswa Pradita", "Demo alur lengkap: lapor → proses → balas → selesai → nilai → dashboard", 3500);
  await Type(page.locator("#email"), "budi@student.pradita.ac.id");
  await Type(page.locator("#password"), "salah123");
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await Step(page, "Input tidak valid: password salah ditolak", "Pesan error jelas, tanpa membocorkan akun mana yang salah", 2500);
  await page.locator("#password").fill("");
  await Type(page.locator("#password"), Password);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await page.waitForURL(/tiket-saya/);
  await page.waitForLoadState("networkidle");
  await Step(page, "Mahasiswa: halaman Tiket Saya", "Daftar laporan milik sendiri dengan status dan tanggal");

  // 2. Buat tiket: validasi lalu sukses
  await page.getByRole("link", { name: /Buat Tiket/ }).first().click();
  await page.waitForSelector("#category");
  await Step(page, "Buat laporan baru", "Kategori menentukan unit tujuan dan batas waktu (SLA) secara otomatis", 2000);
  await page.getByRole("button", { name: "Kirim Tiket" }).click();
  await Step(page, "Validasi form: field wajib diberi pesan error", "Form kosong tidak dikirim ke server");
  const catId = await page.locator("#category option", { hasText: "Kerusakan Fasilitas" }).getAttribute("value");
  await page.selectOption("#category", catId);
  await wait(600);
  await page.getByRole("button", { name: "Kirim Tiket" }).click();
  await Step(page, "Kategori fasilitas wajib mengisi lokasi", "Unit Sarana Prasarana, SLA 24 jam");
  await Type(page.locator("#location"), "Gedung A Lantai 3, Ruang 301");
  await Type(page.locator("#title"), title);
  await Type(page.locator("#description"), "Sejak pagi AC di ruang 301 meneteskan air ke meja dosen. Lantai licin dan kabel proyektor dekat genangan.");
  await page.getByRole("button", { name: "Tinggi", exact: true }).click().catch(() => undefined);
  await page.setInputFiles("#files", photo);
  await Step(page, "Lampirkan foto bukti (JPG/PNG/PDF, maks 5 file × 5 MB)", "", 2000);
  await page.getByRole("button", { name: "Kirim Tiket" }).click();
  await page.waitForURL(/\/tiket\/\d+/);
  await page.waitForLoadState("networkidle");
  await Step(page, "Tiket terkirim: nomor PC-YYYY-NNNNNN, status Terbuka, SLA berjalan", "Timeline mencatat setiap perubahan", 3500);
  const ticketUrl = page.url();
  await Logout(page);

  // 3. Staf Sarpras memproses
  await Login(page, "staf.sarpras@pradita.ac.id", "Staf Sarana Prasarana");
  await Step(page, "Staf: Antrian Tiket unit Sarpras", "Tab Belum Ditugaskan / Tugas Saya / Semua; urut batas SLA terdekat; badge jumlah tindakan di navbar", 3200);
  await OpenTicket(page, title);
  await Step(page, "Staf membuka detail tiket", "Panel Tindakan: ubah status, petugas, prioritas, pindah kategori", 2500);
  await ChangeStatus(page, "Diproses");
  await Step(page, "Status → Diproses (dengan dialog konfirmasi)", "Staf otomatis menjadi petugas; respons pertama tercatat untuk metrik SLA");
  const comment = page.getByPlaceholder("Tulis komentar...");
  await Type(comment, "Teknisi cek: saluran pembuangan AC tersumbat, perlu suku cadang.");
  await page.getByLabel("Catatan internal").check();
  await page.getByRole("button", { name: "Kirim", exact: true }).click();
  await page.waitForLoadState("networkidle");
  await Step(page, "Catatan internal (kuning) tidak pernah terlihat oleh pelapor", "");
  await page.getByRole("button", { name: "Menunggu Pelapor", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.waitFor();
  await dialog.getByRole("button", { name: /Ya, lanjutkan/ }).click();
  await Step(page, "Status Menunggu Pelapor wajib catatan", "Validasi aturan bisnis US2 di dialog", 2200);
  await Type(dialog.locator("textarea"), "Mohon konfirmasi: apakah AC masih dipakai untuk kuliah jam 13.00?");
  await dialog.getByRole("button", { name: /Ya, lanjutkan/ }).click();
  await dialog.waitFor({ state: "detached" });
  await page.waitForLoadState("networkidle");
  await Step(page, "Tiket menunggu jawaban pelapor", "");
  await Logout(page);

  // 4. Mahasiswa membalas
  await Login(page, "budi@student.pradita.ac.id", "Mahasiswa (pelapor)");
  await page.goto(ticketUrl);
  await page.waitForLoadState("networkidle");
  await Step(page, "Pelapor melihat permintaan staf (catatan internal tidak tampil)", "", 2800);
  await Type(page.getByPlaceholder("Tulis komentar..."), "Ya, ruang 301 dipakai jam 13.00. Mohon dipindah dulu kalau belum bisa diperbaiki.");
  await page.getByRole("button", { name: "Kirim", exact: true }).click();
  await page.waitForLoadState("networkidle");
  await Step(page, "Balasan pelapor otomatis mengembalikan status ke Diproses", "");
  await Logout(page);

  // 5. Staf menyelesaikan
  await Login(page, "staf.sarpras@pradita.ac.id", "Staf Sarana Prasarana");
  await page.goto(ticketUrl);
  await page.waitForLoadState("networkidle");
  await ChangeStatus(page, "Selesai", "Saluran pembuangan dibersihkan dan selang diganti. AC normal kembali.");
  await Step(page, "Status → Selesai (catatan wajib); waktu penyelesaian & status SLA tercatat", "", 3000);
  await Logout(page);

  // 6. Mahasiswa menilai
  await Login(page, "budi@student.pradita.ac.id", "Mahasiswa (pelapor)");
  await page.goto(ticketUrl);
  await page.waitForLoadState("networkidle");
  await Step(page, "Pelapor bisa memberi penilaian atau Buka Kembali (≤ 7 hari)", "", 2600);
  await page.getByRole("button", { name: "Rating 2" }).click();
  await page.getByRole("button", { name: /Kirim Penilaian/ }).click();
  await Step(page, "Rating rendah (1–2) wajib alasan", "Validasi aturan bisnis US4", 2500);
  await page.getByRole("button", { name: "Rating 5" }).click();
  await Type(page.getByPlaceholder(/Komentar/), "Cepat ditangani, terima kasih!");
  await page.getByRole("button", { name: /Kirim Penilaian/ }).click();
  await page.waitForLoadState("networkidle");
  await Step(page, "Penilaian ★★★★★ menutup tiket (status Ditutup)", "Tiket yang tidak dinilai ditutup otomatis setelah 7 hari", 3200);
  await Logout(page);

  // 7. Admin
  await Login(page, "admin@pradita.ac.id", "Admin");
  await page.goto(`${Web}/dashboard`);
  await page.waitForLoadState("networkidle");
  await Step(page, "Admin: Dashboard", "Ringkasan tiket, respons & penyelesaian rata-rata, kepatuhan SLA, rating", 3200);
  await page.mouse.wheel(0, 500);
  await Step(page, "Tabel per unit, per kategori, dan lokasi paling sering bermasalah", "Filter rentang tanggal dan unit", 3200);
  await page.mouse.wheel(0, 700);
  await wait(1500);
  await page.goto(`${Web}/antrian`);
  await page.waitForLoadState("networkidle");
  await Step(page, "Admin melihat semua tiket", "Tiket kategori rahasia (Konseling) hanya menampilkan nomor, status, dan SLA", 3200);
  await page.goto(`${Web}/admin/kategori`);
  await page.waitForLoadState("networkidle");
  await Step(page, "Manajemen kategori: unit tujuan, SLA, rahasia, wajib lokasi", "Nonaktifkan, bukan hapus, bila sudah dipakai tiket", 2800);
  await page.getByRole("button", { name: "+ Tambah Kategori" }).click();
  await page.getByRole("dialog").waitFor();
  await page.getByRole("dialog").getByRole("button", { name: "Simpan" }).click();
  await Step(page, "Validasi form admin", "", 2300);
  await page.keyboard.press("Escape");
  await page.goto(`${Web}/admin/user`);
  await page.waitForLoadState("networkidle");
  await Step(page, "Manajemen user: filter peran & unit, nonaktifkan, reset password", "Tidak ada registrasi mandiri", 2800);
  await page.goto(`${Web}/admin/unit`);
  await page.waitForLoadState("networkidle");
  await Step(page, "Manajemen unit", "", 2200);
  await Logout(page);
  await Step(page, "Selesai — terima kasih!", "PraditaCare · MVP final", 2500);

  await context.close();
  await browser.close();
  const video = fs.readdirSync(Out).find((f) => f.endsWith(".webm") && f !== "demo.webm");
  fs.renameSync(path.join(Out, video), path.join(Out, "demo.webm"));
  console.log(`Video: ${path.join(Out, "demo.webm")}`);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
