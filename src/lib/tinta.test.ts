import { describe, it, expect } from "vitest";
import { arredondarKgTinta, kgTintaPorM2, latasTinta } from "./tinta";

describe("tinta", () => {
  it("1 m² = 1,25 kg", () => expect(kgTintaPorM2(1)).toBe(1.25));
  it("12,4 arredonda para 13", () => expect(arredondarKgTinta(12.4)).toBe(13));
  it("12,39 arredonda para 12", () => expect(arredondarKgTinta(12.39)).toBe(12));
  it("12 fica 12", () => expect(arredondarKgTinta(12)).toBe(12));
  it("25 kg é 1 lata", () => expect(latasTinta(25)).toBe(1));
  it("25,1 kg são 2 latas", () => expect(latasTinta(25.1)).toBe(2));
  it("60 kg são 3 latas", () => expect(latasTinta(60)).toBe(3));
  it("0 kg é 0 lata", () => expect(latasTinta(0)).toBe(0));
});

describe("latas por cor", () => {
  it("26 kg cinza + 10 kg preto = 3 latas", async () => {
    const { latasTinta } = await import("./tinta");
    expect(latasTinta(26) + latasTinta(10)).toBe(3);
  });
});
