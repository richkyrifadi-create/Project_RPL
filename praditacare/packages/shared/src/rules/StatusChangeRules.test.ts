import { describe, expect, it } from "vitest";
import { CheckAssignee, PlanStatusChange, StatusTimestampsFor, type StatusChangeInput } from "./StatusChangeRules.js";

const StaffIt = { Id: 10, Role: "STAFF" as const, UnitId: 4 };
const Base: StatusChangeInput = { CurrentStatus: "OPEN", ToStatus: "IN_PROGRESS", TicketUnitId: 4, AssigneeId: null, Actor: StaffIt };

describe("US2 PlanStatusChange: alur status", () => {
  it.each([
    ["OPEN", "IN_PROGRESS"],
    ["IN_PROGRESS", "WAITING_REPORTER"],
    ["WAITING_REPORTER", "IN_PROGRESS"],
    ["IN_PROGRESS", "RESOLVED"],
    ["OPEN", "REJECTED"]
  ] as const)("US2-AC1: %s → %s diizinkan (dengan catatan)", (from, to) => {
    expect(PlanStatusChange({ ...Base, CurrentStatus: from, ToStatus: to, Note: "Catatan staf" }).Allowed).toBe(true);
  });

  it.each([
    ["OPEN", "RESOLVED"],
    ["OPEN", "WAITING_REPORTER"],
    ["RESOLVED", "IN_PROGRESS"],
    ["CLOSED", "IN_PROGRESS"],
    ["REJECTED", "OPEN"]
  ] as const)("US2-AC1: %s → %s ditolak", (from, to) => {
    const plan = PlanStatusChange({ ...Base, CurrentStatus: from, ToStatus: to, Note: "x" });
    expect(plan.Allowed).toBe(false);
    if (!plan.Allowed) expect(plan.Reason).toMatch(/^Status tidak dapat diubah dari/);
  });

  it("mahasiswa tidak bisa mengubah status", () => {
    expect(PlanStatusChange({ ...Base, Actor: { Id: 1, Role: "STUDENT", UnitId: null } }).Allowed).toBe(false);
  });
});

describe("US2 PlanStatusChange: catatan wajib", () => {
  it.each(["RESOLVED", "REJECTED", "WAITING_REPORTER"] as const)("US2-AC2: %s tanpa catatan ditolak", (to) => {
    const from = to === "REJECTED" ? "OPEN" : "IN_PROGRESS";
    for (const note of [undefined, null, "", "   "]) {
      const plan = PlanStatusChange({ ...Base, CurrentStatus: from, ToStatus: to, Note: note });
      expect(plan).toEqual({ Allowed: false, Reason: expect.stringContaining("Catatan wajib diisi") });
    }
  });

  it("US2-AC2: Diproses tidak wajib catatan", () => {
    expect(PlanStatusChange(Base).Allowed).toBe(true);
  });
});

describe("US2 PlanStatusChange: petugas otomatis", () => {
  it("US2-AC3: staf unit terkait yang memproses tiket tanpa petugas menjadi petugas", () => {
    expect(PlanStatusChange(Base)).toEqual({ Allowed: true, AutoAssign: true });
  });

  it("US2-AC3: tidak auto-assign bila sudah ada petugas, aktor admin, atau staf unit lain", () => {
    expect(PlanStatusChange({ ...Base, AssigneeId: 11 })).toEqual({ Allowed: true, AutoAssign: false });
    expect(PlanStatusChange({ ...Base, Actor: { Id: 1, Role: "ADMIN", UnitId: null } })).toEqual({ Allowed: true, AutoAssign: false });
    expect(PlanStatusChange({ ...Base, Actor: { ...StaffIt, UnitId: 2 } })).toEqual({ Allowed: true, AutoAssign: false });
  });

  it("US2-AC3: tidak auto-assign untuk status selain Diproses", () => {
    expect(PlanStatusChange({ ...Base, ToStatus: "REJECTED", Note: "Duplikat" })).toEqual({ Allowed: true, AutoAssign: false });
  });
});

describe("US2 StatusTimestampsFor", () => {
  const now = new Date("2026-11-03T10:00:00Z");

  it("US2-AC4: Selesai mencatat ResolvedAt, Ditutup/Ditolak mencatat ClosedAt", () => {
    expect(StatusTimestampsFor("RESOLVED", now, false, true)).toEqual({ ResolvedAt: now });
    expect(StatusTimestampsFor("CLOSED", now, false, true)).toEqual({ ClosedAt: now });
    expect(StatusTimestampsFor("REJECTED", now, false, true)).toEqual({ ClosedAt: now });
  });

  it("US2-AC4: respons pertama hanya dicatat sekali", () => {
    expect(StatusTimestampsFor("IN_PROGRESS", now, true, false)).toEqual({ FirstResponseAt: now });
    expect(StatusTimestampsFor("IN_PROGRESS", now, true, true)).toEqual({});
  });
});

describe("US2 CheckAssignee", () => {
  const staff = { Role: "STAFF" as const, IsActive: true, UnitId: 4 };

  it("US2-AC5: staf aktif unit yang sama diterima, melepas petugas selalu boleh", () => {
    expect(CheckAssignee(staff, 4, false).Allowed).toBe(true);
    expect(CheckAssignee(null, 4, true).Allowed).toBe(true);
  });

  it("US2-AC5: staf unit lain, staf nonaktif, bukan staf, atau user tidak ada ditolak", () => {
    for (const candidate of [{ ...staff, UnitId: 2 }, { ...staff, IsActive: false }, { ...staff, Role: "ADMIN" as const }, null]) {
      expect(CheckAssignee(candidate, 4, false)).toEqual({ Allowed: false, Reason: "Petugas harus staf aktif di unit yang sama" });
    }
  });
});
