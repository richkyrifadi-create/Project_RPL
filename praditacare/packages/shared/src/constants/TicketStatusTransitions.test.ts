import { describe, expect, it } from "vitest";
import { CanTransition } from "./TicketStatusTransitions.js";

describe("CanTransition", () => {
  it("mengizinkan alur normal OPEN → IN_PROGRESS → RESOLVED", () => {
    expect(CanTransition("OPEN", "IN_PROGRESS")).toBe(true);
    expect(CanTransition("IN_PROGRESS", "RESOLVED")).toBe(true);
  });

  it("menolak loncat langsung OPEN → RESOLVED", () => {
    expect(CanTransition("OPEN", "RESOLVED")).toBe(false);
  });

  it("tidak ada transisi dari status final", () => {
    expect(CanTransition("CLOSED", "IN_PROGRESS")).toBe(false);
    expect(CanTransition("REJECTED", "OPEN")).toBe(false);
  });
});
