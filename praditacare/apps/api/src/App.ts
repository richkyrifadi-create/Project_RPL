import cors from "cors";
import express from "express";
import { Authenticate, RequireRole } from "./middleware/Auth.js";
import { ErrorHandler, NotFoundHandler } from "./middleware/ErrorHandler.js";
import { Config } from "./Config.js";
import { AttachmentRoutes } from "./routes/AttachmentRoutes.js";
import { AuthRoutes } from "./routes/AuthRoutes.js";
import { CategoryRoutes } from "./routes/CategoryRoutes.js";
import { DashboardRoutes } from "./routes/DashboardRoutes.js";
import { TicketRoutes } from "./routes/TicketRoutes.js";
import { UnitRoutes } from "./routes/UnitRoutes.js";
import { UserRoutes } from "./routes/UserRoutes.js";

export function CreateApp() {
  const app = express();
  app.use(cors({ origin: Config.CorsOrigin }));
  app.use(express.json({ limit: "1mb" }));
  app.get("/api/health", (_req, res) => res.json({ Status: "OK" }));
  app.use("/api/auth", AuthRoutes);
  app.use("/api/units", Authenticate, UnitRoutes);
  app.use("/api/categories", Authenticate, CategoryRoutes);
  app.use("/api/users", Authenticate, RequireRole("ADMIN"), UserRoutes);
  app.use("/api/tickets", Authenticate, TicketRoutes);
  app.use("/api/attachments", Authenticate, AttachmentRoutes);
  app.use("/api/dashboard", Authenticate, DashboardRoutes);
  app.use("/api", NotFoundHandler);
  app.use(ErrorHandler);
  return app;
}
