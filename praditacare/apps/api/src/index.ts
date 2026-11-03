import fs from "node:fs";
import { CreateApp } from "./App.js";
import { Config } from "./Config.js";
import { StartAutoCloseJob } from "./jobs/AutoCloseJob.js";

fs.mkdirSync(Config.UploadDir, { recursive: true });
CreateApp().listen(Config.Port, () => {
  console.log(`PraditaCare API berjalan di http://localhost:${Config.Port}`);
  StartAutoCloseJob();
});
