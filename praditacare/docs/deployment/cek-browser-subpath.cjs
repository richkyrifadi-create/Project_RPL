// Cek browser + screenshot PraditaCare yang dideploy di sub-path (https://<host>/praditacare).
// Pemakaian: DEPLOY_URL=https://<ip>/praditacare node docs/deployment/cek-browser-subpath.cjs [folder-screenshot]
// Butuh Playwright + Chromium. Sertifikat self-signed diterima (ignoreHTTPSErrors).
const path = require("node:path");
const fs = require("node:fs");
const { chromium } = require("playwright");

const Base = (process.env.DEPLOY_URL ?? "https://127.0.0.1/praditacare").replace(/\/+$/, "");
const BasePath = new URL(Base + "/").pathname; // "/praditacare/"
const OutDir = path.resolve(process.argv[2] ?? path.join(__dirname, "bukti", "screenshots"));
const Password = "Pradita123!";
fs.mkdirSync(OutDir, { recursive: true });

let pass = 0, fail = 0;
const Check = (name, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` (${detail})` : ""}`);
  ok ? pass++ : fail++;
};

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const outside = [];

  async function NewPage(options = {}) {
    const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1366, height: 820 }, deviceScaleFactor: 2, ...options });
    const page = await context.newPage();
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("request", (r) => {
      const u = new URL(r.url());
      if (u.origin === new URL(Base).origin && !u.pathname.startsWith(BasePath)) outside.push(u.pathname);
    });
    return { context, page };
  }
  async function Shot(page, name) {
    await page.waitForLoadState("networkidle");
    // Label alamat (anotasi screenshot, bukan bagian aplikasi) agar terlihat halaman dibuka lewat sub-path.
    await page.evaluate((url) => {
      const label = document.createElement("div");
      label.textContent = `URL: ${url}`;
      label.style.cssText = "position:fixed;left:0;right:0;bottom:0;z-index:99999;padding:4px 10px;font:12px monospace;background:#0f172acc;color:#fff;text-align:center";
      document.body.appendChild(label);
    }, page.url());
    await page.screenshot({ path: path.join(OutDir, name), fullPage: false });
  }
  async function Login(page, email) {
    await page.goto(`${Base}/`, { waitUntil: "networkidle" });
    await page.waitForSelector("input[type=email]", { timeout: 30000 });
    await page.fill("input[type=email]", email);
    await page.fill("input[type=password]", Password);
    await page.click("button[type=submit]");
    await page.waitForURL((u) => !u.pathname.endsWith("/login"), { timeout: 30000 });
    await page.waitForLoadState("networkidle");
  }

  // 1. Halaman login lewat sub-path
  {
    const { context, page } = await NewPage();
    await page.goto(`${Base}/`, { waitUntil: "networkidle" });
    await page.waitForSelector("input[type=email]");
    Check("Buka /praditacare/ menampilkan halaman login", new URL(page.url()).pathname === `${BasePath}login`, page.url());
    await Shot(page, "01-login.png");

    // 2. Mahasiswa
    await Login(page, "budi@student.pradita.ac.id");
    Check("Login mahasiswa -> Tiket Saya di bawah sub-path", new URL(page.url()).pathname === `${BasePath}tiket-saya`, page.url());
    await page.getByText("Pantau status bantuan").waitFor();
    await Shot(page, "02-mahasiswa-tiket-saya.png");

    await page.click(`a[href="${BasePath}tiket-baru"]`);
    await page.waitForURL(`**${BasePath}tiket-baru`);
    Check("Navigasi menu ke Buat Tiket tetap di sub-path", true, new URL(page.url()).pathname);
    await Shot(page, "03-mahasiswa-buat-tiket.png");

    // Upload lampiran lewat API sub-path dengan token dari browser (multipart melewati Nginx)
    const token = await page.evaluate(() => localStorage.getItem("praditacare.token"));
    const list = await (await page.request.get(`${Base}/api/tickets?PageSize=1`, { headers: { Authorization: `Bearer ${token}` } })).json();
    const ticket = list.Items[0];
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
    const upload = await page.request.post(`${Base}/api/tickets/${ticket.Id}/attachments`, {
      headers: { Authorization: `Bearer ${token}` },
      multipart: { Files: { name: "bukti-deploy.png", mimeType: "image/png", buffer: png } }
    });
    Check("Upload lampiran lewat /praditacare/api (201)", upload.status() === 201, `status ${upload.status()}`);

    await page.goto(`${Base}/tiket/${ticket.Id}`, { waitUntil: "networkidle" });
    await page.getByText("bukti-deploy.png").first().waitFor({ timeout: 15000 });
    Check("Refresh langsung URL detail tiket (deep link) berhasil", true, `${BasePath}tiket/${ticket.Id}`);
    await Shot(page, "04-mahasiswa-detail-tiket.png");

    await page.getByRole("button", { name: "Keluar" }).first().click();
    await page.waitForURL(`**${BasePath}login`);
    Check("Logout kembali ke /praditacare/login", true);
    await context.close();
  }

  // 3. Staf
  {
    const { context, page } = await NewPage();
    await Login(page, "staf.it@pradita.ac.id");
    await page.goto(`${Base}/antrian`, { waitUntil: "networkidle" });
    Check("Staf membuka antrian lewat sub-path", new URL(page.url()).pathname === `${BasePath}antrian`, page.url());
    await Shot(page, "05-staf-antrian.png");
    await context.close();
  }

  // 4. Admin
  {
    const { context, page } = await NewPage();
    await Login(page, "admin@pradita.ac.id");
    await page.goto(`${Base}/dashboard`, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    Check("Admin membuka dashboard lewat sub-path", new URL(page.url()).pathname === `${BasePath}dashboard`, page.url());
    await Shot(page, "06-admin-dashboard.png");
    await page.goto(`${Base}/admin/user`, { waitUntil: "networkidle" });
    await Shot(page, "07-admin-user.png");
    await context.close();
  }

  // 5. Tampilan ponsel
  {
    const { context, page } = await NewPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await Login(page, "budi@student.pradita.ac.id");
    await Shot(page, "08-mobile-tiket-saya.png");
    await context.close();
  }

  Check("Semua request browser tetap di bawah sub-path", outside.length === 0, outside.slice(0, 5).join(", "));
  Check("Tidak ada error konsol browser", errors.length === 0, errors.slice(0, 3).join(" | "));
  console.log(`Hasil: ${pass} PASS, ${fail} FAIL. Screenshot: ${OutDir}`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("GAGAL:", e.message); process.exit(1); });
