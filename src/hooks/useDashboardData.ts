import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface DiaVenda {
  data: string;
  valor: number;
  numero_vendas: number;
}

interface VendedorRanking {
  nome: string;
  total_vendas: number;
  numero_vendas: number;
  posicao: number;
  foto_perfil_url?: string;
}

export const useSalesData = () => {
  return useQuery({
    queryKey: ['vendas-mes'],
    queryFn: async (): Promise<DiaVenda[]> => {
      const hoje = new Date();
      const primeiroDiaDoMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      const ultimoDiaDoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

      const { data, error } = await supabase
        .from('vendas')
        .select('data_venda, valor_venda, valor_frete, valor_credito')
        .eq('is_rascunho', false)
        .gte('data_venda', primeiroDiaDoMes.toISOString())
        .lte('data_venda', ultimoDiaDoMes.toISOString());

      if (error) {
        console.error('Erro ao buscar vendas:', error);
        throw error;
      }

      // Agrupar por data e somar valores (valor_venda - frete + crédito/acréscimo)
      const vendasPorDia = (data || []).reduce((acc: { [key: string]: { valor: number; numero_vendas: number } }, venda: any) => {
        const dataKey = venda.data_venda.split('T')[0];
        if (!acc[dataKey]) {
          acc[dataKey] = { valor: 0, numero_vendas: 0 };
        }
        // Valor = valor_venda - frete + crédito/acréscimo
        const valorCalculado = Number(venda.valor_venda || 0) - Number(venda.valor_frete || 0) + Number(venda.valor_credito || 0);
        acc[dataKey].valor += valorCalculado;
        acc[dataKey].numero_vendas += 1;
        return acc;
      }, {});

      return Object.entries(vendasPorDia).map(([data, { valor, numero_vendas }]) => ({
        data,
        valor,
        numero_vendas
      }));
    },
    refetchInterval: 120000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
};

export const useSellersRanking = () => {
  return useQuery({
    queryKey: ['ranking-vendedores'],
    queryFn: async (): Promise<VendedorRanking[]> => {
      const hoje = new Date();
      const primeiroDiaDoMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      const ultimoDiaDoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

      const { data, error } = await supabase
        .from('vendas')
        .select(`
          valor_venda,
          valor_frete,
          valor_credito,
          atendente_id,
          admin_users!inner(nome, foto_perfil_url)
        `)
        .eq('is_rascunho', false)
        .gte('data_venda', primeiroDiaDoMes.toISOString())
        .lte('data_venda', ultimoDiaDoMes.toISOString());

      if (error) {
        console.error('Erro ao buscar ranking:', error);
        throw error;
      }

      // Agrupar por atendente e somar valores (valor_venda - frete + crédito/acréscimo)
      const vendasPorAtendente = (data || []).reduce((acc: { [key: string]: any }, venda: any) => {
        const atendenteId = venda.atendente_id;
        if (!acc[atendenteId]) {
          acc[atendenteId] = {
            nome: venda.admin_users?.nome || 'N/A',
            foto_perfil_url: venda.admin_users?.foto_perfil_url,
            total_vendas: 0,
            numero_vendas: 0
          };
        }
        // Valor = valor_venda - frete + crédito/acréscimo
        const valorCalculado = Number(venda.valor_venda || 0) - Number(venda.valor_frete || 0) + Number(venda.valor_credito || 0);
        acc[atendenteId].total_vendas += valorCalculado;
        acc[atendenteId].numero_vendas += 1;
        return acc;
      }, {});

      // Converter para array e ordenar
      const ranking = Object.values(vendasPorAtendente)
        .sort((a: any, b: any) => b.total_vendas - a.total_vendas)
        .map((vendedor: any, index: number) => ({
          ...vendedor,
          posicao: index + 1
        }));

      return ranking;
    },
    refetchInterval: 120000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
};

export const useWhatsAppRoulette = () => {
  return useQuery({
    queryKey: ['whatsapp-roulette-stats'],
    queryFn: async (): Promise<{ nome: string; total_clicks: number }[]> => {
      try {
        const hoje = new Date();
        const primeiroDiaDoMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        const ultimoDiaDoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

        const { data, error } = await supabase
          .from('whatsapp_roulette_clicks')
          .select('atendente_nome')
          .gte('created_at', primeiroDiaDoMes.toISOString())
          .lte('created_at', ultimoDiaDoMes.toISOString());

        if (error) {
          console.error('Erro ao buscar stats da roleta:', error);
          return [];
        }

        // Agrupar por atendente e contar
        const clicksPorAtendente = (data || []).reduce((acc: { [key: string]: number }, click: any) => {
          const nome = click.atendente_nome;
          if (nome) {
            acc[nome] = (acc[nome] || 0) + 1;
          }
          return acc;
        }, {});

        const resultado = Object.entries(clicksPorAtendente).map(([nome, total_clicks]) => ({
          nome,
          total_clicks: total_clicks as number
        }));

        console.log('📊 WhatsApp Stats:', resultado);
        return resultado;
      } catch (error) {
        console.error('Erro ao buscar stats da roleta WhatsApp:', error);
        return [];
      }
    },
    refetchInterval: 120000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
};

export const useAutorizadosPorAtendente = () => {
  return useQuery({
    queryKey: ['autorizados-por-atendente'],
    queryFn: async (): Promise<{ [key: string]: number }> => {
      const { data, error } = await supabase
        .from('autorizados')
        .select(`
          vendedor_id,
          admin_users!inner(nome)
        `)
        .eq('ativo', true);

      if (error) {
        console.error('Erro ao buscar autorizados:', error);
        throw error;
      }

      // Agrupar por atendente e contar
      const autorizadosPorAtendente = (data || []).reduce((acc: { [key: string]: number }, autorizado: any) => {
        const nomeAtendente = autorizado.admin_users?.nome;
        if (nomeAtendente) {
          acc[nomeAtendente] = (acc[nomeAtendente] || 0) + 1;
        }
        return acc;
      }, {});

      return autorizadosPorAtendente;
    },
    refetchInterval: 300000, // 5 minutes
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
};

export const useDashboardRealtime = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('dashboard-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vendas'
        },
        () => {
          // Debounced invalidation
          setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['vendas-mes'] });
            queryClient.invalidateQueries({ queryKey: ['ranking-vendedores'] });
            queryClient.invalidateQueries({ queryKey: ['vendas-agregadas'] });
            queryClient.invalidateQueries({ queryKey: ['vendas-mes-atual'] });
            queryClient.invalidateQueries({ queryKey: ['vendas-semana-atual'] });
          }, 500);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'admin_users'
        },
        () => {
          // Debounced invalidation
          setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['ranking-vendedores'] });
            queryClient.invalidateQueries({ queryKey: ['autorizados-por-atendente'] });
          }, 500);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'autorizados'
        },
        () => {
          // Debounced invalidation
          setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['autorizados-por-atendente'] });
          }, 500);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
};