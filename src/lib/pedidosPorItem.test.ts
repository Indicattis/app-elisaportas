import { describe, it, expect } from "vitest";
import { contaNaDemanda, ETAPAS_FORA_DE_COMPRA, EXCLUIR_ARQUIVADOS } from "./pedidosPorItem";

describe("contaNaDemanda", () => {
  it("nenhuma etapa fica fora da conta", () => expect(ETAPAS_FORA_DE_COMPRA).toEqual([]));
  it("arquivados entram na conta", () => expect(EXCLUIR_ARQUIVADOS).toBe(false));
  it("pedido em produção conta", () => expect(contaNaDemanda({ etapa_atual: "em_producao" })).toBe(true));
  it("pedido finalizado conta", () => expect(contaNaDemanda({ etapa_atual: "finalizado" })).toBe(true));
  it("pedido em pós-vendas conta", () => expect(contaNaDemanda({ etapa_atual: "pos_vendas" })).toBe(true));
  it("pedido arquivado conta", () => expect(contaNaDemanda({ etapa_atual: "pos_vendas", arquivado: true })).toBe(true));
  it("etapa vazia conta", () => expect(contaNaDemanda({})).toBe(true));
});
