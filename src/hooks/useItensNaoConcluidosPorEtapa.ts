import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo } from "react";

export interface ItemNaoConcluido {
  id: string;
  nome_produto: string;
  quantidade: number;
  tamanho: string | null;
  estoque_nome: string | null;
  pedido_numero: number | null;
  etapa_atual: string | null;
}

export function useItensNaoConcluidosPorEtapa() {
  const query = useQuery({
    queryKey: ["itens-nao-concluidos-por-etapa"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pedido_linhas")
        .select(`
          id,
          nome_produto,
          quantidade,
          tamanho,
          estoque_id,
          pedidos_producao:pedido_id (numero_pedido, etapa_atual)
        `);

      if (error) {
        console.error("Erro ao buscar itens não concluídos:", error);
        return [];
      }

      // Filter out finalizado/arquivo_morto on client side
      return (data || [])
        .filter((row: any) => {
          const etapa = row.pedidos_producao?.etapa_atual;
          return etapa && etapa !== "finalizado" && etapa !== "pos_vendas" && etapa !== "arquivo_morto";
        })
        .map((row: any) => ({
          id: row.id,
          nome_produto: row.nome_produto,
          quantidade: row.quantidade,
          tamanho: row.tamanho,
          estoque_nome: null, // Will use nome_produto directly
          pedido_numero: row.pedidos_producao?.numero_pedido || null,
          etapa_atual: row.pedidos_producao?.etapa_atual || null,
        })) as ItemNaoConcluido[];
    },
  });

  const itensPorEtapa = useMemo(() => {
    const items = query.data || [];
    const grouped: Record<string, ItemNaoConcluido[]> = {};
    for (const item of items) {
      const etapa = item.etapa_atual || "sem_etapa";
      if (!grouped[etapa]) grouped[etapa] = [];
      grouped[etapa].push(item);
    }
    return grouped;
  }, [query.data]);

  return {
    itens: query.data || [],
    itensPorEtapa,
    isLoading: query.isLoading,
  };
}
