import { Router } from "express";
import { IdParamSchema, UnitSchema } from "@praditacare/shared";
import { NotFound } from "../HttpError.js";
import { GetAuthUser, RequireRole } from "../middleware/Auth.js";
import { Handle } from "../middleware/Handle.js";
import { ValidateBody } from "../middleware/Validate.js";
import { prisma } from "../Prisma.js";
import { MapUnit } from "../services/Mappers.js";

export const UnitRoutes = Router();

UnitRoutes.get(
  "/",
  Handle(async (req, res) => {
    const includeInactive = GetAuthUser(req).Role === "ADMIN" && req.query.IncludeInactive === "true";
    const units = await prisma.unit.findMany({ where: includeInactive ? {} : { IsActive: true }, orderBy: { Name: "asc" } });
    res.json(units.map(MapUnit));
  })
);

UnitRoutes.get(
  "/:Id",
  Handle(async (req, res) => {
    const { Id } = IdParamSchema.parse(req.params);
    const unit = await prisma.unit.findUnique({ where: { Id } });
    if (!unit) throw NotFound("Unit");
    res.json(MapUnit(unit));
  })
);

UnitRoutes.post(
  "/",
  RequireRole("ADMIN"),
  ValidateBody(UnitSchema),
  Handle(async (req, res) => {
    const unit = await prisma.unit.create({ data: req.body });
    res.status(201).json(MapUnit(unit));
  })
);

UnitRoutes.put(
  "/:Id",
  RequireRole("ADMIN"),
  ValidateBody(UnitSchema),
  Handle(async (req, res) => {
    const { Id } = IdParamSchema.parse(req.params);
    if (!(await prisma.unit.findUnique({ where: { Id } }))) throw NotFound("Unit");
    const unit = await prisma.unit.update({ where: { Id }, data: req.body });
    res.json(MapUnit(unit));
  })
);
