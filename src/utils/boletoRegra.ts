import { MetodoPagamento, createEmptyMetodo } from "@/components/vendas/MetodoPagamentoCard";
import type { PagamentoData } from "@/components/vendas/PagamentoSection";

/**
 * Regra de Boleto:
 * Sempre que QUALQUER método de pagamento for boleto, a venda deve obrigatoriamente:
 *  - Método 1: "À Vista" com 70% do valor total
 *  - Método 2: "Boleto" com 30% restante e intervalo de 21 dias
 */
export const BOLETO_ENTRADA_PERCENTUAL = 70;
export const BOLETO_INTERVALO_DIAS = 21;

const round2 = (v: number) => Math.round(v * 100) / 100;

export function pagamentoTemBoleto(p: PagamentoData): boolean {
  if (p.metodos[0]?.tipo === "boleto") return true;
  if (p.usar_dois_metodos && p.metodos[1]?.tipo === "boleto") return true;
  return false;
}

export function calcularEntradaBoleto(valorTotal: number) {
  const entrada = round2(valorTotal * (BOLETO_ENTRADA_PERCENTUAL / 100));
  const restante = round2(valorTotal - entrada);
  return { entrada, restante };
}

/**
 * Normaliza o pagamentoData garantindo 70/30 + 21 dias quando há boleto.
 * Retorna o mesmo objeto se nenhuma alteração for necessária.
 */
export function aplicarRegraBoleto(p: PagamentoData, valorTotal: number): PagamentoData {
  if (!pagamentoTemBoleto(p) || valorTotal <= 0) return p;

  const { entrada, restante } = calcularEntradaBoleto(valorTotal);
  const m1 = p.metodos[0];
  const m2 = p.metodos[1];

  // Origem dos dados do boleto: o método que já era boleto
  const sourceBoleto: MetodoPagamento = m2?.tipo === "boleto" ? m2 : m1;

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
    data_pagamento: sourceBoleto?.data_pagamento,
    empresa_receptora_id: sourceBoleto?.empresa_receptora_id || novoM1.empresa_receptora_id || "",
    parcelas_boleto: sourceBoleto?.parcelas_boleto && sourceBoleto.parcelas_boleto > 0 ? sourceBoleto.parcelas_boleto : 1,
    intervalo_boletos: BOLETO_INTERVALO_DIAS,
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
    m2?.intervalo_boletos === BOLETO_INTERVALO_DIAS
  ) {
    return p;
  }

  return next;
}

export function validarRegraBoleto(
  p: PagamentoData,
  valorTotal: number,
): { ok: true } | { ok: false; mensagem: string } {
  if (!pagamentoTemBoleto(p)) return { ok: true };
  const { entrada, restante } = calcularEntradaBoleto(valorTotal);
  const m1 = p.metodos[0];
  const m2 = p.metodos[1];

  if (!p.usar_dois_metodos || m1?.tipo !== "a_vista" || m2?.tipo !== "boleto") {
    return { ok: false, mensagem: "Boleto exige Método 1 = À Vista e Método 2 = Boleto." };
  }
  if (Math.abs((m1.valor || 0) - entrada) > 0.02 || Math.abs((m2.valor || 0) - restante) > 0.02) {
    return { ok: false, mensagem: `Boleto exige ${BOLETO_ENTRADA_PERCENTUAL}% de entrada à vista e ${100 - BOLETO_ENTRADA_PERCENTUAL}% no boleto.` };
  }
  if (m2.intervalo_boletos !== BOLETO_INTERVALO_DIAS) {
    return { ok: false, mensagem: `Boleto exige intervalo de ${BOLETO_INTERVALO_DIAS} dias entre parcelas.` };
  }
  return { ok: true };
}