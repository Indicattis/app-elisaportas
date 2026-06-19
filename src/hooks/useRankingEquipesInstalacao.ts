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

export interface RankingEquipe {
  equipe_id: string;
  equipe_nome: string;
  equipe_cor: string | null;
  quantidade_instalacoes: number;
  metragem_total: number;
  ultima_instalacao: string | null;
  instalacoes_detalhes: InstalacaoDetalhe[];
}

export function useRankingEquipesInstalacao() {
  const [ranking, setRanking] = useState<RankingEquipe[]>([]);
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

      const { data: equipesData, error: equipesError } = await supabase
        .from('equipes_instalacao')
        .select('id, nome, cor, ativa');

      if (equipesError) throw equipesError;

      const equipesMap = new Map(
        (equipesData || []).map(eq => [eq.id, eq])
      );

      let queryFinalizadas = supabase
        .from('instalacoes_finalizadas')
        .select('id, cliente_nome, finalizado_em, equipe_instalacao_id, equipe_instalacao_nome')
        .not('equipe_instalacao_id', 'is', null);

      if (dataInicio && dataFim) {
        queryFinalizadas = queryFinalizadas
          .gte('finalizado_em', dataInicio.toISOString())
          .lte('finalizado_em', dataFim.toISOString());
      }

      const { data: finalizadasData, error: finalizadasError } = await queryFinalizadas;
      if (finalizadasError) throw finalizadasError;

      const agrupamento = new Map<string, RankingEquipe>();

      (finalizadasData || []).forEach((row: any) => {
        const equipeId = row.equipe_instalacao_id as string;
        const equipe = equipesMap.get(equipeId);
        const nome = equipe?.nome || row.equipe_instalacao_nome || 'Equipe';
        const cor = equipe?.cor ?? null;

        if (!agrupamento.has(equipeId)) {
          agrupamento.set(equipeId, {
            equipe_id: equipeId,
            equipe_nome: nome,
            equipe_cor: cor,
            quantidade_instalacoes: 0,
            metragem_total: 0,
            ultima_instalacao: null,
            instalacoes_detalhes: []
          });
        }

        const item = agrupamento.get(equipeId)!;
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

      // Sort details by date desc within each team
      rankingArray.forEach(eq => {
        eq.instalacoes_detalhes.sort((a, b) => {
          if (!a.data_conclusao) return 1;
          if (!b.data_conclusao) return -1;
          return b.data_conclusao.localeCompare(a.data_conclusao);
        });
      });

      setRanking(rankingArray);
    } catch (error) {
      console.error('Erro ao buscar ranking:', error);
      toast.error('Erro ao carregar ranking das equipes');
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

  return {
    ranking,
    loading,
    periodo,
    setPeriodo,
    maxInstalacoes,
    refetch: fetchRanking
  };
}
