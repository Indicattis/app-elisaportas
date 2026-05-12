import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ConfiguracoesVendasPublicas {
  id: string;
  responsavel_senha_responsavel_id: string | null;
  responsavel_senha_master_id: string | null;
  limite_desconto_avista: number;
  limite_desconto_presencial: number;
  limite_adicional_responsavel: number;
}

/**
 * Hook que retorna apenas dados públicos de configurações_vendas (sem senhas).
 * Usa RPC SECURITY DEFINER, acessível a qualquer usuário autenticado.
 */
export function useConfiguracoesVendasPublicas() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["configuracoes-vendas-publicas"],
    staleTime: 0,
    refetchOnMount: "always",
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_configuracoes_vendas_publicas");
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return (row || null) as ConfiguracoesVendasPublicas | null;
    },
  });

  const limites = {
    avista: data?.limite_desconto_avista ?? 3,
    presencial: data?.limite_desconto_presencial ?? 5,
    adicionalResponsavel: data?.limite_adicional_responsavel ?? 5,
    totalSemSenha:
      (data?.limite_desconto_avista ?? 3) + (data?.limite_desconto_presencial ?? 5),
    totalComResponsavel:
      (data?.limite_desconto_avista ?? 3) +
      (data?.limite_desconto_presencial ?? 5) +
      (data?.limite_adicional_responsavel ?? 5),
  };

  return {
    configuracoesPublicas: data,
    limites,
    isLoading,
    error,
    refetch,
  };
}
