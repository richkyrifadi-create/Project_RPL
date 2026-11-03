import type { z } from "zod";
import type { TicketListQuerySchema } from "../validation/TicketSchemas.js";

export type TicketListQuery = z.infer<typeof TicketListQuerySchema>;
