import { ProdutoVenda } from '@/hooks/useVendas';

export interface DescontoLimits {
  limiteBase: number; // Limite padrão
  limitePresencial: number; // Adicional por venda presencial
  limiteTotal: number; // Limite sem senha
  limiteMaximo: number; // Limite absoluto (com senha)
}

export interface DescontoCalculation {
  totalVenda: number;
  descontoAplicado: number;
  percentualDesconto: number;
  limitePermitido: number;
  limiteMaximoResponsavel?: number; // Limite com senha do responsável
  excedente: number; // Quanto % excede o limite
  dentroDoLimite: boolean;
  requerSenha: boolean;
  excedeLimiteMaximo: boolean; // Excede o limite do responsável, requer master
}

/**
 * Calcula os limites de desconto baseado nas condições da venda
 */
export interface ConfigLimites {
  avista?: number;
  presencial?: number;
  adicionalResponsavel?: number;
}

export function calcularLimitesDesconto(
  formaPagamento: string,
  vendaPresencial: boolean,
  config?: ConfigLimites
): DescontoLimits {
  // Usar valores do banco ou padrões
  const limiteAvista = config?.avista ?? 3;
  const limitePresencialConfig = config?.presencial ?? 5;
  const limiteAdicionalResponsavel = config?.adicionalResponsavel ?? 5;
  
  const limiteBase = formaPagamento !== 'cartao_credito' ? limiteAvista : 0;
  // 3% para pagamento que não seja cartão de crédito (à vista, boleto, dinheiro)
  // 5% adicional para venda Frio (não presencial). Callers passam `venda_presencial === false`.
  const limitePresencial = vendaPresencial ? limitePresencialConfig : 0;
  const limiteTotal = limiteBase + limitePresencial;
  // Máximo com senha do responsável = 11% (6% base + 5% adicional)
  const limiteMaximo = limiteTotal + limiteAdicionalResponsavel;

  return {
    limiteBase,
    limitePresencial,
    limiteTotal,
    limiteMaximo
  };
}

/**
 * Calcula o total da venda sem descontos
 */
export function calcularTotalVenda(produtos: ProdutoVenda[]): number {
  return produtos.reduce((total, produto) => {
    const valorProduto = (
      produto.valor_produto + 
      produto.valor_pintura + 
      produto.valor_instalacao
    ) * produto.quantidade;
    return total + valorProduto;
  }, 0);
}

/**
 * Calcula o desconto total já aplicado nos produtos
 */
export function calcularDescontoTotal(produtos: ProdutoVenda[]): number {
  return produtos.reduce((total, produto) => {
    const valorBase = (
      produto.valor_produto + 
      produto.valor_pintura + 
      produto.valor_instalacao
    ) * produto.quantidade;
    
    const desconto = produto.tipo_desconto === 'valor'
      ? produto.desconto_valor
      : valorBase * (produto.desconto_percentual / 100);
    
    return total + desconto;
  }, 0);
}

/**
 * Calcula o percentual de desconto sobre o total da venda
 */
export function calcularPercentualDesconto(
  descontoTotal: number,
  totalVenda: number
): number {
  if (totalVenda === 0) return 0;
  return (descontoTotal / totalVenda) * 100;
}

/**
 * Valida se o desconto está dentro das regras
 */
export function validarDesconto(
  produtos: ProdutoVenda[],
  formaPagamento: string,
  vendaPresencial: boolean,
  config?: ConfigLimites
): DescontoCalculation {
  const totalVenda = calcularTotalVenda(produtos);
  const descontoAplicado = calcularDescontoTotal(produtos);
  const percentualDesconto = calcularPercentualDesconto(descontoAplicado, totalVenda);
  const limites = calcularLimitesDesconto(formaPagamento, vendaPresencial, config);
  
  const excedente = percentualDesconto - limites.limiteTotal;
  const dentroDoLimite = excedente <= 0;
  const requerSenha = excedente > 0 && percentualDesconto <= limites.limiteMaximo;
  // Com senha master, não há limite máximo - essa lógica é tratada nos modais
  const excedeLimiteMaximo = percentualDesconto > limites.limiteMaximo;

  return {
    totalVenda,
    descontoAplicado,
    percentualDesconto,
    limitePermitido: limites.limiteTotal,
    limiteMaximoResponsavel: limites.limiteMaximo,
    excedente: Math.max(0, excedente),
    dentroDoLimite,
    requerSenha,
    excedeLimiteMaximo
  };
}

/**
 * Formata o valor de desconto para exibição
 */
export function formatarDesconto(
  tipo: 'valor' | 'percentual',
  valor: number
): string {
  if (tipo === 'valor') {
    return `R$ ${valor.toFixed(2)}`;
  }
  return `${valor.toFixed(2)}%`;
}

/**
 * Determina o tipo de autorização necessária baseado no desconto
 */
export function getTipoAutorizacaoNecessaria(
  validacao: DescontoCalculation
): 'responsavel_setor' | 'master' | null {
  // Excede limite máximo - não permitido nem com senha
  if (validacao.excedeLimiteMaximo) {
    return 'master';
  }
  
  // Dentro do limite sem senha - não requer autorização
  if (validacao.dentroDoLimite) {
    return null;
  }
  
  // Excedeu o limite básico mas está dentro do máximo (até +5%) - requer senha do responsável
  return 'responsavel_setor';
}
