// Tipo unificado para ordens de carregamento de ambas as fontes
export interface ProdutoUnificado {
  tipo_produto?: string | null;
  tamanho?: string | null;
  largura?: number | null;
  altura?: number | null;
  quantidade?: number | null;
  cor?: {
    nome: string;
    codigo_hex: string;
  } | null;
}

export interface OrdemCarregamentoUnificada {
  id: string;
  fonte: 'ordens_carregamento' | 'instalacoes' | 'correcoes';
  pedido_id: string | null;
  venda_id: string | null;
  nome_cliente: string;
  data_carregamento: string | null;
  hora_carregamento: string | null;
  hora?: string | null;
  tipo_carregamento: 'elisa' | 'autorizados' | 'terceiro' | null;
  responsavel_carregamento_id: string | null;
  responsavel_carregamento_nome: string | null;
  carregamento_concluido: boolean;
  status: string | null;
  tipo_entrega: 'entrega' | 'instalacao' | 'manutencao' | 'autorizado' | null;
  autorizado_nome?: string | null;
  observacoes?: string | null;
  created_at?: string | null;
  pedido?: {
    id: string;
    numero_pedido: string;
    etapa_atual?: string;
    observacoes?: string;
    updated_at?: string;
    ficha_visita_url?: string | null;
    ficha_visita_nome?: string | null;
    endereco_rua?: string | null;
    endereco_numero?: string | null;
    endereco_bairro?: string | null;
    endereco_cidade?: string | null;
    endereco_estado?: string | null;
    endereco_cep?: string | null;
  } | null;
  venda?: {
    id: string;
    cliente_nome: string;
    cliente_telefone?: string | null;
    cliente_email?: string | null;
    cidade?: string | null;
    estado?: string | null;
    bairro?: string | null;
    cep?: string | null;
    tipo_entrega?: 'entrega' | 'instalacao' | 'manutencao' | 'autorizado' | null;
    autorizado?: { nome: string } | null;
    produtos?: ProdutoUnificado[];
  } | null;
}
