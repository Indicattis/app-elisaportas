import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ConfiguracoesVendas {
  id: string;
  senha_responsavel: string;
  senha_master: string;
  responsavel_senha_responsavel_id: string | null;
  responsavel_senha_master_id: string | null;
  limite_desconto_avista: number;
  limite_desconto_presencial: number;
  limite_adicional_responsavel: number;
  created_at: string;
  updated_at: string;
}

export interface ConfiguracoesVendasUpdate {
  senha_responsavel?: string;
  senha_master?: string;
  responsavel_senha_responsavel_id?: string | null;
  responsavel_senha_master_id?: string | null;
  limite_desconto_avista?: number;
  limite_desconto_presencial?: number;
  limite_adicional_responsavel?: number;
}

export function useConfiguracoesVendas() {
  const queryClient = useQueryClient();

  const { data: configuracoes, isLoading, error, refetch } = useQuery({
    queryKey: ["configuracoes-vendas"],
    staleTime: 0,
    refetchOnMount: 'always',
    queryFn: async () => {
      const { data, error } = await supabase
        .from("configuracoes_vendas")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Erro ao buscar configurações de vendas:", error);
        throw error;
      }

      return data as ConfiguracoesVendas | null;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: ConfiguracoesVendasUpdate) => {
      // Validar que as senhas são diferentes
      const senhaResponsavel = updates.senha_responsavel ?? configuracoes?.senha_responsavel;
      const senhaMaster = updates.senha_master ?? configuracoes?.senha_master;
      
      if (senhaResponsavel && senhaMaster && senhaResponsavel === senhaMaster) {
        throw new Error("As senhas do responsável e master devem ser diferentes");
      }

      if (!configuracoes?.id) {
        throw new Error("Configurações não encontradas");
      }

      const { data, error } = await supabase
        .from("configuracoes_vendas")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", configuracoes.id)
        .select();

      if (error) {
        console.error("Erro ao atualizar configurações:", error);
        if (error.code === '42501') {
          throw new Error("Você não tem permissão para atualizar as configurações. Apenas administradores podem fazer isso.");
        }
        throw error;
      }

      if (!data || data.length === 0) {
        throw new Error("Você não tem permissão para atualizar as configurações. Apenas administradores podem fazer isso.");
      }

      return data[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["configuracoes-vendas"] });
      toast.success("Configurações atualizadas com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao atualizar configurações");
    },
  });

  // Verificar senha via RPC (não expõe senha ao cliente)
  const verificarSenhaResponsavel = async (senha: string): Promise<boolean> => {
    const { data, error } = await supabase.rpc("verificar_senha_vendas", {
      p_senha: senha,
      p_tipo: "responsavel",
    });
    if (error) {
      console.error("Erro ao verificar senha responsavel:", error);
      return false;
    }
    return data === true;
  };

  const verificarSenhaMaster = async (senha: string): Promise<boolean> => {
    const { data, error } = await supabase.rpc("verificar_senha_vendas", {
      p_senha: senha,
      p_tipo: "master",
    });
    if (error) {
      console.error("Erro ao verificar senha master:", error);
      return false;
    }
    return data === true;
  };

  // Limites calculados
  const limites = {
    avista: configuracoes?.limite_desconto_avista ?? 3,
    presencial: configuracoes?.limite_desconto_presencial ?? 5,
    adicionalResponsavel: configuracoes?.limite_adicional_responsavel ?? 5,
    totalSemSenha: (configuracoes?.limite_desconto_avista ?? 3) + (configuracoes?.limite_desconto_presencial ?? 5),
    totalComResponsavel: (configuracoes?.limite_desconto_avista ?? 3) + (configuracoes?.limite_desconto_presencial ?? 5) + (configuracoes?.limite_adicional_responsavel ?? 5),
  };

  return {
    configuracoes,
    isLoading,
    error,
    limites,
    updateConfiguracoes: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
    verificarSenhaResponsavel,
    verificarSenhaMaster,
    refetch,
  };
}
