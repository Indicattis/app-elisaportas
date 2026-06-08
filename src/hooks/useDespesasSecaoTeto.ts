import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Teto (limite) de despesa por seção. `mesReferencia` null => padrão global.
 * Quando estamos em modo mensal e não existe override do mês, faz fallback no padrão.
 */
export function useDespesasSecaoTeto(mesReferencia: string | null) {
  const mesStart = mesReferencia ? `${mesReferencia}-01` : null;
  const [tetos, setTetos] = useState<Record<string, number>>({});
  const [tetosMes, setTetosMes] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const reqPadrao = supabase
      .from('despesas_secao_teto' as any)
      .select('secao_key, valor_teto')
      .is('mes_referencia', null);
    const reqMes = mesStart
      ? supabase.from('despesas_secao_teto' as any).select('secao_key, valor_teto').eq('mes_referencia', mesStart)
      : Promise.resolve({ data: [] as any[], error: null });
    const [{ data: padrao, error: ePadrao }, { data: mes, error: eMes }] = await Promise.all([reqPadrao, reqMes as any]);
    if (ePadrao) toast.error('Erro ao carregar tetos: ' + ePadrao.message);
    if (eMes) toast.error('Erro ao carregar tetos do mês: ' + eMes.message);
    const mapPadrao: Record<string, number> = {};
    ((padrao || []) as any[]).forEach((r) => { mapPadrao[r.secao_key] = Number(r.valor_teto) || 0; });
    const mapMes: Record<string, number> = {};
    ((mes || []) as any[]).forEach((r) => { mapMes[r.secao_key] = Number(r.valor_teto) || 0; });
    setTetos(mapPadrao);
    setTetosMes(mapMes);
    setLoading(false);
  }, [mesStart]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const getTeto = useCallback((secaoKey: string): number => {
    if (mesStart && tetosMes[secaoKey] != null) return tetosMes[secaoKey];
    return tetos[secaoKey] ?? 0;
  }, [tetos, tetosMes, mesStart]);

  const setTeto = useCallback(async (secaoKey: string, valor: number) => {
    const valorNum = Number(valor) || 0;
    if (mesStart) {
      setTetosMes((prev) => ({ ...prev, [secaoKey]: valorNum }));
    } else {
      setTetos((prev) => ({ ...prev, [secaoKey]: valorNum }));
    }
    const userId = (await supabase.auth.getUser()).data.user?.id || null;
    const payload: any = {
      secao_key: secaoKey,
      mes_referencia: mesStart,
      valor_teto: valorNum,
      created_by: userId,
    };
    // Upsert manual: tenta update, se não houver linha, insere
    const filterBase = supabase.from('despesas_secao_teto' as any).update({ valor_teto: valorNum } as any).eq('secao_key', secaoKey);
    const { data: updated, error: errUpd } = mesStart
      ? await filterBase.eq('mes_referencia', mesStart).select('id')
      : await filterBase.is('mes_referencia', null).select('id');
    if (errUpd) { toast.error('Erro ao salvar teto: ' + errUpd.message); await fetchAll(); return false; }
    if (!updated || updated.length === 0) {
      const { error: errIns } = await supabase.from('despesas_secao_teto' as any).insert(payload as any);
      if (errIns) { toast.error('Erro ao salvar teto: ' + errIns.message); await fetchAll(); return false; }
    }
    return true;
  }, [mesStart, fetchAll]);

  return { getTeto, setTeto, loading, refetch: fetchAll };
}