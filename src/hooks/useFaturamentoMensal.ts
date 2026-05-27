import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfYear, endOfYear, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { calcularFaturamentoLiquido, isVendaValida } from "@/utils/faturamentoCalc";

export interface FaturamentoMensal {
  mes: string;
  valor: number;
  numero_vendas: number;
}

export function useFaturamentoMensal() {
  return useQuery({
    queryKey: ['faturamento-mensal', new Date().getFullYear()],
    queryFn: async () => {
      const anoAtual = new Date().getFullYear();
      const inicioAno = startOfYear(new Date(anoAtual, 0, 1));
      const fimAno = endOfYear(new Date(anoAtual, 11, 31));

      const { data: vendas, error } = await supabase
        .from('vendas')
        .select('data_venda, valor_venda, valor_frete, valor_credito')
        .gte('data_venda', inicioAno.toISOString())
        .lte('data_venda', fimAno.toISOString())
        .order('data_venda');

      if (error) {
        console.error('Erro ao buscar faturamento mensal:', error);
        throw error;
      }

      // Agrupar vendas por mês
      const vendasPorMes: Record<number, { valor: number; count: number }> = {};
      
      for (let i = 0; i < 12; i++) {
        vendasPorMes[i] = { valor: 0, count: 0 };
      }

      vendas?.forEach(venda => {
        const mes = new Date(venda.data_venda).getMonth();
        if (!isVendaValida(venda)) return;
        vendasPorMes[mes].valor += calcularFaturamentoLiquido(venda);
        vendasPorMes[mes].count += 1;
      });

      // Converter para array de objetos
      const resultado: FaturamentoMensal[] = Object.keys(vendasPorMes).map(mesNum => {
        const mesIndex = parseInt(mesNum);
        const data = new Date(anoAtual, mesIndex, 1);
        
        return {
          mes: format(data, 'MMM', { locale: ptBR }),
          valor: vendasPorMes[mesIndex].valor,
          numero_vendas: vendasPorMes[mesIndex].count
        };
      });

      return resultado;
    },
  });
}
