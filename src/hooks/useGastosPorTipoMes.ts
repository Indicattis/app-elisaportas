import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface GastoMini {
  id: string;
  descricao: string | null;
  valor: number;
  data: string;
  responsavel_id: string;
}

/**
 * Lista os gastos de um tipo de custo dentro de um mês (YYYY-MM).
 * Hook leve (sem joins) usado pela visão mensal de despesas.
 */
export function useGastosPorTipoMes(tipoCustoId: string | null, mes: string | null, enabled = true) {
  const [gastos, setGastos] = useState<GastoMini[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchGastos = useCallback(async () => {
    if (!enabled || !tipoCustoId || !mes) { setGastos([]); return; }
    setLoading(true);
    const start = `${mes}-01`;
    const [y, m] = mes.split('-').map(Number);
    const end = new Date(y, m, 0).toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('gastos' as any)
      .select('id, descricao, valor, data, responsavel_id')
      .eq('tipo_custo_id', tipoCustoId)
      .gte('data', start)
      .lte('data', end)
      .order('data', { ascending: false });
    if (error) {
      toast.error('Erro ao carregar gastos: ' + error.message);
      setGastos([]);
    } else {
      setGastos(((data || []) as unknown) as GastoMini[]);
    }
    setLoading(false);
  }, [tipoCustoId, mes, enabled]);

  useEffect(() => { fetchGastos(); }, [fetchGastos]);

  const deleteGasto = useCallback(async (id: string) => {
    const { error } = await supabase.from('gastos' as any).delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir gasto: ' + error.message); return false; }
    toast.success('Gasto excluído');
    await fetchGastos();
    return true;
  }, [fetchGastos]);

  return { gastos, loading, refetch: fetchGastos, deleteGasto };
}