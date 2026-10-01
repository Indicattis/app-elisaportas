export interface OrdemCarregamento {
  id: string;
  pedido_id: string | null;
  venda_id: string | null;
  nome_cliente: string;
  tipo_carregamento: 'elisa' | 'autorizados' | 'terceiro' | null;
  data_carregamento: string | null;
  hora: string | null;
  hora_carregamento?: string | null;
  responsavel_carregamento_id: string | null;
  responsavel_carregamento_nome: string | null;
  status: string | null;
  carregamento_concluido: boolean | null;
  carregamento_concluido_em: string | null;
  carregamento_concluido_por: string | null;
  latitude: number | null;
  longitude: number | null;
  geocode_precision: string | null;
  last_geocoded_at: string | null;
  observacoes: string | null;
  created_at: string | null;
  updated_at: string | null;
  created_by: string | null;
  fonte?: 'ordens_carregamento' | 'instalacoes' | 'correcoes';
  pedido?: {
    id: string;
    numero_pedido: string;
    etapa_atual?: string;
    data_producao?: string | null;
    observacoes?: string;
    updated_at?: string;
    instalacao?: Array<{
      id: string;
      responsavel_instalacao_id?: string | null;
      responsavel_instalacao_nome?: string | null;
      tipo_instalacao?: string | null;
      instalacao_concluida?: boolean | null;
      instalacao_concluida_em?: string | null;
      instalacao_concluida_por?: string | null;
    }> | null;
  };
  venda?: {
    id: string;
    cliente_nome: string;
    cliente_telefone?: string | null;
    cidade?: string | null;
    estado?: string | null;
    cep?: string | null;
    bairro?: string | null;
    cliente?: {
      endereco?: string | null;
    } | null;
    data_prevista_entrega?: string | null;
    cliente_email?: string | null;
    valor_instalacao?: number | null;
    tipo_entrega?: 'instalacao' | 'entrega' | 'autorizado' | null;
    metodo_pagamento?: string | null;
    produtos?: Array<{
      tipo_produto?: string | null;
      tamanho?: string | null;
      largura?: number | null;
      altura?: number | null;
      quantidade?: number | null;
      cor?: {
        nome: string;
        codigo_hex: string;
      } | null;
    }>;
  };
}

export interface ProdutoCor {
  nome: string;
  codigo_hex: string;
}

export interface AgendarCarregamentoData {
  data_carregamento: string;
  hora: string;
  responsavel_tipo: 'elisa' | 'autorizados' | 'terceiro';
  responsavel_carregamento_id: string | null;
  responsavel_carregamento_nome: string;
}
