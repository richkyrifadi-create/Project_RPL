import path from "node:path";

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) throw new Error("JWT_SECRET belum diatur. Salin .env.example menjadi .env di root proyek.");

export const Config = {
  Port: Number(process.env.PORT ?? 4000),
  JwtSecret: jwtSecret,
  JwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "8h",
  UploadDir: path.resolve(process.cwd(), process.env.UPLOAD_DIR ?? "uploads"),
  MaxUploadMb: Number(process.env.MAX_UPLOAD_MB ?? 5),
  CorsOrigin: (process.env.CORS_ORIGIN ?? "http://localhost:5173").split(",")
};
