// Uji keamanan PraditaCare lewat HTTP terhadap server yang sedang berjalan (npm run dev atau npm start).
// Butuh database yang baru di-seed. Pemakaian: node docs/security/verify-security.mjs
// Default API_URL http://localhost:4000/api (bisa diganti: API_URL=http://localhost:5173/api).
import crypto from "node:crypto";

const B = process.env.API_URL ?? "http://localhost:4000/api";
let pass = 0, fail = 0;
const check = (name, ok, extra = "") => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"} ${name}${ok ? "" : ` -> ${extra}`}`); };

async function call(token, method, path, body, init = {}) {
  const headers = { ...(init.headers ?? {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload = init.raw;
  if (body instanceof FormData) payload = body;
  else if (body !== undefined) { headers["Content-Type"] = "application/json"; payload = JSON.stringify(body); }
  else if (init.raw !== undefined) headers["Content-Type"] = "application/json";
  const r = await fetch(B + path, { method, headers, body: payload });
  const text = await r.text();
  let json; try { json = JSON.parse(text); } catch { json = text; }
  return { status: r.status, headers: r.headers, body: json, text };
}
const login = async (email, password = "Pradita123!") => (await call(null, "POST", "/auth/login", { Email: email, Password: password })).body.AccessToken;
const b64url = (v) => Buffer.from(typeof v === "string" ? v : JSON.stringify(v)).toString("base64url");
const NoStack = (r) => !/\bat .+\(.+:\d+:\d+\)|node_modules|\.ts:\d+/.test(r.text);

const PngBytes = Buffer.from("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8cfc0f01f0005000201a5f2b6e70000000049454e44ae426082", "hex");

console.log(`== Uji security PraditaCare terhadap ${B}\n`);

// 1. Header keamanan
console.log("-- 1. Header keamanan (helmet)");
const health = await call(null, "GET", "/health");
check("X-Content-Type-Options: nosniff", health.headers.get("x-content-type-options") === "nosniff");
check("X-Frame-Options ada (anti clickjacking)", !!health.headers.get("x-frame-options"));
check("Content-Security-Policy ada", !!health.headers.get("content-security-policy"));
check("Referrer-Policy ada", !!health.headers.get("referrer-policy"));
check("X-Powered-By (Express) disembunyikan", !health.headers.get("x-powered-by"));
check("X-Request-Id dikirim untuk pelacakan log", /^[0-9a-f]{8}$/.test(health.headers.get("x-request-id") ?? ""));

// 2. Autentikasi (token)
console.log("\n-- 2. Autentikasi");
check("tanpa token -> 401", (await call(null, "GET", "/tickets")).status === 401);
const forged = `${b64url({ alg: "HS256", typ: "JWT" })}.${b64url({ sub: "1", exp: 9999999999 })}.${crypto.createHmac("sha256", "tebakan-secret").update("x").digest("base64url")}`;
check("token palsu (secret salah) -> 401", (await call(forged, "GET", "/auth/me")).status === 401);
const algNone = `${b64url({ alg: "none", typ: "JWT" })}.${b64url({ sub: "1" })}.`;
check("token alg=none -> 401", (await call(algNone, "GET", "/auth/me")).status === 401);
const wrongLogin = await call(null, "POST", "/auth/login", { Email: "budi@student.pradita.ac.id", Password: "salah-sekali" });
const unknownLogin = await call(null, "POST", "/auth/login", { Email: "tidakada@pradita.ac.id", Password: "salah-sekali" });
check("password salah & email tak terdaftar -> pesan sama (tidak bocorkan akun)", wrongLogin.status === 401 && unknownLogin.status === 401 && wrongLogin.body.Message === unknownLogin.body.Message);

const budi = await login("budi@student.pradita.ac.id");
const siti = await login("siti@student.pradita.ac.id");
const staffIt = await login("staf.it@pradita.ac.id");
const admin = await login("admin@pradita.ac.id");
check("login akun seed berhasil", !!(budi && siti && staffIt && admin));
const me = await call(budi, "GET", "/auth/me");
check("/auth/me tidak mengirim PasswordHash", me.status === 200 && !/PasswordHash/i.test(me.text));
const users = await call(admin, "GET", "/users");
check("/users (admin) tidak mengirim PasswordHash", users.status === 200 && !/PasswordHash/i.test(users.text));

// 3. Otorisasi peran & akses data orang lain (IDOR)
console.log("\n-- 3. Otorisasi (peran & data milik orang lain)");
check("mahasiswa -> GET /users -> 403", (await call(budi, "GET", "/users")).status === 403);
check("mahasiswa -> GET /dashboard -> 403", (await call(budi, "GET", "/dashboard")).status === 403);
check("staf -> POST /units -> 403", (await call(staffIt, "POST", "/units", { Code: "HACK", Name: "Unit Palsu", Email: "x@pradita.ac.id" })).status === 403);
check("mahasiswa -> ubah status tiket -> 403", (await call(budi, "PUT", "/tickets/1/status", { Status: "CLOSED", Note: "x" })).status === 403);
const budiTickets = (await call(budi, "GET", "/tickets?PageSize=100")).body.Items;
const budiTicket = budiTickets[0];
check("siti membuka tiket milik budi -> 404", (await call(siti, "GET", `/tickets/${budiTicket.Id}`)).status === 404);
check("siti mengomentari tiket milik budi -> 404", (await call(siti, "POST", `/tickets/${budiTicket.Id}/comments`, { Body: "komentar iseng" })).status === 404);
const adminAll = (await call(admin, "GET", "/tickets?PageSize=100")).body.Items;
const sarprasTicket = adminAll.find((t) => t.UnitName?.toLowerCase().includes("sarana"));
check("staf IT membuka tiket unit Sarpras -> 404", !!sarprasTicket && (await call(staffIt, "GET", `/tickets/${sarprasTicket.Id}`)).status === 404, sarprasTicket?.UnitName);

// 4. Validasi input
console.log("\n-- 4. Validasi input");
const cats = (await call(budi, "GET", "/categories")).body;
const itCat = cats.find((c) => !c.RequiresLocation && c.IsActive !== false);
const sqli = await call(budi, "GET", `/tickets?Keyword=${encodeURIComponent("' OR 1=1 --")}&PageSize=100`);
check("SQL injection di Keyword tidak membocorkan tiket lain", sqli.status === 200 && sqli.body.Items.every((t) => budiTickets.some((b) => b.Id === t.Id)));
const xssTitle = "<script>alert(1)</script> AC rusak";
const mass = await call(budi, "POST", "/tickets", { Title: xssTitle, Description: "Uji mass assignment dan XSS tersimpan sebagai teks", CategoryId: itCat.Id, Status: "CLOSED", ReporterId: 999, Priority: "LOW" });
check("mass assignment Status/ReporterId diabaikan (tetap OPEN & milik budi)", mass.status === 201 && mass.body.Status === "OPEN" && mass.body.ReporterId === me.body.Id, JSON.stringify(mass.body).slice(0, 200));
check("teks <script> disimpan apa adanya sebagai data JSON (di-escape oleh React saat tampil)", mass.body.Title === xssTitle && mass.headers.get("content-type").startsWith("application/json"));
check("Id bukan angka -> 422 tanpa stack trace", await (async () => { const r = await call(budi, "GET", "/tickets/abc"); return r.status === 422 && NoStack(r); })());
const badJson = await call(budi, "POST", "/tickets/1/comments", undefined, { raw: "{rusak" });
check("JSON rusak -> 400 tanpa stack trace", badJson.status === 400 && NoStack(badJson), badJson.text);
const big = await call(budi, "POST", "/tickets/1/comments", undefined, { raw: JSON.stringify({ Body: "x".repeat(1_100_000) }) });
check("body JSON > 1 MB -> 413", big.status === 413, `${big.status} ${big.text.slice(0, 100)}`);
check("komentar > 5000 karakter -> 422", (await call(budi, "POST", `/tickets/${budiTicket.Id}/comments`, { Body: "x".repeat(5001) })).status === 422);

// 5. Upload file
console.log("\n-- 5. Upload file");
function TicketForm(fileName, type, bytes) {
  const form = new FormData();
  form.set("Title", "Uji upload lampiran");
  form.set("Description", "Uji keamanan upload lampiran tiket");
  form.set("CategoryId", String(itCat.Id));
  form.append("Files", new Blob([bytes], { type }), fileName);
  return form;
}
const fakePng = await call(budi, "POST", "/tickets", TicketForm("foto.png", "image/png", Buffer.from("<html><script>alert(1)</script></html>")));
check("HTML yang diganti nama jadi foto.png -> 400", fakePng.status === 400, `${fakePng.status} ${fakePng.text}`);
const exe = await call(budi, "POST", "/tickets", TicketForm("virus.exe", "application/octet-stream", Buffer.from("MZ\x90\x00")));
check("file .exe -> 400", exe.status === 400);
const pdfAsJpg = await call(budi, "POST", "/tickets", TicketForm("bukti.jpg", "image/jpeg", Buffer.from("%PDF-1.4 palsu")));
check("PDF yang mengaku JPG -> 400", pdfAsJpg.status === 400);
const empty = await call(budi, "POST", "/tickets", TicketForm("kosong.png", "image/png", Buffer.alloc(0)));
check("file kosong -> 400", empty.status === 400);
const good = await call(budi, "POST", "/tickets", TicketForm("../../etc/foto\"asli.png", "image/png", PngBytes));
const attachment = good.body?.Attachments?.[0];
check("PNG asli diterima -> 201", good.status === 201 && !!attachment, `${good.status} ${good.text.slice(0, 200)}`);
check("nama file dibersihkan dari path traversal", attachment?.FileName === "fotoasli.png", attachment?.FileName);
const dl = await fetch(`${B}/attachments/${attachment?.Id}/download`, { headers: { Authorization: `Bearer ${budi}` } });
check("pemilik bisa unduh lampiran (200, image/png, nosniff)", dl.status === 200 && dl.headers.get("content-type") === "image/png" && dl.headers.get("x-content-type-options") === "nosniff");
check("siti mengunduh lampiran milik budi -> 404", (await call(siti, "GET", `/attachments/${attachment?.Id}/download`)).status === 404);
check("unduh lampiran tanpa login -> 401", (await call(null, "GET", `/attachments/${attachment?.Id}/download`)).status === 401);

// 6. Rate limit login (brute force)
console.log("\n-- 6. Rate limit login");
const target = `penyerang.${Date.now()}@pradita.ac.id`;
const statuses = [];
for (let i = 0; i < 6; i++) statuses.push((await call(null, "POST", "/auth/login", { Email: target, Password: `tebak-${i}` })).status);
check("5 percobaan gagal pertama -> 401", statuses.slice(0, 5).every((s) => s === 401), statuses.join(","));
const blocked = await call(null, "POST", "/auth/login", { Email: target, Password: "tebak-lagi" });
check("percobaan berikutnya diblokir -> 429 + Retry-After", statuses[5] === 429 && blocked.status === 429 && Number(blocked.headers.get("retry-after")) > 0, `${statuses[5]} ${blocked.status}`);
check("akun lain tetap bisa login normal", !!(await login("staf.sarpras@pradita.ac.id")));

console.log(`\nHasil: ${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
