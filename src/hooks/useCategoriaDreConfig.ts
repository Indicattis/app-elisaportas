import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type CategoriaDespesa = string;

export interface TipoDespesa {
  id: string;
  chave: string;
  nome: string;
  debita_dre: boolean;
  ordem: number;
  sistema: boolean;
}

const FALLBACK: TipoDespesa[] = [
  { chave: 'folha', nome: 'Folha Salarial', sistema: true },
  { chave: 'projetada', nome: 'Despesa projetada', sistema: false },
  { chave: 'fixa', nome: 'Fixas', sistema: false },
  { chave: 'variavel', nome: 'Variáveis', sistema: false },
  { chave: 'autorizado', nome: 'Autorizados', sistema: false },
  { chave: 'imposto', nome: 'Impostos', sistema: false },
  { chave: 'investimento', nome: 'Investimentos', sistema: false },
  { chave: 'fornecedor', nome: 'Fornecedores', sistema: false },
  { chave: 'financiamento', nome: 'Financiamentos', sistema: false },
  { chave: 'frete', nome: 'Fretes e Logística', sistema: false },
  { chave: 'salario', nome: 'Salários', sistema: false },
].map((t, i) => ({ id: t.chave, debita_dre: true, ordem: i + 1, ...t }));

const slugify = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40);

/**
 * Carrega os tipos (seções) de despesa de `despesas_tipos` e o mapa
 * { categoria -> debita_dre }. Default = true quando ausente.
 */
export const useCategoriaDreConfig = () => {
  const [tipos, setTipos] = useState<TipoDespesa[]>(FALLBACK);
  const [config, setConfig] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    const [{ data: tiposData }, { data, error }] = await Promise.all([
      supabase.from('despesas_tipos' as any).select('id, chave, nome, debita_dre, ordem, sistema').eq('ativo', true).order('ordem'),
      supabase.from('despesas_categoria_dre_config' as any).select('categoria, debita_dre'),
    ]);

    const lista = ((tiposData as any[] | null) || []) as TipoDespesa[];
    setTipos(lista.length ? lista : FALLBACK);

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }
    const map: Record<string, boolean> = {};
    (lista.length ? lista : FALLBACK).forEach((t) => { map[t.chave] = !!t.debita_dre; });
    (data as any[] | null)?.forEach((row) => { map[row.categoria] = !!row.debita_dre; });
    setConfig(map);
    setLoading(false);
  }, []);

  const toggle = useCallback(async (categoria: CategoriaDespesa) => {
    const atual = config[categoria] ?? true;
    const novo = !atual;
    setConfig((prev) => ({ ...prev, [categoria]: novo }));
    const [{ error }] = await Promise.all([
      supabase.from('despesas_categoria_dre_config' as any).upsert(
        { categoria, debita_dre: novo, updated_at: new Date().toISOString() } as any,
        { onConflict: 'categoria' },
      ),
      supabase.from('despesas_tipos' as any).update({ debita_dre: novo } as any).eq('chave', categoria),
    ]);
    if (error) {
      setConfig((prev) => ({ ...prev, [categoria]: atual }));
      toast.error('Erro ao atualizar configuração do DRE');
      console.error(error);
      return false;
    }
    setTipos((prev) => prev.map((t) => (t.chave === categoria ? { ...t, debita_dre: novo } : t)));
    toast.success(novo ? 'Categoria passa a debitar do lucro no DRE' : 'Categoria não debitará mais do lucro no DRE');
    return true;
  }, [config]);

  const criarTipo = useCallback(async (nome: string, debitaDre = true) => {
    const chaveBase = slugify(nome);
    if (!chaveBase) { toast.error('Informe um nome válido'); return false; }
    let chave = chaveBase;
    let i = 2;
    while (tipos.some((t) => t.chave === chave)) { chave = `${chaveBase}_${i++}`; }
    const ordem = (tipos.reduce((m, t) => Math.max(m, t.ordem || 0), 0) || 0) + 1;
    const { error } = await supabase.from('despesas_tipos' as any).insert({ chave, nome, debita_dre: debitaDre, ordem } as any);
    if (error) { toast.error('Erro ao criar tipo de despesa'); console.error(error); return false; }
    await supabase.from('despesas_categoria_dre_config' as any).upsert(
      { categoria: chave, debita_dre: debitaDre, updated_at: new Date().toISOString() } as any,
      { onConflict: 'categoria' },
    );
    toast.success('Tipo de despesa criado');
    await fetchConfig();
    return true;
  }, [tipos, fetchConfig]);

  const renomearTipo = useCallback(async (chave: string, nome: string) => {
    if (!nome.trim()) return false;
    const { error } = await supabase.from('despesas_tipos' as any).update({ nome: nome.trim() } as any).eq('chave', chave);
    if (error) { toast.error('Erro ao renomear tipo'); console.error(error); return false; }
    setTipos((prev) => prev.map((t) => (t.chave === chave ? { ...t, nome: nome.trim() } : t)));
    return true;
  }, []);

  const excluirTipo = useCallback(async (origem: string, destino?: string | null) => {
    const { error } = await supabase.rpc('excluir_tipo_despesa' as any, { _origem: origem, _destino: destino || null } as any);
    if (error) { toast.error(error.message || 'Erro ao excluir tipo de despesa'); console.error(error); return false; }
    toast.success('Tipo de despesa excluído');
    await fetchConfig();
    return true;
  }, [fetchConfig]);

  const debita = useCallback(
    (categoria: CategoriaDespesa) => config[categoria] ?? true,
    [config],
  );

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  return { config, tipos, loading, toggle, debita, criarTipo, renomearTipo, excluirTipo, refetch: fetchConfig };
};
