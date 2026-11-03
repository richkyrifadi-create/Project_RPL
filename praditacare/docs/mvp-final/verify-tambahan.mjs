// Cek tambahan MVP final lewat API: ganti password, ubah prioritas, pindah kategori, admin nonaktif/aktifkan,
// reset password, dan input tidak valid (Id salah, JSON rusak). Butuh `npm run dev` + database baru di-seed.
const B = process.env.API_URL ?? "http://localhost:5173/api";
let pass = 0, fail = 0;
const check = (name, ok, extra = "") => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"} ${name} ${ok ? "" : extra}`); };
async function call(token, method, path, body, raw) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const r = await fetch(B + path, { method, headers, body: raw ?? (body === undefined ? undefined : JSON.stringify(body)) });
  const text = await r.text();
  let json; try { json = JSON.parse(text); } catch { json = text; }
  return { status: r.status, body: json };
}
const login = async (email, password = "Pradita123!") => (await call(null, "POST", "/auth/login", { Email: email, Password: password })).body.AccessToken;

// Ganti password
const andi = await login("andi@student.pradita.ac.id");
check("ganti password: password lama salah -> 422", (await call(andi, "PUT", "/auth/password", { CurrentPassword: "salah", NewPassword: "Baru12345!" })).status === 422);
check("ganti password: password baru < 8 -> 422", (await call(andi, "PUT", "/auth/password", { CurrentPassword: "Pradita123!", NewPassword: "pendek" })).status === 422);
const changed = await call(andi, "PUT", "/auth/password", { CurrentPassword: "Pradita123!", NewPassword: "Baru12345!" });
check("ganti password berhasil", changed.status === 200 || changed.status === 204, JSON.stringify(changed));
check("login dengan password baru", !!(await login("andi@student.pradita.ac.id", "Baru12345!")));

// Prioritas & pindah kategori
const it = await login("staf.it@pradita.ac.id");
const admin = await login("admin@pradita.ac.id");
const list = (await call(it, "GET", "/tickets?PageSize=50")).body.Items;
const t = list.find((x) => x.Status === "OPEN" || x.Status === "IN_PROGRESS");
const pr = await call(it, "PUT", `/tickets/${t.Id}/priority`, { Priority: "URGENT" });
check("ubah prioritas -> URGENT", pr.status === 200 && pr.body.Priority === "URGENT", JSON.stringify(pr.body));
check("prioritas tidak valid -> 422", (await call(it, "PUT", `/tickets/${t.Id}/priority`, { Priority: "SANGAT" })).status === 422);
const cats = (await call(it, "GET", "/categories")).body;
const akd = cats.find((c) => c.Name === "KRS & Perwalian");
const moved = await call(it, "PUT", `/tickets/${t.Id}/category`, { CategoryId: akd.Id, Note: "Salah kategori" });
check("pindah kategori -> unit Akademik", moved.status === 200 && moved.body.UnitName === "Akademik", JSON.stringify(moved.body));
check("pindah kategori: DueAt tidak berubah", moved.body.DueAt === t.DueAt);
check("staf IT tidak lagi melihat tiket yang dipindah -> 404", (await call(it, "GET", `/tickets/${t.Id}`)).status === 404);

// Admin: nonaktifkan / aktifkan kategori & reset password
const users = (await call(admin, "GET", "/users")).body;
const siti = users.find((u) => u.Email === "siti@student.pradita.ac.id");
check("reset password user oleh admin", [200, 204].includes((await call(admin, "POST", `/users/${siti.Id}/reset-password`, { NewPassword: "Reset12345!" })).status));
check("login dengan password hasil reset", !!(await login("siti@student.pradita.ac.id", "Reset12345!")));
const wifi = cats.find((c) => c.Name === "Wi-Fi & Jaringan");
const { Id, UnitName, ...rest } = wifi;
const off = await call(admin, "PUT", `/categories/${wifi.Id}`, { UnitId: rest.UnitId, Name: rest.Name, Description: rest.Description, SlaHours: rest.SlaHours, IsConfidential: rest.IsConfidential, RequiresLocation: rest.RequiresLocation, IsActive: false });
check("nonaktifkan kategori", off.status === 200 && off.body.IsActive === false, JSON.stringify(off.body));
const budi = await login("budi@student.pradita.ac.id");
check("kategori nonaktif tidak muncul untuk mahasiswa", !(await call(budi, "GET", "/categories")).body.some((c) => c.Id === wifi.Id));
const on = await call(admin, "PUT", `/categories/${wifi.Id}`, { UnitId: rest.UnitId, Name: rest.Name, Description: rest.Description, SlaHours: rest.SlaHours, IsConfidential: rest.IsConfidential, RequiresLocation: rest.RequiresLocation, IsActive: true });
check("aktifkan kembali kategori", on.status === 200 && on.body.IsActive === true);
check("SLA kategori 0 jam -> 422", (await call(admin, "PUT", `/categories/${wifi.Id}`, { ...{ UnitId: rest.UnitId, Name: rest.Name, Description: rest.Description, IsConfidential: false, RequiresLocation: false, IsActive: true }, SlaHours: 0 })).status === 422);

// Input tidak valid
check("Id tiket bukan angka -> 422", (await call(budi, "GET", "/tickets/abc")).status === 422);
check("tiket tidak ada -> 404", (await call(budi, "GET", "/tickets/999999")).status === 404);
check("JSON rusak -> 400", (await call(null, "POST", "/auth/login", {}, "{rusak")).status === 400);
check("filter status tidak dikenal -> 422", (await call(budi, "GET", "/tickets?Status=XYZ")).status === 422);
check("route tidak ada -> 404", (await call(budi, "GET", "/tidak-ada")).status === 404);

console.log(`\n${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
