import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMetasVendas, type MetaVendas, type MetaVendasTier } from './useMetasVendas';
import { calcularFaturamentoLiquido } from '@/utils/faturamentoCalc';
import { calcularTier, calcularBonificacao } from '@/lib/metasVendasCalc';

export interface HistVendedor {
  vendedor_id: string;
  nome: string;
  foto_perfil_url: string | null;
  total_vendido: number;
  tier_atingido: MetaVendasTier | null;
  bonificacao_calculada: number;
}

export interface HistPeriodo {
  key: string;
  label: string;
  inicio: Date;
  fim: Date;
  totalGlobal: number;
  tier_atingido_global: MetaVendasTier | null;
  bonificacao_global: number;
  vendedores: HistVendedor[];
}

export interface MetaHistorico {
  meta: MetaVendas;
  periodos: HistPeriodo[];
}

const MAX_PERIODOS = 104;

function parseDataLocal(iso: string): Date {
  // aceita 'YYYY-MM-DD' ou 'YYYY-MM-DDTHH:mm:ss(.sss)Z'
  const s = iso.slice(0, 10);
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function startOfWeek(d: Date): Date {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  r.setDate(r.getDate() - r.getDay()); // domingo
  return r;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfDayIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}T12:00:00.000Z`;
}

function fmtDM(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const MESES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];

function gerarPeriodos(meta: MetaVendas, hoje: Date): { inicio: Date; fim: Date; key: string; label: string }[] {
  const inicioVig = parseDataLocal(meta.data_inicio_vigencia);
  const fimVigBruto = meta.data_fim_vigencia ? parseDataLocal(meta.data_fim_vigencia) : hoje;
  const fimVig = fimVigBruto > hoje ? hoje : fimVigBruto;

  const periodos: { inicio: Date; fim: Date; key: string; label: string }[] = [];
  if (meta.periodo === 'semanal') {
    let cursor = startOfWeek(inicioVig);
    while (cursor <= fimVig && periodos.length < MAX_PERIODOS) {
      const fim = new Date(cursor);
      fim.setDate(cursor.getDate() + 6);
      if (fim < hoje) {
        periodos.push({
          inicio: new Date(cursor),
          fim,
          key: `${cursor.toISOString().slice(0, 10)}_w`,
          label: `Semana de ${fmtDM(cursor)} a ${fmtDM(fim)}`,
        });
      }
      cursor = new Date(cursor);
      cursor.setDate(cursor.getDate() + 7);
    }
  } else {
    let cursor = startOfMonth(inicioVig);
    const inicioMesAtual = startOfMonth(hoje);
    while (cursor <= fimVig && periodos.length < MAX_PERIODOS) {
      const fim = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
      if (cursor < inicioMesAtual) {
        periodos.push({
          inicio: new Date(cursor),
          fim,
          key: `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`,
          label: `${MESES[cursor.getMonth()]} ${cursor.getFullYear()}`,
        });
      }
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }
  }
  // mais recentes primeiro
  return periodos.reverse();
}

export function useHistoricoMetasVendas() {
  const { data: metas, isLoading: loadingMetas } = useMetasVendas();

  const query = useQuery({
    queryKey: ['historico_metas_vendas', metas?.map((m) => `${m.id}:${m.updated_at}`).join(',')],
    enabled: !!metas,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<MetaHistorico[]> => {
      const lista = metas || [];
      if (lista.length === 0) return [];

      // Resolver usuários (mesma fonte do hook live)
      const { data: usuarios } = await supabase
        .from('admin_users')
        .select('user_id, nome, foto_perfil_url');
      const userMap = new Map<string, { nome: string; foto_perfil_url: string | null }>();
      (usuarios || []).forEach((u: any) =>
        userMap.set(u.user_id, { nome: u.nome, foto_perfil_url: u.foto_perfil_url ?? null }),
      );

      const hoje = new Date();
      const resultados: MetaHistorico[] = [];

      for (const meta of lista) {
        const periodos = gerarPeriodos(meta, hoje);
        if (periodos.length === 0) {
          resultados.push({ meta, periodos: [] });
          continue;
        }

        const inicioGlobal = periodos[periodos.length - 1].inicio;
        const fimGlobal = periodos[0].fim;

        let q = supabase
          .from('vendas')
          .select('atendente_id, data_venda, valor_venda, valor_frete, valor_credito')
          .eq('is_rascunho', false)
          .gte('data_venda', endOfDayIso(inicioGlobal))
          .lte('data_venda', endOfDayIso(fimGlobal));
        if (meta.escopo === 'individual' && meta.vendedor_id) {
          q = q.eq('atendente_id', meta.vendedor_id);
        }
        const { data: vendas, error } = await q;
        if (error) throw error;

        const tiers = meta.tiers || [];
        const periodosOut: HistPeriodo[] = periodos.map((p) => {
          const porVendedor = new Map<string, number>();
          let totalGlobal = 0;
          const inicioMs = p.inicio.getTime();
          const fimMs = new Date(p.fim.getFullYear(), p.fim.getMonth(), p.fim.getDate(), 23, 59, 59).getTime();
          for (const v of (vendas as any[]) || []) {
            const dv = parseDataLocal(v.data_venda).getTime();
            if (dv < inicioMs || dv > fimMs) continue;
            const valor = calcularFaturamentoLiquido(v);
            totalGlobal += valor;
            porVendedor.set(v.atendente_id, (porVendedor.get(v.atendente_id) || 0) + valor);
          }

          let vendedores: HistVendedor[] = [];
          if (meta.escopo === 'individual') {
            if (meta.vendedor_id) {
              const total = porVendedor.get(meta.vendedor_id) || 0;
              const tier = calcularTier(total, tiers);
              const u = userMap.get(meta.vendedor_id);
              vendedores = [{
                vendedor_id: meta.vendedor_id,
                nome: u?.nome || 'Vendedor',
                foto_perfil_url: u?.foto_perfil_url ?? null,
                total_vendido: total,
                tier_atingido: tier,
                bonificacao_calculada: calcularBonificacao(total, tier, !!tier),
              }];
            } else {
              const ids = new Set<string>([...porVendedor.keys()]);
              vendedores = Array.from(ids).map((id) => {
                const total = porVendedor.get(id) || 0;
                const tier = calcularTier(total, tiers);
                const u = userMap.get(id);
                return {
                  vendedor_id: id,
                  nome: u?.nome || 'Vendedor',
                  foto_perfil_url: u?.foto_perfil_url ?? null,
                  total_vendido: total,
                  tier_atingido: tier,
                  bonificacao_calculada: calcularBonificacao(total, tier, !!tier),
                };
              }).sort((a, b) => b.total_vendido - a.total_vendido || a.nome.localeCompare(b.nome));
            }
          }

          const tierGlobal = meta.escopo === 'global' ? calcularTier(totalGlobal, tiers) : null;
          return {
            key: p.key,
            label: p.label,
            inicio: p.inicio,
            fim: p.fim,
            totalGlobal,
            tier_atingido_global: tierGlobal,
            bonificacao_global:
              meta.escopo === 'global'
                ? calcularBonificacao(totalGlobal, tierGlobal, !!tierGlobal)
                : 0,
            vendedores,
          };
        });

        resultados.push({ meta, periodos: periodosOut });
      }

      return resultados;
    },
  });

  return { ...query, isLoading: loadingMetas || query.isLoading };
}