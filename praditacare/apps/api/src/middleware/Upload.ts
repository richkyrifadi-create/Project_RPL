import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import { UploadLimits } from "@praditacare/shared";
import { Config } from "../Config.js";
import { HttpError } from "../HttpError.js";

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const now = new Date();
    const folder = path.join(Config.UploadDir, String(now.getUTCFullYear()), String(now.getUTCMonth() + 1).padStart(2, "0"));
    fs.mkdirSync(folder, { recursive: true });
    cb(null, folder);
  },
  filename: (_req, file, cb) => {
    cb(null, `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`);
  }
});

export const UploadFiles = multer({
  storage,
  limits: { fileSize: Config.MaxUploadMb * 1024 * 1024, files: UploadLimits.MaxFilesPerUpload },
  fileFilter: (_req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const allowedMime = (UploadLimits.AllowedMimeTypes as readonly string[]).includes(file.mimetype);
    const allowedExt = (UploadLimits.AllowedExtensions as readonly string[]).includes(extension);
    if (!allowedMime || !allowedExt) return cb(new HttpError(400, `File "${file.originalname}" ditolak. Hanya JPG, PNG, dan PDF.`));
    cb(null, true);
  }
}).array("Files", UploadLimits.MaxFilesPerUpload);

export function GetUploadedFiles(files: unknown): Express.Multer.File[] {
  return Array.isArray(files) ? (files as Express.Multer.File[]) : [];
}

export function ToStoredPath(absolutePath: string): string {
  return path.relative(Config.UploadDir, absolutePath).split(path.sep).join("/");
}

export function ResolveStoredPath(storedPath: string): string {
  const resolved = path.resolve(Config.UploadDir, storedPath);
  if (!resolved.startsWith(Config.UploadDir)) throw new HttpError(400, "Path lampiran tidak valid");
  return resolved;
}

export function RemoveUploadedFiles(files: Express.Multer.File[]): void {
  for (const file of files) fs.rm(file.path, { force: true }, () => undefined);
}
