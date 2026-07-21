import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth } from "date-fns";
import { calcularFaturamentoLiquido, isVendaValida } from "@/utils/faturamentoCalc";

export interface RankingVendedorMes {
  atendente_id: string;
  atendente_nome: string;
  foto_perfil_url: string | null;
  quantidade_vendas: number;
  valor_total: number;
}

export const useRankingMes = () => {
  return useQuery({
    queryKey: ['ranking-mes'],
    queryFn: async () => {
      const now = new Date();
      const inicio = startOfMonth(now);
      const fim = endOfMonth(now);

      const { data: vendas, error } = await supabase
        .from('vendas')
        .select(`
          id,
          atendente_id,
          valor_venda,
          valor_frete,
          valor_credito,
          admin_users!fk_vendas_atendente(nome, foto_perfil_url)
        `)
        .gte('data_venda', inicio.toISOString())
        .lte('data_venda', fim.toISOString());

      if (error) throw error;

      const rankingMap = new Map<string, RankingVendedorMes>();
      vendas?.forEach((venda: any) => {
        if (!isVendaValida(venda)) return;
        const id = venda.atendente_id;
        if (!rankingMap.has(id)) {
          rankingMap.set(id, {
            atendente_id: id,
            atendente_nome: venda.admin_users?.nome || 'Sem atendente',
            foto_perfil_url: venda.admin_users?.foto_perfil_url || null,
            quantidade_vendas: 0,
            valor_total: 0,
          });
        }
        const v = rankingMap.get(id)!;
        v.quantidade_vendas += 1;
        v.valor_total += calcularFaturamentoLiquido(venda);
      });

      return Array.from(rankingMap.values()).sort((a, b) => b.valor_total - a.valor_total);
    },
    refetchInterval: 60000,
  });
};