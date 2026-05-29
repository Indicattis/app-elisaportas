export interface OrcamentoProduto {
  id?: string;
  orcamento_id?: string;
  tipo_produto: 'porta_enrolar' | 'porta_social' | 'acessorio' | 'manutencao' | 'adicional' | 'pintura_epoxi' | 'instalacao';
  medidas?: string;
  largura?: number;
  altura?: number;
  cor_id?: string;
  acessorio_id?: string;
  adicional_id?: string;
  descricao?: string;
  descricao_manutencao?: string;
  valor: number;
  quantidade?: number;
  preco_producao?: number;
  preco_instalacao?: number;
  valor_pintura?: number;
  valor_instalacao?: number;
  desconto_percentual?: number;
  desconto_valor?: number;
  tipo_desconto?: 'percentual' | 'valor';
  tamanho?: string;
}

export interface OrcamentoCusto {
  id?: string;
  orcamento_id?: string;
  tipo: 'frete' | 'instalacao';
  descricao?: string;
  valor: number;
}

export interface ProdutoFormData {
  tipo_produto: string;
  medidas: string;
  cor: string;
  descricao: string;
  valor: string;
}