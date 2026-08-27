import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type ProcessoModelo = 'trabalhista' | 'judicial';
export type ProcessoStatus = 'em_andamento' | 'encerrado';

export interface ProcessoJustica {
  id: string;
  modelo: ProcessoModelo;
  nome: string;
  acordo_sugerido_valor: number | null;
  acordo_sugerido_texto: string | null;
  acordo_proposto_valor: number | null;
  sem_acordo: boolean;
  valor_final: number | null;
  status: ProcessoStatus;
  ordem: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  atualizacoes_count?: number;
}

export interface ProcessoAtualizacao {
  id: string;
  processo_id: string;
  comentario: string;
  autor_id: string | null;
  autor_nome: string | null;
  created_at: string;
}

export type ProcessoInput = Omit<
  ProcessoJustica,
  'id' | 'created_at' | 'updated_at' | 'created_by' | 'atualizacoes_count'
>;

export function useProcessosJustica() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['processos-justica'],
    queryFn: async (): Promise<ProcessoJustica[]> => {
      const { data, error } = await supabase
        .from('processos_justica')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;

      const ids = (data || []).map((p: any) => p.id);
      const counts = new Map<string, number>();
      if (ids.length > 0) {
        const { data: ats } = await supabase
          .from('processos_justica_atualizacoes')
          .select('processo_id')
          .in('processo_id', ids);
        (ats || []).forEach((a: any) => {
          counts.set(a.processo_id, (counts.get(a.processo_id) || 0) + 1);
        });
      }

      return (data || []).map((p: any) => ({
        ...p,
        atualizacoes_count: counts.get(p.id) || 0,
      })) as ProcessoJustica[];
    },
    staleTime: 30_000,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['processos-justica'] });
  };

  const criar = useMutation({
    mutationFn: async (input: ProcessoInput) => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('processos_justica')
        .insert({ ...input, created_by: userData?.user?.id ?? null });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Processo cadastrado');
      invalidate();
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao cadastrar processo'),
  });

  const atualizar = useMutation({
    mutationFn: async ({ id, ...input }: Partial<ProcessoInput> & { id: string }) => {
      const { error } = await supabase
        .from('processos_justica')
        .update(input)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Processo atualizado');
      invalidate();
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao atualizar processo'),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('processos_justica').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Processo excluído');
      invalidate();
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao excluir processo'),
  });

  return {
    processos: query.data || [],
    isLoading: query.isLoading,
    criar,
    atualizar,
    excluir,
  };
}

export function useProcessoAtualizacoes(processoId?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['processos-justica-atualizacoes', processoId],
    enabled: !!processoId,
    queryFn: async (): Promise<ProcessoAtualizacao[]> => {
      const { data, error } = await supabase
        .from('processos_justica_atualizacoes')
        .select('*')
        .eq('processo_id', processoId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as ProcessoAtualizacao[];
    },
  });

  const adicionar = useMutation({
    mutationFn: async ({ comentario, autorNome }: { comentario: string; autorNome?: string | null }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from('processos_justica_atualizacoes').insert({
        processo_id: processoId!,
        comentario,
        autor_id: userData?.user?.id ?? null,
        autor_nome: autorNome ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Atualização adicionada');
      queryClient.invalidateQueries({ queryKey: ['processos-justica-atualizacoes', processoId] });
      queryClient.invalidateQueries({ queryKey: ['processos-justica'] });
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao adicionar atualização'),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('processos_justica_atualizacoes')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processos-justica-atualizacoes', processoId] });
      queryClient.invalidateQueries({ queryKey: ['processos-justica'] });
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao excluir atualização'),
  });

  return {
    atualizacoes: query.data || [],
    isLoading: query.isLoading,
    adicionar,
    excluir,
  };
}
