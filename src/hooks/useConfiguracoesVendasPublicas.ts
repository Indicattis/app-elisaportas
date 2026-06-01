import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ConfiguracoesVendasPublicas {
  id: string;
  responsavel_senha_responsavel_id: string | null;
  responsavel_senha_master_id: string | null;
  limite_desconto_avista: number;
  /** Mantido por retrocompatibilidade — corresponde a `limite_desconto_fria` em `regras_vendas`. */
  limite_desconto_presencial: number;
  limite_adicional_responsavel: number;
  limite_desconto_master_lucro: number;
}

/**
 * Hook que retorna os limites públicos de vendas.
 * Lê de `regras_vendas` (nova tabela canônica) e mantém o mesmo formato dos
 * consumidores antigos para evitar refator em cascata.
 */
export function useConfiguracoesVendasPublicas() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["configuracoes-vendas-publicas"],
    staleTime: 0,
    refetchOnMount: "always",
    queryFn: async () => {
      const [{ data: regras, error: errRegras }, { data: cfg, error: errCfg }] =
        await Promise.all([
          supabase
            .from("regras_vendas")
            .select(
              "id, limite_desconto_avista, limite_desconto_fria, limite_adicional_responsavel, limite_desconto_master_lucro"
            )
            .order("created_at", { ascending: true })
            .limit(1)
            .maybeSingle(),
          supabase.rpc("get_configuracoes_vendas_publicas"),
        ]);

      if (errRegras) throw errRegras;
      if (errCfg) throw errCfg;

      const cfgRow = Array.isArray(cfg) ? cfg[0] : cfg;
      if (!regras) return (cfgRow || null) as ConfiguracoesVendasPublicas | null;

      return {
        id: (cfgRow as any)?.id ?? regras.id,
        responsavel_senha_responsavel_id:
          (cfgRow as any)?.responsavel_senha_responsavel_id ?? null,
        responsavel_senha_master_id:
          (cfgRow as any)?.responsavel_senha_master_id ?? null,
        limite_desconto_avista: regras.limite_desconto_avista,
        limite_desconto_presencial: regras.limite_desconto_fria,
        limite_adicional_responsavel: regras.limite_adicional_responsavel,
        limite_desconto_master_lucro:
          (regras as any).limite_desconto_master_lucro ?? 15,
      } as ConfiguracoesVendasPublicas;
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
    masterLucro: data?.limite_desconto_master_lucro ?? 15,
  };

  return {
    configuracoesPublicas: data,
    limites,
    isLoading,
    error,
    refetch,
  };
}
