import { describe, expect, it } from "vitest";
import { FormatLogLine, MaskEmail, SafeErrorFields, SanitizeLogFields, ScrubText } from "./SafeLog.js";

const Time = new Date("2026-11-04T02:00:00.000Z");

describe("SafeLog (security: log tanpa data sensitif)", () => {
  it("menyamarkan email", () => {
    expect(MaskEmail("budi@student.pradita.ac.id")).toBe("b***@student.pradita.ac.id");
    expect(ScrubText("user admin@pradita.ac.id gagal")).toBe("user a***@pradita.ac.id gagal");
  });

  it("mengganti nilai kunci sensitif dengan [REDACTED]", () => {
    const fields = SanitizeLogFields({ Password: "Pradita123!", authorization: "Bearer abc", JwtSecret: "x", user: 5 });
    expect(fields).toEqual({ Password: "[REDACTED]", authorization: "[REDACTED]", JwtSecret: "[REDACTED]", user: "5" });
  });

  it("menghapus token JWT, Bearer, dan connection string dari teks bebas", () => {
    const jwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.c2lnbmF0dXJl";
    expect(ScrubText(`token ${jwt}`)).toBe("token [TOKEN]");
    expect(ScrubText("header Bearer abc.def-ghi")).toBe("header Bearer [TOKEN]");
    expect(ScrubText("Can't reach mysql://root:root@localhost:3306/praditacare")).toBe("Can't reach mysql://[REDACTED]");
  });

  it("memotong nilai yang terlalu panjang", () => {
    expect(ScrubText("a".repeat(500)).length).toBe(301);
  });

  it("menulis satu baris key=value dengan kutip bila ada spasi", () => {
    const line = FormatLogLine("WARN", "auth.login_failed", { reqId: "ab12", email: "budi@student.pradita.ac.id", reason: "password salah" }, Time);
    expect(line).toBe('2026-11-04T02:00:00.000Z WARN  auth.login_failed reqId=ab12 email=b***@student.pradita.ac.id reason="password salah"');
  });

  it("SafeErrorFields tidak menyertakan stack di production", () => {
    const err = Object.assign(new Error("Can't reach database server at mysql://root:root@db:3306/x"), { code: "P1001" });
    const fields = SafeErrorFields(err, false);
    expect(fields).toEqual({ error: "Error", code: "P1001", message: "Can't reach database server at mysql://[REDACTED]" });
    expect(SafeErrorFields(err, true).stack).toBeTypeOf("string");
  });
});
