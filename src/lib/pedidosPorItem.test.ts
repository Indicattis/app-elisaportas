import { describe, it, expect } from "vitest";
import { contaNaDemanda, ETAPAS_FORA_DE_COMPRA } from "./pedidosPorItem";

describe("contaNaDemanda", () => {
  it("nenhuma etapa fica fora da conta", () => expect(ETAPAS_FORA_DE_COMPRA).toEqual([]));
  it("pedido em produção conta", () => expect(contaNaDemanda("em_producao")).toBe(true));
  it("pedido finalizado conta", () => expect(contaNaDemanda("finalizado")).toBe(true));
  it("pedido em pós-vendas conta", () => expect(contaNaDemanda("pos_vendas")).toBe(true));
  it("etapa vazia conta", () => expect(contaNaDemanda(null)).toBe(true));
});
