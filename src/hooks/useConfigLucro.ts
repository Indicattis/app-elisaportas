import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ConfigLucroTipo = "instalacao" | "pintura_epoxi";

export interface ConfigLucro {
  tipo: ConfigLucroTipo;
  modo: "estatico";
  percentual_custo: number;
}

const DEFAULT_PCT: Record<ConfigLucroTipo, number> = {
  instalacao: 60,
  pintura_epoxi: 60,
};

export function useConfigLucro(tipo: ConfigLucroTipo) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["vendas_config_lucro", tipo],
    queryFn: async (): Promise<ConfigLucro> => {
      const { data, error } = await supabase
        .from("vendas_config_lucro")
        .select("tipo, modo, percentual_custo")
        .eq("tipo", tipo)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        return { tipo, modo: "estatico", percentual_custo: DEFAULT_PCT[tipo] };
      }
      return {
        tipo: data.tipo as ConfigLucroTipo,
        modo: "estatico",
        percentual_custo: Number(data.percentual_custo),
      };
    },
    staleTime: 60_000,
  });

  const save = useMutation({
    mutationFn: async (percentual_custo: number) => {
      const { error } = await supabase
        .from("vendas_config_lucro")
        .upsert(
          { tipo, modo: "estatico", percentual_custo, updated_at: new Date().toISOString() },
          { onConflict: "tipo" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vendas_config_lucro", tipo] });
    },
  });

  return { ...query, save };
}

export async function fetchPercentualCusto(tipo: ConfigLucroTipo): Promise<number> {
  const { data, error } = await supabase
    .from("vendas_config_lucro")
    .select("percentual_custo")
    .eq("tipo", tipo)
    .maybeSingle();
  if (error || !data) return DEFAULT_PCT[tipo];
  return Number(data.percentual_custo);
}