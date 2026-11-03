import type { SlaStatus } from "../enums/SlaStatus.js";
import type { TicketPriority } from "../enums/TicketPriority.js";
import type { TicketStatus } from "../enums/TicketStatus.js";
import type { UserRole } from "../enums/UserRole.js";

export const TicketStatusLabels: Record<TicketStatus, string> = {
  OPEN: "Terbuka",
  IN_PROGRESS: "Diproses",
  WAITING_REPORTER: "Menunggu Pelapor",
  RESOLVED: "Selesai",
  CLOSED: "Ditutup",
  REJECTED: "Ditolak"
};

export const TicketPriorityLabels: Record<TicketPriority, string> = {
  LOW: "Rendah",
  MEDIUM: "Sedang",
  HIGH: "Tinggi",
  URGENT: "Mendesak"
};

export const SlaStatusLabels: Record<SlaStatus, string> = {
  ON_TRACK: "Sesuai Jadwal",
  AT_RISK: "Berisiko",
  OVERDUE: "Terlambat",
  MET: "SLA Terpenuhi",
  BREACHED: "SLA Terlewati"
};

export const UserRoleLabels: Record<UserRole, string> = {
  STUDENT: "Mahasiswa",
  STAFF: "Staf",
  ADMIN: "Admin"
};

export const AppTimeZone = "Asia/Jakarta";
