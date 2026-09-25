import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface VendaRastreioInterna {
  id: string;
  rastreio_token: string;
  numero_pedido: string | null;
  cliente_nome: string | null;
  cliente_telefone: string | null;
  cpf_cliente: string | null;
  data_venda: string;
  valor_venda: number | null;
  tipo_entrega: string | null;
  cidade: string | null;
  estado: string | null;
  atendente: {
    nome: string;
    foto_perfil_url: string | null;
  } | null;
  produtos_vendas: Array<{
    id: string;
    descricao: string | null;
    tipo_produto: string;
    quantidade: number | null;
    largura: number | null;
    altura: number | null;
    tamanho: string;
  }>;
  pedidos_producao: Array<{
    id: string;
    numero_pedido: string;
    etapa_atual: string;
    status: string;
    data_entrega: string | null;
    created_at: string;
    arquivado: boolean;
  }>;
}

export function useVendasRastreio() {
  return useQuery({
    queryKey: ["vendas-rastreio"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendas")
        .select(`
          id, rastreio_token, numero_pedido, cliente_nome, cliente_telefone,
          cpf_cliente, data_venda, valor_venda, tipo_entrega, cidade, estado,
          atendente:admin_users!fk_vendas_atendente(nome, foto_perfil_url),
          produtos_vendas(id, descricao, tipo_produto, quantidade, largura, altura, tamanho),
          pedidos_producao(id, numero_pedido, etapa_atual, status, data_entrega, created_at, arquivado)
        `)
        .eq("is_rascunho", false)
        .eq("dispensada_sistema", false)
        .order("data_venda", { ascending: false })
        .limit(1000);

      if (error) throw error;
      return (data || []) as VendaRastreioInterna[];
    },
  });
}