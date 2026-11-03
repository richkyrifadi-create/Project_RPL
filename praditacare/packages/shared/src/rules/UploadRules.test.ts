import { describe, expect, it } from "vitest";
import { ValidateUploadFiles } from "./UploadRules.js";

const MB = 1024 * 1024;
const pdf = (name = "bukti.pdf", size = 1000) => ({ name, type: "application/pdf", size });

describe("ValidateUploadFiles (lampiran tiket & komentar)", () => {
  it("tanpa lampiran tetap valid", () => {
    expect(ValidateUploadFiles([])).toBeNull();
  });

  it("menerima JPG, PNG, dan PDF", () => {
    expect(
      ValidateUploadFiles([
        { name: "foto.JPG", type: "image/jpeg", size: 2000 },
        { name: "layar.png", type: "image/png", size: 2000 },
        pdf()
      ])
    ).toBeNull();
  });

  it("menolak lebih dari 5 file", () => {
    const files = Array.from({ length: 6 }, (_, i) => pdf(`f${i}.pdf`));
    expect(ValidateUploadFiles(files)).toBe("Maksimal 5 file per unggahan.");
  });

  it("menolak jenis file selain JPG/PNG/PDF", () => {
    expect(ValidateUploadFiles([{ name: "tugas.docx", type: "application/msword", size: 10 }])).toContain("tidak didukung");
  });

  it("menolak ekstensi palsu walaupun MIME diizinkan", () => {
    expect(ValidateUploadFiles([{ name: "virus.exe", type: "application/pdf", size: 10 }])).toContain("tidak didukung");
  });

  it("menolak file kosong (0 byte)", () => {
    expect(ValidateUploadFiles([pdf("kosong.pdf", 0)])).toBe('File "kosong.pdf" kosong.');
  });

  it("menolak file melebihi batas MB, tepat di batas diterima", () => {
    expect(ValidateUploadFiles([pdf("besar.pdf", 5 * MB + 1)], 5)).toBe('File "besar.pdf" melebihi batas 5 MB.');
    expect(ValidateUploadFiles([pdf("pas.pdf", 5 * MB)], 5)).toBeNull();
  });
});
