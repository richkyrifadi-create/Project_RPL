import { z } from "zod";
import { BooleanLike, RequiredText } from "./Common.js";

export const UnitSchema = z.object({
  Code: RequiredText("Kode", 2, 20).transform((value) => value.toUpperCase()),
  Name: RequiredText("Nama unit", 3, 120),
  Email: z.string().trim().min(1, "Email wajib diisi").email("Format email tidak valid"),
  IsActive: BooleanLike.optional()
});

export const CategorySchema = z.object({
  UnitId: z.coerce.number({ invalid_type_error: "Unit wajib dipilih" }).int().positive("Unit wajib dipilih"),
  Name: RequiredText("Nama kategori", 3, 120),
  Description: z.string().trim().max(500, "Deskripsi maksimal 500 karakter").default(""),
  SlaHours: z.coerce.number({ invalid_type_error: "SLA wajib diisi" }).int().min(1, "SLA minimal 1 jam").max(720, "SLA maksimal 720 jam"),
  IsConfidential: BooleanLike.default(false),
  RequiresLocation: BooleanLike.default(false),
  IsActive: BooleanLike.optional()
});
