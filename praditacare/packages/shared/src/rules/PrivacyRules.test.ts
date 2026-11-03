import { describe, expect, it } from "vitest";
import { GetLocationHotspots } from "../utils/LocationHotspots.js";
import { CanSeeInternalComments, IsContentHidden, IsReporterHidden, ReporterDisplayName, type Viewer } from "./PrivacyRules.js";

const Pelapor: Viewer = { Id: 1, Role: "STUDENT" };
const MahasiswaLain: Viewer = { Id: 2, Role: "STUDENT" };
const StafKonseling: Viewer = { Id: 20, Role: "STAFF" };
const Admin: Viewer = { Id: 99, Role: "ADMIN" };

const TiketAnonim = { IsAnonymous: true, ReporterId: 1, ReporterName: "Siti Rahmawati", IsConfidential: false };
const TiketRahasia = { IsAnonymous: false, ReporterId: 1, ReporterName: "Siti Rahmawati", IsConfidential: true };

describe("US5 Pelapor anonim", () => {
  it("US5-AC1: pelapor sendiri tetap melihat namanya", () => {
    expect(IsReporterHidden(TiketAnonim, Pelapor)).toBe(false);
    expect(ReporterDisplayName(TiketAnonim, Pelapor)).toBe("Siti Rahmawati");
  });

  it("US5-AC1: staf, admin, dan mahasiswa lain melihat 'Anonim'", () => {
    for (const viewer of [StafKonseling, Admin, MahasiswaLain]) {
      expect(ReporterDisplayName(TiketAnonim, viewer)).toBe("Anonim");
    }
  });

  it("tiket tidak anonim menampilkan nama pelapor ke staf", () => {
    expect(ReporterDisplayName({ ...TiketAnonim, IsAnonymous: false }, StafKonseling)).toBe("Siti Rahmawati");
  });
});

describe("US5 Kategori rahasia", () => {
  it("US5-AC2: isi tiket rahasia disembunyikan dari admin saja", () => {
    expect(IsContentHidden(true, Admin)).toBe(true);
    expect(IsContentHidden(true, StafKonseling)).toBe(false);
    expect(IsContentHidden(true, Pelapor)).toBe(false);
    expect(IsContentHidden(false, Admin)).toBe(false);
  });

  it("US5-AC3: bila isi disembunyikan, nama pelapor ikut disembunyikan walau tidak anonim", () => {
    expect(ReporterDisplayName(TiketRahasia, Admin)).toBe("Anonim");
    expect(ReporterDisplayName(TiketRahasia, StafKonseling)).toBe("Siti Rahmawati");
  });

  it("US5-AC5: tiket rahasia tidak dihitung di dashboard lokasi", () => {
    const rows = GetLocationHotspots([
      { Location: "Ruang Konseling Lantai 2", Status: "OPEN", CategoryName: "Konseling Pribadi", IsConfidential: true },
      { Location: "Aula", Status: "OPEN", CategoryName: "Kerusakan Fasilitas", IsConfidential: false }
    ]);
    expect(rows.map((r) => r.Location)).toEqual(["Aula"]);
  });
});

describe("US5 Komentar internal", () => {
  it("US5-AC4: mahasiswa tidak pernah melihat komentar internal", () => {
    expect(CanSeeInternalComments("STUDENT")).toBe(false);
    expect(CanSeeInternalComments("STAFF")).toBe(true);
    expect(CanSeeInternalComments("ADMIN")).toBe(true);
  });
});
