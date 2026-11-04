import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import type { ErrorResponse } from "@praditacare/shared";
import { Config } from "../Config.js";
import { HttpError } from "../HttpError.js";
import { Log, SafeErrorFields } from "../security/SafeLog.js";
import { GetUploadedFiles, RemoveUploadedFiles } from "./Upload.js";

export function NotFoundHandler(_req: Request, res: Response<ErrorResponse>) {
  res.status(404).json({ Message: "Endpoint tidak ditemukan" });
}

export function ErrorHandler(err: unknown, req: Request, res: Response<ErrorResponse>, _next: NextFunction) {
  RemoveUploadedFiles(GetUploadedFiles(req.files));
  if (err instanceof ZodError) {
    const errors: Record<string, string[]> = {};
    for (const issue of err.issues) {
      const key = issue.path.join(".") || "_";
      (errors[key] ??= []).push(issue.message);
    }
    return res.status(422).json({ Message: "Data yang dikirim tidak valid", Errors: errors });
  }
  if (err instanceof HttpError) {
    const retryAfter = (err as HttpError & { RetryAfterSeconds?: number }).RetryAfterSeconds;
    if (retryAfter) res.setHeader("Retry-After", String(retryAfter));
    return res.status(err.Status).json({ Message: err.message, Errors: err.Errors });
  }
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") return res.status(413).json({ Message: `Ukuran file maksimal ${Config.MaxUploadMb} MB` });
    if (err.code === "LIMIT_FILE_COUNT" || err.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({ Message: "Maksimal 5 file per unggahan" });
    }
    return res.status(400).json({ Message: err.message });
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    const target = (err.meta?.target as string | string[] | undefined) ?? "";
    return res.status(409).json({ Message: `Data sudah digunakan: ${Array.isArray(target) ? target.join(", ") : target}` });
  }
  if (err instanceof SyntaxError && "body" in err) return res.status(400).json({ Message: "Format JSON tidak valid" });
  if ((err as { type?: string }).type === "entity.too.large") return res.status(413).json({ Message: "Data yang dikirim terlalu besar" });
  // Log aman: tanpa body request, token, password; stack hanya di development.
  Log.Error("http.unhandled_error", { reqId: req.RequestId, method: req.method, path: req.originalUrl.split("?")[0], ...SafeErrorFields(err, !Config.IsProduction) });
  res.status(500).json({ Message: "Terjadi kesalahan pada server", RequestId: req.RequestId });
}
