import { describe, expect, it } from "vitest";
import { CanComment, CanReopen, CountsAsFirstResponse, ResolveCommentInternal, ShouldResumeAfterReply } from "./ReporterInteractionRules.js";

const Now = new Date("2026-11-10T12:00:00Z");
const DaysAgo = (d: number) => new Date(Now.getTime() - d * 86400000);

describe("US3 CanReopen", () => {
  it("US3-AC2: tiket Selesai dalam 7 hari boleh dibuka kembali", () => {
    expect(CanReopen({ Status: "RESOLVED", ResolvedAt: DaysAgo(1) }, Now).Allowed).toBe(true);
    expect(CanReopen({ Status: "RESOLVED", ResolvedAt: DaysAgo(7) }, Now).Allowed).toBe(true);
  });

  it("US3-AC2: lewat 7 hari ditolak", () => {
    expect(CanReopen({ Status: "RESOLVED", ResolvedAt: new Date(DaysAgo(7).getTime() - 1000) }, Now)).toEqual({
      Allowed: false,
      Reason: "Tiket hanya dapat dibuka kembali dalam 7 hari setelah selesai"
    });
  });

  it("US3-AC2: status selain Selesai tidak bisa dibuka kembali", () => {
    for (const Status of ["OPEN", "IN_PROGRESS", "CLOSED", "REJECTED"] as const) {
      expect(CanReopen({ Status, ResolvedAt: DaysAgo(1) }, Now).Allowed).toBe(false);
    }
  });

  it("menerima ResolvedAt berupa string ISO dari API (dipakai di web)", () => {
    expect(CanReopen({ Status: "RESOLVED", ResolvedAt: DaysAgo(2).toISOString() }, Now).Allowed).toBe(true);
  });
});

describe("US3 ShouldResumeAfterReply", () => {
  it("US3-AC1: balasan pelapor saat Menunggu Pelapor mengembalikan ke Diproses", () => {
    expect(ShouldResumeAfterReply({ Status: "WAITING_REPORTER", IsReporter: true })).toBe(true);
  });

  it("US3-AC1: komentar staf atau status lain tidak mengubah status", () => {
    expect(ShouldResumeAfterReply({ Status: "WAITING_REPORTER", IsReporter: false })).toBe(false);
    expect(ShouldResumeAfterReply({ Status: "IN_PROGRESS", IsReporter: true })).toBe(false);
  });
});

describe("US3 CanComment", () => {
  it("pelapor dan staf boleh berkomentar di tiket aktif", () => {
    expect(CanComment({ Role: "STUDENT", IsReporter: true, Status: "IN_PROGRESS" }).Allowed).toBe(true);
    expect(CanComment({ Role: "STAFF", IsReporter: false, Status: "OPEN" }).Allowed).toBe(true);
  });

  it("US3-AC3: tiket Ditutup/Ditolak tidak bisa dikomentari", () => {
    expect(CanComment({ Role: "STAFF", IsReporter: false, Status: "CLOSED" })).toEqual({ Allowed: false, Reason: "Tiket sudah ditutup dan tidak dapat diubah" });
    expect(CanComment({ Role: "STUDENT", IsReporter: true, Status: "REJECTED" }).Allowed).toBe(false);
  });

  it("US3-AC3: mahasiswa lain tidak bisa berkomentar", () => {
    expect(CanComment({ Role: "STUDENT", IsReporter: false, Status: "OPEN" }).Allowed).toBe(false);
  });
});

describe("US3 ResolveCommentInternal & CountsAsFirstResponse", () => {
  it("US3-AC4: mahasiswa tidak bisa membuat komentar internal", () => {
    expect(ResolveCommentInternal("STUDENT", true)).toBe(false);
    expect(ResolveCommentInternal("STAFF", true)).toBe(true);
    expect(ResolveCommentInternal("ADMIN", false)).toBe(false);
  });

  it("US3-AC5: hanya komentar publik pertama staf yang dihitung sebagai respons pertama", () => {
    expect(CountsAsFirstResponse({ Role: "STAFF", IsInternal: false, HasFirstResponse: false })).toBe(true);
    expect(CountsAsFirstResponse({ Role: "STAFF", IsInternal: true, HasFirstResponse: false })).toBe(false);
    expect(CountsAsFirstResponse({ Role: "STAFF", IsInternal: false, HasFirstResponse: true })).toBe(false);
    expect(CountsAsFirstResponse({ Role: "STUDENT", IsInternal: false, HasFirstResponse: false })).toBe(false);
  });
});
