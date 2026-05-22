import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ItemTabelaPreco {
  id: string;
  descricao: string;
  largura: number;
  altura: number;
  valor_porta: number;
  valor_instalacao: number;
  valor_pintura: number;
  lucro: number;
  ativo: boolean;
  ordem?: number | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface ItemTabelaPrecoInput {
  descricao: string;
  largura: number;
  altura: number;
  valor_porta: number;
  valor_instalacao: number;
  valor_pintura: number;
  lucro: number;
}

export function useTabelaPrecos(searchTerm: string = '') {
  const queryClient = useQueryClient();

  const { data: itens = [], isLoading } = useQuery({
    queryKey: ['tabela-precos', searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('tabela_precos_portas')
        .select('*')
        .eq('ativo', true)
        .order('ordem', { ascending: true, nullsFirst: false })
        .order('largura', { ascending: true })
        .order('altura', { ascending: true });

      if (searchTerm) {
        query = query.or(`descricao.ilike.%${searchTerm}%,largura::text.ilike.%${searchTerm}%,altura::text.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar tabela de preços:', error);
        throw error;
      }

      return data as ItemTabelaPreco[];
    }
  });

  const adicionarItem = useMutation({
    mutationFn: async (novoItem: ItemTabelaPrecoInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('tabela_precos_portas')
        .insert([{ ...novoItem, created_by: user?.id }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tabela-precos'] });
      toast.success('Item adicionado com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao adicionar item:', error);
      toast.error('Erro ao adicionar item');
    }
  });

  const editarItem = useMutation({
    mutationFn: async ({ id, dados }: { id: string; dados: Partial<ItemTabelaPrecoInput> }) => {
      const { data, error } = await supabase
        .from('tabela_precos_portas')
        .update(dados)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tabela-precos'] });
      toast.success('Item atualizado com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao atualizar item:', error);
      toast.error('Erro ao atualizar item');
    }
  });

  const inativarItem = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('tabela_precos_portas')
        .update({ ativo: false })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tabela-precos'] });
      toast.success('Item inativado com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao inativar item:', error);
      toast.error('Erro ao inativar item');
    }
  });

  const reordenarItens = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(
        ids.map((id, index) =>
          supabase.from('tabela_precos_portas').update({ ordem: index + 1 }).eq('id', id)
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tabela-precos'] });
    },
    onError: (error) => {
      console.error('Erro ao reordenar itens:', error);
      toast.error('Erro ao reordenar itens');
    }
  });

  return {
    itens,
    isLoading,
    adicionarItem: adicionarItem.mutateAsync,
    editarItem: editarItem.mutateAsync,
    inativarItem: inativarItem.mutateAsync,
    reordenarItens: reordenarItens.mutateAsync
  };
}
