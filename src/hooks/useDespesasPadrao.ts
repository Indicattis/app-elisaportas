import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type DespesaPadraoTipo = 'folha' | 'fixa' | 'variavel' | 'imposto';

export interface DespesaPadrao {
  id: string;
  tipo: DespesaPadraoTipo;
  nome: string;
  valor: number;
  salario: number;
  aux_combustivel: number;
  insalubridade_pct: number;
  fgts_pct: number;
  previsao_13_valor: number;
  ordem: number;
  em_folha: boolean;
  setor: string | null;
  ferias_valor: number | null;
}

export function useDespesasPadrao() {
  const [items, setItems] = useState<DespesaPadrao[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('despesas_padrao' as any)
      .select('*')
      .order('tipo')
      .order('ordem')
      .order('nome');
    if (error) {
      toast.error('Erro ao carregar padrões: ' + error.message);
    } else {
      setItems(((data || []) as any[]).map((x) => ({
        id: x.id,
        tipo: x.tipo,
        nome: x.nome,
        valor: Number(x.valor) || 0,
        salario: Number(x.salario) || 0,
        aux_combustivel: Number(x.aux_combustivel) || 0,
        insalubridade_pct: Number(x.insalubridade_pct) || 0,
        fgts_pct: Number(x.fgts_pct) || 0,
        previsao_13_valor: Number(x.previsao_13_valor) || 0,
        ordem: Number(x.ordem) || 0,
        em_folha: x.em_folha ?? true,
        setor: x.setor ?? null,
        ferias_valor: x.ferias_valor == null ? null : Number(x.ferias_valor),
      })));
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const insert = async (payload: Partial<DespesaPadrao> & { tipo: DespesaPadraoTipo; nome: string }) => {
    const userId = (await supabase.auth.getUser()).data.user?.id || null;
    const { error } = await supabase.from('despesas_padrao' as any).insert({
      tipo: payload.tipo,
      nome: payload.nome,
      valor: payload.valor ?? 0,
      salario: payload.salario ?? 0,
      aux_combustivel: payload.aux_combustivel ?? 0,
      insalubridade_pct: payload.insalubridade_pct ?? 0,
      fgts_pct: payload.fgts_pct ?? 8,
      previsao_13_valor: payload.previsao_13_valor ?? 0,
      ordem: payload.ordem ?? 0,
      em_folha: payload.em_folha ?? true,
      setor: payload.setor ?? null,
      ferias_valor: payload.ferias_valor ?? null,
      created_by: userId,
    } as any);
    if (error) { toast.error('Erro ao salvar: ' + error.message); return false; }
    await fetchAll();
    return true;
  };

  const update = async (id: string, patch: Partial<DespesaPadrao>) => {
    const { error } = await supabase.from('despesas_padrao' as any).update(patch as any).eq('id', id);
    if (error) { toast.error('Erro ao atualizar: ' + error.message); return false; }
    await fetchAll();
    return true;
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('despesas_padrao' as any).delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir: ' + error.message); return false; }
    await fetchAll();
    return true;
  };

  return { items, loading, refetch: fetchAll, insert, update, remove };
}