import { MetodoPagamento, createEmptyMetodo } from "@/components/vendas/MetodoPagamentoCard";
import type { PagamentoData } from "@/components/vendas/PagamentoSection";

/**
 * Regra de Boleto (configurável em `regras_vendas`):
 *  - Sempre que qualquer método for boleto, força split em 2 métodos:
 *      Método 1 = À Vista com ao menos `entradaMinPct`% do total
 *      Método 2 = Boleto com o restante, no máx `parcelasMax` parcelas
 *  - Intervalos: `total > valorLimiteFlex` libera `intervalosFlex`;
 *    até esse valor, trava em `intervaloPadrao`.
 */
export interface BoletoConfig {
  entradaMinPct: number;
  valorLimiteFlex: number;
  intervalosFlex: number[];
  intervaloPadrao: number;
  parcelasMax: number;
}

export const DEFAULT_BOLETO_CONFIG: BoletoConfig = {
  entradaMinPct: 50,
  valorLimiteFlex: 60000,
  intervalosFlex: [21, 36, 42],
  intervaloPadrao: 21,
  parcelasMax: 3,
};

// Aliases retro-compatíveis
export const BOLETO_ENTRADA_PERCENTUAL = DEFAULT_BOLETO_CONFIG.entradaMinPct;
export const BOLETO_INTERVALO_DIAS = DEFAULT_BOLETO_CONFIG.intervaloPadrao;
export const BOLETO_LIMITE_INTERVALO_FLEXIVEL = DEFAULT_BOLETO_CONFIG.valorLimiteFlex;
export const BOLETO_INTERVALOS_FLEXIVEIS = DEFAULT_BOLETO_CONFIG.intervalosFlex;

export function getIntervalosBoletoPermitidos(
  valorTotal: number,
  config: BoletoConfig = DEFAULT_BOLETO_CONFIG,
): number[] {
  return valorTotal > config.valorLimiteFlex
    ? config.intervalosFlex
    : [config.intervaloPadrao];
}

const round2 = (v: number) => Math.round(v * 100) / 100;

export function pagamentoTemBoleto(p: PagamentoData): boolean {
  return p.metodos.some((m) => m?.tipo === "boleto");
}

export function calcularEntradaBoleto(
  valorTotal: number,
  config: BoletoConfig = DEFAULT_BOLETO_CONFIG,
  entradaAtual?: number,
) {
  const minimo = round2(valorTotal * (config.entradaMinPct / 100));
  // Se já existe entrada configurada acima do mínimo, respeita.
  const entrada = entradaAtual !== undefined && entradaAtual > minimo
    ? round2(Math.min(entradaAtual, valorTotal))
    : minimo;
  const restante = round2(valorTotal - entrada);
  return { entrada, restante, minimo };
}

/**
 * Normaliza o pagamentoData garantindo split M1 À Vista (>= entradaMinPct) + M2 Boleto
 * quando há boleto em qualquer método.
 * Retorna o mesmo objeto se nenhuma alteração for necessária.
 */
export function aplicarRegraBoleto(
  p: PagamentoData,
  valorTotal: number,
  config: BoletoConfig = DEFAULT_BOLETO_CONFIG,
): PagamentoData {
  if (!pagamentoTemBoleto(p) || valorTotal <= 0) return p;

  const m1 = p.metodos[0];
  const m2 = p.metodos[1];

  // Origem dos dados do boleto: o método que já era boleto
  const sourceBoleto: MetodoPagamento = m2?.tipo === "boleto" ? m2 : m1;

  // Se o usuário já indicou uma entrada acima do mínimo em M1, preserva.
  const entradaAtualValida = m1?.tipo === "a_vista" ? m1.valor : undefined;
  const { entrada, restante } = calcularEntradaBoleto(valorTotal, config, entradaAtualValida);

  const intervalosPermitidos = getIntervalosBoletoPermitidos(valorTotal, config);
  const intervaloAtual = sourceBoleto?.intervalo_boletos;
  const intervaloFinal = intervalosPermitidos.includes(intervaloAtual)
    ? intervaloAtual
    : config.intervaloPadrao;

  const parcelasAtuais = sourceBoleto?.parcelas_boleto && sourceBoleto.parcelas_boleto > 0
    ? sourceBoleto.parcelas_boleto
    : 1;
  const parcelasFinal = Math.min(parcelasAtuais, config.parcelasMax);

  const novoM1: MetodoPagamento = {
    ...createEmptyMetodo(),
    tipo: "a_vista",
    valor: entrada,
    data_pagamento: m1?.tipo === "a_vista" ? m1.data_pagamento : undefined,
    empresa_receptora_id: m1?.empresa_receptora_id || sourceBoleto?.empresa_receptora_id || "",
    comprovante_file: m1?.tipo === "a_vista" ? m1.comprovante_file : null,
  };

  const novoM2: MetodoPagamento = {
    ...createEmptyMetodo(),
    tipo: "boleto",
    valor: restante,
    data_pagamento: undefined,
    empresa_receptora_id: sourceBoleto?.empresa_receptora_id || novoM1.empresa_receptora_id || "",
    parcelas_boleto: parcelasFinal,
    intervalo_boletos: intervaloFinal,
    ja_pago: sourceBoleto?.ja_pago ?? false,
    comprovante_file: sourceBoleto?.comprovante_file ?? null,
  };

  const next: PagamentoData = {
    usar_dois_metodos: true,
    metodos: [novoM1, novoM2],
    pagamento_na_entrega: p.pagamento_na_entrega,
  };

  // Evita loops: só retorna novo objeto se algo realmente mudou
  if (
    p.usar_dois_metodos === next.usar_dois_metodos &&
    m1?.tipo === novoM1.tipo &&
    Math.abs((m1?.valor || 0) - novoM1.valor) < 0.01 &&
    m2?.tipo === novoM2.tipo &&
    Math.abs((m2?.valor || 0) - novoM2.valor) < 0.01 &&
    m2?.intervalo_boletos === novoM2.intervalo_boletos &&
    m2?.parcelas_boleto === novoM2.parcelas_boleto
  ) {
    return p;
  }

  return next;
}

export function validarRegraBoleto(
  p: PagamentoData,
  valorTotal: number,
  config: BoletoConfig = DEFAULT_BOLETO_CONFIG,
): { ok: true } | { ok: false; mensagem: string } {
  if (!pagamentoTemBoleto(p)) return { ok: true };
  const { minimo } = calcularEntradaBoleto(valorTotal, config);
  const m1 = p.metodos[0];
  const m2 = p.metodos[1];

  if (!p.usar_dois_metodos || m1?.tipo !== "a_vista" || m2?.tipo !== "boleto") {
    return { ok: false, mensagem: "Boleto exige Método 1 = À Vista e Método 2 = Boleto." };
  }
  if ((m1.valor || 0) + 0.02 < minimo) {
    return {
      ok: false,
      mensagem: `Entrada à vista deve ser de no mínimo ${config.entradaMinPct}% (R$ ${minimo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}).`,
    };
  }
  if (Math.abs((m1.valor || 0) + (m2.valor || 0) - valorTotal) > 0.02) {
    return { ok: false, mensagem: "A soma dos métodos deve fechar o valor total." };
  }
  if ((m2.parcelas_boleto || 1) > config.parcelasMax) {
    return { ok: false, mensagem: `Boleto permite no máximo ${config.parcelasMax} parcelas.` };
  }
  const intervalosPermitidos = getIntervalosBoletoPermitidos(valorTotal, config);
  if (!intervalosPermitidos.includes(m2.intervalo_boletos)) {
    const lista = intervalosPermitidos.join(', ');
    return {
      ok: false,
      mensagem: valorTotal <= config.valorLimiteFlex
        ? `Vendas até R$ ${config.valorLimiteFlex.toLocaleString('pt-BR')} exigem intervalo de ${config.intervaloPadrao} dias.`
        : `Intervalo permitido: ${lista} dias.`,
    };
  }
  return { ok: true };
}