import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface InstalacaoFinalizada {
  id: string;
  pedido_id: string;
  venda_id: string | null;
  numero_pedido: string | null;
  numero_mes: number | null;
  mes_vigencia: string | null;
  cliente_nome: string | null;
  valor_instalacao: number;
  equipe_instalacao_id: string | null;
  equipe_instalacao_nome: string | null;
  autorizado_correcao_id: string | null;
  autorizado_correcao_nome: string | null;
  responsavel_carregamento_id: string | null;
  responsavel_carregamento_nome: string | null;
  estado: string | null;
  cidade: string | null;
  finalizado_em: string;
}

/**
 * @param mes formato "YYYY-MM" ou "todos"
 */
export function useInstalacoesFinalizadas(mes: string) {
  return useQuery({
    queryKey: ["instalacoes-finalizadas", mes],
    queryFn: async (): Promise<InstalacaoFinalizada[]> => {
      let query = supabase
        .from("instalacoes_finalizadas")
        .select("*")
        .order("finalizado_em", { ascending: false });

      if (mes !== "todos") {
        const [y, m] = mes.split("-").map(Number);
        const inicio = new Date(Date.UTC(y, m - 1, 1)).toISOString();
        const fim = new Date(Date.UTC(y, m, 1)).toISOString();
        query = query.gte("finalizado_em", inicio).lt("finalizado_em", fim);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as InstalacaoFinalizada[];
    },
  });
}