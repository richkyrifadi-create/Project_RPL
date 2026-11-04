import { describe, expect, it } from "vitest";
import { AttemptLimiter } from "./AttemptLimiter.js";

function CreateLimiter() {
  let now = 1_000_000;
  const limiter = new AttemptLimiter({ MaxFailures: 3, WindowMs: 60_000, Now: () => now });
  return { limiter, Advance: (ms: number) => (now += ms) };
}

describe("AttemptLimiter (security: rate limit login)", () => {
  it("tidak memblokir sebelum batas gagal tercapai", () => {
    const { limiter } = CreateLimiter();
    limiter.RecordFailure("ip|budi");
    limiter.RecordFailure("ip|budi");
    expect(limiter.Check("ip|budi").Blocked).toBe(false);
  });

  it("memblokir setelah 3 kali gagal dan memberi waktu tunggu", () => {
    const { limiter } = CreateLimiter();
    for (let i = 0; i < 3; i++) limiter.RecordFailure("ip|budi");
    expect(limiter.Check("ip|budi")).toEqual({ Blocked: true, RetryAfterSeconds: 60 });
  });

  it("kunci lain (akun/IP lain) tidak ikut terblokir", () => {
    const { limiter } = CreateLimiter();
    for (let i = 0; i < 3; i++) limiter.RecordFailure("ip|budi");
    expect(limiter.Check("ip|siti").Blocked).toBe(false);
  });

  it("blokir hilang sendiri setelah jendela waktu lewat", () => {
    const { limiter, Advance } = CreateLimiter();
    for (let i = 0; i < 3; i++) limiter.RecordFailure("ip|budi");
    Advance(60_001);
    expect(limiter.Check("ip|budi").Blocked).toBe(false);
  });

  it("login berhasil (Reset) menghapus hitungan gagal", () => {
    const { limiter } = CreateLimiter();
    limiter.RecordFailure("ip|budi");
    limiter.RecordFailure("ip|budi");
    limiter.Reset("ip|budi");
    limiter.RecordFailure("ip|budi");
    expect(limiter.Check("ip|budi").Blocked).toBe(false);
  });
});
