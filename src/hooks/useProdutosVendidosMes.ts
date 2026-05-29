import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth } from "date-fns";

export interface ProdutoVendidoMes {
  catalogo_id: string;
  nome_produto: string;
  categoria: string | null;
  quantidade_total: number;
  valor_total: number;
}

export interface UseProdutosVendidosMesParams {
  dataInicio?: Date;
  dataFim?: Date;
  atendenteId?: string;
}

export function useProdutosVendidosMes(params: UseProdutosVendidosMesParams = {}) {
  const hoje = new Date();
  const inicioMes = params.dataInicio ? params.dataInicio.toISOString() : startOfMonth(hoje).toISOString();
  const fimMes = params.dataFim ? params.dataFim.toISOString() : endOfMonth(hoje).toISOString();
  const atendenteId = params.atendenteId;

  return useQuery({
    queryKey: ["produtos-catalogo-vendidos-mes", inicioMes, fimMes, atendenteId],
    queryFn: async () => {
      // Buscar produtos vendidos no período vinculados a custos_itens
      let query = supabase
        .from("produtos_vendas")
        .select(`
          custos_itens_id,
          quantidade,
          valor_total,
          vendas!inner(data_venda, atendente_id),
          custos_itens(descricao, categoria)
        `)
        .not("custos_itens_id", "is", null)
        .gte("vendas.data_venda", inicioMes)
        .lte("vendas.data_venda", fimMes);

      if (atendenteId && atendenteId !== "todos") {
        query = query.eq("vendas.atendente_id", atendenteId);
      }

      const { data: produtosVendas, error } = await query;
      if (error) throw error;

      const agrupado = (produtosVendas || []).reduce((acc: Record<string, ProdutoVendidoMes>, item: any) => {
        const id = item.custos_itens_id;
        if (!id) return acc;
        if (!acc[id]) {
          acc[id] = {
            catalogo_id: id,
            nome_produto: item.custos_itens?.descricao ?? "",
            categoria: item.custos_itens?.categoria ?? null,
            quantidade_total: 0,
            valor_total: 0,
          };
        }
        acc[id].quantidade_total += item.quantidade || 0;
        acc[id].valor_total += item.valor_total || 0;
        return acc;
      }, {});

      return Object.values(agrupado).sort((a, b) => b.quantidade_total - a.quantidade_total);
    },
  });
}
