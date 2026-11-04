/**
 * Pemeriksaan isi file lampiran berdasarkan "magic bytes" (beberapa byte pertama file).
 * MIME type dan ekstensi dikirim oleh browser sehingga bisa dipalsukan; isi file tidak.
 */

const Signatures: ReadonlyArray<{ MimeType: string; Bytes: readonly number[] }> = [
  { MimeType: "image/jpeg", Bytes: [0xff, 0xd8, 0xff] },
  { MimeType: "image/png", Bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { MimeType: "application/pdf", Bytes: [0x25, 0x50, 0x44, 0x46, 0x2d] } // "%PDF-"
];

/** Jumlah byte awal yang perlu dibaca untuk mengenali semua jenis file yang didukung. */
export const FileSignatureLength = 8;

/** Mengembalikan MIME type sebenarnya dari isi file, atau null bila bukan JPG/PNG/PDF. */
export function DetectFileType(header: Uint8Array): string | null {
  for (const signature of Signatures) {
    if (header.length >= signature.Bytes.length && signature.Bytes.every((byte, i) => header[i] === byte)) {
      return signature.MimeType;
    }
  }
  return null;
}

/** true bila isi file benar-benar sesuai dengan MIME type yang diklaim pengirim. */
export function IsFileContentValid(header: Uint8Array, declaredMimeType: string): boolean {
  return DetectFileType(header) === declaredMimeType;
}

export const MaxFileNameLength = 200;

/**
 * Membersihkan nama file asli sebelum disimpan dan dikirim kembali di header Content-Disposition:
 * buang path (../, C:\), karakter kontrol, dan potong agar muat di kolom database.
 */
export function SanitizeFileName(name: string): string {
  const baseName = name.split(/[\\/]/).pop() ?? "";
  // eslint-disable-next-line no-control-regex
  const cleaned = baseName.replace(/[\u0000-\u001f\u007f"<>|:*?]/g, "").trim();
  const safe = cleaned.replace(/^\.+/, "") || "lampiran";
  if (safe.length <= MaxFileNameLength) return safe;
  const dot = safe.lastIndexOf(".");
  const extension = dot > 0 && safe.length - dot <= 10 ? safe.slice(dot) : "";
  return safe.slice(0, MaxFileNameLength - extension.length) + extension;
}
