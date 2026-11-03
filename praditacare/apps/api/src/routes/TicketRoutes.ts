import { Router } from "express";
import type { Prisma } from "@prisma/client";
import {
  ActiveStatuses,
  AssignTicketSchema,
  CanTransition,
  ChangeCategorySchema,
  ChangePrioritySchema,
  ChangeStatusSchema,
  CreateCommentSchema,
  CreateTicketSchema,
  FeedbackSchema,
  IdParamSchema,
  ReopenTicketSchema,
  ReopenWindowDays,
  TicketListQuerySchema,
  TicketStatusLabels,
  type PagedResponse,
  type Ticket
} from "@praditacare/shared";
import { Conflict, Forbidden, HttpError } from "../HttpError.js";
import { GetAuthUser, RequireRole } from "../middleware/Auth.js";
import { Handle } from "../middleware/Handle.js";
import { GetUploadedFiles, ToStoredPath, UploadFiles } from "../middleware/Upload.js";
import { ValidateBody } from "../middleware/Validate.js";
import { prisma } from "../Prisma.js";
import { CommentInclude, TicketInclude } from "../services/Includes.js";
import { MapComment, MapHistory, MapTicket, MapUser } from "../services/Mappers.js";
import {
  ApplyStatusChange,
  EnsureNotFinal,
  LoadTicket,
  LoadTicketContent,
  NextTicketNumber,
  TicketScope
} from "../services/TicketService.js";

export const TicketRoutes = Router();

const JakartaStart = (date: string) => new Date(`${date}T00:00:00+07:00`);
const JakartaEnd = (date: string) => new Date(`${date}T23:59:59.999+07:00`);

function AttachmentRows(files: Express.Multer.File[], ticketId: number, uploadedById: number, commentId: number | null) {
  return files.map((file) => ({
    TicketId: ticketId,
    CommentId: commentId,
    UploadedById: uploadedById,
    FileName: file.originalname,
    StoredPath: ToStoredPath(file.path),
    MimeType: file.mimetype,
    SizeBytes: file.size
  }));
}

TicketRoutes.get(
  "/",
  Handle(async (req, res) => {
    const user = GetAuthUser(req);
    const query = TicketListQuerySchema.parse(req.query);
    const filters: Prisma.TicketWhereInput[] = [TicketScope(user)];
    if (query.Status) filters.push({ Status: query.Status });
    if (query.ActiveOnly) filters.push({ Status: { in: ActiveStatuses } });
    if (query.Priority) filters.push({ Priority: query.Priority });
    if (query.CategoryId) filters.push({ CategoryId: query.CategoryId });
    if (query.UnitId) filters.push({ UnitId: query.UnitId });
    if (query.AssigneeId === "me") filters.push({ AssigneeId: user.Id });
    else if (query.AssigneeId === "none") filters.push({ AssigneeId: null });
    else if (query.AssigneeId) filters.push({ AssigneeId: query.AssigneeId });
    if (query.From) filters.push({ CreatedAt: { gte: JakartaStart(query.From) } });
    if (query.To) filters.push({ CreatedAt: { lte: JakartaEnd(query.To) } });
    if (query.Keyword) {
      const content: Prisma.TicketWhereInput[] = [{ Title: { contains: query.Keyword } }, { Description: { contains: query.Keyword } }];
      filters.push({
        OR: [
          { TicketNumber: { contains: query.Keyword } },
          ...(user.Role === "ADMIN" ? content.map((c) => ({ ...c, Category: { IsConfidential: false } })) : content)
        ]
      });
    }
    const where: Prisma.TicketWhereInput = { AND: filters };
    const orderBy: Prisma.TicketOrderByWithRelationInput = query.SortBy === "DueAt" ? { DueAt: "asc" } : { CreatedAt: "desc" };
    const [items, total] = await prisma.$transaction([
      prisma.ticket.findMany({
        where,
        include: TicketInclude,
        orderBy,
        skip: (query.Page - 1) * query.PageSize,
        take: query.PageSize
      }),
      prisma.ticket.count({ where })
    ]);
    const response: PagedResponse<Ticket> = {
      Items: items.map((t) => MapTicket(t, user)),
      Page: query.Page,
      PageSize: query.PageSize,
      TotalItems: total,
      TotalPages: Math.max(1, Math.ceil(total / query.PageSize))
    };
    res.json(response);
  })
);

TicketRoutes.post(
  "/",
  RequireRole("STUDENT"),
  UploadFiles,
  ValidateBody(CreateTicketSchema),
  Handle(async (req, res) => {
    const user = GetAuthUser(req);
    const category = await prisma.category.findFirst({ where: { Id: req.body.CategoryId, IsActive: true, Unit: { IsActive: true } } });
    if (!category) throw new HttpError(422, "Kategori tidak tersedia", { CategoryId: ["Kategori tidak tersedia"] });
    const files = GetUploadedFiles(req.files);
    const ticketId = await prisma.$transaction(async (tx) => {
      const now = new Date();
      const ticket = await tx.ticket.create({
        data: {
          TicketNumber: await NextTicketNumber(tx, now),
          ReporterId: user.Id,
          CategoryId: category.Id,
          UnitId: category.UnitId,
          Title: req.body.Title,
          Description: req.body.Description,
          Priority: req.body.Priority,
          IsAnonymous: req.body.IsAnonymous,
          DueAt: new Date(now.getTime() + category.SlaHours * 3600 * 1000),
          CreatedAt: now
        }
      });
      await tx.ticketStatusHistory.create({ data: { TicketId: ticket.Id, FromStatus: null, ToStatus: "OPEN", ChangedById: user.Id } });
      if (files.length) await tx.ticketAttachment.createMany({ data: AttachmentRows(files, ticket.Id, user.Id, null) });
      return ticket.Id;
    });
    res.status(201).json(MapTicket(await LoadTicket(ticketId, user), user));
  })
);

TicketRoutes.get(
  "/:Id",
  Handle(async (req, res) => {
    const user = GetAuthUser(req);
    const { Id } = IdParamSchema.parse(req.params);
    res.json(MapTicket(await LoadTicket(Id, user), user));
  })
);

TicketRoutes.get(
  "/:Id/assignees",
  RequireRole("STAFF", "ADMIN"),
  Handle(async (req, res) => {
    const user = GetAuthUser(req);
    const { Id } = IdParamSchema.parse(req.params);
    const ticket = await LoadTicket(Id, user);
    const staff = await prisma.user.findMany({ where: { Role: "STAFF", IsActive: true, UnitId: ticket.UnitId }, include: { Unit: true } });
    res.json(staff.map(MapUser));
  })
);

TicketRoutes.put(
  "/:Id/assign",
  RequireRole("STAFF", "ADMIN"),
  ValidateBody(AssignTicketSchema),
  Handle(async (req, res) => {
    const user = GetAuthUser(req);
    const { Id } = IdParamSchema.parse(req.params);
    const ticket = await LoadTicket(Id, user);
    EnsureNotFinal(ticket);
    const assigneeId: number | null = req.body.AssigneeId;
    if (assigneeId) {
      const assignee = await prisma.user.findUnique({ where: { Id: assigneeId } });
      if (!assignee || assignee.Role !== "STAFF" || !assignee.IsActive || assignee.UnitId !== ticket.UnitId) {
        throw new HttpError(422, "Petugas harus staf aktif di unit yang sama", { AssigneeId: ["Petugas tidak valid"] });
      }
    }
    await prisma.ticket.update({ where: { Id }, data: { AssigneeId: assigneeId } });
    res.json(MapTicket(await LoadTicket(Id, user), user));
  })
);

TicketRoutes.put(
  "/:Id/priority",
  RequireRole("STAFF", "ADMIN"),
  ValidateBody(ChangePrioritySchema),
  Handle(async (req, res) => {
    const user = GetAuthUser(req);
    const { Id } = IdParamSchema.parse(req.params);
    EnsureNotFinal(await LoadTicket(Id, user));
    await prisma.ticket.update({ where: { Id }, data: { Priority: req.body.Priority } });
    res.json(MapTicket(await LoadTicket(Id, user), user));
  })
);

TicketRoutes.put(
  "/:Id/status",
  RequireRole("STAFF", "ADMIN"),
  ValidateBody(ChangeStatusSchema),
  Handle(async (req, res) => {
    const user = GetAuthUser(req);
    const { Id } = IdParamSchema.parse(req.params);
    const ticket = await LoadTicket(Id, user);
    if (!CanTransition(ticket.Status, req.body.Status)) {
      throw Conflict(`Status tidak dapat diubah dari ${TicketStatusLabels[ticket.Status]} ke ${TicketStatusLabels[req.body.Status as Ticket["Status"]]}`);
    }
    const autoAssign = user.Role === "STAFF" && !ticket.AssigneeId && req.body.Status === "IN_PROGRESS" && user.UnitId === ticket.UnitId;
    await prisma.$transaction((tx) =>
      ApplyStatusChange(tx, {
        Ticket: ticket,
        ToStatus: req.body.Status,
        ChangedById: user.Id,
        Note: req.body.Note,
        CountsAsFirstResponse: true,
        Extra: autoAssign ? { AssigneeId: user.Id } : undefined
      })
    );
    res.json(MapTicket(await LoadTicket(Id, user), user));
  })
);

TicketRoutes.put(
  "/:Id/category",
  RequireRole("STAFF", "ADMIN"),
  ValidateBody(ChangeCategorySchema),
  Handle(async (req, res) => {
    const user = GetAuthUser(req);
    const { Id } = IdParamSchema.parse(req.params);
    const ticket = await LoadTicket(Id, user);
    EnsureNotFinal(ticket);
    const category = await prisma.category.findFirst({ where: { Id: req.body.CategoryId, IsActive: true }, include: { Unit: true } });
    if (!category) throw new HttpError(422, "Kategori tidak tersedia", { CategoryId: ["Kategori tidak tersedia"] });
    if (category.Id === ticket.CategoryId) throw Conflict("Tiket sudah berada di kategori tersebut");
    const unitChanged = category.UnitId !== ticket.UnitId;
    const note = `Tiket dipindahkan dari ${ticket.Category.Name} (${ticket.Unit.Name}) ke ${category.Name} (${category.Unit.Name}).`;
    await prisma.$transaction([
      prisma.ticket.update({
        where: { Id },
        data: { CategoryId: category.Id, UnitId: category.UnitId, ...(unitChanged ? { AssigneeId: null } : {}) }
      }),
      prisma.ticketComment.create({
        data: { TicketId: Id, AuthorId: user.Id, IsInternal: true, Body: req.body.Note ? `${note}\n${req.body.Note}` : note }
      })
    ]);
    const updated = await prisma.ticket.findUniqueOrThrow({ where: { Id }, include: TicketInclude });
    res.json(MapTicket(updated, user));
  })
);

TicketRoutes.post(
  "/:Id/reopen",
  RequireRole("STUDENT"),
  ValidateBody(ReopenTicketSchema),
  Handle(async (req, res) => {
    const user = GetAuthUser(req);
    const { Id } = IdParamSchema.parse(req.params);
    const ticket = await LoadTicket(Id, user);
    if (ticket.Status !== "RESOLVED" || !ticket.ResolvedAt) throw Conflict("Hanya tiket berstatus Selesai yang dapat dibuka kembali");
    if (Date.now() - ticket.ResolvedAt.getTime() > ReopenWindowDays * 86400000) {
      throw Conflict(`Tiket hanya dapat dibuka kembali dalam ${ReopenWindowDays} hari setelah selesai`);
    }
    await prisma.$transaction((tx) =>
      ApplyStatusChange(tx, { Ticket: ticket, ToStatus: "IN_PROGRESS", ChangedById: user.Id, Note: req.body.Note, Extra: { ResolvedAt: null } })
    );
    res.json(MapTicket(await LoadTicket(Id, user), user));
  })
);

TicketRoutes.get(
  "/:Id/comments",
  Handle(async (req, res) => {
    const user = GetAuthUser(req);
    const { Id } = IdParamSchema.parse(req.params);
    const ticket = await LoadTicketContent(Id, user);
    const comments = await prisma.ticketComment.findMany({
      where: { TicketId: Id, ...(user.Role === "STUDENT" ? { IsInternal: false } : {}) },
      include: CommentInclude,
      orderBy: { CreatedAt: "asc" }
    });
    res.json(comments.map((c) => MapComment(c, ticket, user)));
  })
);

TicketRoutes.post(
  "/:Id/comments",
  UploadFiles,
  ValidateBody(CreateCommentSchema),
  Handle(async (req, res) => {
    const user = GetAuthUser(req);
    const { Id } = IdParamSchema.parse(req.params);
    const ticket = await LoadTicketContent(Id, user);
    EnsureNotFinal(ticket);
    const isReporter = ticket.ReporterId === user.Id;
    if (user.Role === "STUDENT" && !isReporter) throw Forbidden();
    const isInternal = user.Role !== "STUDENT" && req.body.IsInternal === true;
    const files = GetUploadedFiles(req.files);
    const commentId = await prisma.$transaction(async (tx) => {
      const comment = await tx.ticketComment.create({ data: { TicketId: Id, AuthorId: user.Id, Body: req.body.Body, IsInternal: isInternal } });
      if (files.length) await tx.ticketAttachment.createMany({ data: AttachmentRows(files, Id, user.Id, comment.Id) });
      if (user.Role !== "STUDENT" && !isInternal && !ticket.FirstResponseAt) {
        await tx.ticket.update({ where: { Id }, data: { FirstResponseAt: new Date() } });
      }
      if (isReporter && ticket.Status === "WAITING_REPORTER") {
        await ApplyStatusChange(tx, { Ticket: ticket, ToStatus: "IN_PROGRESS", ChangedById: user.Id, Note: "Pelapor memberikan balasan" });
      }
      return comment.Id;
    });
    const comment = await prisma.ticketComment.findUniqueOrThrow({ where: { Id: commentId }, include: CommentInclude });
    res.status(201).json(MapComment(comment, ticket, user));
  })
);

TicketRoutes.post(
  "/:Id/attachments",
  UploadFiles,
  Handle(async (req, res) => {
    const user = GetAuthUser(req);
    const { Id } = IdParamSchema.parse(req.params);
    const ticket = await LoadTicketContent(Id, user);
    EnsureNotFinal(ticket);
    const files = GetUploadedFiles(req.files);
    if (!files.length) throw new HttpError(422, "Pilih minimal satu file", { Files: ["Pilih minimal satu file"] });
    await prisma.ticketAttachment.createMany({ data: AttachmentRows(files, Id, user.Id, null) });
    res.status(201).json(MapTicket(await LoadTicket(Id, user), user));
  })
);

TicketRoutes.get(
  "/:Id/history",
  Handle(async (req, res) => {
    const user = GetAuthUser(req);
    const { Id } = IdParamSchema.parse(req.params);
    const ticket = await LoadTicket(Id, user);
    const history = await prisma.ticketStatusHistory.findMany({ where: { TicketId: Id }, include: { ChangedBy: true }, orderBy: { Id: "asc" } });
    res.json(history.map((h) => MapHistory(h, ticket, user)));
  })
);

TicketRoutes.post(
  "/:Id/feedback",
  RequireRole("STUDENT"),
  ValidateBody(FeedbackSchema),
  Handle(async (req, res) => {
    const user = GetAuthUser(req);
    const { Id } = IdParamSchema.parse(req.params);
    const ticket = await LoadTicket(Id, user);
    if (ticket.Status !== "RESOLVED") throw Conflict("Feedback hanya dapat diberikan untuk tiket berstatus Selesai");
    if (ticket.Feedback) throw Conflict("Feedback untuk tiket ini sudah diberikan");
    await prisma.$transaction(async (tx) => {
      await tx.ticketFeedback.create({ data: { TicketId: Id, Rating: req.body.Rating, Comment: req.body.Comment || null } });
      await ApplyStatusChange(tx, { Ticket: ticket, ToStatus: "CLOSED", ChangedById: user.Id, Note: `Feedback rating ${req.body.Rating}/5` });
    });
    res.status(201).json(MapTicket(await LoadTicket(Id, user), user));
  })
);
