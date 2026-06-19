import type { EtapaPedido } from "@/types/pedidoEtapa";

export interface FluxogramaEtapa {
  id: EtapaPedido;
  label: string;
  color: string;
}

export const FLUXOGRAMA_ETAPAS: Record<EtapaPedido, FluxogramaEtapa> = {
  aprovacao_diretor: {
    id: 'aprovacao_diretor',
    label: 'Aprovação Diretor',
    color: 'bg-orange-600'
  },
  aberto: {
    id: 'aberto',
    label: 'Pedidos em Aberto',
    color: 'bg-gray-500'
  },
  aprovacao_ceo: {
    id: 'aprovacao_ceo',
    label: 'Aprovação CEO',
    color: 'bg-orange-500'
  },
  em_producao: {
    id: 'em_producao',
    label: 'Em Produção',
    color: 'bg-blue-500'
  },
  inspecao_qualidade: {
    id: 'inspecao_qualidade',
    label: 'Inspeção de Qualidade',
    color: 'bg-purple-500'
  },
  aguardando_pintura: {
    id: 'aguardando_pintura',
    label: 'Aguardando Pintura',
    color: 'bg-pink-500'
  },
  embalagem: {
    id: 'embalagem',
    label: 'Embalagem',
    color: 'bg-cyan-600'
  },
  aguardando_coleta: {
    id: 'aguardando_coleta',
    label: 'Expedição Coleta',
    color: 'bg-yellow-500'
  },
  instalacoes: {
    id: 'instalacoes',
    label: 'Instalações',
    color: 'bg-teal-500'
  },
  correcoes: {
    id: 'correcoes',
    label: 'Correções',
    color: 'bg-purple-500'
  },
  finalizado: {
    id: 'finalizado',
    label: 'Finalizado',
    color: 'bg-green-500'
  },
  pos_vendas: {
    id: 'pos_vendas',
    label: 'Pós-Vendas',
    color: 'bg-emerald-500'
  },
  aguardando_cliente: {
    id: 'aguardando_cliente',
    label: 'Aguardando Cliente',
    color: 'bg-yellow-500'
  }
};

/**
 * Determina o fluxograma de etapas que um pedido seguirá
 * baseado em suas características (pintura e tipo de entrega)
 */
export function determinarFluxograma(pedido: any): FluxogramaEtapa[] {
  // Extrair dados da venda - aceita múltiplos formatos
  let vendaData = null;
  let produtos = [];
  let tipoEntrega = null;
  
  // Formato 1: pedido.venda (usado em PedidoView)
  if (pedido.venda) {
    vendaData = pedido.venda;
    produtos = pedido.venda.produtos || [];
    tipoEntrega = pedido.venda.tipo_entrega;
  }
  // Formato 2: pedido.vendas (usado em outros lugares)
  else if (pedido.vendas) {
    vendaData = Array.isArray(pedido.vendas) 
      ? pedido.vendas[0] 
      : pedido.vendas;
    produtos = vendaData?.produtos_vendas || [];
    tipoEntrega = vendaData?.tipo_entrega;
  }
  
  // Verificar se é apenas manutenção
  const apenasManutencao = produtos.length > 0 && 
    produtos.every((p: any) => p.tipo_produto === 'manutencao');
  
  // Se for apenas manutenção, fluxo direto para instalações
  if (apenasManutencao) {
    return [
      FLUXOGRAMA_ETAPAS.instalacoes,
      FLUXOGRAMA_ETAPAS.finalizado
    ];
  }
  
  const temPintura = produtos.some((p: any) => p.valor_pintura > 0);
  
  // Etapas base que todos os pedidos passam
  const baseFlow: FluxogramaEtapa[] = [
    FLUXOGRAMA_ETAPAS.aprovacao_diretor,
    FLUXOGRAMA_ETAPAS.aberto,
    FLUXOGRAMA_ETAPAS.aprovacao_ceo,
    FLUXOGRAMA_ETAPAS.em_producao,
    FLUXOGRAMA_ETAPAS.inspecao_qualidade
  ];
  
  // Se tem pintura, adiciona etapa de pintura
  if (temPintura) {
    baseFlow.push(FLUXOGRAMA_ETAPAS.aguardando_pintura);
  }
  
  // Embalagem apenas quando tem pintura
  if (temPintura) {
    baseFlow.push(FLUXOGRAMA_ETAPAS.embalagem);
  }
  
  // Define etapa final baseada no tipo de entrega
  if (tipoEntrega === 'entrega') {
    baseFlow.push(FLUXOGRAMA_ETAPAS.aguardando_coleta);
  } else if (tipoEntrega === 'instalacao') {
    baseFlow.push(FLUXOGRAMA_ETAPAS.instalacoes);
  }
  
  // Finalizado é sempre a última etapa
  baseFlow.push(FLUXOGRAMA_ETAPAS.finalizado);
  
  return baseFlow;
}

/**
 * Retorna o índice da etapa atual no fluxograma
 */
export function getIndiceEtapaAtual(
  fluxograma: FluxogramaEtapa[], 
  etapaAtual: EtapaPedido
): number {
  return fluxograma.findIndex(etapa => etapa.id === etapaAtual);
}
