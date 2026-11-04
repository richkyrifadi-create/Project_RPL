import bcrypt from "bcryptjs";
import { Router, type Request } from "express";
import { ChangePasswordSchema, LoginSchema, type LoginResponse } from "@praditacare/shared";
import { HttpError } from "../HttpError.js";
import { Authenticate, GetAuthUser, SignToken } from "../middleware/Auth.js";
import { Handle } from "../middleware/Handle.js";
import { ValidateBody } from "../middleware/Validate.js";
import { prisma } from "../Prisma.js";
import { AttemptLimiter } from "../security/AttemptLimiter.js";
import { Log } from "../security/SafeLog.js";
import { MapUser } from "../services/Mappers.js";

export const AuthRoutes = Router();

const FifteenMinutes = 15 * 60 * 1000;
/** Maks 5 login gagal per akun+IP dan 30 per IP dalam 15 menit (mencegah brute force & tebak password massal). */
export const LoginAccountLimiter = new AttemptLimiter({ MaxFailures: 5, WindowMs: FifteenMinutes });
export const LoginIpLimiter = new AttemptLimiter({ MaxFailures: 30, WindowMs: FifteenMinutes });
/** Maks 5 kali salah password lama per user dalam 15 menit. */
const ChangePasswordLimiter = new AttemptLimiter({ MaxFailures: 5, WindowMs: FifteenMinutes });

// Hash pembanding agar waktu respons login sama untuk email terdaftar maupun tidak (mencegah enumerasi akun).
const DummyHash = bcrypt.hashSync("praditacare-dummy-password", 10);

function TooManyAttempts(retryAfterSeconds: number): HttpError {
  const minutes = Math.ceil(retryAfterSeconds / 60);
  return Object.assign(new HttpError(429, `Terlalu banyak percobaan gagal. Coba lagi dalam ${minutes} menit.`), {
    RetryAfterSeconds: retryAfterSeconds
  });
}

const ClientIp = (req: Request) => req.ip ?? "unknown";

AuthRoutes.post(
  "/login",
  ValidateBody(LoginSchema),
  Handle(async (req, res) => {
    const email = String(req.body.Email).toLowerCase();
    const ip = ClientIp(req);
    const accountKey = `${ip}|${email}`;
    for (const status of [LoginAccountLimiter.Check(accountKey), LoginIpLimiter.Check(ip)]) {
      if (status.Blocked) {
        Log.Warn("auth.login_blocked", { reqId: req.RequestId, ip, email, retryAfter: status.RetryAfterSeconds });
        throw TooManyAttempts(status.RetryAfterSeconds);
      }
    }
    const user = await prisma.user.findUnique({ where: { Email: email }, include: { Unit: true } });
    const valid = await bcrypt.compare(req.body.Password, user?.PasswordHash ?? DummyHash);
    if (!user || !valid) {
      LoginAccountLimiter.RecordFailure(accountKey);
      LoginIpLimiter.RecordFailure(ip);
      Log.Warn("auth.login_failed", { reqId: req.RequestId, ip, email, reason: user ? "password salah" : "email tidak terdaftar" });
      throw new HttpError(401, "Email atau password salah");
    }
    if (!user.IsActive) {
      Log.Warn("auth.login_failed", { reqId: req.RequestId, ip, user: user.Id, reason: "akun nonaktif" });
      throw new HttpError(403, "Akun Anda dinonaktifkan. Hubungi admin.");
    }
    LoginAccountLimiter.Reset(accountKey);
    const updated = await prisma.user.update({ where: { Id: user.Id }, data: { LastLoginAt: new Date() }, include: { Unit: true } });
    Log.Info("auth.login_success", { reqId: req.RequestId, user: user.Id, role: user.Role });
    const response: LoginResponse = { AccessToken: SignToken(user.Id), User: MapUser(updated) };
    res.json(response);
  })
);

AuthRoutes.get(
  "/me",
  Authenticate,
  Handle(async (req, res) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { Id: GetAuthUser(req).Id }, include: { Unit: true } });
    res.json(MapUser(user));
  })
);

AuthRoutes.put(
  "/password",
  Authenticate,
  ValidateBody(ChangePasswordSchema),
  Handle(async (req, res) => {
    const authUser = GetAuthUser(req);
    const key = String(authUser.Id);
    const status = ChangePasswordLimiter.Check(key);
    if (status.Blocked) throw TooManyAttempts(status.RetryAfterSeconds);
    const user = await prisma.user.findUniqueOrThrow({ where: { Id: authUser.Id } });
    if (!(await bcrypt.compare(req.body.CurrentPassword, user.PasswordHash))) {
      ChangePasswordLimiter.RecordFailure(key);
      Log.Warn("auth.change_password_failed", { reqId: req.RequestId, user: user.Id, reason: "password lama salah" });
      throw new HttpError(422, "Password lama salah", { CurrentPassword: ["Password lama salah"] });
    }
    ChangePasswordLimiter.Reset(key);
    await prisma.user.update({ where: { Id: user.Id }, data: { PasswordHash: await bcrypt.hash(req.body.NewPassword, 10) } });
    Log.Info("auth.password_changed", { reqId: req.RequestId, user: user.Id });
    res.json({ Message: "Password berhasil diubah" });
  })
);
