import type { SlaStatus } from "../enums/SlaStatus.js";
import type { TicketPriority } from "../enums/TicketPriority.js";
import type { TicketStatus } from "../enums/TicketStatus.js";
import type { TicketAttachment } from "./TicketAttachment.js";
import type { TicketFeedback } from "./TicketFeedback.js";

export interface Ticket {
  Id: number;
  TicketNumber: string;
  ReporterId: number | null;
  ReporterName: string;
  CategoryId: number;
  CategoryName: string;
  UnitId: number;
  UnitName: string;
  AssigneeId: number | null;
  AssigneeName: string | null;
  Title: string | null;
  Description: string | null;
  Priority: TicketPriority;
  Status: TicketStatus;
  IsAnonymous: boolean;
  IsConfidential: boolean;
  IsContentHidden: boolean;
  IsMine: boolean;
  SlaHours: number;
  SlaStatus: SlaStatus;
  DueAt: string;
  FirstResponseAt: string | null;
  ResolvedAt: string | null;
  ClosedAt: string | null;
  CreatedAt: string;
  UpdatedAt: string;
  Feedback: TicketFeedback | null;
  Attachments: TicketAttachment[];
}
