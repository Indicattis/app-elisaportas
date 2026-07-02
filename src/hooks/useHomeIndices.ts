import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth } from 'date-fns';
import { calcularFaturamentoLiquido, isVendaValida } from '@/utils/faturamentoCalc';

export interface HomeIndices {
  faturamentoMes: number;
  autorizadosComContrato: number;
  autorizadosSemContrato: number;
}

export const useHomeIndices = () => {
  return useQuery({
    queryKey: ['home-indices'],
    queryFn: async (): Promise<HomeIndices> => {
      const hoje = new Date();
      const inicioMes = startOfMonth(hoje).toISOString().split('T')[0] + 'T12:00:00.000Z';
      const fimMes = endOfMonth(hoje).toISOString().split('T')[0] + 'T12:00:00.000Z';

      const [{ data: vendas, error: vendasError }, { data: autorizados, error: autorizadosError }] = await Promise.all([
        supabase
          .from('vendas')
          .select('valor_venda, valor_frete, valor_credito')
          .gte('data_venda', inicioMes)
          .lte('data_venda', fimMes)
          .eq('is_rascunho', false)
          .not('custo_total', 'is', null),
        supabase
          .from('autorizados')
          .select('contrato_url')
          .eq('ativo', true),
      ]);

      if (vendasError) {
        console.error('Erro ao buscar faturamento:', vendasError);
        throw vendasError;
      }

      if (autorizadosError) {
        console.error('Erro ao buscar autorizados:', autorizadosError);
        throw autorizadosError;
      }

      const vendasValidas = (vendas || []).filter(isVendaValida);
      const faturamentoMes = vendasValidas.reduce((sum, v) => sum + calcularFaturamentoLiquido(v), 0);

      const autorizadosComContrato = (autorizados || []).filter(a => a.contrato_url).length;
      const autorizadosSemContrato = (autorizados || []).filter(a => !a.contrato_url).length;

      return {
        faturamentoMes,
        autorizadosComContrato,
        autorizadosSemContrato,
      };
    },
    staleTime: 1000 * 60 * 2,
    refetchOnWindowFocus: true,
  });
};
