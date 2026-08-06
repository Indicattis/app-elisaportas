import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type CategoriaDespesa =
  | 'fixa' | 'variavel' | 'imposto' | 'projetada' | 'investimento'
  | 'fornecedor' | 'financiamento' | 'frete' | 'autorizado' | 'salario' | 'folha';

/**
 * Carrega o mapa { categoria -> debita_dre } a partir de
 * `despesas_categoria_dre_config`. Default = true quando ausente.
 */
export const useCategoriaDreConfig = () => {
  const [config, setConfig] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('despesas_categoria_dre_config' as any)
      .select('categoria, debita_dre');
    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }
    const map: Record<string, boolean> = {};
    (data as any[] | null)?.forEach((row) => {
      map[row.categoria] = !!row.debita_dre;
    });
    setConfig(map);
    setLoading(false);
  }, []);

  const toggle = useCallback(async (categoria: CategoriaDespesa) => {
    const atual = config[categoria] ?? true;
    const novo = !atual;
    // otimista
    setConfig((prev) => ({ ...prev, [categoria]: novo }));
    const { error } = await supabase
      .from('despesas_categoria_dre_config' as any)
      .upsert(
        { categoria, debita_dre: novo, updated_at: new Date().toISOString() } as any,
        { onConflict: 'categoria' },
      );
    if (error) {
      // rollback
      setConfig((prev) => ({ ...prev, [categoria]: atual }));
      toast.error('Erro ao atualizar configuração do DRE');
      console.error(error);
      return false;
    }
    toast.success(novo ? 'Categoria passa a debitar do lucro no DRE' : 'Categoria não debitará mais do lucro no DRE');
    return true;
  }, [config]);

  const debita = useCallback(
    (categoria: CategoriaDespesa) => config[categoria] ?? true,
    [config],
  );

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  return { config, loading, toggle, debita, refetch: fetchConfig };
};