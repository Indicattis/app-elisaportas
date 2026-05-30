import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CategoriaDespesa {
  id: string;
  nome: string;
  ordem: number;
  ativo: boolean;
}

const CATEGORIA_PALETTE = [
  { color: 'bg-emerald-500/15 border-emerald-400/40 text-emerald-200', dot: 'bg-emerald-400' },
  { color: 'bg-pink-500/15 border-pink-400/40 text-pink-200',           dot: 'bg-pink-400' },
  { color: 'bg-amber-500/15 border-amber-400/40 text-amber-200',        dot: 'bg-amber-400' },
  { color: 'bg-blue-500/15 border-blue-400/40 text-blue-200',           dot: 'bg-blue-400' },
  { color: 'bg-violet-500/15 border-violet-400/40 text-violet-200',     dot: 'bg-violet-400' },
  { color: 'bg-cyan-500/15 border-cyan-400/40 text-cyan-200',           dot: 'bg-cyan-400' },
  { color: 'bg-rose-500/15 border-rose-400/40 text-rose-200',           dot: 'bg-rose-400' },
  { color: 'bg-teal-500/15 border-teal-400/40 text-teal-200',           dot: 'bg-teal-400' },
  { color: 'bg-orange-500/15 border-orange-400/40 text-orange-200',     dot: 'bg-orange-400' },
  { color: 'bg-sky-500/15 border-sky-400/40 text-sky-200',              dot: 'bg-sky-400' },
];

export const getCategoriaPalette = (index: number) => CATEGORIA_PALETTE[index % CATEGORIA_PALETTE.length];

export function useDespesasCategorias() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['custos-categorias'],
    queryFn: async (): Promise<CategoriaDespesa[]> => {
      const { data, error } = await supabase
        .from('custos_categorias' as any)
        .select('id, nome, ordem, ativo')
        .eq('ativo', true)
        .order('ordem', { ascending: true });
      if (error) throw error;
      return ((data || []) as unknown as CategoriaDespesa[]);
    },
    staleTime: 60_000,
  });

  const categorias = useMemo(() => data || [], [data]);

  const create = useMutation({
    mutationFn: async (nome: string) => {
      const clean = nome.trim();
      if (clean.length < 2) throw new Error('Nome muito curto');
      const dup = categorias.find(c => c.nome.toLowerCase() === clean.toLowerCase());
      if (dup) throw new Error('Já existe uma categoria com esse nome');
      const ordem = (categorias[categorias.length - 1]?.ordem ?? 0) + 10;
      const { error } = await supabase
        .from('custos_categorias' as any)
        .insert({ nome: clean, ordem, cor: '#3b82f6' } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['custos-categorias'] });
      toast.success('Categoria criada');
    },
    onError: (e: Error) => toast.error(e.message || 'Erro ao criar categoria'),
  });

  const rename = useMutation({
    mutationFn: async ({ id, nome }: { id: string; nome: string }) => {
      const clean = nome.trim();
      if (clean.length < 2) throw new Error('Nome muito curto');
      const { error } = await supabase
        .from('custos_categorias' as any)
        .update({ nome: clean } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['custos-categorias'] });
      toast.success('Categoria renomeada');
    },
    onError: (e: Error) => toast.error(e.message || 'Erro ao renomear'),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      // bloqueia se houver tipos de custo vinculados
      const { count, error: countErr } = await supabase
        .from('tipos_custos' as any)
        .select('id', { count: 'exact', head: true })
        .eq('categoria_id', id);
      if (countErr) throw countErr;
      if ((count ?? 0) > 0) {
        throw new Error(`Não é possível excluir: existem ${count} despesa(s) vinculadas a esta categoria`);
      }
      const { error } = await supabase
        .from('custos_categorias' as any)
        .update({ ativo: false } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['custos-categorias'] });
      toast.success('Categoria excluída');
    },
    onError: (e: Error) => toast.error(e.message || 'Erro ao excluir categoria'),
  });

  const reorder = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(
        ids.map((id, idx) =>
          supabase.from('custos_categorias' as any).update({ ordem: (idx + 1) * 10 } as any).eq('id', id)
        )
      );
    },
    onMutate: async (ids: string[]) => {
      await qc.cancelQueries({ queryKey: ['custos-categorias'] });
      const prev = qc.getQueryData<CategoriaDespesa[]>(['custos-categorias']);
      if (prev) {
        const map = new Map(prev.map(c => [c.id, c]));
        const next = ids.map((id, idx) => ({ ...(map.get(id) as CategoriaDespesa), ordem: (idx + 1) * 10 }));
        qc.setQueryData(['custos-categorias'], next);
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['custos-categorias'], ctx.prev);
      toast.error('Erro ao reordenar categorias');
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['custos-categorias'] }),
  });

  return {
    categorias,
    loading: isLoading,
    createCategoria: create.mutateAsync,
    renameCategoria: rename.mutateAsync,
    removeCategoria: remove.mutateAsync,
    reorderCategorias: reorder.mutate,
    creating: create.isPending,
  };
}