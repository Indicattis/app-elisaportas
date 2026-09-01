import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ColaboradorFicha {
  id: string;
  admin_user_id: string;
  comida_favorita: string | null;
  bebida_favorita: string | null;
  preferencia_bebida: string | null;
  preferencia_bebida_outra: string | null;
  doce_favorito: string | null;
  doce_ou_salgado: string | null;
  cor_favorita: string | null;
  sexo: string | null;
  estado_civil: string | null;
  nacionalidade: string | null;
  created_at: string;
  updated_at: string;
}

export interface ColaboradorBasico {
  id: string;
  nome: string;
  email: string | null;
  setor: string | null;
  role: string | null;
  foto_perfil_url: string | null;
  data_nascimento: string | null;
}

export type FichaInput = Omit<
  ColaboradorFicha,
  "id" | "created_at" | "updated_at"
> & { data_nascimento: string | null };

export function useColaboradorFichas() {
  const queryClient = useQueryClient();

  const colaboradoresQuery = useQuery({
    queryKey: ["colaboradores-fichas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_users")
        .select("id, nome, email, setor, role, foto_perfil_url, data_nascimento")
        .eq("ativo", true)
        .in("tipo_usuario", ["colaborador", "metamorfo"])
        .order("nome");
      if (error) throw error;
      return (data || []) as ColaboradorBasico[];
    },
  });

  const fichasQuery = useQuery({
    queryKey: ["colaborador-fichas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("colaborador_fichas")
        .select("*");
      if (error) throw error;
      return (data || []) as ColaboradorFicha[];
    },
  });

  const salvar = useMutation({
    mutationFn: async (input: FichaInput) => {
      const { data_nascimento, ...ficha } = input;

      const { error } = await supabase
        .from("colaborador_fichas")
        .upsert(
          {
            admin_user_id: ficha.admin_user_id,
            comida_favorita: ficha.comida_favorita || null,
            bebida_favorita: ficha.bebida_favorita || null,
            preferencia_bebida: ficha.preferencia_bebida || null,
            preferencia_bebida_outra: ficha.preferencia_bebida_outra || null,
            doce_favorito: ficha.doce_favorito || null,
            doce_ou_salgado: ficha.doce_ou_salgado || null,
            cor_favorita: ficha.cor_favorita || null,
            sexo: ficha.sexo || null,
            estado_civil: ficha.estado_civil || null,
            nacionalidade: ficha.nacionalidade || null,
          },
          { onConflict: "admin_user_id" },
        );
      if (error) throw error;

      const { error: errorUser } = await supabase
        .from("admin_users")
        .update({ data_nascimento: data_nascimento || null })
        .eq("id", ficha.admin_user_id);
      if (errorUser) throw errorUser;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["colaborador-fichas"] });
      queryClient.invalidateQueries({ queryKey: ["colaboradores-fichas"] });
      toast.success("Ficha salva com sucesso");
    },
    onError: (e: any) => {
      toast.error(e?.message || "Erro ao salvar a ficha");
    },
  });

  return {
    colaboradores: colaboradoresQuery.data || [],
    fichas: fichasQuery.data || [],
    isLoading: colaboradoresQuery.isLoading || fichasQuery.isLoading,
    salvar,
  };
}
