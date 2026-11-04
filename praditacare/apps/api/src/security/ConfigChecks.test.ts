import { describe, expect, it } from "vitest";
import { CheckSecurityConfig, ExampleJwtSecret } from "./ConfigChecks.js";

const StrongSecret = "k3J9xQ2mP8vL5nR7tY1wZ4cB6dF0gH2j";

describe("CheckSecurityConfig (security: secret & CORS)", () => {
  it("lolos dengan secret acak panjang dan origin spesifik", () => {
    expect(CheckSecurityConfig({ IsProduction: true, JwtSecret: StrongSecret, CorsOrigin: ["https://care.pradita.ac.id"] })).toEqual([]);
  });

  it("menolak JWT_SECRET contoh dari .env.example", () => {
    expect(CheckSecurityConfig({ IsProduction: true, JwtSecret: ExampleJwtSecret, CorsOrigin: [] })).toEqual([
      "JWT_SECRET masih memakai nilai contoh dari .env.example"
    ]);
  });

  it("menolak JWT_SECRET pendek dan CORS '*'", () => {
    expect(CheckSecurityConfig({ IsProduction: true, JwtSecret: "rahasia", CorsOrigin: ["*"] })).toHaveLength(2);
  });
});
