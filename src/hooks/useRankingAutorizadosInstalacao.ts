import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { startOfMonth, startOfYear, endOfMonth, endOfYear } from 'date-fns';

export type PeriodoFiltro = 'mes' | 'ano' | 'todos';

export interface InstalacaoDetalhe {
  id: string;
  nome_cliente: string;
  data_conclusao: string | null;
  metragem?: number | null;
  origem: 'pedido' | 'neo';
}

export interface RankingAutorizado {
  autorizado_id: string;
  autorizado_nome: string;
  autorizado_logo_url: string | null;
  quantidade_instalacoes: number;
  metragem_total: number;
  ultima_instalacao: string | null;
  instalacoes_detalhes: InstalacaoDetalhe[];
}

export function useRankingAutorizadosInstalacao() {
  const [ranking, setRanking] = useState<RankingAutorizado[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState<PeriodoFiltro>('mes');

  const fetchRanking = async () => {
    try {
      setLoading(true);

      const now = new Date();
      let dataInicio: Date | null = null;
      let dataFim: Date | null = null;

      if (periodo === 'mes') {
        dataInicio = startOfMonth(now);
        dataFim = endOfMonth(now);
      } else if (periodo === 'ano') {
        dataInicio = startOfYear(now);
        dataFim = endOfYear(now);
      }

      // Autorizados ativos (para nome canônico e logo)
      const { data: autorizadosData, error: autorizadosError } = await supabase
        .from('autorizados')
        .select('id, nome, logo_url');

      if (autorizadosError) throw autorizadosError;

      const autorizadosMap = new Map(
        (autorizadosData || []).map((a: any) => [a.id, a])
      );

      // Mesma fonte do ranking de equipes: instalacoes_finalizadas
      let queryFinalizadas = supabase
        .from('instalacoes_finalizadas')
        .select('id, cliente_nome, finalizado_em, autorizado_correcao_id, autorizado_correcao_nome')
        .not('autorizado_correcao_id', 'is', null);

      if (dataInicio && dataFim) {
        queryFinalizadas = queryFinalizadas
          .gte('finalizado_em', dataInicio.toISOString())
          .lte('finalizado_em', dataFim.toISOString());
      }

      const { data: finalizadasData, error: finalizadasError } = await queryFinalizadas;
      if (finalizadasError) throw finalizadasError;

      const agrupamento = new Map<string, RankingAutorizado>();

      (finalizadasData || []).forEach((row: any) => {
        const autId = row.autorizado_correcao_id as string;
        const aut = autorizadosMap.get(autId);
        const nome = aut?.nome || row.autorizado_correcao_nome || 'Autorizado';
        const logo = aut?.logo_url ?? null;

        if (!agrupamento.has(autId)) {
          agrupamento.set(autId, {
            autorizado_id: autId,
            autorizado_nome: nome,
            autorizado_logo_url: logo,
            quantidade_instalacoes: 0,
            metragem_total: 0,
            ultima_instalacao: null,
            instalacoes_detalhes: []
          });
        }

        const item = agrupamento.get(autId)!;
        item.quantidade_instalacoes += 1;
        item.instalacoes_detalhes.push({
          id: row.id,
          nome_cliente: row.cliente_nome,
          data_conclusao: row.finalizado_em,
          metragem: null,
          origem: 'pedido'
        });

        if (!item.ultima_instalacao ||
            (row.finalizado_em && row.finalizado_em > item.ultima_instalacao)) {
          item.ultima_instalacao = row.finalizado_em;
        }
      });

      const rankingArray = Array.from(agrupamento.values())
        .sort((a, b) => b.quantidade_instalacoes - a.quantidade_instalacoes);

      rankingArray.forEach(a => {
        a.instalacoes_detalhes.sort((x, y) => {
          if (!x.data_conclusao) return 1;
          if (!y.data_conclusao) return -1;
          return y.data_conclusao.localeCompare(x.data_conclusao);
        });
      });

      setRanking(rankingArray);
    } catch (error) {
      console.error('Erro ao buscar ranking autorizados:', error);
      toast.error('Erro ao carregar ranking dos autorizados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRanking();
  }, [periodo]);

  const maxInstalacoes = useMemo(() => {
    if (ranking.length === 0) return 0;
    return ranking[0].quantidade_instalacoes;
  }, [ranking]);

  return { ranking, loading, periodo, setPeriodo, maxInstalacoes, refetch: fetchRanking };
}
