import { z } from "zod";
import { StatusesRequiringNote } from "../constants/TicketStatusTransitions.js";
import { TicketPriorityValues } from "../enums/TicketPriority.js";
import { TicketStatusValues } from "../enums/TicketStatus.js";
import { BooleanLike, RequiredText } from "./Common.js";

export const CreateTicketSchema = z.object({
  Title: RequiredText("Judul", 5, 200),
  Description: RequiredText("Deskripsi", 10, 5000),
  CategoryId: z.coerce.number({ invalid_type_error: "Kategori wajib dipilih" }).int().positive("Kategori wajib dipilih"),
  Priority: z.enum(TicketPriorityValues, { errorMap: () => ({ message: "Prioritas tidak valid" }) }).default("MEDIUM"),
  IsAnonymous: BooleanLike.default(false)
});

export const TicketListQuerySchema = z.object({
  Status: z.enum(TicketStatusValues).optional(),
  Priority: z.enum(TicketPriorityValues).optional(),
  CategoryId: z.coerce.number().int().positive().optional(),
  UnitId: z.coerce.number().int().positive().optional(),
  AssigneeId: z.union([z.coerce.number().int().positive(), z.literal("me"), z.literal("none")]).optional(),
  From: z.string().date("Tanggal awal tidak valid").optional(),
  To: z.string().date("Tanggal akhir tidak valid").optional(),
  Keyword: z.string().trim().max(100).optional(),
  ActiveOnly: BooleanLike.optional(),
  SortBy: z.enum(["DueAt", "CreatedAt"]).default("CreatedAt"),
  Page: z.coerce.number().int().min(1).default(1),
  PageSize: z.coerce.number().int().min(1).max(100).default(20)
});

export const AssignTicketSchema = z.object({
  AssigneeId: z.coerce.number().int().positive().nullable()
});

export const ChangePrioritySchema = z.object({
  Priority: z.enum(TicketPriorityValues, { errorMap: () => ({ message: "Prioritas tidak valid" }) })
});

export const ChangeStatusSchema = z
  .object({
    Status: z.enum(TicketStatusValues, { errorMap: () => ({ message: "Status tidak valid" }) }),
    Note: z.string().trim().max(1000).optional().nullable()
  })
  .superRefine((data, ctx) => {
    if (StatusesRequiringNote.includes(data.Status) && !data.Note) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Catatan wajib diisi untuk status ini", path: ["Note"] });
    }
  });

export const ChangeCategorySchema = z.object({
  CategoryId: z.coerce.number({ invalid_type_error: "Kategori wajib dipilih" }).int().positive("Kategori wajib dipilih"),
  Note: z.string().trim().max(1000).optional().nullable()
});

export const CreateCommentSchema = z.object({
  Body: RequiredText("Komentar", 1, 5000),
  IsInternal: BooleanLike.default(false)
});

export const ReopenTicketSchema = z.object({
  Note: RequiredText("Alasan", 5, 1000)
});

export const FeedbackSchema = z.object({
  Rating: z.coerce.number({ invalid_type_error: "Rating wajib dipilih" }).int().min(1, "Rating 1 sampai 5").max(5, "Rating 1 sampai 5"),
  Comment: z.string().trim().max(1000).optional().nullable()
});

export const DashboardQuerySchema = z.object({
  From: z.string().date("Tanggal awal tidak valid").optional(),
  To: z.string().date("Tanggal akhir tidak valid").optional(),
  UnitId: z.coerce.number().int().positive().optional()
});
