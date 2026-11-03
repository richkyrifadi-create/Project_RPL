import type { z } from "zod";
import type { LoginSchema } from "../validation/UserSchemas.js";

export type LoginRequest = z.infer<typeof LoginSchema>;
