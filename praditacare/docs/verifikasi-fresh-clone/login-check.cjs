// Cek browser (Chromium/Playwright): buka web, login sebagai mahasiswa, pastikan halaman Tiket Saya tampil tanpa error konsol.
const { chromium } = require("playwright");
(async () => {
  const web = process.env.WEB_URL ?? "http://localhost:4000";
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(web, { waitUntil: "networkidle" });
  await page.waitForSelector("input[type=email]", { timeout: 30000 });
  await page.fill("input[type=email]", "budi@student.pradita.ac.id");
  await page.fill("input[type=password]", "Pradita123!");
  await page.click("button[type=submit]");
  await page.getByText("Pantau status bantuan").waitFor({ timeout: 30000 });
  console.log(`browser: buka ${web} -> login budi -> ${new URL(page.url()).pathname} tampil "Tiket Saya"`);
  console.log(`error konsol browser: ${errors.length ? errors.join(" | ") : "tidak ada"}`);
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})().catch((e) => { console.error("GAGAL:", e.message); process.exit(1); });
