import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SETOR_LABELS } from '@/utils/setorMapping';

export interface Setor {
  id: string;
  key: string;
  label: string;
  ordem: number;
  ativo: boolean;
}

const SETOR_PALETTE = [
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

export const getSetorPalette = (index: number) => SETOR_PALETTE[index % SETOR_PALETTE.length];

function slugify(label: string): string {
  return label
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40) || 'setor';
}

export function useSetores() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['system-setores'],
    queryFn: async (): Promise<Setor[]> => {
      const { data, error } = await supabase
        .from('system_setores')
        .select('id, key, label, ordem, ativo')
        .eq('ativo', true)
        .order('ordem', { ascending: true });
      if (error) throw error;
      return (data || []) as Setor[];
    },
    staleTime: 60_000,
  });

  const setores = useMemo(() => data || [], [data]);

  // Mantém SETOR_LABELS espelhado com o banco para que lookups legados
  // (`SETOR_LABELS[key]`) resolvam novos setores sem precisar refatorar tudo.
  useEffect(() => {
    setores.forEach(s => { SETOR_LABELS[s.key] = s.label; });
  }, [setores]);

  const labelMap = useMemo(() => {
    const m: Record<string, string> = { ...SETOR_LABELS };
    setores.forEach(s => { m[s.key] = s.label; });
    return m;
  }, [setores]);

  const create = useMutation({
    mutationFn: async (label: string) => {
      const clean = label.trim();
      if (clean.length < 2) throw new Error('Nome muito curto');

      // checa duplicidade (label case-insensitive)
      const dup = setores.find(s => s.label.toLowerCase() === clean.toLowerCase());
      if (dup) throw new Error('Já existe um setor com esse nome');

      // gera key única
      let baseKey = slugify(clean);
      let key = baseKey;
      let n = 2;
      const existing = new Set(setores.map(s => s.key));
      while (existing.has(key)) { key = `${baseKey}_${n++}`; }

      const ordem = (setores[setores.length - 1]?.ordem ?? 0) + 10;
      const { error } = await supabase
        .from('system_setores')
        .insert({ key, label: clean, ordem });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['system-setores'] });
      toast.success('Setor criado');
    },
    onError: (e: Error) => toast.error(e.message || 'Erro ao criar setor'),
  });

  const rename = useMutation({
    mutationFn: async ({ id, label }: { id: string; label: string }) => {
      const clean = label.trim();
      if (clean.length < 2) throw new Error('Nome muito curto');
      const { error } = await supabase
        .from('system_setores')
        .update({ label: clean })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['system-setores'] });
      toast.success('Setor renomeado');
    },
    onError: (e: Error) => toast.error(e.message || 'Erro ao renomear'),
  });

  const remove = useMutation({
    mutationFn: async ({ id, key }: { id: string; key: string }) => {
      // bloqueia se houver cargos vinculados
      const { count, error: countErr } = await supabase
        .from('system_roles')
        .select('id', { count: 'exact', head: true })
        .eq('setor', key);
      if (countErr) throw countErr;
      if ((count ?? 0) > 0) {
        throw new Error(`Não é possível excluir: existem ${count} cargo(s) vinculados a este setor`);
      }
      const { error } = await supabase.from('system_setores').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['system-setores'] });
      toast.success('Setor excluído');
    },
    onError: (e: Error) => toast.error(e.message || 'Erro ao excluir setor'),
  });

  return {
    setores,
    labelMap,
    loading: isLoading,
    createSetor: create.mutateAsync,
    renameSetor: rename.mutateAsync,
    removeSetor: remove.mutateAsync,
    creating: create.isPending,
  };
}