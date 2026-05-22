import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface FreteCidade {
  id: string;
  estado: string;
  cidade: string;
  valor_frete: number;
  observacoes: string | null;
  ativo: boolean;
  quilometragem: number | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface FreteCidadeInput {
  estado: string;
  cidade: string;
  valor_frete: number;
  observacoes?: string | null;
  ativo?: boolean;
  quilometragem?: number | null;
}

export function useFretesCidades() {
  const queryClient = useQueryClient();

  const { data: fretes, isLoading } = useQuery({
    queryKey: ['frete_cidades'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('frete_cidades')
        .select('*')
        .order('estado', { ascending: true })
        .order('cidade', { ascending: true })
        .range(0, 9999);
      
      if (error) throw error;
      return data as FreteCidade[];
    }
  });

  const createFrete = useMutation({
    mutationFn: async (input: FreteCidadeInput) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('frete_cidades')
        .insert({
          ...input,
          created_by: userData.user?.id
        })
        .select()
        .single();
      
      if (error) {
        if (error.code === '23505') {
          throw new Error('Já existe um frete cadastrado para esta cidade/estado');
        }
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['frete_cidades'] });
      toast.success('Frete cadastrado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao cadastrar frete');
    }
  });

  const updateFrete = useMutation({
    mutationFn: async ({ id, ...input }: FreteCidadeInput & { id: string }) => {
      const { data, error } = await supabase
        .from('frete_cidades')
        .update(input)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        if (error.code === '23505') {
          throw new Error('Já existe um frete cadastrado para esta cidade/estado');
        }
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['frete_cidades'] });
      toast.success('Frete atualizado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao atualizar frete');
    }
  });

  const deleteFrete = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('frete_cidades')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['frete_cidades'] });
      toast.success('Frete excluído com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao excluir frete');
    }
  });

  const toggleAtivo = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase
        .from('frete_cidades')
        .update({ ativo })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['frete_cidades'] });
      toast.success('Status atualizado!');
    },
    onError: () => {
      toast.error('Erro ao atualizar status');
    }
  });

  return {
    fretes,
    isLoading,
    createFrete,
    updateFrete,
    deleteFrete,
    toggleAtivo
  };
}
