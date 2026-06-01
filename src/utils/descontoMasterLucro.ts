/**
 * Quando o desconto autorizado por senha master excede o limite configurado
 * (`regras_vendas.limite_desconto_master_lucro`, padrão 15%), o valor
 * excedente em R$ é debitado do lucro da venda no faturamento.
 *
 * O cálculo está espelhado no trigger `recalcular_totais_venda`, que ajusta
 * `vendas.lucro_total` automaticamente. Este util replica o cálculo para a UI.
 */
export interface CalcularDebitoMasterInput {
  /** Base bruta: SUM((valor_produto + valor_pintura + valor_instalacao) * quantidade) */
  produtosBruto: number;
  /** Maior percentual_desconto entre autorizações tipo `master` (null se não houver). */
  percentualMaster: number | null | undefined;
  /** Limite configurado em regras_vendas (padrão 15). */
  limiteMaster?: number;
}

export interface DebitoMasterResultado {
  /** Houve autorização master para a venda. */
  temAutorizacaoMaster: boolean;
  /** Percentual de desconto autorizado pelo master. */
  percentualMaster: number;
  /** Limite a partir do qual o excedente é debitado. */
  limiteMaster: number;
  /** Percentual excedente (acima do limite). */
  excedentePct: number;
  /** Valor em R$ que será debitado do lucro. */
  valorExcedente: number;
}

export function calcularDebitoMasterLucro({
  produtosBruto,
  percentualMaster,
  limiteMaster = 15,
}: CalcularDebitoMasterInput): DebitoMasterResultado {
  const temAutorizacaoMaster =
    typeof percentualMaster === "number" && Number.isFinite(percentualMaster);
  const pct = temAutorizacaoMaster ? Number(percentualMaster) : 0;

  if (!temAutorizacaoMaster || produtosBruto <= 0) {
    return {
      temAutorizacaoMaster: false,
      percentualMaster: 0,
      limiteMaster,
      excedentePct: 0,
      valorExcedente: 0,
    };
  }

  const excedentePct = Math.max(0, pct - limiteMaster);
  const valorExcedente = produtosBruto * (excedentePct / 100);

  return {
    temAutorizacaoMaster: true,
    percentualMaster: pct,
    limiteMaster,
    excedentePct,
    valorExcedente,
  };
}

/**
 * Extrai o maior percentual de autorização do tipo `master` em uma lista
 * de registros de `vendas_autorizacoes_desconto`.
 */
export function obterPercentualMaster(
  autorizacoes?: Array<{ tipo_autorizacao?: string | null; percentual_desconto?: number | null } | null> | null
): number | null {
  if (!autorizacoes || autorizacoes.length === 0) return null;
  const masters = autorizacoes
    .filter((a) => a && a.tipo_autorizacao === "master")
    .map((a) => Number(a?.percentual_desconto ?? 0))
    .filter((n) => Number.isFinite(n) && n > 0);
  if (masters.length === 0) return null;
  return Math.max(...masters);
}