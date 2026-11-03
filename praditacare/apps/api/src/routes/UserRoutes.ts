import bcrypt from "bcryptjs";
import { Router } from "express";
import { CreateUserSchema, IdParamSchema, ResetPasswordSchema, UpdateUserSchema, UserListQuerySchema } from "@praditacare/shared";
import type { z } from "zod";
import { HttpError, NotFound } from "../HttpError.js";
import { GetAuthUser } from "../middleware/Auth.js";
import { Handle } from "../middleware/Handle.js";
import { ValidateBody } from "../middleware/Validate.js";
import { prisma } from "../Prisma.js";
import { MapUser } from "../services/Mappers.js";

export const UserRoutes = Router();

function NormalizeUser(body: z.infer<typeof UpdateUserSchema>) {
  const isStudent = body.Role === "STUDENT";
  return {
    Name: body.Name,
    Email: body.Email.toLowerCase(),
    Role: body.Role,
    StudentNumber: isStudent ? body.StudentNumber || null : null,
    StudyProgram: isStudent ? body.StudyProgram || null : null,
    UnitId: body.Role === "STAFF" ? body.UnitId ?? null : null,
    ...(body.IsActive === undefined ? {} : { IsActive: body.IsActive })
  };
}

UserRoutes.get(
  "/",
  Handle(async (req, res) => {
    const query = UserListQuerySchema.parse(req.query);
    const users = await prisma.user.findMany({
      where: {
        Role: query.Role,
        UnitId: query.UnitId,
        ...(query.Keyword
          ? { OR: [{ Name: { contains: query.Keyword } }, { Email: { contains: query.Keyword } }, { StudentNumber: { contains: query.Keyword } }] }
          : {})
      },
      include: { Unit: true },
      orderBy: [{ Role: "asc" }, { Name: "asc" }]
    });
    res.json(users.map(MapUser));
  })
);

UserRoutes.post(
  "/",
  ValidateBody(CreateUserSchema),
  Handle(async (req, res) => {
    const user = await prisma.user.create({
      data: { ...NormalizeUser(req.body), PasswordHash: await bcrypt.hash(req.body.Password, 10) },
      include: { Unit: true }
    });
    res.status(201).json(MapUser(user));
  })
);

UserRoutes.put(
  "/:Id",
  ValidateBody(UpdateUserSchema),
  Handle(async (req, res) => {
    const { Id } = IdParamSchema.parse(req.params);
    if (!(await prisma.user.findUnique({ where: { Id } }))) throw NotFound("User");
    const data = NormalizeUser(req.body);
    if (Id === GetAuthUser(req).Id && (data.IsActive === false || data.Role !== "ADMIN")) {
      throw new HttpError(409, "Anda tidak dapat menonaktifkan atau menurunkan peran akun sendiri");
    }
    const user = await prisma.user.update({ where: { Id }, data, include: { Unit: true } });
    res.json(MapUser(user));
  })
);

UserRoutes.post(
  "/:Id/reset-password",
  ValidateBody(ResetPasswordSchema),
  Handle(async (req, res) => {
    const { Id } = IdParamSchema.parse(req.params);
    if (!(await prisma.user.findUnique({ where: { Id } }))) throw NotFound("User");
    await prisma.user.update({ where: { Id }, data: { PasswordHash: await bcrypt.hash(req.body.NewPassword, 10) } });
    res.json({ Message: "Password berhasil direset" });
  })
);
