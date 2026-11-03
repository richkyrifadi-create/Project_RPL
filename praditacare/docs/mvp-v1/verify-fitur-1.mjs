// Verifikasi acceptance criteria Fitur 1 (Lokasi laporan) lewat API yang sedang berjalan.
// Jalankan: npm run dev (terminal lain), lalu: node docs/mvp-v1/verify-fitur-1.mjs
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
const admin = await login("admin@pradita.ac.id");

const cats = (await call(budi, "GET", "/categories")).body;
const fasilitas = cats.find((c) => c.Name === "Kerusakan Fasilitas");
const krs = cats.find((c) => c.Name === "KRS & Perwalian");
check("kategori Kerusakan Fasilitas mewajibkan lokasi (RequiresLocation=true)", fasilitas.RequiresLocation === true);
check("kategori KRS & Perwalian tidak mewajibkan lokasi", krs.RequiresLocation === false);

const base = { Title: "Lampu kelas mati", Description: "Dua lampu di kelas mati sejak pagi, ruangan gelap.", CategoryId: fasilitas.Id };

// AC1: kategori fasilitas tanpa lokasi ditolak dengan pesan jelas di field Location
const noLoc = await call(budi, "POST", "/tickets", base);
check("AC1 tanpa lokasi -> 422", noLoc.status === 422, JSON.stringify(noLoc.body));
check("AC1 pesan error ada di field Location", noLoc.body?.Errors?.Location?.[0] === "Lokasi wajib diisi untuk kategori ini", JSON.stringify(noLoc.body));
const blank = await call(budi, "POST", "/tickets", { ...base, Location: "    " });
check("AC1 lokasi berisi spasi saja juga ditolak -> 422", blank.status === 422);

// AC2: dengan lokasi valid -> tiket dibuat, lokasi dirapikan dan tersimpan
const ok = await call(budi, "POST", "/tickets", { ...base, Location: "  Gedung C   Ruang 204 " });
check("AC2 dengan lokasi -> 201", ok.status === 201, JSON.stringify(ok.body));
check("AC2 lokasi tersimpan rapi", ok.body?.Location === "Gedung C Ruang 204", ok.body?.Location);

// AC3: kategori non-fasilitas tetap bisa tanpa lokasi
const noLocKrs = await call(siti, "POST", "/tickets", { Title: "KRS tidak bisa disimpan", Description: "Tombol simpan KRS tidak merespons sama sekali.", CategoryId: krs.Id });
check("AC3 kategori non-fasilitas tanpa lokasi -> 201", noLocKrs.status === 201, JSON.stringify(noLocKrs.body));
check("AC3 Location bernilai null", noLocKrs.body?.Location === null);

// AC4: staf unit terkait melihat lokasi di detail dan bisa mencari berdasarkan lokasi
const detail = await call(sarpras, "GET", `/tickets/${ok.body.Id}`);
check("AC4 staf Sarpras melihat lokasi di detail", detail.body?.Location === "Gedung C Ruang 204");
const search = await call(sarpras, "GET", `/tickets?Keyword=${encodeURIComponent("Ruang 204")}`);
check("AC4 pencarian kata kunci menemukan tiket berdasarkan lokasi", search.body?.Items?.some((t) => t.Id === ok.body.Id));

// AC5: lokasi terlalu panjang ditolak
const long = await call(budi, "POST", "/tickets", { ...base, Location: "x".repeat(151) });
check("AC5 lokasi > 150 karakter -> 422", long.status === 422 && !!long.body?.Errors?.Location);

// AC6: admin dapat mengatur kategori lain agar wajib lokasi, dan flag tidak hilang saat kategori di-edit
const wifi = cats.find((c) => c.Name === "Wi-Fi & Jaringan");
const put = await call(admin, "PUT", `/categories/${wifi.Id}`, { UnitId: wifi.UnitId, Name: wifi.Name, Description: wifi.Description, SlaHours: wifi.SlaHours, IsConfidential: false, RequiresLocation: true, IsActive: true });
check("AC6 admin mengaktifkan wajib lokasi untuk Wi-Fi", put.status === 200 && put.body.RequiresLocation === true);
await call(admin, "PUT", `/categories/${wifi.Id}`, { UnitId: wifi.UnitId, Name: wifi.Name, Description: wifi.Description, SlaHours: wifi.SlaHours, IsConfidential: false, RequiresLocation: false, IsActive: true });

console.log(`\n${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
