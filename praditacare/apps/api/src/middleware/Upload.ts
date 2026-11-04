import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { FileSignatureLength, IsFileContentValid, SanitizeFileName, UploadLimits } from "@praditacare/shared";
import { Config } from "../Config.js";
import { HttpError } from "../HttpError.js";
import { Log } from "../security/SafeLog.js";

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const now = new Date();
    const folder = path.join(Config.UploadDir, String(now.getUTCFullYear()), String(now.getUTCMonth() + 1).padStart(2, "0"));
    fs.mkdirSync(folder, { recursive: true });
    cb(null, folder);
  },
  filename: (_req, file, cb) => {
    // Nama file di disk selalu UUID acak; nama asli hanya disimpan di database setelah dibersihkan.
    cb(null, `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`);
  }
});

const ReceiveFiles = multer({
  storage,
  limits: { fileSize: Config.MaxUploadMb * 1024 * 1024, files: UploadLimits.MaxFilesPerUpload, fields: 20, fieldSize: 64 * 1024 },
  fileFilter: (_req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const allowedMime = (UploadLimits.AllowedMimeTypes as readonly string[]).includes(file.mimetype);
    const allowedExt = (UploadLimits.AllowedExtensions as readonly string[]).includes(extension);
    if (!allowedMime || !allowedExt) return cb(new HttpError(400, `File "${SanitizeFileName(file.originalname)}" ditolak. Hanya JPG, PNG, dan PDF.`));
    cb(null, true);
  }
}).array("Files", UploadLimits.MaxFilesPerUpload);

function ReadHeader(filePath: string): Uint8Array {
  const buffer = Buffer.alloc(FileSignatureLength);
  const fd = fs.openSync(filePath, "r");
  try {
    const bytesRead = fs.readSync(fd, buffer, 0, FileSignatureLength, 0);
    return buffer.subarray(0, bytesRead);
  } finally {
    fs.closeSync(fd);
  }
}

/** Setelah file diterima: pastikan isinya benar-benar JPG/PNG/PDF (bukan HTML/skrip yang diganti nama). */
function VerifyFiles(req: Request, _res: Response, next: NextFunction) {
  const files = GetUploadedFiles(req.files);
  for (const file of files) {
    file.originalname = SanitizeFileName(file.originalname);
    if (file.size === 0 || !IsFileContentValid(ReadHeader(file.path), file.mimetype)) {
      Log.Warn("upload.rejected", { reqId: req.RequestId, user: req.AuthUser?.Id, declared: file.mimetype, reason: "isi file tidak sesuai jenisnya" });
      return next(new HttpError(400, `File "${file.originalname}" ditolak: isi file bukan JPG, PNG, atau PDF yang valid.`));
    }
  }
  next();
}

export const UploadFiles = [ReceiveFiles, VerifyFiles];

export function GetUploadedFiles(files: unknown): Express.Multer.File[] {
  return Array.isArray(files) ? (files as Express.Multer.File[]) : [];
}

export function ToStoredPath(absolutePath: string): string {
  return path.relative(Config.UploadDir, absolutePath).split(path.sep).join("/");
}

export function ResolveStoredPath(storedPath: string): string {
  const resolved = path.resolve(Config.UploadDir, storedPath);
  if (!resolved.startsWith(Config.UploadDir + path.sep)) throw new HttpError(400, "Path lampiran tidak valid");
  return resolved;
}

export function RemoveUploadedFiles(files: Express.Multer.File[]): void {
  for (const file of files) fs.rm(file.path, { force: true }, () => undefined);
}
