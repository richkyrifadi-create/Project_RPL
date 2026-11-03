import type { Prisma, TicketStatus } from "@prisma/client";
import { FinalStatuses } from "@praditacare/shared";
import { Conflict, Forbidden, NotFound } from "../HttpError.js";
import { prisma } from "../Prisma.js";
import type { AuthUser } from "../types/express.js";
import { IsContentHidden } from "./Mappers.js";
import { TicketInclude, type TicketWithRelations } from "./Includes.js";

export function TicketScope(user: AuthUser): Prisma.TicketWhereInput {
  if (user.Role === "STUDENT") return { ReporterId: user.Id };
  if (user.Role === "STAFF") return { OR: [{ UnitId: user.UnitId ?? -1 }, { AssigneeId: user.Id }] };
  return {};
}

export async function LoadTicket(id: number, user: AuthUser): Promise<TicketWithRelations> {
  const ticket = await prisma.ticket.findFirst({ where: { AND: [{ Id: id }, TicketScope(user)] }, include: TicketInclude });
  if (!ticket) throw NotFound("Tiket");
  return ticket;
}

export async function LoadTicketContent(id: number, user: AuthUser): Promise<TicketWithRelations> {
  const ticket = await LoadTicket(id, user);
  if (IsContentHidden(ticket, user)) throw Forbidden("Isi tiket rahasia hanya dapat dilihat oleh unit terkait");
  return ticket;
}

export function EnsureNotFinal(ticket: { Status: TicketStatus }) {
  if (FinalStatuses.includes(ticket.Status)) throw Conflict("Tiket sudah ditutup dan tidak dapat diubah");
}

export async function NextTicketNumber(tx: Prisma.TransactionClient, now: Date): Promise<string> {
  const year = now.getUTCFullYear();
  await tx.$executeRaw`INSERT INTO TicketSequence (Year, LastNumber) VALUES (${year}, 1) ON DUPLICATE KEY UPDATE LastNumber = LastNumber + 1`;
  const sequence = await tx.ticketSequence.findUniqueOrThrow({ where: { Year: year } });
  return `PC-${year}-${String(sequence.LastNumber).padStart(6, "0")}`;
}

interface StatusChange {
  Ticket: { Id: number; Status: TicketStatus; FirstResponseAt: Date | null };
  ToStatus: TicketStatus;
  ChangedById: number | null;
  Note?: string | null;
  CountsAsFirstResponse?: boolean;
  Extra?: Prisma.TicketUncheckedUpdateInput;
}

export async function ApplyStatusChange(tx: Prisma.TransactionClient, change: StatusChange) {
  const now = new Date();
  const data: Prisma.TicketUncheckedUpdateInput = { ...change.Extra, Status: change.ToStatus };
  if (change.ToStatus === "RESOLVED") data.ResolvedAt = now;
  if (change.ToStatus === "CLOSED" || change.ToStatus === "REJECTED") data.ClosedAt = now;
  if (change.CountsAsFirstResponse && !change.Ticket.FirstResponseAt) data.FirstResponseAt = now;
  await tx.ticket.update({ where: { Id: change.Ticket.Id }, data });
  await tx.ticketStatusHistory.create({
    data: {
      TicketId: change.Ticket.Id,
      FromStatus: change.Ticket.Status,
      ToStatus: change.ToStatus,
      ChangedById: change.ChangedById,
      Note: change.Note ?? null
    }
  });
}
