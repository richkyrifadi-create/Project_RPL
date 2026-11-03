// Cek 5 user story lewat aplikasi yang sedang berjalan (npm run dev), pada database yang baru di-seed.
// Jalankan: node docs/mvp-penyempurnaan/verify-user-stories.mjs
const B = process.env.API_URL ?? "http://localhost:5173/api";
let pass = 0, fail = 0;
const check = (name, cond, extra = "") => { cond ? pass++ : fail++; console.log(`${cond ? "PASS" : "FAIL"} ${name}${cond ? "" : "  -> " + extra}`); };
async function call(token, method, path, body) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  if (body) headers["Content-Type"] = "application/json";
  const r = await fetch(B + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, body: await r.json().catch(() => null) };
}
const login = async (email) => (await call(null, "POST", "/auth/login", { Email: email, Password: "Pradita123!" })).body.AccessToken;
const budi = await login("budi@student.pradita.ac.id");
const siti = await login("siti@student.pradita.ac.id");
const sarpras = await login("staf.sarpras@pradita.ac.id");
const it = await login("staf.it@pradita.ac.id");
const kns = await login("staf.konseling@pradita.ac.id");
const admin = await login("admin@pradita.ac.id");
const cats = (await call(budi, "GET", "/categories")).body;
const cat = (name) => cats.find((c) => c.Name === name);

console.log("--- US1 Mahasiswa membuat laporan");
const t = (await call(budi, "POST", "/tickets", { Title: "Lampu toilet mati", Description: "Lampu toilet pria lantai 2 mati total sejak pagi.", CategoryId: cat("Kerusakan Fasilitas").Id, Location: "Gedung B Lantai 2" })).body;
check("US1-AC1 unit otomatis Sarana Prasarana", t.UnitName === "Sarana Prasarana", t.UnitName);
check("US1-AC2 DueAt = CreatedAt + 24 jam", Date.parse(t.DueAt) - Date.parse(t.CreatedAt) === 24 * 3600000);
check("US1-AC3 nomor tiket PC-YYYY-NNNNNN", /^PC-\d{4}-\d{6}$/.test(t.TicketNumber), t.TicketNumber);
const krs = cat("KRS & Perwalian");
await call(admin, "PUT", `/categories/${krs.Id}`, { ...krs, IsActive: false });
const inactive = await call(budi, "POST", "/tickets", { Title: "Tes kategori nonaktif", Description: "Deskripsi cukup panjang untuk tes.", CategoryId: krs.Id });
check("US1-AC4 kategori nonaktif ditolak 422", inactive.status === 422 && inactive.body?.Errors?.CategoryId?.[0] === "Kategori tidak tersedia", JSON.stringify(inactive.body));
await call(admin, "PUT", `/categories/${krs.Id}`, { ...krs, IsActive: true });
const noLoc = await call(budi, "POST", "/tickets", { Title: "Kursi rusak", Description: "Kursi patah di ruang kelas.", CategoryId: cat("Kerusakan Fasilitas").Id });
check("US1-AC5 tanpa lokasi ditolak 422 di field Location", noLoc.status === 422 && !!noLoc.body?.Errors?.Location);

console.log("--- US2 Staf memproses laporan");
const skip = await call(sarpras, "PUT", `/tickets/${t.Id}/status`, { Status: "RESOLVED", Note: "Sudah" });
check("US2-AC1 Terbuka → Selesai langsung ditolak 409", skip.status === 409, JSON.stringify(skip.body));
const prog = await call(sarpras, "PUT", `/tickets/${t.Id}/status`, { Status: "IN_PROGRESS" });
check("US2-AC1 Terbuka → Diproses diterima", prog.body?.Status === "IN_PROGRESS");
check("US2-AC3 staf Sarpras otomatis jadi petugas", prog.body?.AssigneeName === "Rudi Hartono", prog.body?.AssigneeName);
check("US2-AC4 respons pertama tercatat", !!prog.body?.FirstResponseAt);
const waitNoNote = await call(sarpras, "PUT", `/tickets/${t.Id}/status`, { Status: "WAITING_REPORTER" });
check("US2-AC2 Menunggu Pelapor tanpa catatan ditolak 422", waitNoNote.status === 422, JSON.stringify(waitNoNote.body));
const itUser = (await call(sarpras, "GET", `/tickets/${t.Id}/assignees`)).body;
const wrongAssign = await call(admin, "PUT", `/tickets/${t.Id}/assign`, { AssigneeId: 999 });
check("US2-AC5 petugas tidak valid ditolak 422", wrongAssign.status === 422);
check("US2-AC5 daftar petugas hanya staf Sarpras", itUser.every((u) => u.UnitName === "Sarana Prasarana"));

console.log("--- US3 Pelapor membalas & membuka kembali");
await call(sarpras, "PUT", `/tickets/${t.Id}/status`, { Status: "WAITING_REPORTER", Note: "Lampu di bilik nomor berapa?" });
const internal = await call(budi, "POST", `/tickets/${t.Id}/comments`, { Body: "Bilik nomor 3 dan 4", IsInternal: true });
check("US3-AC4 komentar mahasiswa tidak bisa internal", internal.status === 201 && internal.body.IsInternal === false);
const afterReply = (await call(budi, "GET", `/tickets/${t.Id}`)).body;
check("US3-AC1 balasan pelapor mengembalikan ke Diproses", afterReply.Status === "IN_PROGRESS", afterReply.Status);
const otherStudent = await call(siti, "POST", `/tickets/${t.Id}/comments`, { Body: "Ikut komentar" });
check("US3-AC3 mahasiswa lain tidak bisa berkomentar (404)", otherStudent.status === 404);
await call(sarpras, "PUT", `/tickets/${t.Id}/status`, { Status: "RESOLVED", Note: "Lampu sudah diganti" });
const reopen = await call(budi, "POST", `/tickets/${t.Id}/reopen`, { Note: "Bilik 4 masih mati" });
check("US3-AC2 dibuka kembali dalam 7 hari", reopen.body?.Status === "IN_PROGRESS", JSON.stringify(reopen.body));

console.log("--- US4 Penilaian & tutup otomatis");
const early = await call(budi, "POST", `/tickets/${t.Id}/feedback`, { Rating: 5 });
check("US4-AC1 belum Selesai tidak bisa dinilai 409", early.status === 409);
await call(sarpras, "PUT", `/tickets/${t.Id}/status`, { Status: "RESOLVED", Note: "Bilik 4 sudah diganti" });
const lowNoReason = await call(budi, "POST", `/tickets/${t.Id}/feedback`, { Rating: 1 });
check("US4-AC3 rating 1 tanpa alasan ditolak 422", lowNoReason.status === 422 && !!lowNoReason.body?.Errors?.Comment, JSON.stringify(lowNoReason.body));
const badRating = await call(budi, "POST", `/tickets/${t.Id}/feedback`, { Rating: 6 });
check("US4-AC2 rating 6 ditolak 422", badRating.status === 422);
const fb = await call(budi, "POST", `/tickets/${t.Id}/feedback`, { Rating: 2, Comment: "Harus lapor dua kali" });
check("US4-AC1 penilaian diterima dan tiket Ditutup", fb.status === 201 && fb.body.Status === "CLOSED", JSON.stringify(fb.body));
const twice = await call(budi, "POST", `/tickets/${t.Id}/feedback`, { Rating: 4 });
check("US4-AC1 penilaian kedua ditolak 409", twice.status === 409);
const closedComment = await call(budi, "POST", `/tickets/${t.Id}/comments`, { Body: "Terima kasih" });
check("US3-AC3 tiket Ditutup tidak bisa dikomentari 409", closedComment.status === 409);

console.log("--- US5 Privasi");
const anon = (await call(siti, "POST", "/tickets", { Title: "Wi-Fi lab lambat", Description: "Wi-Fi lab komputer sangat lambat saat praktikum.", CategoryId: cat("Wi-Fi & Jaringan").Id, IsAnonymous: true })).body;
check("US5-AC1 pelapor melihat namanya sendiri", anon.ReporterName === "Siti Rahmawati");
check("US5-AC1 staf IT melihat 'Anonim'", (await call(it, "GET", `/tickets/${anon.Id}`)).body.ReporterName === "Anonim");
const secret = (await call(siti, "POST", "/tickets", { Title: "Butuh konseling", Description: "Saya ingin bicara dengan konselor minggu ini.", CategoryId: cat("Konseling Pribadi").Id })).body;
const adminView = (await call(admin, "GET", `/tickets/${secret.Id}`)).body;
check("US5-AC2 admin tidak melihat isi tiket rahasia", adminView.Title === null && adminView.Description === null && adminView.IsContentHidden === true);
check("US5-AC3 admin tidak melihat nama pelapor tiket rahasia", adminView.ReporterName === "Anonim");
check("US5-AC2 staf Konseling melihat isi", (await call(kns, "GET", `/tickets/${secret.Id}`)).body.Title === "Butuh konseling");
await call(kns, "POST", `/tickets/${secret.Id}/comments`, { Body: "Catatan internal konselor", IsInternal: true });
const sitiComments = (await call(siti, "GET", `/tickets/${secret.Id}/comments`)).body;
check("US5-AC4 mahasiswa tidak melihat komentar internal", Array.isArray(sitiComments) && !sitiComments.some((c) => c.IsInternal));
const knsComments = (await call(kns, "GET", `/tickets/${secret.Id}/comments`)).body;
check("US5-AC4 staf melihat komentar internal", knsComments.some((c) => c.IsInternal));

console.log(`\n${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
