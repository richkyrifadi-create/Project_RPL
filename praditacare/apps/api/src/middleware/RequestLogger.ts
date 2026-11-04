import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { Log } from "../security/SafeLog.js";

/**
 * Mencatat setiap request API dalam satu baris aman: id request, method, path TANPA query string,
 * status, durasi, dan id user. Body, header Authorization, dan query (bisa berisi kata kunci pencarian) tidak dicatat.
 */
export function RequestLogger(req: Request, res: Response, next: NextFunction) {
  const started = process.hrtime.bigint();
  req.RequestId = crypto.randomUUID().slice(0, 8);
  res.setHeader("X-Request-Id", req.RequestId);
  res.on("finish", () => {
    const path = req.originalUrl.split("?")[0];
    if (!path.startsWith("/api") || path === "/api/health") return;
    const fields = {
      reqId: req.RequestId,
      method: req.method,
      path,
      status: res.statusCode,
      ms: Number((process.hrtime.bigint() - started) / 1_000_000n),
      user: req.AuthUser?.Id
    };
    if (res.statusCode >= 500) Log.Error("http.request", fields);
    else if (res.statusCode >= 400) Log.Warn("http.request", fields);
    else Log.Info("http.request", fields);
  });
  next();
}
