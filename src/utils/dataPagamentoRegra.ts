import type { PagamentoData } from "@/components/vendas/PagamentoSection";

/**
 * Regra: a data de pagamento (para qualquer método) deve estar dentro
 * de uma janela de ± N dias a partir da data atual. N é configurável em
 * `regras_vendas.pagamento_data_janela_dias` (padrão 5).
 */

export const DEFAULT_DATA_PAGAMENTO_JANELA_DIAS = 5;

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function getJanelaDataPagamento(
  janelaDias: number = DEFAULT_DATA_PAGAMENTO_JANELA_DIAS,
  hoje: Date = new Date(),
): { min: Date; max: Date } {
  const base = startOfDay(hoje);
  const min = new Date(base);
  min.setDate(base.getDate() - Math.max(0, janelaDias));
  const max = new Date(base);
  max.setDate(base.getDate() + Math.max(0, janelaDias));
  return { min, max };
}

function formatBR(d: Date): string {
  return d.toLocaleDateString("pt-BR");
}

export function validarDataPagamento(
  data: Date | string | null | undefined,
  janelaDias: number = DEFAULT_DATA_PAGAMENTO_JANELA_DIAS,
): { ok: true } | { ok: false; mensagem: string } {
  if (!data) return { ok: true };
  const d = startOfDay(typeof data === "string" ? new Date(data) : data);
  if (isNaN(d.getTime())) return { ok: true };
  const { min, max } = getJanelaDataPagamento(janelaDias);
  if (d < min || d > max) {
    return {
      ok: false,
      mensagem: `A data de pagamento deve estar entre ${formatBR(min)} e ${formatBR(max)} (janela de ±${janelaDias} dias).`,
    };
  }
  return { ok: true };
}

export function validarDatasPagamento(
  p: PagamentoData,
  janelaDias: number = DEFAULT_DATA_PAGAMENTO_JANELA_DIAS,
): { ok: true } | { ok: false; mensagem: string } {
  const metodos = p.metodos || [];
  for (let i = 0; i < metodos.length; i++) {
    const m = metodos[i];
    if (!m?.tipo) continue;
    if (!p.usar_dois_metodos && i > 0) continue;
    const r = validarDataPagamento(m.data_pagamento, janelaDias);
    if (r.ok === false) {
      return {
        ok: false,
        mensagem: `Método ${i + 1}: ${r.mensagem}`,
      };
    }
  }
  return { ok: true };
}