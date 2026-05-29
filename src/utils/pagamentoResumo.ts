const METODO_LABELS: Record<string, string> = {
  boleto: "Boleto",
  a_vista: "À Vista",
  cartao_credito: "Cartão de Crédito",
  cartao: "Cartão",
  credito: "Cartão",
  dinheiro: "Dinheiro",
  pix: "Pix",
};

export function formatarMetodoPagamento(metodo?: string | null): string {
  if (!metodo) return "—";
  return METODO_LABELS[metodo] || metodo.replace(/_/g, " ");
}

/**
 * Resumo compacto da forma de pagamento da venda, baseado nas parcelas
 * de contas_receber (fonte da verdade) com fallback no método principal.
 * Ex.: "Boleto 5x + À Vista"
 */
export function resumoPagamentoCompacto(
  metodoPrincipal?: string | null,
  parcelas?: Array<{ metodo_pagamento: string | null }>
): string {
  const metodosOrdenados: string[] = [];
  if (parcelas && parcelas.length > 0) {
    for (const p of parcelas) {
      const m = p.metodo_pagamento;
      if (m && !metodosOrdenados.includes(m)) metodosOrdenados.push(m);
    }
  } else if (metodoPrincipal) {
    metodosOrdenados.push(metodoPrincipal);
  }
  if (metodosOrdenados.length === 0) return "—";
  return metodosOrdenados.map((m) => formatarMetodoPagamento(m)).join(" + ");
}