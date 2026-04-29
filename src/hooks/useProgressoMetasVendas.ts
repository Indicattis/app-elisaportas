import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMetasVendas, type MetaVendas, type MetaVendasTier } from './useMetasVendas';
import { getInicioFimSemana, getInicioFimMes } from '@/lib/periodoMeta';
import { calcularFaturamentoLiquido } from '@/utils/faturamentoCalc';

export interface VendedorProgresso {
  vendedor_id: string;
  nome: string;
  foto_perfil_url: string | null;
  total_vendido: number;
  tier_atingido: MetaVendasTier | null;
  bonificacao_calculada: number;
  total_vendido_mes: number;
  total_vendido_semana: number;
}

export interface MetaProgresso {
  meta: MetaVendas;
  tiers: MetaVendasTier[];
  vendedores: VendedorProgresso[];
  totalGlobal: number;
}

function calcularTier(total: number, tiers: MetaVendasTier[]): MetaVendasTier | null {
  const ordenados = [...tiers].sort((a, b) => Number(b.valor_alvo) - Number(a.valor_alvo));
  return ordenados.find((t) => total >= Number(t.valor_alvo)) || null;
}

function calcularBonificacao(total: number, tier: MetaVendasTier | null, atingido: boolean = true): number {
  if (!tier) return 0;
  if (tier.bonificacao_tipo === 'fixo') return atingido ? Number(tier.bonificacao_valor) : 0;
  // Regra: bonificacao_valor é a porcentagem direta (ex.: 0.3 ⇒ 0,3% ⇒ multiplicador 0.003)
  return total * (Number(tier.bonificacao_valor) / 100);
}

export function useProgressoMetasVendas() {
  const { data: metas, isLoading: loadingMetas } = useMetasVendas();

  const query = useQuery({
    queryKey: ['progresso_metas_vendas', metas?.map((m) => m.id).join(',')],
    enabled: !!metas,
    refetchInterval: 30000,
    queryFn: async (): Promise<MetaProgresso[]> => {
      const hoje = new Date();
      const hojeStr = hoje.toISOString().slice(0, 10);
      const ativas = (metas || []).filter((m) => {
        if (!m.ativa) return false;
        if (m.data_inicio_vigencia && m.data_inicio_vigencia > hojeStr) return false;
        if (m.data_fim_vigencia && m.data_fim_vigencia < hojeStr) return false;
        return true;
      });

      if (ativas.length === 0) return [];

      // Buscar nomes de atendentes
      const { data: usuarios } = await supabase
        .from('admin_users')
        .select('user_id, nome, foto_perfil_url, role')
        .eq('ativo', true)
        .in('role', ['atendente', 'vendedor']);
      const userMap = new Map<string, { nome: string; foto_perfil_url: string | null; role: string }>();
      (usuarios || []).forEach((u: any) =>
        userMap.set(u.user_id, { nome: u.nome, foto_perfil_url: u.foto_perfil_url ?? null, role: u.role }),
      );
      // Vendedores elegíveis = todos os ativos (mesma fonte de useVendedoresElegiveis)
      const elegiveis = (usuarios || []) as any[];

      // Total vendido no mês corrente (independente do período de cada meta)
      const periodoMes = getInicioFimMes(hoje);
      const { data: vendasMes, error: errMes } = await supabase
        .from('vendas')
        .select('atendente_id, valor_venda, valor_frete, valor_credito')
        .eq('is_rascunho', false)
        .gte('data_venda', periodoMes.inicioIso)
        .lte('data_venda', periodoMes.fimIso);
      if (errMes) throw errMes;
      const porVendedorMes = new Map<string, number>();
      let totalGlobalMes = 0;
      for (const v of (vendasMes as any[]) || []) {
        const valor = calcularFaturamentoLiquido(v);
        totalGlobalMes += valor;
        porVendedorMes.set(v.atendente_id, (porVendedorMes.get(v.atendente_id) || 0) + valor);
      }

      // Total vendido na semana corrente
      const periodoSemana = getInicioFimSemana(hoje);
      const { data: vendasSemana, error: errSemana } = await supabase
        .from('vendas')
        .select('atendente_id, valor_venda, valor_frete, valor_credito')
        .eq('is_rascunho', false)
        .gte('data_venda', periodoSemana.inicioIso)
        .lte('data_venda', periodoSemana.fimIso);
      if (errSemana) throw errSemana;
      const porVendedorSemana = new Map<string, number>();
      let totalGlobalSemana = 0;
      for (const v of (vendasSemana as any[]) || []) {
        const valor = calcularFaturamentoLiquido(v);
        totalGlobalSemana += valor;
        porVendedorSemana.set(v.atendente_id, (porVendedorSemana.get(v.atendente_id) || 0) + valor);
      }

      const resultados: MetaProgresso[] = [];

      for (const meta of ativas) {
        const periodo = meta.periodo === 'semanal' ? getInicioFimSemana(hoje) : getInicioFimMes(hoje);

        let q = supabase
          .from('vendas')
          .select('atendente_id, valor_venda, valor_frete, valor_credito')
          .eq('is_rascunho', false)
          .gte('data_venda', periodo.inicioIso)
          .lte('data_venda', periodo.fimIso);

        if (meta.escopo === 'individual' && meta.vendedor_id) {
          q = q.eq('atendente_id', meta.vendedor_id);
        }

        const { data: vendas, error } = await q;
        if (error) throw error;

        const tiers = meta.tiers || [];
        const porVendedor = new Map<string, number>();
        let totalGlobal = 0;
        for (const v of (vendas as any[]) || []) {
          const valor = calcularFaturamentoLiquido(v);
          totalGlobal += valor;
          porVendedor.set(v.atendente_id, (porVendedor.get(v.atendente_id) || 0) + valor);
        }

        let vendedores: VendedorProgresso[] = [];
        if (meta.escopo === 'individual') {
          if (meta.vendedor_id) {
            const total = porVendedor.get(meta.vendedor_id) || 0;
            const tier = calcularTier(total, tiers);
            const tierBonus = tier || [...tiers].sort((a, b) => Number(a.valor_alvo) - Number(b.valor_alvo))[0] || null;
            const u = userMap.get(meta.vendedor_id);
            vendedores = [{
              vendedor_id: meta.vendedor_id,
              nome: u?.nome || 'Vendedor',
              foto_perfil_url: u?.foto_perfil_url ?? null,
              total_vendido: total,
              tier_atingido: tier,
              bonificacao_calculada: calcularBonificacao(total, tierBonus, !!tier),
              total_vendido_mes: porVendedorMes.get(meta.vendedor_id) || 0,
              total_vendido_semana: porVendedorSemana.get(meta.vendedor_id) || 0,
            }];
          } else {
            // Inclui todos os vendedores elegíveis, mesmo sem vendas
            const primeiroTier = [...tiers].sort((a, b) => Number(a.valor_alvo) - Number(b.valor_alvo))[0] || null;
            vendedores = elegiveis
              .map((u) => {
                const total = porVendedor.get(u.user_id) || 0;
                const tier = calcularTier(total, tiers);
                const totalMes = porVendedorMes.get(u.user_id) || 0;
                return {
                  vendedor_id: u.user_id,
                  nome: u.nome,
                  foto_perfil_url: u.foto_perfil_url ?? null,
                  total_vendido: total,
                  tier_atingido: tier,
                  bonificacao_calculada: calcularBonificacao(total, tier || primeiroTier, !!tier),
                  total_vendido_mes: totalMes,
                  total_vendido_semana: porVendedorSemana.get(u.user_id) || 0,
                };
              })
              .sort((a, b) => b.total_vendido - a.total_vendido || a.nome.localeCompare(b.nome));
          }
        } else {
          const tier = calcularTier(totalGlobal, tiers);
          const primeiroTier = [...tiers].sort((a, b) => Number(a.valor_alvo) - Number(b.valor_alvo))[0] || null;
          vendedores = [{
            vendedor_id: 'global',
            nome: 'Equipe',
            foto_perfil_url: null,
            total_vendido: totalGlobal,
            tier_atingido: tier,
            bonificacao_calculada: calcularBonificacao(totalGlobal, tier || primeiroTier, !!tier),
            total_vendido_mes: totalGlobalMes,
            total_vendido_semana: totalGlobalSemana,
          }];
        }

        resultados.push({ meta, tiers, vendedores, totalGlobal });
      }

      return resultados;
    },
  });

  return { ...query, isLoading: loadingMetas || query.isLoading };
}

export function useVendedoresElegiveis() {
  return useQuery({
    queryKey: ['vendedores_elegiveis_metas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_users')
        .select('user_id, nome, role')
        .eq('ativo', true)
        .order('nome');
      if (error) throw error;
      return (data || []) as { user_id: string; nome: string; role: string }[];
    },
  });
}