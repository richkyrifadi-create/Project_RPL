import { describe, expect, it } from "vitest";
import { GetRemainingText, GetSlaStatus } from "./GetSlaStatus.js";

const Now = new Date("2026-11-03T10:00:00Z");
const HoursFromNow = (h: number) => new Date(Now.getTime() + h * 3600000);

describe("GetSlaStatus", () => {
  it("ON_TRACK bila sisa waktu masih lebih dari 25% SLA", () => {
    expect(GetSlaStatus({ DueAt: HoursFromNow(10), SlaHours: 24 }, Now)).toBe("ON_TRACK");
  });

  it("AT_RISK bila sisa waktu kurang dari 25% SLA", () => {
    expect(GetSlaStatus({ DueAt: HoursFromNow(5), SlaHours: 24 }, Now)).toBe("AT_RISK");
  });

  it("OVERDUE bila tenggat lewat dan tiket belum selesai", () => {
    expect(GetSlaStatus({ DueAt: HoursFromNow(-1), SlaHours: 24 }, Now)).toBe("OVERDUE");
  });

  it("MET bila diselesaikan sebelum tenggat", () => {
    expect(GetSlaStatus({ DueAt: HoursFromNow(-1), SlaHours: 24, ResolvedAt: HoursFromNow(-2) }, Now)).toBe("MET");
  });

  it("BREACHED bila diselesaikan setelah tenggat", () => {
    expect(GetSlaStatus({ DueAt: HoursFromNow(-3), SlaHours: 24, ClosedAt: HoursFromNow(-1) }, Now)).toBe("BREACHED");
  });
});

describe("GetRemainingText", () => {
  it("menampilkan sisa waktu dalam jam dan menit", () => {
    expect(GetRemainingText(HoursFromNow(2.5), Now)).toBe("Sisa 2 jam 30 menit");
  });

  it("menampilkan keterlambatan dalam hari dan jam", () => {
    expect(GetRemainingText(HoursFromNow(-27), Now)).toBe("Terlambat 1 hari 3 jam");
  });
});
