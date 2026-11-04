import fs from "node:fs";
import { CreateApp } from "./App.js";
import { Config } from "./Config.js";
import { StartAutoCloseJob } from "./jobs/AutoCloseJob.js";
import { Log } from "./security/SafeLog.js";

fs.mkdirSync(Config.UploadDir, { recursive: true });
for (const warning of Config.ConfigWarnings) Log.Warn("config.insecure", { detail: warning, note: "ditolak bila NODE_ENV=production" });
CreateApp().listen(Config.Port, () => {
  console.log(`PraditaCare API berjalan di http://localhost:${Config.Port}`);
  Log.Info("server.start", {
    mode: Config.IsProduction ? "production" : "development",
    port: Config.Port,
    web: Config.WebDistDir ? "disajikan oleh API" : "tidak disajikan (pakai Vite :5173)"
  });
  StartAutoCloseJob();
});
