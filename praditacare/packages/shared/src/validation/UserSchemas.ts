import { z } from "zod";
import { UserRoleValues } from "../enums/UserRole.js";
import { BooleanLike, RequiredText } from "./Common.js";

export const LoginSchema = z.object({
  Email: z.string({ error: "Email wajib diisi" }).trim().min(1, "Email wajib diisi").email("Format email tidak valid"),
  Password: z.string({ error: "Password wajib diisi" }).min(1, "Password wajib diisi")
});

export const PasswordRule = z.string({ error: "Password wajib diisi" }).min(8, "Password minimal 8 karakter");

export const ChangePasswordSchema = z
  .object({
    CurrentPassword: z.string().min(1, "Password lama wajib diisi"),
    NewPassword: PasswordRule
  })
  .refine((data) => data.CurrentPassword !== data.NewPassword, {
    message: "Password baru harus berbeda dari password lama",
    path: ["NewPassword"]
  });

const UserBaseSchema = z.object({
  Name: RequiredText("Nama", 3, 120),
  Email: z.string().trim().min(1, "Email wajib diisi").email("Format email tidak valid"),
  Role: z.enum(UserRoleValues, { error: "Peran tidak valid" }),
  StudentNumber: z.string().trim().max(30).optional().nullable(),
  StudyProgram: z.string().trim().max(120).optional().nullable(),
  UnitId: z.coerce.number().int().positive().optional().nullable(),
  IsActive: BooleanLike.optional()
});

const RoleRules = <T extends z.ZodType<z.infer<typeof UserBaseSchema>>>(schema: T) =>
  schema.superRefine((data: z.infer<typeof UserBaseSchema>, ctx) => {
    if (data.Role === "STAFF" && !data.UnitId) {
      ctx.addIssue({ code: "custom", message: "Unit wajib dipilih untuk staf", path: ["UnitId"] });
    }
    if (data.Role === "STUDENT" && !data.StudentNumber) {
      ctx.addIssue({ code: "custom", message: "NIM wajib diisi untuk mahasiswa", path: ["StudentNumber"] });
    }
  });

export const CreateUserSchema = RoleRules(UserBaseSchema.extend({ Password: PasswordRule }));
export const UpdateUserSchema = RoleRules(UserBaseSchema);

export const ResetPasswordSchema = z.object({ NewPassword: PasswordRule });

export const UserListQuerySchema = z.object({
  Role: z.enum(UserRoleValues).optional(),
  UnitId: z.coerce.number().int().positive().optional(),
  Keyword: z.string().trim().optional()
});
