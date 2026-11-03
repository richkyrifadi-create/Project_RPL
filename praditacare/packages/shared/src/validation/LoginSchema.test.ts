import { describe, expect, it } from "vitest";
import { LoginSchema } from "./UserSchemas.js";

const firstErrors = (input: unknown) => {
  const parsed = LoginSchema.safeParse(input);
  if (parsed.success) return {};
  return Object.fromEntries(Object.entries(parsed.error.flatten().fieldErrors).map(([k, v]) => [k, v?.[0]]));
};

describe("LoginSchema (validasi form login)", () => {
  it("form kosong: pesan pertama adalah 'wajib diisi'", () => {
    expect(firstErrors({ Email: "", Password: "" })).toEqual({ Email: "Email wajib diisi", Password: "Password wajib diisi" });
  });

  it("email hanya spasi dianggap kosong", () => {
    expect(firstErrors({ Email: "   ", Password: "x" }).Email).toBe("Email wajib diisi");
  });

  it("format email salah ditolak", () => {
    expect(firstErrors({ Email: "budi@", Password: "x" }).Email).toBe("Format email tidak valid");
  });

  it("email dirapikan (trim) dan data valid diterima", () => {
    const parsed = LoginSchema.parse({ Email: "  budi@student.pradita.ac.id ", Password: "Pradita123!" });
    expect(parsed.Email).toBe("budi@student.pradita.ac.id");
  });
});
