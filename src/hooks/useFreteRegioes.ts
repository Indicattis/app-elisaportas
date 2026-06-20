import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface FreteRegiao {
  id: string;
  transportadora_id: string;
  nome: string;
  estados: string[];
}

export function useFreteRegioes(transportadoraId?: string) {
  const qc = useQueryClient();

  const { data: regioes = [], isLoading } = useQuery({
    queryKey: ['frete_regioes', transportadoraId],
    enabled: !!transportadoraId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('frete_regioes')
        .select('id, transportadora_id, nome, frete_regiao_estados(estado)')
        .eq('transportadora_id', transportadoraId)
        .order('nome');
      if (error) throw error;
      return (data as any[]).map(r => ({
        id: r.id,
        transportadora_id: r.transportadora_id,
        nome: r.nome,
        estados: (r.frete_regiao_estados ?? []).map((e: any) => e.estado).sort(),
      })) as FreteRegiao[];
    },
  });

  const saveRegiao = useMutation({
    mutationFn: async (input: { id?: string; nome: string; estados: string[] }) => {
      if (!transportadoraId) throw new Error('Transportadora não selecionada');
      let regiaoId = input.id;
      if (regiaoId) {
        const { error } = await (supabase as any)
          .from('frete_regioes').update({ nome: input.nome }).eq('id', regiaoId);
        if (error) throw error;
      } else {
        const { data, error } = await (supabase as any)
          .from('frete_regioes').insert({ transportadora_id: transportadoraId, nome: input.nome })
          .select('id').single();
        if (error) throw error;
        regiaoId = data.id;
      }
      // Reset estados
      await (supabase as any).from('frete_regiao_estados').delete().eq('regiao_id', regiaoId);
      if (input.estados.length) {
        const rows = input.estados.map(e => ({ regiao_id: regiaoId, estado: e }));
        const { error: e2 } = await (supabase as any).from('frete_regiao_estados').insert(rows);
        if (e2) throw e2;
      }
      return regiaoId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['frete_regioes', transportadoraId] });
      toast.success('Região salva!');
    },
    onError: (e: Error) => toast.error(e.message || 'Erro ao salvar região'),
  });

  const deleteRegiao = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('frete_regioes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['frete_regioes', transportadoraId] });
      toast.success('Região excluída!');
    },
    onError: () => toast.error('Erro ao excluir'),
  });

  return { regioes, isLoading, saveRegiao, deleteRegiao };
}