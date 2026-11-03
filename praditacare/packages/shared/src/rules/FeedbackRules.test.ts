import { describe, expect, it } from "vitest";
import { FeedbackSchema } from "../validation/TicketSchemas.js";
import { AutoCloseThreshold, CanGiveFeedback, IsDueForAutoClose, ValidateFeedbackComment } from "./FeedbackRules.js";

const Now = new Date("2026-11-10T12:00:00Z");
const DaysAgo = (d: number) => new Date(Now.getTime() - d * 86400000);

describe("US4 CanGiveFeedback", () => {
  it("US4-AC1: tiket Selesai yang belum dinilai boleh dinilai", () => {
    expect(CanGiveFeedback({ Status: "RESOLVED", HasFeedback: false }).Allowed).toBe(true);
  });

  it("US4-AC1: tiket yang belum Selesai tidak bisa dinilai", () => {
    for (const Status of ["OPEN", "IN_PROGRESS", "WAITING_REPORTER", "CLOSED", "REJECTED"] as const) {
      expect(CanGiveFeedback({ Status, HasFeedback: false })).toEqual({
        Allowed: false,
        Reason: "Feedback hanya dapat diberikan untuk tiket berstatus Selesai"
      });
    }
  });

  it("US4-AC1: penilaian hanya sekali", () => {
    expect(CanGiveFeedback({ Status: "RESOLVED", HasFeedback: true }).Allowed).toBe(false);
  });
});

describe("US4 ValidateFeedbackComment & FeedbackSchema", () => {
  it("US4-AC3: rating 1-2 tanpa alasan ditolak", () => {
    expect(ValidateFeedbackComment(1, null)).toMatch(/mohon jelaskan alasannya/);
    expect(ValidateFeedbackComment(2, "   ok ")).toMatch(/minimal 5 karakter/);
  });

  it("US4-AC3: rating 1-2 dengan alasan, atau rating 3-5 tanpa komentar, diterima", () => {
    expect(ValidateFeedbackComment(2, "Petugas datang terlambat")).toBeNull();
    expect(ValidateFeedbackComment(3, null)).toBeNull();
    expect(ValidateFeedbackComment(5, "")).toBeNull();
  });

  it("US4-AC2 & AC3: skema menolak rating di luar 1-5 dan menaruh error alasan di field Comment", () => {
    expect(FeedbackSchema.safeParse({ Rating: 0 }).success).toBe(false);
    expect(FeedbackSchema.safeParse({ Rating: 6 }).success).toBe(false);
    const low = FeedbackSchema.safeParse({ Rating: "1", Comment: "" });
    expect(low.success).toBe(false);
    expect(low.error?.flatten().fieldErrors.Comment?.[0]).toMatch(/mohon jelaskan alasannya/);
    expect(FeedbackSchema.parse({ Rating: "4" })).toEqual({ Rating: 4 });
  });
});

describe("US4 Tutup otomatis", () => {
  it("US4-AC4: ambang tutup otomatis = 7 hari sebelum sekarang", () => {
    expect(AutoCloseThreshold(Now).toISOString()).toBe("2026-11-03T12:00:00.000Z");
  });

  it("US4-AC4: tiket Selesai > 7 hari tanpa penilaian ditutup", () => {
    expect(IsDueForAutoClose({ Status: "RESOLVED", ResolvedAt: DaysAgo(8), HasFeedback: false }, Now)).toBe(true);
    expect(IsDueForAutoClose({ Status: "RESOLVED", ResolvedAt: DaysAgo(7), HasFeedback: false }, Now)).toBe(true);
  });

  it("US4-AC4: belum 7 hari, sudah dinilai, atau bukan Selesai tidak ditutup", () => {
    expect(IsDueForAutoClose({ Status: "RESOLVED", ResolvedAt: DaysAgo(6), HasFeedback: false }, Now)).toBe(false);
    expect(IsDueForAutoClose({ Status: "RESOLVED", ResolvedAt: DaysAgo(10), HasFeedback: true }, Now)).toBe(false);
    expect(IsDueForAutoClose({ Status: "IN_PROGRESS", ResolvedAt: null, HasFeedback: false }, Now)).toBe(false);
  });
});
