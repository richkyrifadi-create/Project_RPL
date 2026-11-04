import path from "node:path";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { Authenticate, RequireRole } from "./middleware/Auth.js";
import { ErrorHandler, NotFoundHandler } from "./middleware/ErrorHandler.js";
import { RequestLogger } from "./middleware/RequestLogger.js";
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
  app.set("trust proxy", Config.TrustProxy);
  // Header keamanan: CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, HSTS, tanpa X-Powered-By.
  app.use(helmet({ crossOriginEmbedderPolicy: false, hsts: Config.IsProduction }));
  app.use(RequestLogger);
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
  if (Config.WebDistDir) {
    // Mode deploy: web hasil `npm run build` disajikan dari port yang sama dengan API.
    const webDir = Config.WebDistDir;
    app.use(express.static(webDir, { index: false, maxAge: "1h" }));
    app.get(/.*/, (_req, res) => res.sendFile(path.join(webDir, "index.html")));
  }
  app.use(ErrorHandler);
  return app;
}
