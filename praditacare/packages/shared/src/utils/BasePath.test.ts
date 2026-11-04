import { describe, expect, it } from "vitest";
import { JoinBasePath, NormalizeBasePath } from "./BasePath.js";

describe("NormalizeBasePath (deploy di sub-path /praditacare)", () => {
  it("kosong, undefined, atau '/' berarti root", () => {
    expect(NormalizeBasePath(undefined)).toBe("/");
    expect(NormalizeBasePath("")).toBe("/");
    expect(NormalizeBasePath("/")).toBe("/");
    expect(NormalizeBasePath("  ")).toBe("/");
  });

  it("menambahkan garis miring awal dan akhir", () => {
    expect(NormalizeBasePath("praditacare")).toBe("/praditacare/");
    expect(NormalizeBasePath("/praditacare")).toBe("/praditacare/");
    expect(NormalizeBasePath("praditacare/")).toBe("/praditacare/");
  });

  it("merapikan garis miring ganda dan spasi", () => {
    expect(NormalizeBasePath(" //praditacare// ")).toBe("/praditacare/");
    expect(NormalizeBasePath("/apps/praditacare/")).toBe("/apps/praditacare/");
  });
});

describe("JoinBasePath", () => {
  it("menggabungkan base dengan path API", () => {
    expect(JoinBasePath("/praditacare/", "api/health")).toBe("/praditacare/api/health");
    expect(JoinBasePath("/praditacare", "/api/health")).toBe("/praditacare/api/health");
    expect(JoinBasePath("/", "/api/health")).toBe("/api/health");
  });
});
