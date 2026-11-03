import { Router } from "express";
import { CategorySchema, IdParamSchema } from "@praditacare/shared";
import { HttpError, NotFound } from "../HttpError.js";
import { GetAuthUser, RequireRole } from "../middleware/Auth.js";
import { Handle } from "../middleware/Handle.js";
import { ValidateBody } from "../middleware/Validate.js";
import { prisma } from "../Prisma.js";
import { MapCategory } from "../services/Mappers.js";

export const CategoryRoutes = Router();

CategoryRoutes.get(
  "/",
  Handle(async (req, res) => {
    const includeInactive = GetAuthUser(req).Role === "ADMIN" && req.query.IncludeInactive === "true";
    const unitId = req.query.UnitId ? Number(req.query.UnitId) : undefined;
    const categories = await prisma.category.findMany({
      where: { ...(includeInactive ? {} : { IsActive: true, Unit: { IsActive: true } }), ...(unitId ? { UnitId: unitId } : {}) },
      include: { Unit: true },
      orderBy: [{ Unit: { Name: "asc" } }, { Name: "asc" }]
    });
    res.json(categories.map(MapCategory));
  })
);

CategoryRoutes.get(
  "/:Id",
  Handle(async (req, res) => {
    const { Id } = IdParamSchema.parse(req.params);
    const category = await prisma.category.findUnique({ where: { Id }, include: { Unit: true } });
    if (!category) throw NotFound("Kategori");
    res.json(MapCategory(category));
  })
);

async function EnsureUnit(unitId: number) {
  const unit = await prisma.unit.findUnique({ where: { Id: unitId } });
  if (!unit) throw new HttpError(422, "Unit tidak ditemukan", { UnitId: ["Unit tidak ditemukan"] });
}

CategoryRoutes.post(
  "/",
  RequireRole("ADMIN"),
  ValidateBody(CategorySchema),
  Handle(async (req, res) => {
    await EnsureUnit(req.body.UnitId);
    const category = await prisma.category.create({ data: req.body, include: { Unit: true } });
    res.status(201).json(MapCategory(category));
  })
);

CategoryRoutes.put(
  "/:Id",
  RequireRole("ADMIN"),
  ValidateBody(CategorySchema),
  Handle(async (req, res) => {
    const { Id } = IdParamSchema.parse(req.params);
    if (!(await prisma.category.findUnique({ where: { Id } }))) throw NotFound("Kategori");
    await EnsureUnit(req.body.UnitId);
    const category = await prisma.category.update({ where: { Id }, data: req.body, include: { Unit: true } });
    res.json(MapCategory(category));
  })
);
