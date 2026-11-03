// US3: Mahasiswa memantau laporan, membalas permintaan staf, dan membuka kembali bila masalah belum beres.
import { FinalStatuses, ReopenWindowDays } from "../constants/TicketStatusTransitions.js";
import type { TicketStatus } from "../enums/TicketStatus.js";
import type { UserRole } from "../enums/UserRole.js";
import { Allow, Deny, type RuleResult } from "./RuleResult.js";

const DayMs = 86400000;

/** Tiket Selesai boleh dibuka kembali oleh pelapor paling lama 7 hari setelah diselesaikan. */
export function CanReopen(ticket: { Status: TicketStatus; ResolvedAt: Date | string | null }, now: Date = new Date()): RuleResult {
  if (ticket.Status !== "RESOLVED" || !ticket.ResolvedAt) return Deny("Hanya tiket berstatus Selesai yang dapat dibuka kembali");
  if (now.getTime() - new Date(ticket.ResolvedAt).getTime() > ReopenWindowDays * DayMs) {
    return Deny(`Tiket hanya dapat dibuka kembali dalam ${ReopenWindowDays} hari setelah selesai`);
  }
  return Allow();
}

/** Siapa yang boleh berkomentar: pelapor sendiri atau staf/admin, dan tiket belum final. */
export function CanComment(input: { Role: UserRole; IsReporter: boolean; Status: TicketStatus }): RuleResult {
  if (FinalStatuses.includes(input.Status)) return Deny("Tiket sudah ditutup dan tidak dapat diubah");
  if (input.Role === "STUDENT" && !input.IsReporter) return Deny("Anda tidak memiliki akses ke tiket ini");
  return Allow();
}

/** Komentar internal hanya bisa dibuat staf/admin; permintaan internal dari mahasiswa diabaikan. */
export function ResolveCommentInternal(role: UserRole, requestedInternal: boolean): boolean {
  return role !== "STUDENT" && requestedInternal;
}

/** Balasan pelapor saat status Menunggu Pelapor mengembalikan tiket ke Diproses. */
export function ShouldResumeAfterReply(input: { Status: TicketStatus; IsReporter: boolean }): boolean {
  return input.IsReporter && input.Status === "WAITING_REPORTER";
}

/** Komentar publik pertama dari staf dihitung sebagai respons pertama (untuk metrik SLA). */
export function CountsAsFirstResponse(input: { Role: UserRole; IsInternal: boolean; HasFirstResponse: boolean }): boolean {
  return input.Role !== "STUDENT" && !input.IsInternal && !input.HasFirstResponse;
}
