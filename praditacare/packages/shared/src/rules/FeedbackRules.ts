// US4: Mahasiswa menilai penanganan; tiket yang tidak dinilai ditutup otomatis.
import { AutoCloseDays } from "../constants/TicketStatusTransitions.js";
import type { TicketStatus } from "../enums/TicketStatus.js";
import { Allow, Deny, type RuleResult } from "./RuleResult.js";

const DayMs = 86400000;
export const LowRatingThreshold = 2;
export const LowRatingCommentMinLength = 5;

/** Feedback hanya untuk tiket Selesai dan hanya sekali. */
export function CanGiveFeedback(ticket: { Status: TicketStatus; HasFeedback: boolean }): RuleResult {
  if (ticket.Status !== "RESOLVED") return Deny("Feedback hanya dapat diberikan untuk tiket berstatus Selesai");
  if (ticket.HasFeedback) return Deny("Feedback untuk tiket ini sudah diberikan");
  return Allow();
}

/** Rating rendah (1-2) wajib disertai komentar agar unit tahu apa yang perlu diperbaiki. Mengembalikan pesan error atau null. */
export function ValidateFeedbackComment(rating: number, comment: string | null | undefined): string | null {
  if (rating <= LowRatingThreshold && (comment?.trim().length ?? 0) < LowRatingCommentMinLength) {
    return `Untuk rating ${LowRatingThreshold} atau kurang, mohon jelaskan alasannya (minimal ${LowRatingCommentMinLength} karakter)`;
  }
  return null;
}

/** Batas waktu: tiket Selesai sebelum titik ini dan tanpa feedback ditutup otomatis. */
export function AutoCloseThreshold(now: Date): Date {
  return new Date(now.getTime() - AutoCloseDays * DayMs);
}

export function IsDueForAutoClose(ticket: { Status: TicketStatus; ResolvedAt: Date | null; HasFeedback: boolean }, now: Date): boolean {
  return ticket.Status === "RESOLVED" && !ticket.HasFeedback && !!ticket.ResolvedAt && ticket.ResolvedAt <= AutoCloseThreshold(now);
}
