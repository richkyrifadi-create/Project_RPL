export const TicketPriorityValues = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export type TicketPriority = (typeof TicketPriorityValues)[number];
