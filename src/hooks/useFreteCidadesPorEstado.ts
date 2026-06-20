import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FreteCidadeRef { id: string; nome: string; estado: string; }

export function useFreteCidadesPorEstado(estado?: string) {
  return useQuery({
    queryKey: ['frete_cidades_uf', estado],
    enabled: !!estado,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('frete_cidades')
        .select('id, cidade, estado')
        .eq('estado', estado as string)
        .eq('ativo', true)
        .order('cidade');
      if (error) throw error;
      return (data ?? []).map(c => ({ id: c.id, nome: c.cidade, estado: c.estado })) as FreteCidadeRef[];
    },
  });
}
