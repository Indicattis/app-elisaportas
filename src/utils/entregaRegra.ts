import { MetodoPagamento, createEmptyMetodo } from "@/components/vendas/MetodoPagamentoCard";
import type { PagamentoData } from "@/components/vendas/PagamentoSection";

/**
 * Regra de "Na Entrega" (configurável em `regras_vendas`):
 *  - Quando o M1 for `na_entrega`, força split em 2 métodos:
 *      Método 1 = À Vista com ao menos `entradaMinPct`% do total
 *      Método 2 = À Vista (marcado `pagamento_na_entrega = true`) com o restante
 */
export interface EntregaConfig {
  entradaMinPct: number;
}

export const DEFAULT_ENTREGA_CONFIG: EntregaConfig = {
  entradaMinPct: 50,
};

const round2 = (v: number) => Math.round(v * 100) / 100;

export function pagamentoTemEntregaPrincipal(p: PagamentoData): boolean {
  return p.metodos[0]?.tipo === "na_entrega" || (p.pagamento_na_entrega && p.usar_dois_metodos && p.metodos[1]?.tipo === "a_vista");
}

export function aplicarRegraEntrega(
  p: PagamentoData,
  valorTotal: number,
  config: EntregaConfig = DEFAULT_ENTREGA_CONFIG,
): PagamentoData {
  if (valorTotal < 0) return p;
  const m1 = p.metodos[0];
  const m2 = p.metodos[1];

  const entradaMin = round2(valorTotal * (config.entradaMinPct / 100));
  // Preserva entrada se o usuário já configurou >= mínimo em À Vista.
  const entradaAtual = m1?.tipo === "a_vista" ? m1.valor : undefined;
  const entrada = entradaAtual !== undefined && entradaAtual > entradaMin
    ? round2(Math.min(entradaAtual, valorTotal))
    : entradaMin;
  const restante = round2(valorTotal - entrada);

  const novoM1: MetodoPagamento = {
    ...createEmptyMetodo(),
    tipo: "a_vista",
    valor: entrada,
    data_pagamento: m1?.tipo === "a_vista" ? m1.data_pagamento : undefined,
    empresa_receptora_id: m1?.empresa_receptora_id || m2?.empresa_receptora_id || "",
  };

  const novoM2: MetodoPagamento = {
    ...createEmptyMetodo(),
    tipo: "a_vista",
    valor: restante,
    empresa_receptora_id: m2?.empresa_receptora_id || novoM1.empresa_receptora_id || "",
  };

  const next: PagamentoData = {
    usar_dois_metodos: true,
    metodos: [novoM1, novoM2],
    pagamento_na_entrega: true,
  };

  if (
    p.usar_dois_metodos &&
    p.pagamento_na_entrega &&
    m1?.tipo === "a_vista" &&
    Math.abs((m1?.valor || 0) - novoM1.valor) < 0.01 &&
    m2?.tipo === "a_vista" &&
    Math.abs((m2?.valor || 0) - novoM2.valor) < 0.01
  ) {
    return p;
  }
  return next;
}