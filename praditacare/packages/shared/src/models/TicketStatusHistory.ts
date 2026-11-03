import type { TicketStatus } from "../enums/TicketStatus.js";

export interface TicketStatusHistory {
  Id: number;
  TicketId: number;
  FromStatus: TicketStatus | null;
  ToStatus: TicketStatus;
  ChangedById: number | null;
  ChangedByName: string;
  Note: string | null;
  CreatedAt: string;
}
