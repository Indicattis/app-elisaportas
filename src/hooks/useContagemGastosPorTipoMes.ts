import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useContagemGastosPorTipoMes(mes: string | null) {
  const [contagem, setContagem] = useState<Record<string, number>>({});
  const [totais, setTotais] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  const fetchContagem = useCallback(async () => {
    if (!mes) { setContagem({}); return; }
    setLoading(true);
    const start = `${mes}-01`;
    const [y, m] = mes.split('-').map(Number);
    const end = new Date(y, m, 0).toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('gastos' as any)
      .select('tipo_custo_id, valor')
      .gte('data', start)
      .lte('data', end);
    if (error) {
      setContagem({});
      setTotais({});
    } else {
      const map: Record<string, number> = {};
      const sum: Record<string, number> = {};
      ((data || []) as any[]).forEach((g) => {
        const tid = g.tipo_custo_id;
        if (tid) {
          map[tid] = (map[tid] || 0) + 1;
          sum[tid] = (sum[tid] || 0) + Number(g.valor || 0);
        }
      });
      setContagem(map);
      setTotais(sum);
    }
    setLoading(false);
  }, [mes]);

  useEffect(() => { fetchContagem(); }, [fetchContagem]);

  return { contagem, totais, loading, refetch: fetchContagem };
}
