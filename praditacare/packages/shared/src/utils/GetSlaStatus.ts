import type { SlaStatus } from "../enums/SlaStatus.js";

export interface SlaInput {
  DueAt: string | Date;
  SlaHours: number;
  ResolvedAt?: string | Date | null;
  ClosedAt?: string | Date | null;
}

export function GetSlaStatus(input: SlaInput, now: Date = new Date()): SlaStatus {
  const dueAt = new Date(input.DueAt).getTime();
  const finishedRaw = input.ResolvedAt ?? input.ClosedAt ?? null;
  if (finishedRaw) {
    return new Date(finishedRaw).getTime() <= dueAt ? "MET" : "BREACHED";
  }
  const remainingMs = dueAt - now.getTime();
  if (remainingMs < 0) return "OVERDUE";
  const slaMs = input.SlaHours * 3600 * 1000;
  return remainingMs < slaMs * 0.25 ? "AT_RISK" : "ON_TRACK";
}

export function GetRemainingText(dueAt: string | Date, now: Date = new Date()): string {
  const diffMs = new Date(dueAt).getTime() - now.getTime();
  const totalMinutes = Math.round(Math.abs(diffMs) / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  const parts = days > 0 ? `${days} hari ${hours} jam` : hours > 0 ? `${hours} jam ${minutes} menit` : `${minutes} menit`;
  return diffMs >= 0 ? `Sisa ${parts}` : `Terlambat ${parts}`;
}
