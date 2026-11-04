import { describe, expect, it } from "vitest";
import { DetectFileType, IsFileContentValid, MaxFileNameLength, SanitizeFileName } from "./FileSignatureRules.js";

const Bytes = (...values: number[]) => new Uint8Array(values);
const Text = (value: string) => new TextEncoder().encode(value);

describe("DetectFileType (security: cek isi file lampiran)", () => {
  it("mengenali JPG, PNG, dan PDF dari magic bytes", () => {
    expect(DetectFileType(Bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0))).toBe("image/jpeg");
    expect(DetectFileType(Bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe("image/png");
    expect(DetectFileType(Text("%PDF-1.7"))).toBe("application/pdf");
  });

  it("menolak file lain walau namanya .jpg (HTML, script, exe, file kosong)", () => {
    expect(DetectFileType(Text("<script>"))).toBeNull();
    expect(DetectFileType(Text("MZ\x90\x00"))).toBeNull();
    expect(DetectFileType(new Uint8Array())).toBeNull();
  });
});

describe("IsFileContentValid", () => {
  it("valid bila isi file sama dengan MIME type yang diklaim", () => {
    expect(IsFileContentValid(Text("%PDF-1.4"), "application/pdf")).toBe(true);
  });

  it("tidak valid bila PDF diklaim sebagai gambar atau HTML diklaim sebagai PNG", () => {
    expect(IsFileContentValid(Text("%PDF-1.4"), "image/png")).toBe(false);
    expect(IsFileContentValid(Text("<html><body>"), "image/png")).toBe(false);
  });
});

describe("SanitizeFileName", () => {
  it("membuang path traversal dan karakter berbahaya", () => {
    expect(SanitizeFileName("../../etc/passwd.pdf")).toBe("passwd.pdf");
    expect(SanitizeFileName("C:\\Users\\budi\\foto.jpg")).toBe("foto.jpg");
    expect(SanitizeFileName('bukti"\r\nX-Header: a.png')).toBe("buktiX-Header a.png");
  });

  it("memberi nama default bila nama kosong atau hanya titik", () => {
    expect(SanitizeFileName("..")).toBe("lampiran");
    expect(SanitizeFileName("   ")).toBe("lampiran");
  });

  it("memotong nama yang terlalu panjang tetapi mempertahankan ekstensi", () => {
    const result = SanitizeFileName(`${"a".repeat(300)}.png`);
    expect(result.length).toBe(MaxFileNameLength);
    expect(result.endsWith(".png")).toBe(true);
  });
});
