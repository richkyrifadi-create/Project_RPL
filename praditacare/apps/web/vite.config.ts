import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { NormalizeBasePath } from "../../packages/shared/src/utils/BasePath";

// Sub-path tempat web disajikan. Default "/" (lokal). Untuk deploy di https://<ip>/praditacare
// build dengan VITE_BASE_PATH=/praditacare/ agar aset, routing, dan panggilan API ikut sub-path itu.
export default defineConfig({
  base: NormalizeBasePath(process.env.VITE_BASE_PATH),
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { "/api": "http://localhost:4000" }
  }
});
