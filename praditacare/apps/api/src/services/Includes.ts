import type { Prisma } from "@prisma/client";

export const TicketInclude = {
  Category: true,
  Unit: true,
  Reporter: true,
  Assignee: true,
  Feedback: true,
  Attachments: { where: { CommentId: null }, orderBy: { Id: "asc" } }
} satisfies Prisma.TicketInclude;

export type TicketWithRelations = Prisma.TicketGetPayload<{ include: typeof TicketInclude }>;

export const CommentInclude = {
  Author: true,
  Attachments: { orderBy: { Id: "asc" } }
} satisfies Prisma.TicketCommentInclude;

export type CommentWithRelations = Prisma.TicketCommentGetPayload<{ include: typeof CommentInclude }>;

export type HistoryWithRelations = Prisma.TicketStatusHistoryGetPayload<{ include: { ChangedBy: true } }>;
