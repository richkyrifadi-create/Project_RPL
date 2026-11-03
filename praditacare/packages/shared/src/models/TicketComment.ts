import type { UserRole } from "../enums/UserRole.js";
import type { TicketAttachment } from "./TicketAttachment.js";

export interface TicketComment {
  Id: number;
  TicketId: number;
  AuthorId: number | null;
  AuthorName: string;
  AuthorRole: UserRole;
  Body: string;
  IsInternal: boolean;
  CreatedAt: string;
  Attachments: TicketAttachment[];
}
