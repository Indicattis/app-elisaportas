import { describe, it, expect } from "vitest";
import { arredondarKgTinta, kgTintaPorM2 } from "./tinta";

describe("tinta", () => {
  it("1 m² = 1,25 kg", () => expect(kgTintaPorM2(1)).toBe(1.25));
  it("12,4 arredonda para 13", () => expect(arredondarKgTinta(12.4)).toBe(13));
  it("12,39 arredonda para 12", () => expect(arredondarKgTinta(12.39)).toBe(12));
  it("12 fica 12", () => expect(arredondarKgTinta(12)).toBe(12));
});
