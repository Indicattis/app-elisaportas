import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FRETE_POR_PORTA_REGIAO } from '@/utils/fretePorPorta';
import type { RegiaoBrasil } from '@/utils/regioesBrasil';

export type FretePorPortaRegiao = {
  id: string;
  regiao: RegiaoBrasil;
  valor_unitario: number;
};

/**
 * Retorna a tabela de frete por porta (região -> valor unitário) vinda do banco,
 * com fallback para os valores estáticos enquanto carrega ou em caso de erro.
 */
export function useFretePorPortaRegiao() {
  const query = useQuery({
    queryKey: ['frete-por-porta-regiao'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('frete_por_porta_regiao' as any)
        .select('id, regiao, valor_unitario');
      if (error) throw error;
      return ((data ?? []) as unknown) as FretePorPortaRegiao[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const tabela: Record<RegiaoBrasil, number> = { ...FRETE_POR_PORTA_REGIAO };
  for (const row of query.data ?? []) {
    if (row.regiao in tabela) {
      tabela[row.regiao as RegiaoBrasil] = Number(row.valor_unitario) || 0;
    }
  }

  return { tabela, rows: query.data ?? [], isLoading: query.isLoading, refetch: query.refetch };
}