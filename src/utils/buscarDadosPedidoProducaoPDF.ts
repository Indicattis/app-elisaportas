import { supabase } from "@/integrations/supabase/client";
import type { PedidoProducaoPDFData } from "./pedidoProducaoPDFGenerator";

/**
 * Busca todos os dados necessários para gerar o PDF de um pedido de produção.
 * Mesma lógica usada em PedidoViewDirecao.tsx (versão enxuta para impressão em lote).
 */
export async function buscarDadosPedidoProducaoPDF(
  pedidoId: string
): Promise<PedidoProducaoPDFData | null> {
  const { data: pedidoData, error } = await supabase
    .from("pedidos_producao")
    .select(
      `id, numero_pedido, etapa_atual, created_at,
       vendas:venda_id ( cliente_nome, cidade, estado, valor_venda, forma_pagamento, tipo_entrega, data_prevista_entrega )`
    )
    .eq("id", pedidoId)
    .maybeSingle();

  if (error) throw error;
  if (!pedidoData) return null;

  const { data: linhasData } = await supabase
    .from("pedido_linhas")
    .select("nome_produto, descricao_produto, quantidade, tamanho")
    .eq("pedido_id", pedidoId)
    .order("ordem", { ascending: true });

  const venda: any = (pedidoData as any).vendas;

  return {
    pedido: {
      id: (pedidoData as any).id,
      numero_pedido: (pedidoData as any).numero_pedido,
      etapa_atual: (pedidoData as any).etapa_atual,
      created_at: (pedidoData as any).created_at,
    },
    cliente: venda?.cliente_nome
      ? {
          nome: venda.cliente_nome,
          cidade: venda.cidade,
          estado: venda.estado,
          valor_venda: venda.valor_venda,
          forma_pagamento: venda.forma_pagamento,
          tipo_entrega: venda.tipo_entrega,
          data_prevista_entrega: venda.data_prevista_entrega,
        }
      : undefined,
    produtos: [],
    linhas: (linhasData || []).map((l: any) => ({
      nome_produto: l.nome_produto,
      descricao_produto: l.descricao_produto || undefined,
      quantidade: l.quantidade,
      tamanho: l.tamanho || undefined,
    })),
    observacoes: [],
    ordens: [],
  };
}