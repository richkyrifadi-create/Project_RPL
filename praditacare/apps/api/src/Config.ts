import fs from "node:fs";
import path from "node:path";
import { CheckSecurityConfig } from "./security/ConfigChecks.js";

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) throw new Error("JWT_SECRET belum diatur. Salin .env.example menjadi .env di root proyek.");

const isProduction = process.env.NODE_ENV === "production";
const corsOrigin = (process.env.CORS_ORIGIN ?? "http://localhost:5173").split(",").map((origin) => origin.trim());
const webDistDir = path.resolve(process.cwd(), process.env.WEB_DIST_DIR ?? "../web/dist");

const problems = CheckSecurityConfig({ IsProduction: isProduction, JwtSecret: jwtSecret, CorsOrigin: corsOrigin });
if (problems.length && isProduction) {
  throw new Error(`Konfigurasi production tidak aman: ${problems.join("; ")}. Lihat README bagian Deploy.`);
}

export const Config = {
  IsProduction: isProduction,
  Port: Number(process.env.PORT ?? 4000),
  JwtSecret: jwtSecret,
  JwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "8h",
  UploadDir: path.resolve(process.cwd(), process.env.UPLOAD_DIR ?? "uploads"),
  MaxUploadMb: Number(process.env.MAX_UPLOAD_MB ?? 5),
  CorsOrigin: corsOrigin,
  /** Jumlah reverse proxy di depan API (untuk IP asli pada rate limit). 0 = tanpa proxy. */
  TrustProxy: Number(process.env.TRUST_PROXY ?? 0),
  /** Folder hasil build web; bila ada, API sekaligus menyajikan web (mode deploy satu port). */
  WebDistDir: process.env.SERVE_WEB === "false" || !fs.existsSync(path.join(webDistDir, "index.html")) ? null : webDistDir,
  ConfigWarnings: problems
};
