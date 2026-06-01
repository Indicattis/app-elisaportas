import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTiposCustos, type TipoCusto } from './useTiposCustos';

/**
 * Overrides por mês para `tipos_custos`. Apenas `valor_maximo_mensal` é
 * overrideável. Demais campos são considerados configuração global e
 * updates neles são ignorados.
 */

interface TipoCustoOverrideRow {
  id: string;
  tipo_custo_id: string;
  valor_maximo_mensal: number | null;
}

export function useTiposCustosMes(mes: string | null) {
  const mesStart = mes ? `${mes}-01` : null;
  const base = useTiposCustos();
  const [overrides, setOverrides] = useState<Record<string, TipoCustoOverrideRow>>({});
  const [loadingOv, setLoadingOv] = useState(true);

  const fetchOverrides = useCallback(async () => {
    if (!mesStart) { setOverrides({}); setLoadingOv(false); return; }
    setLoadingOv(true);
    const { data, error } = await supabase
      .from('despesas_mes_tipo_custo_override' as any)
      .select('*')
      .eq('mes_referencia', mesStart);
    if (error) {
      toast.error('Erro ao carregar overrides de tipos: ' + error.message);
      setOverrides({});
    } else {
      const map: Record<string, TipoCustoOverrideRow> = {};
      ((data || []) as any[]).forEach((r) => { map[r.tipo_custo_id] = r as TipoCustoOverrideRow; });
      setOverrides(map);
    }
    setLoadingOv(false);
  }, [mesStart]);

  useEffect(() => { fetchOverrides(); }, [fetchOverrides]);

  const tiposCustos: TipoCusto[] = useMemo(() => {
    return base.tiposCustos.map((t) => {
      const ov = overrides[t.id];
      if (!ov) return t;
      return {
        ...t,
        valor_maximo_mensal: ov.valor_maximo_mensal != null ? Number(ov.valor_maximo_mensal) : t.valor_maximo_mensal,
      };
    });
  }, [base.tiposCustos, overrides]);

  const updateTipoCusto = useCallback(async (id: string, patch: Partial<TipoCusto>) => {
    if (!mesStart) return false;
    if (!('valor_maximo_mensal' in patch)) return true; // outros campos: ignorar
    const valor = Number(patch.valor_maximo_mensal) || 0;

    setOverrides((prev) => ({
      ...prev,
      [id]: { id: prev[id]?.id || '', tipo_custo_id: id, valor_maximo_mensal: valor },
    }));

    const userId = (await supabase.auth.getUser()).data.user?.id || null;
    const { error } = await supabase
      .from('despesas_mes_tipo_custo_override' as any)
      .upsert({
        mes_referencia: mesStart,
        tipo_custo_id: id,
        valor_maximo_mensal: valor,
        created_by: userId,
      } as any, { onConflict: 'mes_referencia,tipo_custo_id' });
    if (error) {
      toast.error('Erro ao salvar override: ' + error.message);
      await fetchOverrides();
      return false;
    }
    return true;
  }, [mesStart, fetchOverrides]);

  const noop = useCallback(async () => false, []);

  const clearOverride = useCallback(async (tipoCustoId: string) => {
    if (!mesStart) return false;
    const { error } = await supabase
      .from('despesas_mes_tipo_custo_override' as any)
      .delete()
      .eq('mes_referencia', mesStart)
      .eq('tipo_custo_id', tipoCustoId);
    if (error) { toast.error('Erro ao restaurar padrão: ' + error.message); return false; }
    await fetchOverrides();
    return true;
  }, [mesStart, fetchOverrides]);

  return {
    tiposCustos,
    loading: base.loading || loadingOv,
    refetch: async () => { await base.refetch(); await fetchOverrides(); },
    saveTipoCusto: noop as unknown as ReturnType<typeof useTiposCustos>['saveTipoCusto'],
    updateTipoCusto,
    deleteTipoCusto: noop as unknown as ReturnType<typeof useTiposCustos>['deleteTipoCusto'],
    contarGastosVinculados: base.contarGastosVinculados,
    realocarEExcluirTipoCusto: noop as unknown as ReturnType<typeof useTiposCustos>['realocarEExcluirTipoCusto'],
    forcarExclusaoTipoCusto: noop as unknown as ReturnType<typeof useTiposCustos>['forcarExclusaoTipoCusto'],
    reorderTiposCustos: noop as unknown as ReturnType<typeof useTiposCustos>['reorderTiposCustos'],
    clearOverride,
    hasOverride: (id: string) => !!overrides[id],
  };
}