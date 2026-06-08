import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useDespesasPadrao, type DespesaPadrao } from './useDespesasPadrao';

/**
 * Overrides por mês da Folha. A API espelha `useDespesasPadrao`, mas:
 * - `items` traz cada colaborador do padrão com os campos numéricos
 *   sobrescritos pelo override do mês (quando existe).
 * - `update(id, patch)` aplica o patch como override mensal (UPSERT por
 *   mes_referencia + despesa_padrao_id). Apenas campos overrideáveis valem;
 *   demais campos são ignorados.
 * - `insert`, `remove` e `reorder` são no-op (UI deve esconder).
 * - `clearOverride(id)` apaga o override daquele colaborador no mês.
 */

const OVERRIDE_FIELDS = [
  'salario',
  'salario_minimo',
  'aux_combustivel',
  'bonificacao',
  'hora_extra',
  'insalubridade_pct',
  'fgts_pct',
  'previsao_13_valor',
  'ferias_valor',
  'em_folha',
] as const;

type OverrideField = (typeof OVERRIDE_FIELDS)[number];

interface FolhaOverrideRow {
  id: string;
  despesa_padrao_id: string;
  salario: number | null;
  salario_minimo: number | null;
  aux_combustivel: number | null;
  bonificacao: number | null;
  hora_extra: number | null;
  insalubridade_pct: number | null;
  fgts_pct: number | null;
  previsao_13_valor: number | null;
  ferias_valor: number | null;
  em_folha: boolean | null;
}

export function useDespesasPadraoMes(mes: string | null) {
  const mesStart = mes ? `${mes}-01` : null;
  const base = useDespesasPadrao();
  const [overrides, setOverrides] = useState<Record<string, FolhaOverrideRow>>({});
  const [loadingOv, setLoadingOv] = useState(true);

  const fetchOverrides = useCallback(async () => {
    if (!mesStart) { setOverrides({}); setLoadingOv(false); return; }
    setLoadingOv(true);
    const { data, error } = await supabase
      .from('despesas_mes_folha_override' as any)
      .select('*')
      .eq('mes_referencia', mesStart);
    if (error) {
      toast.error('Erro ao carregar overrides da folha: ' + error.message);
      setOverrides({});
    } else {
      const map: Record<string, FolhaOverrideRow> = {};
      ((data || []) as any[]).forEach((r) => { map[r.despesa_padrao_id] = r as FolhaOverrideRow; });
      setOverrides(map);
    }
    setLoadingOv(false);
  }, [mesStart]);

  useEffect(() => { fetchOverrides(); }, [fetchOverrides]);

  const items: DespesaPadrao[] = useMemo(() => {
    return base.items.map((it) => {
      const ov = overrides[it.id];
      if (!ov) return it;
      return {
        ...it,
        salario: ov.salario != null ? Number(ov.salario) : it.salario,
        salario_minimo: ov.salario_minimo != null ? Number(ov.salario_minimo) : it.salario_minimo,
        aux_combustivel: ov.aux_combustivel != null ? Number(ov.aux_combustivel) : it.aux_combustivel,
        bonificacao: ov.bonificacao != null ? Number(ov.bonificacao) : it.bonificacao,
        hora_extra: ov.hora_extra != null ? Number(ov.hora_extra) : it.hora_extra,
        insalubridade_pct: ov.insalubridade_pct != null ? Number(ov.insalubridade_pct) : it.insalubridade_pct,
        fgts_pct: ov.fgts_pct != null ? Number(ov.fgts_pct) : it.fgts_pct,
        previsao_13_valor: ov.previsao_13_valor != null ? Number(ov.previsao_13_valor) : it.previsao_13_valor,
        ferias_valor: ov.ferias_valor != null ? Number(ov.ferias_valor) : it.ferias_valor,
        em_folha: ov.em_folha != null ? !!ov.em_folha : it.em_folha,
      };
    });
  }, [base.items, overrides]);

  const update = useCallback(async (id: string, patch: Partial<DespesaPadrao>) => {
    if (!mesStart) return false;
    const overridePatch: Record<string, any> = {};
    for (const key of OVERRIDE_FIELDS) {
      if (key in patch) overridePatch[key] = (patch as any)[key];
    }
    if (Object.keys(overridePatch).length === 0) return true; // nada a fazer

    // Otimista: atualiza local
    setOverrides((prev) => {
      const cur = prev[id] || {
        id: '',
        despesa_padrao_id: id,
        salario: null, salario_minimo: null, aux_combustivel: null, bonificacao: null,
        hora_extra: null, insalubridade_pct: null, fgts_pct: null, previsao_13_valor: null,
        ferias_valor: null, em_folha: null,
      };
      return { ...prev, [id]: { ...cur, ...overridePatch } };
    });

    const userId = (await supabase.auth.getUser()).data.user?.id || null;
    const { error } = await supabase
      .from('despesas_mes_folha_override' as any)
      .upsert({
        mes_referencia: mesStart,
        despesa_padrao_id: id,
        ...overridePatch,
        created_by: userId,
      } as any, { onConflict: 'mes_referencia,despesa_padrao_id' });
    if (error) {
      toast.error('Erro ao salvar override: ' + error.message);
      await fetchOverrides();
      return false;
    }
    return true;
  }, [mesStart, fetchOverrides]);

  const noop = useCallback(async () => false, []);

  const clearOverride = useCallback(async (despesaPadraoId: string) => {
    if (!mesStart) return false;
    const { error } = await supabase
      .from('despesas_mes_folha_override' as any)
      .delete()
      .eq('mes_referencia', mesStart)
      .eq('despesa_padrao_id', despesaPadraoId);
    if (error) { toast.error('Erro ao restaurar padrão: ' + error.message); return false; }
    await fetchOverrides();
    return true;
  }, [mesStart, fetchOverrides]);

  return {
    items,
    loading: base.loading || loadingOv,
    refetch: async () => { await base.refetch(); await fetchOverrides(); },
    insert: noop as unknown as ReturnType<typeof useDespesasPadrao>['insert'],
    update,
    remove: noop as unknown as ReturnType<typeof useDespesasPadrao>['remove'],
    reorder: noop as unknown as ReturnType<typeof useDespesasPadrao>['reorder'],
    clearOverride,
    hasOverride: (id: string) => !!overrides[id],
  };
}