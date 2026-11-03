import { describe, expect, it } from "vitest";
import { CalculateDueAt, CheckNewTicket, FormatTicketNumber } from "./TicketCreationRules.js";

const Fasilitas = { IsActive: true, UnitIsActive: true, RequiresLocation: true };
const Krs = { IsActive: true, UnitIsActive: true, RequiresLocation: false };

describe("US1 CalculateDueAt", () => {
  const created = new Date("2026-11-03T08:00:00Z");

  it("US1-AC2: batas waktu = waktu dibuat + SLA kategori (jam)", () => {
    expect(CalculateDueAt(created, 24).toISOString()).toBe("2026-11-04T08:00:00.000Z");
    expect(CalculateDueAt(created, 8).toISOString()).toBe("2026-11-03T16:00:00.000Z");
  });

  it("US1-AC2: SLA melewati pergantian bulan dihitung benar", () => {
    expect(CalculateDueAt(new Date("2026-11-30T20:00:00Z"), 120).toISOString()).toBe("2026-12-05T20:00:00.000Z");
  });

  it("US1-AC2: SLA tidak valid ditolak", () => {
    expect(() => CalculateDueAt(created, 0)).toThrow("minimal 1 jam");
    expect(() => CalculateDueAt(created, 1.5)).toThrow();
  });
});

describe("US1 FormatTicketNumber", () => {
  it("US1-AC3: format PC-YYYY-NNNNNN dengan nol di depan", () => {
    expect(FormatTicketNumber(2026, 1)).toBe("PC-2026-000001");
    expect(FormatTicketNumber(2026, 123456)).toBe("PC-2026-123456");
  });

  it("US1-AC3: nomor urut 0, negatif, atau lebih dari 6 digit ditolak", () => {
    expect(() => FormatTicketNumber(2026, 0)).toThrow();
    expect(() => FormatTicketNumber(2026, -3)).toThrow();
    expect(() => FormatTicketNumber(2026, 1_000_000)).toThrow("melebihi 6 digit");
  });
});

describe("US1 CheckNewTicket", () => {
  it("menerima kategori aktif dengan data lengkap", () => {
    expect(CheckNewTicket(Fasilitas, "Gedung A Ruang 301").Result.Allowed).toBe(true);
    expect(CheckNewTicket(Krs, null).Result.Allowed).toBe(true);
  });

  it("US1-AC4: kategori tidak ada, nonaktif, atau unitnya nonaktif ditolak pada field CategoryId", () => {
    for (const category of [null, { ...Krs, IsActive: false }, { ...Krs, UnitIsActive: false }]) {
      const check = CheckNewTicket(category, null);
      expect(check.Result).toEqual({ Allowed: false, Reason: "Kategori tidak tersedia" });
      expect(check.Field).toBe("CategoryId");
    }
  });

  it("US1-AC5: kategori wajib lokasi tanpa lokasi ditolak pada field Location", () => {
    const check = CheckNewTicket(Fasilitas, "   ");
    expect(check.Result).toEqual({ Allowed: false, Reason: "Lokasi wajib diisi untuk kategori ini" });
    expect(check.Field).toBe("Location");
  });
});
