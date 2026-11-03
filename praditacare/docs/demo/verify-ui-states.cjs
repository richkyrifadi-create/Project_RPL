// Verifikasi UI: state loading, kosong, dan gagal (error + tombol "Coba lagi").
// Kegagalan server disimulasikan dengan page.route (API asli tetap berjalan).
// Prasyarat: `npm run dev` berjalan dengan data seed. Jalankan: node docs/demo/verify-ui-states.cjs [folder-screenshot]
const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const Web = process.env.WEB_URL ?? "http://localhost:5173";
const Shots = process.argv[2] ? path.resolve(process.argv[2]) : null;
if (Shots) fs.mkdirSync(Shots, { recursive: true });
let pass = 0;
let fail = 0;
const check = (name, ok) => {
  ok ? pass++ : fail++;
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
};

async function Login(page, email) {
  await page.goto(`${Web}/login`);
  await page.fill("#email", email);
  await page.fill("#password", "Pradita123!");
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
}

const Fail500 = (route) => route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ Message: "Server sedang bermasalah" }) });
const Shown = (locator) => locator.first().waitFor({ state: "visible", timeout: 5000 }).then(() => true, () => false);
const Visible = (page, text) => Shown(page.getByText(text));
const Shot = async (page, name) => Shots && page.screenshot({ path: path.join(Shots, `${name}.png`) });

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  // Login: input kosong & password salah
  await page.goto(`${Web}/login`);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  check("login kosong menampilkan pesan field wajib", await Visible(page, "Email wajib diisi"));
  await page.fill("#email", "budi@student.pradita.ac.id");
  await page.fill("#password", "salah");
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  check("login salah menampilkan pesan error", await Visible(page, /salah/i));

  // Server mati saat login
  await page.route("**/api/auth/login", (r) => r.abort());
  await page.fill("#password", "Pradita123!");
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  check("server tidak terjangkau -> pesan 'Tidak dapat terhubung'", await Visible(page, "Tidak dapat terhubung ke server"));
  await page.unroute("**/api/auth/login");

  // Mahasiswa: buat tiket saat kategori gagal dimuat, lalu coba lagi
  await Login(page, "budi@student.pradita.ac.id");
  await page.route("**/api/categories*", Fail500);
  await page.goto(`${Web}/tiket-baru`);
  check("buat tiket: kategori gagal dimuat -> error state", await Visible(page, "Data gagal dimuat"));
  await Shot(page, "ui-01-buat-tiket-gagal-muat");
  await page.unroute("**/api/categories*");
  await page.getByRole("button", { name: "Coba lagi" }).click();
  check("buat tiket: tombol Coba lagi memuat form", await Shown(page.locator("#category")));

  // Lampiran tidak valid ditolak di sisi klien
  await page.setInputFiles("#files", { name: "tugas.docx", mimeType: "application/msword", buffer: Buffer.from("x") });
  check("lampiran .docx ditolak sebelum dikirim", await Visible(page, "tidak didukung"));
  await page.setInputFiles("#files", { name: "kosong.pdf", mimeType: "application/pdf", buffer: Buffer.alloc(0) });
  check("lampiran 0 byte ditolak", await Visible(page, "kosong.pdf"));

  // Daftar kosong
  await page.route("**/api/tickets?*", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ Items: [], Page: 1, PageSize: 10, TotalItems: 0, TotalPages: 0 }) })
  );
  await page.goto(`${Web}/tiket-saya`);
  check("tiket saya kosong -> empty state", await Visible(page, /Belum ada tiket/));
  await Shot(page, "ui-02-tiket-saya-kosong");
  await page.unroute("**/api/tickets?*");

  // Loading: respons lambat menampilkan spinner
  await page.route("**/api/tickets?*", async (r) => {
    await new Promise((res) => setTimeout(res, 1500));
    await r.continue().catch(() => undefined);
  });
  await page.goto(`${Web}/tiket-saya`);
  check("respons lambat -> spinner 'Memuat...'", await Visible(page, "Memuat..."));
  await page.waitForLoadState("networkidle");
  await page.unroute("**/api/tickets?*");

  // Detail tiket yang tidak ada
  await page.goto(`${Web}/tiket/999999`);
  check("tiket tidak ditemukan -> error state + Coba lagi", (await Visible(page, "Data gagal dimuat")) && (await Visible(page, "Coba lagi")));
  await Shot(page, "ui-03-tiket-tidak-ditemukan");

  // Admin: halaman master data gagal dimuat & daftar user kosong
  await page.getByRole("button", { name: "Keluar" }).click();
  await Login(page, "admin@pradita.ac.id");
  for (const [url, api] of [["/admin/unit", "**/api/units*"], ["/admin/kategori", "**/api/categories*"], ["/admin/user", "**/api/users*"]]) {
    await page.route(api, Fail500);
    await page.goto(`${Web}${url}`);
    check(`${url}: gagal dimuat -> error state`, await Visible(page, "Server sedang bermasalah"));
    if (url === "/admin/unit") await Shot(page, "ui-04-admin-unit-gagal-muat");
    await page.unroute(api);
    await page.getByRole("button", { name: "Coba lagi" }).click();
    check(`${url}: Coba lagi memuat tabel`, await Shown(page.locator("table")));
  }
  await page.route("**/api/users*", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
  await page.goto(`${Web}/admin/user`);
  check("/admin/user tanpa hasil filter -> empty state", await Visible(page, "Tidak ada user"));
  await page.unroute("**/api/users*");

  // Dashboard gagal dimuat
  await page.route("**/api/dashboard?*", Fail500);
  await page.goto(`${Web}/dashboard`);
  check("dashboard gagal dimuat -> pesan error", await Visible(page, "Server sedang bermasalah"));
  await page.unroute("**/api/dashboard?*");

  await browser.close();
  console.log(`\n${pass} PASS, ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
