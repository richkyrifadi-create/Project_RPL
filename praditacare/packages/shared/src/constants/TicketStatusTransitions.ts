import type { TicketStatus } from "../enums/TicketStatus.js";

export const TicketStatusTransitions: Record<TicketStatus, TicketStatus[]> = {
  OPEN: ["IN_PROGRESS", "REJECTED"],
  IN_PROGRESS: ["WAITING_REPORTER", "RESOLVED", "REJECTED"],
  WAITING_REPORTER: ["IN_PROGRESS"],
  RESOLVED: [],
  CLOSED: [],
  REJECTED: []
};

export const StatusesRequiringNote: TicketStatus[] = ["REJECTED", "RESOLVED"];
export const FinalStatuses: TicketStatus[] = ["CLOSED", "REJECTED"];
export const ActiveStatuses: TicketStatus[] = ["OPEN", "IN_PROGRESS", "WAITING_REPORTER"];
export const ReopenWindowDays = 7;
export const AutoCloseDays = 7;

export function CanTransition(From: TicketStatus, To: TicketStatus): boolean {
  return TicketStatusTransitions[From].includes(To);
}
