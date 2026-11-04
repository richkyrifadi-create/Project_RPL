import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { UserRole } from "@praditacare/shared";
import { Config } from "../Config.js";
import { HttpError, Forbidden } from "../HttpError.js";
import { prisma } from "../Prisma.js";
import type { AuthUser } from "../types/express.js";
import { Handle } from "./Handle.js";

interface TokenPayload {
  sub: string;
}

export const Authenticate = Handle(async (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) throw new HttpError(401, "Silakan login terlebih dahulu");
  let payload: TokenPayload;
  try {
    payload = jwt.verify(token, Config.JwtSecret, { algorithms: ["HS256"] }) as TokenPayload;
  } catch {
    throw new HttpError(401, "Sesi berakhir, silakan login kembali");
  }
  const user = await prisma.user.findUnique({ where: { Id: Number(payload.sub) } });
  if (!user || !user.IsActive) throw new HttpError(401, "Akun tidak aktif atau tidak ditemukan");
  req.AuthUser = { Id: user.Id, Name: user.Name, Role: user.Role, UnitId: user.UnitId };
  next();
});

export const RequireRole =
  (...roles: UserRole[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.AuthUser) return next(new HttpError(401, "Silakan login terlebih dahulu"));
    if (!roles.includes(req.AuthUser.Role)) return next(Forbidden());
    next();
  };

export function GetAuthUser(req: Request): AuthUser {
  if (!req.AuthUser) throw new HttpError(401, "Silakan login terlebih dahulu");
  return req.AuthUser;
}

export function SignToken(userId: number): string {
  return jwt.sign({ sub: String(userId) }, Config.JwtSecret, { algorithm: "HS256", expiresIn: Config.JwtExpiresIn as jwt.SignOptions["expiresIn"] });
}
