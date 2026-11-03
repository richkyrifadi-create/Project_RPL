export const TicketStatusValues = ["OPEN", "IN_PROGRESS", "WAITING_REPORTER", "RESOLVED", "CLOSED", "REJECTED"] as const;
export type TicketStatus = (typeof TicketStatusValues)[number];
