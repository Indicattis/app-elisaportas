import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface Fornecedor {
  id: string;
  codigo: number;
  tipo: "fisica" | "juridica";
  nome: string;
  responsavel?: string;
  cnpj?: string;
  estado?: string;
  cidade?: string;
  bairro?: string;
  cep?: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface FornecedorFormData {
  tipo: "fisica" | "juridica";
  nome: string;
  responsavel?: string;
  cnpj?: string;
  estado?: string;
  cidade?: string;
  bairro?: string;
  cep?: string;
}

export const useFornecedores = () => {
  const queryClient = useQueryClient();

  const { data: fornecedores = [], isLoading } = useQuery({
    queryKey: ["fornecedores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fornecedores")
        .select("*")
        .eq("ativo", true)
        .order("nome");

      if (error) throw error;
      return data as Fornecedor[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (fornecedor: FornecedorFormData) => {
      const { data, error } = await supabase
        .from("fornecedores")
        .insert([fornecedor])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fornecedores"] });
      toast({
        title: "Fornecedor criado",
        description: "Fornecedor cadastrado com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar fornecedor",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Fornecedor> & { id: string }) => {
      const { data: updated, error } = await supabase
        .from("fornecedores")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fornecedores"] });
      toast({
        title: "Fornecedor atualizado",
        description: "Fornecedor atualizado com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar fornecedor",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("fornecedores")
        .update({ ativo: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fornecedores"] });
      toast({
        title: "Fornecedor excluído",
        description: "Fornecedor excluído com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir fornecedor",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    fornecedores,
    isLoading,
    createFornecedor: createMutation.mutateAsync,
    updateFornecedor: updateMutation.mutateAsync,
    deleteFornecedor: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
