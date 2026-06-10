/**
 * Distribui o desconto real aplicado em uma venda entre as faixas:
 * À Vista, Frio (Presencial) e Gerente (adicional com senha).
 *
 * A ordem de preenchimento é: À Vista → Frio → Gerente, respeitando o limite
 * de cada faixa. Mesma lógica usada em /financeiro/faturamento/vendas
 * (calcDescontoTiers) para garantir consistência entre telas.
 */
export interface DescontoTiersInput {
  totalVenda: number;
  descontoTotal: number;
  formaPagamento: string | null | undefined;
  vendaPresencial: boolean | null | undefined;
  limAvista?: number;
  limPresencial?: number;
  limResponsavel?: number;
}

export interface DescontoTiersResult {
  pctTotal: number;
  pctAvista: number;
  pctFrio: number;
  pctGerente: number;
  valorAvista: number;
  valorFrio: number;
  valorGerente: number;
  aptoAvista: boolean;
  aptoFrio: boolean;
}

export function calcDescontoTiersAplicados({
  totalVenda,
  descontoTotal,
  formaPagamento,
  vendaPresencial,
  limAvista = 3,
  limPresencial = 5,
  limResponsavel = 7,
}: DescontoTiersInput): DescontoTiersResult {
  const aptoAvista = !!formaPagamento && formaPagamento !== 'cartao_credito';
  const aptoFrio = vendaPresencial === true;

  if (!totalVenda || totalVenda <= 0 || !descontoTotal || descontoTotal <= 0) {
    return {
      pctTotal: 0,
      pctAvista: 0,
      pctFrio: 0,
      pctGerente: 0,
      valorAvista: 0,
      valorFrio: 0,
      valorGerente: 0,
      aptoAvista,
      aptoFrio,
    };
  }

  const pctTotal = (descontoTotal / totalVenda) * 100;

  const pctAvista = aptoAvista ? Math.min(pctTotal, limAvista) : 0;
  const restante1 = pctTotal - pctAvista;
  const pctFrio = aptoFrio && restante1 > 0 ? Math.min(restante1, limPresencial) : 0;
  const pctGerente = Math.max(0, pctTotal - pctAvista - pctFrio);

  return {
    pctTotal,
    pctAvista,
    pctFrio,
    pctGerente,
    valorAvista: totalVenda * (pctAvista / 100),
    valorFrio: totalVenda * (pctFrio / 100),
    valorGerente: totalVenda * (pctGerente / 100),
    aptoAvista,
    aptoFrio,
  };
}