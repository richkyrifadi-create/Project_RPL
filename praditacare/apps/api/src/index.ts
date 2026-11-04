import fs from "node:fs";
import { CreateApp } from "./App.js";
import { Config } from "./Config.js";
import { StartAutoCloseJob } from "./jobs/AutoCloseJob.js";
import { Log, SafeErrorFields } from "./security/SafeLog.js";

fs.mkdirSync(Config.UploadDir, { recursive: true });
for (const warning of Config.ConfigWarnings) Log.Warn("config.insecure", { detail: warning, note: "ditolak bila NODE_ENV=production" });
const server = CreateApp().listen(Config.Port, () => {
  console.log(`PraditaCare API berjalan di http://localhost:${Config.Port}`);
  Log.Info("server.start", {
    mode: Config.IsProduction ? "production" : "development",
    port: Config.Port,
    web: Config.WebDistDir ? "disajikan oleh API" : "tidak disajikan (pakai Vite :5173)"
  });
  StartAutoCloseJob();
});

server.on("error", (err: NodeJS.ErrnoException) => {
  const hint = err.code === "EADDRINUSE" ? `port ${Config.Port} sudah dipakai proses lain; hentikan proses itu atau ubah PORT di .env` : "periksa konfigurasi server";
  Log.Error("server.start_failed", { ...SafeErrorFields(err, false), hint });
  process.exit(1);
});
