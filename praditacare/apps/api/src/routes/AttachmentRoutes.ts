import fs from "node:fs";
import { Router } from "express";
import { IdParamSchema } from "@praditacare/shared";
import { NotFound } from "../HttpError.js";
import { GetAuthUser } from "../middleware/Auth.js";
import { Handle } from "../middleware/Handle.js";
import { ResolveStoredPath } from "../middleware/Upload.js";
import { prisma } from "../Prisma.js";
import { LoadTicketContent } from "../services/TicketService.js";

export const AttachmentRoutes = Router();

AttachmentRoutes.get(
  "/:Id/download",
  Handle(async (req, res) => {
    const user = GetAuthUser(req);
    const { Id } = IdParamSchema.parse(req.params);
    const attachment = await prisma.ticketAttachment.findUnique({ where: { Id }, include: { Comment: true } });
    if (!attachment) throw NotFound("Lampiran");
    await LoadTicketContent(attachment.TicketId, user);
    if (user.Role === "STUDENT" && attachment.Comment?.IsInternal) throw NotFound("Lampiran");
    const filePath = ResolveStoredPath(attachment.StoredPath);
    if (!fs.existsSync(filePath)) throw NotFound("File lampiran");
    res.setHeader("Content-Type", attachment.MimeType);
    res.download(filePath, attachment.FileName);
  })
);
