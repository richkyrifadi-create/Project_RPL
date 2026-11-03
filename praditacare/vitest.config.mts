import { defineConfig } from "vitest/config";

// Unit test untuk logika murni di packages/shared dan apps/api (tanpa database).
export default defineConfig({
  test: {
    include: ["packages/*/src/**/*.test.ts", "apps/api/src/**/*.test.ts"],
    environment: "node",
    reporters: ["verbose"]
  }
});
