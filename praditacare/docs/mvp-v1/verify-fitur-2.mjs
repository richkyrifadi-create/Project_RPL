// Verifikasi acceptance criteria Fitur 2 (Lokasi paling sering bermasalah) lewat API yang sedang berjalan.
// Prasyarat: database baru di-seed (npm run db:seed) dan npm run dev berjalan.
// Jalankan: node docs/mvp-v1/verify-fitur-2.mjs
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
const admin = await login("admin@pradita.ac.id");
const sarpras = await login("staf.sarpras@pradita.ac.id");
const akademik = await login("staf.akademik@pradita.ac.id");
const budi = await login("budi@student.pradita.ac.id");

const before = (await call(admin, "GET", "/dashboard")).body;
console.log("Locations (admin, sebelum):", JSON.stringify(before.Locations));
check("dashboard admin berisi daftar Locations", Array.isArray(before.Locations));

// AC1: "Gedung A Ruang 301", "gedung a, ruang 301", "Gd. A R.301" dihitung satu lokasi
const r301 = before.Locations.find((l) => l.Location === "Gedung A Ruang 301");
check("AC1 tiga penulisan berbeda ruang 301 digabung jadi satu baris (>= 3 laporan)", r301?.TicketCount >= 3, JSON.stringify(r301));
check("AC1 tidak ada baris duplikat untuk ruang 301", before.Locations.filter((l) => /301/.test(l.Location)).length === 1);

// AC2: urut dari jumlah terbanyak, maksimal 5
const counts = before.Locations.map((l) => l.TicketCount);
check("AC2 urut menurun berdasarkan jumlah laporan", counts.every((c, i) => i === 0 || counts[i - 1] >= c), JSON.stringify(counts));
check("AC2 maksimal 5 lokasi", before.Locations.length <= 5);
check("AC2 lokasi teratas adalah ruang 301", before.Locations[0]?.Location === "Gedung A Ruang 301");

// AC3: jumlah aktif bertambah saat ada laporan baru di lokasi yang sama
const cats = (await call(budi, "GET", "/categories")).body;
const fasilitas = cats.find((c) => c.Name === "Kerusakan Fasilitas");
const created = await call(budi, "POST", "/tickets", { Title: "Kursi ruang 301 patah", Description: "Satu kursi di baris depan patah kakinya.", CategoryId: fasilitas.Id, Location: "GEDUNG A - RUANG 301" });
check("AC3 laporan baru di ruang 301 dibuat", created.status === 201);
const after = (await call(admin, "GET", "/dashboard")).body;
const r301After = after.Locations.find((l) => l.Location === "Gedung A Ruang 301");
check("AC3 jumlah laporan ruang 301 naik 1", r301After?.TicketCount === r301.TicketCount + 1, JSON.stringify(r301After));
check("AC3 jumlah aktif ruang 301 naik 1", r301After?.ActiveCount === r301.ActiveCount + 1, JSON.stringify(r301After));

// AC4: staf hanya melihat lokasi dari unitnya
const staffSarpras = (await call(sarpras, "GET", "/dashboard")).body;
check("AC4 staf Sarpras melihat lokasi fasilitas", staffSarpras.Locations.some((l) => l.Location === "Gedung A Ruang 301"));
check("AC4 staf Sarpras tidak melihat lokasi Wi-Fi milik unit IT", !staffSarpras.Locations.some((l) => l.Location === "Gedung B Lantai 3"));
const staffAkd = (await call(akademik, "GET", "/dashboard")).body;
check("AC4 staf Akademik tidak punya lokasi (kategori akademik tanpa lokasi)", staffAkd.Locations.length === 0, JSON.stringify(staffAkd.Locations));

// AC5: mahasiswa tetap tidak bisa membuka dashboard
check("AC5 mahasiswa akses dashboard -> 403", (await call(budi, "GET", "/dashboard")).status === 403);

console.log(`\n${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
