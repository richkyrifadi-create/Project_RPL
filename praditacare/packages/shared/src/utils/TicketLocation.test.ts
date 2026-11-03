import { describe, expect, it } from "vitest";
import { CreateTicketSchema } from "../validation/TicketSchemas.js";
import { NormalizeLocation, ValidateTicketLocation } from "./TicketLocation.js";

describe("NormalizeLocation", () => {
  it("membuang spasi berlebih di awal, akhir, dan tengah", () => {
    expect(NormalizeLocation("  Gedung B   Ruang 301 ")).toBe("Gedung B Ruang 301");
  });

  it("mengubah string kosong atau spasi saja menjadi null", () => {
    expect(NormalizeLocation("")).toBeNull();
    expect(NormalizeLocation("    ")).toBeNull();
    expect(NormalizeLocation(undefined)).toBeNull();
  });
});

describe("ValidateTicketLocation", () => {
  it("AC1: kategori fasilitas tanpa lokasi ditolak", () => {
    expect(ValidateTicketLocation(true, "")).toBe("Lokasi wajib diisi untuk kategori ini");
    expect(ValidateTicketLocation(true, null)).toBe("Lokasi wajib diisi untuk kategori ini");
  });

  it("AC2: kategori fasilitas dengan lokasi valid diterima", () => {
    expect(ValidateTicketLocation(true, "Gedung A Lantai 2, Toilet Pria")).toBeNull();
  });

  it("AC3: kategori non-fasilitas boleh tanpa lokasi", () => {
    expect(ValidateTicketLocation(false, undefined)).toBeNull();
  });

  it("menolak lokasi yang terlalu pendek atau terlalu panjang", () => {
    expect(ValidateTicketLocation(false, "B")).toBe("Lokasi minimal 3 karakter");
    expect(ValidateTicketLocation(true, "x".repeat(151))).toBe("Lokasi maksimal 150 karakter");
  });
});

describe("CreateTicketSchema.Location", () => {
  const base = { Title: "AC kelas mati", Description: "AC di kelas tidak menyala sejak pagi.", CategoryId: "5" };

  it("merapikan lokasi dari form", () => {
    const parsed = CreateTicketSchema.parse({ ...base, Location: "  Gedung B  R.301 " });
    expect(parsed.Location).toBe("Gedung B R.301");
  });

  it("lokasi kosong dari form menjadi null (bukan string kosong)", () => {
    expect(CreateTicketSchema.parse({ ...base, Location: "  " }).Location).toBeNull();
    expect(CreateTicketSchema.parse(base).Location).toBeNull();
  });

  it("lokasi terlalu panjang menghasilkan error pada field Location", () => {
    const result = CreateTicketSchema.safeParse({ ...base, Location: "x".repeat(151) });
    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.Location).toEqual(["Lokasi maksimal 150 karakter"]);
  });
});
