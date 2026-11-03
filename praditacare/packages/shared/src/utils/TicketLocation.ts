// Aturan lokasi laporan (Fitur 1 MVP v1).
// Dipakai di browser (validasi form) dan di API (validasi akhir), supaya aturannya hanya ada di satu tempat.

export const LocationMinLength = 3;
export const LocationMaxLength = 150;

/** Merapikan teks lokasi: buang spasi di awal/akhir dan spasi ganda. Kosong → null. */
export function NormalizeLocation(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const cleaned = raw.replace(/\s+/g, " ").trim();
  return cleaned.length ? cleaned : null;
}

/**
 * Memeriksa lokasi terhadap kategori yang dipilih.
 * Mengembalikan pesan error (Bahasa Indonesia) atau null bila valid.
 */
export function ValidateTicketLocation(requiresLocation: boolean, raw: string | null | undefined): string | null {
  const location = NormalizeLocation(raw);
  if (!location) return requiresLocation ? "Lokasi wajib diisi untuk kategori ini" : null;
  if (location.length < LocationMinLength) return `Lokasi minimal ${LocationMinLength} karakter`;
  if (location.length > LocationMaxLength) return `Lokasi maksimal ${LocationMaxLength} karakter`;
  return null;
}
