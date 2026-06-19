export type EtapaPedido = 
  | 'aprovacao_diretor'
  | 'aberto'
  | 'aprovacao_ceo'
  | 'em_producao'
  | 'inspecao_qualidade'
  | 'aguardando_pintura'
  | 'embalagem'
  | 'aguardando_coleta'
  | 'instalacoes'
  | 'correcoes'
  | 'finalizado'
  | 'pos_vendas'
  | 'aguardando_cliente';

export interface PedidoCheckbox {
  id: string;
  label: string;
  checked: boolean;
  required: boolean;
  checked_at?: string;
  checked_by?: string;
}

export interface PedidoEtapa {
  id: string;
  pedido_id: string;
  etapa: EtapaPedido;
  checkboxes: PedidoCheckbox[];
  data_entrada: string;
  data_saida?: string;
  created_at: string;
  updated_at: string;
}

export const ETAPAS_CONFIG: Record<EtapaPedido, {
  label: string;
  color: string;
  icon: string;
  checkboxes: Omit<PedidoCheckbox, 'checked' | 'checked_at' | 'checked_by'>[];
}> = {
  aprovacao_diretor: {
    label: 'Aprovação Diretor',
    color: 'bg-orange-600',
    icon: 'ShieldCheck',
    checkboxes: []
  },
  aberto: {
    label: 'Pedidos em Aberto',
    color: 'bg-yellow-500',
    icon: 'Clock',
    checkboxes: [
      { id: 'orcamento_aprovado', label: 'Orçamento aprovado pelo cliente', required: true },
      { id: 'pagamento_confirmado', label: 'Pagamento/Entrada confirmado', required: true },
      { id: 'dados_completos', label: 'Todos os dados do pedido estão completos', required: true },
      { id: 'pronto_producao', label: 'Pedido pronto para iniciar produção', required: false }
    ]
  },
  aprovacao_ceo: {
    label: 'Aprovação CEO',
    color: 'bg-orange-500',
    icon: 'ShieldCheck',
    checkboxes: [
      { id: 'pedido_revisado', label: 'Pedido revisado pela diretoria', required: true },
      { id: 'aprovado_producao', label: 'Aprovado para produção', required: true }
    ]
  },
  em_producao: {
    label: 'Em Produção',
    color: 'bg-blue-500',
    icon: 'Factory',
    checkboxes: [
      { id: 'materiais_separados', label: 'Materiais separados', required: true },
      { id: 'ordem_iniciada', label: 'Ordem iniciada', required: true }
    ]
  },
  inspecao_qualidade: {
    label: 'Inspeção de Qualidade',
    color: 'bg-purple-500',
    icon: 'ClipboardCheck',
    checkboxes: [
      { id: 'medidas_conferidas', label: 'Medidas conferidas', required: true },
      { id: 'acabamento_ok', label: 'Acabamento OK', required: true },
      { id: 'funcionamento_ok', label: 'Funcionamento OK', required: true }
    ]
  },
  aguardando_pintura: {
    label: 'Aguardando Pintura',
    color: 'bg-orange-500',
    icon: 'Paintbrush',
    checkboxes: [
      { id: 'cor_definida', label: 'Cor definida', required: true },
      { id: 'superficie_preparada', label: 'Superfície preparada', required: true }
    ]
  },
  embalagem: {
    label: 'Embalagem',
    color: 'bg-cyan-600',
    icon: 'Package',
    checkboxes: []
  },
  aguardando_coleta: {
    label: 'Expedição Coleta',
    color: 'bg-indigo-500',
    icon: 'Package',
    checkboxes: [
      { id: 'produtos_embalados', label: 'Produtos embalados', required: true },
      { id: 'nota_fiscal_emitida', label: 'Nota fiscal emitida', required: true }
    ]
  },
  instalacoes: {
    label: 'Instalações',
    color: 'bg-teal-500',
    icon: 'HardHat',
    checkboxes: [
      { id: 'equipe_escalada', label: 'Equipe escalada', required: false },
      { id: 'cliente_contatado', label: 'Cliente contatado', required: false }
    ]
  },
  correcoes: {
    label: 'Correções',
    color: 'bg-purple-500',
    icon: 'AlertTriangle',
    checkboxes: []
  },
  finalizado: {
    label: 'Finalizado',
    color: 'bg-green-500',
    icon: 'CheckCircle2',
    checkboxes: []
  },
  pos_vendas: {
    label: 'Pós-Vendas',
    color: 'bg-emerald-500',
    icon: 'Headset',
    checkboxes: []
  },
  aguardando_cliente: {
    label: 'Aguardando Cliente',
    color: 'bg-yellow-500',
    icon: 'Clock',
    checkboxes: []
  }
};

export const ORDEM_ETAPAS: EtapaPedido[] = [
  'aprovacao_diretor',
  'aberto',
  'aprovacao_ceo',
  'em_producao',
  'inspecao_qualidade',
  'aguardando_pintura',
  'embalagem',
  'aguardando_coleta',
  'instalacoes',
  'correcoes',
  'finalizado',
  'pos_vendas'
];

export function getProximaEtapa(etapaAtual: EtapaPedido): EtapaPedido | null {
  const indiceAtual = ORDEM_ETAPAS.indexOf(etapaAtual);
  if (indiceAtual === -1 || indiceAtual === ORDEM_ETAPAS.length - 1) {
    return null;
  }
  return ORDEM_ETAPAS[indiceAtual + 1];
}

export function getEtapaAnterior(etapaAtual: EtapaPedido): EtapaPedido | null {
  const indiceAtual = ORDEM_ETAPAS.indexOf(etapaAtual);
  if (indiceAtual === -1 || indiceAtual === 0) {
    return null;
  }
  return ORDEM_ETAPAS[indiceAtual - 1];
}

// Tipos para sistema de prioridade
export interface PrioridadeUpdate {
  id: string;
  prioridade: number;
}

export type DirecaoPrioridade = 'frente' | 'tras';

// Limites de tempo por etapa em segundos comerciais (1 dia comercial = 10h = 36000s)
export const LIMITES_ETAPA_SEGUNDOS: Record<EtapaPedido, number> = {
  aprovacao_diretor: 6 * 3600,     // 6h comerciais
  aberto: 6 * 3600,                // 6h comerciais
  aprovacao_ceo: 6 * 3600,         // 6h comerciais
  em_producao: 4 * 10 * 3600,      // 4 dias comerciais (40h)
  inspecao_qualidade: 3 * 3600,    // 3h comerciais
  aguardando_pintura: 4 * 10 * 3600, // 4 dias comerciais (40h)
  embalagem: 3 * 3600,             // 3h comerciais
  aguardando_coleta: 48 * 10 * 3600, // 48 dias comerciais (480h)
  instalacoes: 3 * 10 * 3600,      // 3 dias comerciais (30h)
  correcoes: 3 * 10 * 3600,        // 3 dias comerciais (30h)
  finalizado: Infinity,
  pos_vendas: Infinity,
  aguardando_cliente: Infinity,
};
