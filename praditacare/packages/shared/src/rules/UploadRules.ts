import { UploadLimits } from "../constants/UploadLimits.js";

/** Info minimum sebuah file yang akan diunggah (cocok dengan File di browser). */
export interface UploadCandidate {
  name: string;
  type: string;
  size: number;
}

function ExtensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot < 0 ? "" : name.slice(dot).toLowerCase();
}

/**
 * Validasi lampiran sebelum dikirim: jumlah file, jenis (JPG/PNG/PDF), file kosong, dan ukuran maksimal.
 * Mengembalikan pesan error berbahasa Indonesia, atau null bila semua file valid.
 */
export function ValidateUploadFiles(files: readonly UploadCandidate[], maxFileMb: number = UploadLimits.DefaultMaxFileMb): string | null {
  if (files.length > UploadLimits.MaxFilesPerUpload) return `Maksimal ${UploadLimits.MaxFilesPerUpload} file per unggahan.`;
  for (const file of files) {
    const allowedType = (UploadLimits.AllowedMimeTypes as readonly string[]).includes(file.type);
    const allowedExt = (UploadLimits.AllowedExtensions as readonly string[]).includes(ExtensionOf(file.name));
    if (!allowedType || !allowedExt) return `File "${file.name}" tidak didukung. Hanya JPG, PNG, dan PDF.`;
    if (file.size <= 0) return `File "${file.name}" kosong.`;
    if (file.size > maxFileMb * 1024 * 1024) return `File "${file.name}" melebihi batas ${maxFileMb} MB.`;
  }
  return null;
}
