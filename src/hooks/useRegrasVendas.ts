import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface RegrasVendas {
  id: string;

  limite_desconto_avista: number;
  limite_desconto_fria: number;
  limite_adicional_responsavel: number;
  limite_desconto_master_lucro: number;

  acrescimo_permite_com_desconto: boolean;
  acrescimo_descricao: string;

  boleto_intervalos_dias: number[];

  cartao_parcelas_min: number;
  cartao_parcelas_max: number;
  cartao_habilita_desconto_avista: boolean;

  avista_exige_comprovante: boolean;

  obrigatorio_nome: boolean;
  obrigatorio_telefone: boolean;
  obrigatorio_estado: boolean;
  obrigatorio_cidade: boolean;
  obrigatorio_cep: boolean;
  obrigatorio_bairro_min_chars: number;
  obrigatorio_endereco_min_chars: number;
  produto_minimo_quantidade: number;
  cpf_digitos: number;
  cnpj_digitos: number;

  max_formas_pagamento: number;
  pagamento_imediato_exige_comprovante: boolean;
  bloqueia_desconto_com_credito: boolean;

  created_at: string;
  updated_at: string;
}

export type RegrasVendasUpdate = Partial<
  Omit<RegrasVendas, "id" | "created_at" | "updated_at">
>;

export function useRegrasVendas() {
  const queryClient = useQueryClient();

  const { data: regras, isLoading, error, refetch } = useQuery({
    queryKey: ["regras-vendas"],
    staleTime: 0,
    refetchOnMount: "always",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("regras_vendas")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) {
        console.error("Erro ao buscar regras de vendas:", error);
        throw error;
      }
      return data as RegrasVendas | null;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: RegrasVendasUpdate) => {
      if (!regras?.id) throw new Error("Regras de vendas não encontradas");

      const { data, error } = await supabase
        .from("regras_vendas")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", regras.id)
        .select();

      if (error) {
        console.error("Erro ao atualizar regras de vendas:", error);
        if (error.code === "42501") {
          throw new Error(
            "Você não tem permissão para atualizar as regras de vendas. Apenas administradores podem fazer isso."
          );
        }
        throw error;
      }

      if (!data || data.length === 0) {
        throw new Error(
          "Você não tem permissão para atualizar as regras de vendas. Apenas administradores podem fazer isso."
        );
      }

      return data[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["regras-vendas"] });
      queryClient.invalidateQueries({ queryKey: ["configuracoes-vendas"] });
      queryClient.invalidateQueries({ queryKey: ["configuracoes-vendas-publicas"] });
      toast.success("Regras de vendas atualizadas com sucesso!");
    },
    onError: (e: Error) => {
      toast.error(e.message || "Erro ao atualizar regras de vendas");
    },
  });

  const avista = regras?.limite_desconto_avista ?? 3;
  const fria = regras?.limite_desconto_fria ?? 5;
  const adicionalResponsavel = regras?.limite_adicional_responsavel ?? 5;
  const masterLucro = regras?.limite_desconto_master_lucro ?? 15;

  const limites = {
    avista,
    fria,
    // Backward-compat alias for code that ainda usa `presencial`
    presencial: fria,
    adicionalResponsavel,
    totalSemSenha: avista + fria,
    totalComResponsavel: avista + fria + adicionalResponsavel,
    masterLucro,
  };

  return {
    regras,
    isLoading,
    error,
    limites,
    updateRegras: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
    refetch,
  };
}