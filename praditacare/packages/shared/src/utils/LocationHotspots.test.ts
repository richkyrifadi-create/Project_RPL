import { describe, expect, it } from "vitest";
import { GetLocationHotspots, LocationKey, type HotspotTicket } from "./LocationHotspots.js";

const T = (Location: string | null, extra: Partial<HotspotTicket> = {}): HotspotTicket => ({
  Location,
  Status: "OPEN",
  CategoryName: "Kerusakan Fasilitas",
  IsConfidential: false,
  ...extra
});

describe("LocationKey", () => {
  it("menyamakan huruf besar/kecil, tanda baca, dan spasi", () => {
    expect(LocationKey("Gedung A, Ruang 301")).toBe("gedung a ruang 301");
    expect(LocationKey("  gedung a   ruang 301. ")).toBe("gedung a ruang 301");
  });

  it("menyeragamkan singkatan umum (Gd., Lt., R.)", () => {
    expect(LocationKey("Gd. A Lt. 3 R.301")).toBe("gedung a lantai 3 ruang 301");
    expect(LocationKey("Gd A R301")).toBe("gedung a ruang 301");
    expect(LocationKey("Perpus lt 2")).toBe("perpustakaan lantai 2");
  });

  it("lokasi kosong atau hanya tanda baca menghasilkan null", () => {
    expect(LocationKey(null)).toBeNull();
    expect(LocationKey("   ")).toBeNull();
    expect(LocationKey("...")).toBeNull();
  });
});

describe("GetLocationHotspots", () => {
  it("AC1: penulisan berbeda untuk lokasi yang sama dihitung jadi satu", () => {
    const result = GetLocationHotspots([T("Gedung A Ruang 301"), T("gedung a, ruang 301"), T("Gd. A R.301")]);
    expect(result).toHaveLength(1);
    expect(result[0].TicketCount).toBe(3);
  });

  it("AC2: diurutkan dari laporan terbanyak dan dibatasi 5 lokasi", () => {
    const tickets = [
      ...Array(3).fill(T("Kantin")),
      ...Array(4).fill(T("Gedung B Lantai 3")),
      T("Lab 1"), T("Lab 2"), T("Lab 3"), T("Lab 4"), T("Lab 5")
    ];
    const result = GetLocationHotspots(tickets);
    expect(result.map((r) => r.Location)).toEqual(["Gedung B Lantai 3", "Kantin", "Lab 1", "Lab 2", "Lab 3"]);
  });

  it("AC3: menghitung tiket yang masih aktif secara terpisah", () => {
    const result = GetLocationHotspots([
      T("Toilet Gedung A", { Status: "OPEN" }),
      T("Toilet Gedung A", { Status: "IN_PROGRESS" }),
      T("Toilet Gedung A", { Status: "CLOSED" })
    ]);
    expect(result[0]).toMatchObject({ TicketCount: 3, ActiveCount: 2 });
  });

  it("AC4: tiket tanpa lokasi dan tiket kategori rahasia tidak dihitung", () => {
    const result = GetLocationHotspots([T(null), T(""), T("Ruang Konseling", { IsConfidential: true }), T("Aula")]);
    expect(result.map((r) => r.Location)).toEqual(["Aula"]);
  });

  it("menampilkan penulisan yang paling sering dipakai dan daftar kategorinya", () => {
    const result = GetLocationHotspots([
      T("gd a r301", { CategoryName: "Wi-Fi & Jaringan" }),
      T("Gedung A Ruang 301"),
      T("Gedung A Ruang 301")
    ]);
    expect(result[0].Location).toBe("Gedung A Ruang 301");
    expect(result[0].Categories).toEqual(["Kerusakan Fasilitas", "Wi-Fi & Jaringan"]);
  });

  it("mengembalikan array kosong bila belum ada lokasi", () => {
    expect(GetLocationHotspots([])).toEqual([]);
  });
});
