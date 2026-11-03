// US2: Staf memproses laporan mengikuti alur status yang jelas.
import { CanTransition, StatusesRequiringNote } from "../constants/TicketStatusTransitions.js";
import { TicketStatusLabels } from "../constants/Labels.js";
import type { TicketStatus } from "../enums/TicketStatus.js";
import type { UserRole } from "../enums/UserRole.js";
import { Allow, Deny, type RuleResult } from "./RuleResult.js";

const Reject = (Reason: string): StatusChangePlan => ({ Allowed: false, Reason });

export interface StatusActor {
  Id: number;
  Role: UserRole;
  UnitId: number | null;
}

export interface StatusChangeInput {
  CurrentStatus: TicketStatus;
  ToStatus: TicketStatus;
  Note?: string | null;
  TicketUnitId: number;
  AssigneeId: number | null;
  Actor: StatusActor;
}

export type StatusChangePlan =
  | { Allowed: false; Reason: string }
  | { Allowed: true; AutoAssign: boolean };

/**
 * Memeriksa perubahan status oleh staf/admin dan menentukan efek sampingnya.
 * - Hanya transisi yang ada di tabel alur status.
 * - Selesai, Ditolak, dan Menunggu Pelapor wajib catatan (pelapor perlu tahu alasannya / apa yang diminta).
 * - Staf unit terkait yang mulai memproses tiket tanpa petugas otomatis menjadi petugasnya.
 */
export function PlanStatusChange(input: StatusChangeInput): StatusChangePlan {
  if (input.Actor.Role === "STUDENT") return Reject("Mahasiswa tidak dapat mengubah status tiket");
  if (!CanTransition(input.CurrentStatus, input.ToStatus)) {
    return Reject(
      `Status tidak dapat diubah dari ${TicketStatusLabels[input.CurrentStatus]} ke ${TicketStatusLabels[input.ToStatus]}`
    );
  }
  if (StatusesRequiringNote.includes(input.ToStatus) && !input.Note?.trim()) {
    return Reject(`Catatan wajib diisi untuk status ${TicketStatusLabels[input.ToStatus]}`);
  }
  const autoAssign =
    input.Actor.Role === "STAFF" && input.AssigneeId === null && input.ToStatus === "IN_PROGRESS" && input.Actor.UnitId === input.TicketUnitId;
  return { Allowed: true, AutoAssign: autoAssign };
}

export interface StatusTimestamps {
  ResolvedAt?: Date;
  ClosedAt?: Date;
  FirstResponseAt?: Date;
}

/** Kolom waktu yang ikut berubah bersama status. Respons pertama hanya dicatat sekali. */
export function StatusTimestampsFor(toStatus: TicketStatus, now: Date, countsAsFirstResponse: boolean, hasFirstResponse: boolean): StatusTimestamps {
  const result: StatusTimestamps = {};
  if (toStatus === "RESOLVED") result.ResolvedAt = now;
  if (toStatus === "CLOSED" || toStatus === "REJECTED") result.ClosedAt = now;
  if (countsAsFirstResponse && !hasFirstResponse) result.FirstResponseAt = now;
  return result;
}

export interface AssigneeCandidate {
  Role: UserRole;
  IsActive: boolean;
  UnitId: number | null;
}

/** Petugas tiket harus staf aktif dari unit yang sama dengan tiket. null = lepas petugas. */
export function CheckAssignee(candidate: AssigneeCandidate | null | undefined, ticketUnitId: number, unassign: boolean): RuleResult {
  if (unassign) return Allow();
  if (!candidate || candidate.Role !== "STAFF" || !candidate.IsActive || candidate.UnitId !== ticketUnitId) {
    return Deny("Petugas harus staf aktif di unit yang sama");
  }
  return Allow();
}
