import type { z } from "zod";
import type { CreateTicketSchema } from "../validation/TicketSchemas.js";

export type CreateTicketRequest = z.infer<typeof CreateTicketSchema>;
