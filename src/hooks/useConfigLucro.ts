import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ConfigLucroTipo = "instalacao" | "pintura_epoxi";
export type ConfigLucroModo = "estatico" | "formula_dimensao";

export interface ConfigLucro {
  tipo: ConfigLucroTipo;
  modo: ConfigLucroModo;
  percentual_custo: number;
  parametros: Record<string, any>;
}

const DEFAULT_PCT: Record<ConfigLucroTipo, number> = {
  instalacao: 60,
  pintura_epoxi: 60,
};

const DEFAULT_PARAMS: Record<ConfigLucroTipo, Record<string, any>> = {
  instalacao: {},
  pintura_epoxi: { valor_m2: 25 },
};

export interface SaveConfigPayload {
  modo: ConfigLucroModo;
  percentual_custo: number;
  parametros: Record<string, any>;
}

export function useConfigLucro(tipo: ConfigLucroTipo) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["vendas_config_lucro", tipo],
    queryFn: async (): Promise<ConfigLucro> => {
      const { data, error } = await supabase
        .from("vendas_config_lucro")
        .select("tipo, modo, percentual_custo, parametros")
        .eq("tipo", tipo)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        return {
          tipo,
          modo: "estatico",
          percentual_custo: DEFAULT_PCT[tipo],
          parametros: DEFAULT_PARAMS[tipo],
        };
      }
      return {
        tipo: data.tipo as ConfigLucroTipo,
        modo: (data.modo as ConfigLucroModo) || "estatico",
        percentual_custo: Number(data.percentual_custo),
        parametros: (data.parametros as any) || DEFAULT_PARAMS[tipo],
      };
    },
    staleTime: 60_000,
  });

  const save = useMutation({
    mutationFn: async (payload: SaveConfigPayload) => {
      const { error } = await supabase
        .from("vendas_config_lucro")
        .upsert(
          {
            tipo,
            modo: payload.modo,
            percentual_custo: payload.percentual_custo,
            parametros: payload.parametros,
            updated_at: new Date().toISOString(),
          },
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

export async function fetchConfigLucro(tipo: ConfigLucroTipo): Promise<ConfigLucro> {
  const { data, error } = await supabase
    .from("vendas_config_lucro")
    .select("tipo, modo, percentual_custo, parametros")
    .eq("tipo", tipo)
    .maybeSingle();
  if (error || !data) {
    return {
      tipo,
      modo: "estatico",
      percentual_custo: DEFAULT_PCT[tipo],
      parametros: DEFAULT_PARAMS[tipo],
    };
  }
  return {
    tipo: data.tipo as ConfigLucroTipo,
    modo: (data.modo as ConfigLucroModo) || "estatico",
    percentual_custo: Number(data.percentual_custo),
    parametros: (data.parametros as any) || DEFAULT_PARAMS[tipo],
  };
}

/** Backward-compat helper (instalação ainda usa apenas % custo). */
export async function fetchPercentualCusto(tipo: ConfigLucroTipo): Promise<number> {
  const cfg = await fetchConfigLucro(tipo);
  return cfg.percentual_custo;
}