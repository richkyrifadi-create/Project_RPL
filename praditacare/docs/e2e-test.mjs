const B = "http://localhost:5173/api";
const S = process.argv[2];
import fs from "node:fs";
let pass = 0, fail = 0;
const check = (name, cond, extra = "") => { cond ? pass++ : fail++; console.log(`${cond ? "PASS" : "FAIL"} ${name} ${cond ? "" : extra}`); };
async function call(token, method, path, body, isForm) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  if (body && !isForm) headers["Content-Type"] = "application/json";
  const r = await fetch(B + path, { method, headers, body: isForm ? body : body ? JSON.stringify(body) : undefined });
  const text = await r.text();
  let json; try { json = JSON.parse(text); } catch { json = text; }
  return { status: r.status, body: json };
}
const login = async (email) => (await call(null, "POST", "/auth/login", { Email: email, Password: "Pradita123!" })).body.AccessToken;
const budi = await login("budi@student.pradita.ac.id");
const siti = await login("siti@student.pradita.ac.id");
const it = await login("staf.it@pradita.ac.id");
const akd = await login("staf.akademik@pradita.ac.id");
const kns = await login("staf.konseling@pradita.ac.id");
const admin = await login("admin@pradita.ac.id");
check("login semua peran", budi && siti && it && akd && kns && admin);
check("login salah -> 401", (await call(null, "POST", "/auth/login", { Email: "budi@student.pradita.ac.id", Password: "salah" })).status === 401);
check("tanpa token -> 401", (await call(null, "GET", "/tickets")).status === 401);
check("mahasiswa akses /users -> 403", (await call(budi, "GET", "/users")).status === 403);

const cats = (await call(budi, "GET", "/categories")).body;
const wifi = cats.find((c) => c.Name === "Wi-Fi & Jaringan");
const form = new FormData();
form.append("Title", "Proyektor lab IT tidak tersambung Wi-Fi");
form.append("Description", "Proyektor di lab 2 tidak dapat terhubung ke jaringan kampus sejak kemarin.");
form.append("CategoryId", String(wifi.Id));
form.append("Priority", "HIGH");
form.append("IsAnonymous", "false");
form.append("Files", new Blob([fs.readFileSync(`${S}/bukti.pdf`)], { type: "application/pdf" }), "bukti.pdf");
const created = await call(budi, "POST", "/tickets", form, true);
check("buat tiket + lampiran -> 201", created.status === 201, JSON.stringify(created.body));
const t = created.body;
check("nomor tiket format PC-YYYY-NNNNNN", /^PC-\d{4}-\d{6}$/.test(t.TicketNumber), t.TicketNumber);
check("unit otomatis dari kategori (IT)", t.UnitName === "IT");
check("DueAt = CreatedAt + SLA", Date.parse(t.DueAt) - Date.parse(t.CreatedAt) === wifi.SlaHours * 3600000);
check("lampiran tersimpan", t.Attachments.length === 1);

const bad = new FormData();
bad.append("Title", "Tes file salah"); bad.append("Description", "Deskripsi cukup panjang di sini."); bad.append("CategoryId", String(wifi.Id));
bad.append("Files", new Blob(["hello"], { type: "text/plain" }), "bad.txt");
check("lampiran .txt ditolak -> 400", (await call(budi, "POST", "/tickets", bad, true)).status === 400);
check("validasi gagal -> 422", (await call(budi, "POST", "/tickets", { Title: "a" })).status === 422);

check("mahasiswa lain tidak bisa lihat -> 404", (await call(siti, "GET", `/tickets/${t.Id}`)).status === 404);
check("staf unit lain tidak bisa lihat -> 404", (await call(akd, "GET", `/tickets/${t.Id}`)).status === 404);
check("staf IT bisa lihat", (await call(it, "GET", `/tickets/${t.Id}`)).status === 200);

const dl = await fetch(`${B}/attachments/${t.Attachments[0].Id}/download`, { headers: { Authorization: `Bearer ${it}` } });
check("unduh lampiran oleh staf -> 200", dl.status === 200);
check("unduh lampiran oleh mahasiswa lain -> 404", (await call(siti, "GET", `/attachments/${t.Attachments[0].Id}/download`)).status === 404);

const assignees = (await call(it, "GET", `/tickets/${t.Id}/assignees`)).body;
const agus = assignees[0];
check("assign ke staf unit sama", (await call(it, "PUT", `/tickets/${t.Id}/assign`, { AssigneeId: agus.Id })).body.AssigneeName === agus.Name);
const akdUser = (await call(admin, "GET", "/users?Role=STAFF")).body.find((u) => u.UnitName === "Akademik");
check("assign ke staf unit lain -> 422", (await call(it, "PUT", `/tickets/${t.Id}/assign`, { AssigneeId: akdUser.Id })).status === 422);
check("transisi ilegal OPEN->RESOLVED -> 409", (await call(it, "PUT", `/tickets/${t.Id}/status`, { Status: "RESOLVED", Note: "x" })).status === 409);
check("mahasiswa ubah status -> 403", (await call(budi, "PUT", `/tickets/${t.Id}/status`, { Status: "IN_PROGRESS" })).status === 403);
let r = await call(it, "PUT", `/tickets/${t.Id}/status`, { Status: "IN_PROGRESS" });
check("OPEN -> IN_PROGRESS", r.body.Status === "IN_PROGRESS" && r.body.FirstResponseAt);
await call(it, "POST", `/tickets/${t.Id}/comments`, { Body: "Catatan internal: cek access point lab 2", IsInternal: true });
await call(it, "POST", `/tickets/${t.Id}/comments`, { Body: "Mohon info nomor seri proyektor.", IsInternal: false });
r = await call(it, "PUT", `/tickets/${t.Id}/status`, { Status: "WAITING_REPORTER", Note: "Butuh nomor seri" });
check("IN_PROGRESS -> WAITING_REPORTER", r.body.Status === "WAITING_REPORTER");
const studentComments = (await call(budi, "GET", `/tickets/${t.Id}/comments`)).body;
check("komentar internal tidak terkirim ke pelapor", studentComments.every((c) => !c.IsInternal) && studentComments.length === 1);
await call(budi, "POST", `/tickets/${t.Id}/comments`, { Body: "Nomor seri: EPS-12345", IsInternal: true });
r = await call(budi, "GET", `/tickets/${t.Id}`);
check("balasan pelapor -> otomatis IN_PROGRESS", r.body.Status === "IN_PROGRESS");
const allComments = (await call(it, "GET", `/tickets/${t.Id}/comments`)).body;
check("mahasiswa tidak bisa buat komentar internal", allComments.filter((c) => c.AuthorName === "Budi Santoso").every((c) => !c.IsInternal));
check("RESOLVED tanpa catatan -> 422", (await call(it, "PUT", `/tickets/${t.Id}/status`, { Status: "RESOLVED" })).status === 422);
r = await call(it, "PUT", `/tickets/${t.Id}/status`, { Status: "RESOLVED", Note: "Access point lab 2 sudah diganti" });
check("IN_PROGRESS -> RESOLVED + ResolvedAt", r.body.Status === "RESOLVED" && r.body.ResolvedAt);
r = await call(budi, "POST", `/tickets/${t.Id}/reopen`, { Note: "Masih putus-putus" });
check("pelapor buka kembali -> IN_PROGRESS", r.body.Status === "IN_PROGRESS" && !r.body.ResolvedAt);
await call(it, "PUT", `/tickets/${t.Id}/status`, { Status: "RESOLVED", Note: "Sudah stabil" });
check("feedback rating 6 -> 422", (await call(budi, "POST", `/tickets/${t.Id}/feedback`, { Rating: 6 })).status === 422);
r = await call(budi, "POST", `/tickets/${t.Id}/feedback`, { Rating: 5, Comment: "Mantap" });
check("feedback -> CLOSED", r.body.Status === "CLOSED" && r.body.Feedback?.Rating === 5);
check("feedback kedua -> 409", (await call(budi, "POST", `/tickets/${t.Id}/feedback`, { Rating: 4 })).status === 409);
check("komentar di tiket CLOSED -> 409", (await call(budi, "POST", `/tickets/${t.Id}/comments`, { Body: "halo" })).status === 409);
const hist = (await call(budi, "GET", `/tickets/${t.Id}/history`)).body;
check("riwayat status lengkap (8 baris)", hist.length === 8, hist.map((h) => h.ToStatus).join(","));

const sitiTickets = (await call(siti, "GET", "/tickets")).body.Items;
const conf = sitiTickets.find((x) => x.IsConfidential);
const adminView = (await call(admin, "GET", `/tickets/${conf.Id}`)).body;
check("admin: tiket rahasia tanpa judul/deskripsi", adminView.Title === null && adminView.Description === null && adminView.SlaStatus);
check("admin: komentar tiket rahasia -> 403", (await call(admin, "GET", `/tickets/${conf.Id}/comments`)).status === 403);
const knsView = (await call(kns, "GET", `/tickets/${conf.Id}`)).body;
check("staf konseling: anonim -> nama pelapor disembunyikan", knsView.ReporterName === "Anonim" && knsView.ReporterId === null && knsView.Title);
check("pelapor sendiri melihat namanya", (await call(siti, "GET", `/tickets/${conf.Id}`)).body.ReporterName === "Siti Rahmawati");

const dashIt = (await call(it, "GET", "/dashboard")).body;
check("dashboard staf hanya unitnya", dashIt.Units.length === 1 && dashIt.Units[0].UnitName === "IT");
const dashAdmin = (await call(admin, "GET", "/dashboard")).body;
check("dashboard admin semua unit", dashAdmin.Units.length === 5, JSON.stringify(dashAdmin.Summary));
check("mahasiswa akses dashboard -> 403", (await call(budi, "GET", "/dashboard")).status === 403);
check("action-count mahasiswa", typeof (await call(siti, "GET", "/dashboard/action-count")).body.Count === "number");
const page = (await call(it, "GET", "/tickets?AssigneeId=none&SortBy=DueAt&Keyword=Wi-Fi")).body;
check("filter+keyword+pagination", Array.isArray(page.Items) && page.TotalPages >= 1);
console.log(`\n${pass} lulus, ${fail} gagal`);
console.log(JSON.stringify(dashAdmin.Summary));
