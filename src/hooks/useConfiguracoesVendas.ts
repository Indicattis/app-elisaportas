import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useRegrasVendas } from "./useRegrasVendas";

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
  const { regras, limites: limitesRegras, updateRegras } = useRegrasVendas();

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

      // Roteia limites para a tabela canônica `regras_vendas`
      const {
        limite_desconto_avista,
        limite_desconto_presencial,
        limite_adicional_responsavel,
        ...restoUpdates
      } = updates;

      const limitesUpdate: Record<string, number> = {};
      if (limite_desconto_avista !== undefined)
        limitesUpdate.limite_desconto_avista = limite_desconto_avista;
      if (limite_desconto_presencial !== undefined)
        limitesUpdate.limite_desconto_fria = limite_desconto_presencial;
      if (limite_adicional_responsavel !== undefined)
        limitesUpdate.limite_adicional_responsavel = limite_adicional_responsavel;

      if (Object.keys(limitesUpdate).length > 0 && regras?.id) {
        const { error: regErr } = await supabase
          .from("regras_vendas")
          .update({ ...limitesUpdate, updated_at: new Date().toISOString() })
          .eq("id", regras.id);
        if (regErr) {
          if (regErr.code === "42501") {
            throw new Error(
              "Você não tem permissão para atualizar as regras de vendas. Apenas administradores podem fazer isso."
            );
          }
          throw regErr;
        }
      }

      if (Object.keys(restoUpdates).length === 0) {
        return configuracoes;
      }

      const { data, error } = await supabase
        .from("configuracoes_vendas")
        .update({
          ...restoUpdates,
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
      queryClient.invalidateQueries({ queryKey: ["regras-vendas"] });
      queryClient.invalidateQueries({ queryKey: ["configuracoes-vendas-publicas"] });
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

  // Limites calculados — vêm da tabela canônica `regras_vendas`
  const limites = limitesRegras;

  // Sobrescreve os campos de limite no objeto `configuracoes` para refletir a fonte canônica
  const configuracoesMescladas = configuracoes
    ? {
        ...configuracoes,
        limite_desconto_avista: limitesRegras.avista,
        limite_desconto_presencial: limitesRegras.presencial,
        limite_adicional_responsavel: limitesRegras.adicionalResponsavel,
      }
    : configuracoes;

  return {
    configuracoes: configuracoesMescladas,
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
