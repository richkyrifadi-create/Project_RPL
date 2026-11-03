import { z } from "zod";

export const BooleanLike = z.preprocess((value) => {
  if (typeof value === "string") return value === "true" || value === "1" || value === "on";
  return value;
}, z.boolean());

export const IdParamSchema = z.object({ Id: z.coerce.number().int().positive("Id tidak valid") });

export const RequiredText = (label: string, min = 1, max = 255) =>
  z
    .string({ required_error: `${label} wajib diisi`, invalid_type_error: `${label} wajib diisi` })
    .trim()
    .min(min, min <= 1 ? `${label} wajib diisi` : `${label} minimal ${min} karakter`)
    .max(max, `${label} maksimal ${max} karakter`);
