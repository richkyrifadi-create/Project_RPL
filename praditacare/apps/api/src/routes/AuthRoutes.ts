import bcrypt from "bcryptjs";
import { Router } from "express";
import { ChangePasswordSchema, LoginSchema, type LoginResponse } from "@praditacare/shared";
import { HttpError } from "../HttpError.js";
import { Authenticate, GetAuthUser, SignToken } from "../middleware/Auth.js";
import { Handle } from "../middleware/Handle.js";
import { ValidateBody } from "../middleware/Validate.js";
import { prisma } from "../Prisma.js";
import { MapUser } from "../services/Mappers.js";

export const AuthRoutes = Router();

AuthRoutes.post(
  "/login",
  ValidateBody(LoginSchema),
  Handle(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { Email: req.body.Email.toLowerCase() }, include: { Unit: true } });
    const valid = user ? await bcrypt.compare(req.body.Password, user.PasswordHash) : false;
    if (!user || !valid) throw new HttpError(401, "Email atau password salah");
    if (!user.IsActive) throw new HttpError(403, "Akun Anda dinonaktifkan. Hubungi admin.");
    const updated = await prisma.user.update({ where: { Id: user.Id }, data: { LastLoginAt: new Date() }, include: { Unit: true } });
    const response: LoginResponse = { AccessToken: SignToken(user.Id), User: MapUser(updated) };
    res.json(response);
  })
);

AuthRoutes.get(
  "/me",
  Authenticate,
  Handle(async (req, res) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { Id: GetAuthUser(req).Id }, include: { Unit: true } });
    res.json(MapUser(user));
  })
);

AuthRoutes.put(
  "/password",
  Authenticate,
  ValidateBody(ChangePasswordSchema),
  Handle(async (req, res) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { Id: GetAuthUser(req).Id } });
    if (!(await bcrypt.compare(req.body.CurrentPassword, user.PasswordHash))) {
      throw new HttpError(422, "Password lama salah", { CurrentPassword: ["Password lama salah"] });
    }
    await prisma.user.update({ where: { Id: user.Id }, data: { PasswordHash: await bcrypt.hash(req.body.NewPassword, 10) } });
    res.json({ Message: "Password berhasil diubah" });
  })
);
