/**
 * Utilitário canônico para cálculo de faturamento.
 *
 * Fórmula: faturamento_liquido = valor_venda + valor_credito
 * (o frete NÃO entra no faturamento em nenhum caso)
 *
 * Use em TODOS os hooks/componentes que mostram "faturamento" para garantir
 * que cards diferentes do mesmo período mostrem o mesmo número.
 */

export const VENDA_TESTE_LIMITE = 500;

export interface VendaParaCalculo {
  valor_venda?: number | null;
  valor_frete?: number | null;
  valor_credito?: number | null;
}

export function calcularFaturamentoLiquido(venda: VendaParaCalculo): number {
  const valorVenda = Number(venda.valor_venda || 0);
  const valorCredito = Number(venda.valor_credito || 0);
  return valorVenda + valorCredito;
}

/**
 * Filtra vendas-teste/rascunho com valor simbólico (< R$ 500).
 * Use antes de agregar faturamento para evitar ruído de testes.
 */
export function isVendaValida(venda: VendaParaCalculo): boolean {
  return Number(venda.valor_venda || 0) >= VENDA_TESTE_LIMITE;
}