// US5: Pelapor bisa anonim, dan isi kategori rahasia (misal Konseling) hanya dilihat pelapor dan unit terkait.
import type { UserRole } from "../enums/UserRole.js";

export interface Viewer {
  Id: number;
  Role: UserRole;
}

/** Isi tiket kategori rahasia disembunyikan dari admin (admin hanya melihat nomor, status, SLA). */
export function IsContentHidden(isConfidential: boolean, viewer: Viewer): boolean {
  return isConfidential && viewer.Role === "ADMIN";
}

/** Identitas pelapor anonim hanya terlihat oleh pelapor itu sendiri. */
export function IsReporterHidden(ticket: { IsAnonymous: boolean; ReporterId: number }, viewer: Viewer): boolean {
  return ticket.IsAnonymous && viewer.Id !== ticket.ReporterId;
}

/** Nama yang ditampilkan untuk pelapor; tiket yang isinya disembunyikan juga menyembunyikan pelapor. */
export function ReporterDisplayName(
  ticket: { IsAnonymous: boolean; ReporterId: number; ReporterName: string; IsConfidential: boolean },
  viewer: Viewer
): string {
  return IsReporterHidden(ticket, viewer) || IsContentHidden(ticket.IsConfidential, viewer) ? "Anonim" : ticket.ReporterName;
}

/** Komentar internal staf tidak pernah dikirim ke mahasiswa. */
export function CanSeeInternalComments(role: UserRole): boolean {
  return role !== "STUDENT";
}
