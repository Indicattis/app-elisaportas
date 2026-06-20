import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useLargurasKits() {
  return useQuery({
    queryKey: ['kits-larguras-distinct'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tabela_precos_portas')
        .select('largura')
        .eq('ativo', true);
      if (error) throw error;
      const unique = Array.from(new Set((data ?? []).map((r: any) => Number(r.largura))));
      return unique.filter(n => !isNaN(n)).sort((a, b) => a - b);
    },
  });
}

export function useFreteRegiaoLarguras(regiaoId?: string) {
  const qc = useQueryClient();

  const { data: precos = [], isLoading } = useQuery({
    queryKey: ['frete_regiao_larguras', regiaoId],
    enabled: !!regiaoId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('frete_regiao_larguras').select('*').eq('regiao_id', regiaoId);
      if (error) throw error;
      return data as { id: string; regiao_id: string; largura: number; valor: number }[];
    },
  });

  const upsertPreco = useMutation({
    mutationFn: async (input: { largura: number; valor: number }) => {
      if (!regiaoId) throw new Error('Sem região');
      const { error } = await (supabase as any)
        .from('frete_regiao_larguras')
        .upsert({ regiao_id: regiaoId, largura: input.largura, valor: input.valor }, { onConflict: 'regiao_id,largura' });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['frete_regiao_larguras', regiaoId] });
    },
    onError: () => toast.error('Erro ao salvar preço'),
  });

  return { precos, isLoading, upsertPreco };
}