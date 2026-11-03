import type { TicketAttachment as PrismaAttachment, Unit as PrismaUnit, Category as PrismaCategory } from "@prisma/client";
import type { User as PrismaUser, TicketFeedback as PrismaFeedback } from "@prisma/client";
import {
  GetSlaStatus,
  type Category,
  type Ticket,
  type TicketAttachment,
  type TicketComment,
  type TicketFeedback,
  type TicketStatusHistory,
  type Unit,
  type User
} from "@praditacare/shared";
import type { AuthUser } from "../types/express.js";
import type { CommentWithRelations, HistoryWithRelations, TicketWithRelations } from "./Includes.js";

const Iso = (value: Date | null | undefined) => (value ? value.toISOString() : null);

export function MapUnit(unit: PrismaUnit): Unit {
  return { Id: unit.Id, Code: unit.Code, Name: unit.Name, Email: unit.Email, IsActive: unit.IsActive, CreatedAt: unit.CreatedAt.toISOString() };
}

export function MapUser(user: PrismaUser & { Unit?: PrismaUnit | null }): User {
  return {
    Id: user.Id,
    Name: user.Name,
    Email: user.Email,
    Role: user.Role,
    StudentNumber: user.StudentNumber,
    StudyProgram: user.StudyProgram,
    UnitId: user.UnitId,
    UnitName: user.Unit?.Name ?? null,
    IsActive: user.IsActive,
    LastLoginAt: Iso(user.LastLoginAt),
    CreatedAt: user.CreatedAt.toISOString()
  };
}

export function MapCategory(category: PrismaCategory & { Unit: PrismaUnit }): Category {
  return {
    Id: category.Id,
    UnitId: category.UnitId,
    UnitName: category.Unit.Name,
    Name: category.Name,
    Description: category.Description,
    SlaHours: category.SlaHours,
    IsConfidential: category.IsConfidential,
    RequiresLocation: category.RequiresLocation,
    IsActive: category.IsActive,
    CreatedAt: category.CreatedAt.toISOString()
  };
}

export function MapAttachment(attachment: PrismaAttachment): TicketAttachment {
  return {
    Id: attachment.Id,
    TicketId: attachment.TicketId,
    CommentId: attachment.CommentId,
    UploadedById: attachment.UploadedById,
    FileName: attachment.FileName,
    MimeType: attachment.MimeType,
    SizeBytes: attachment.SizeBytes,
    CreatedAt: attachment.CreatedAt.toISOString()
  };
}

export function MapFeedback(feedback: PrismaFeedback | null): TicketFeedback | null {
  if (!feedback) return null;
  const { Id, TicketId, Rating, Comment, CreatedAt } = feedback;
  return { Id, TicketId, Rating, Comment, CreatedAt: CreatedAt.toISOString() };
}

export function IsContentHidden(ticket: TicketWithRelations, viewer: AuthUser): boolean {
  return ticket.Category.IsConfidential && viewer.Role === "ADMIN";
}

export function IsReporterHidden(ticket: { IsAnonymous: boolean; ReporterId: number }, viewer: AuthUser): boolean {
  return ticket.IsAnonymous && viewer.Id !== ticket.ReporterId;
}

export function MapTicket(ticket: TicketWithRelations, viewer: AuthUser): Ticket {
  const contentHidden = IsContentHidden(ticket, viewer);
  const reporterHidden = IsReporterHidden(ticket, viewer) || contentHidden;
  return {
    Id: ticket.Id,
    TicketNumber: ticket.TicketNumber,
    ReporterId: reporterHidden ? null : ticket.ReporterId,
    ReporterName: reporterHidden ? "Anonim" : ticket.Reporter.Name,
    CategoryId: ticket.CategoryId,
    CategoryName: ticket.Category.Name,
    UnitId: ticket.UnitId,
    UnitName: ticket.Unit.Name,
    AssigneeId: ticket.AssigneeId,
    AssigneeName: ticket.Assignee?.Name ?? null,
    Title: contentHidden ? null : ticket.Title,
    Description: contentHidden ? null : ticket.Description,
    Location: contentHidden ? null : ticket.Location,
    Priority: ticket.Priority,
    Status: ticket.Status,
    IsAnonymous: ticket.IsAnonymous,
    IsConfidential: ticket.Category.IsConfidential,
    IsContentHidden: contentHidden,
    IsMine: ticket.ReporterId === viewer.Id,
    SlaHours: ticket.Category.SlaHours,
    SlaStatus: GetSlaStatus({ ...ticket, SlaHours: ticket.Category.SlaHours }),
    DueAt: ticket.DueAt.toISOString(),
    FirstResponseAt: Iso(ticket.FirstResponseAt),
    ResolvedAt: Iso(ticket.ResolvedAt),
    ClosedAt: Iso(ticket.ClosedAt),
    CreatedAt: ticket.CreatedAt.toISOString(),
    UpdatedAt: ticket.UpdatedAt.toISOString(),
    Feedback: contentHidden ? null : MapFeedback(ticket.Feedback),
    Attachments: contentHidden ? [] : ticket.Attachments.map(MapAttachment)
  };
}

export function MapComment(comment: CommentWithRelations, ticket: TicketWithRelations, viewer: AuthUser): TicketComment {
  const hideAuthor = comment.AuthorId === ticket.ReporterId && IsReporterHidden(ticket, viewer);
  return {
    Id: comment.Id,
    TicketId: comment.TicketId,
    AuthorId: hideAuthor ? null : comment.AuthorId,
    AuthorName: hideAuthor ? "Pelapor (Anonim)" : comment.Author.Name,
    AuthorRole: comment.Author.Role,
    Body: comment.Body,
    IsInternal: comment.IsInternal,
    CreatedAt: comment.CreatedAt.toISOString(),
    Attachments: comment.Attachments.map(MapAttachment)
  };
}

export function MapHistory(history: HistoryWithRelations, ticket: TicketWithRelations, viewer: AuthUser): TicketStatusHistory {
  const byReporter = history.ChangedById === ticket.ReporterId;
  const hideActor = byReporter && (IsReporterHidden(ticket, viewer) || IsContentHidden(ticket, viewer));
  return {
    Id: history.Id,
    TicketId: history.TicketId,
    FromStatus: history.FromStatus,
    ToStatus: history.ToStatus,
    ChangedById: hideActor ? null : history.ChangedById,
    ChangedByName: !history.ChangedBy ? "Sistem" : hideActor ? "Pelapor" : history.ChangedBy.Name,
    Note: IsContentHidden(ticket, viewer) ? null : history.Note,
    CreatedAt: history.CreatedAt.toISOString()
  };
}
