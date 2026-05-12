import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LiderVendas {
  user_id: string;
  nome: string;
  email: string;
  role: string;
  foto_perfil_url?: string;
}

export function useLiderVendas() {
  return useQuery({
    queryKey: ["lider-vendas"],
    queryFn: async () => {
      // Buscar o líder do setor de vendas
      const { data: setorLider, error: setorError } = await supabase
        .from("setores_lideres")
        .select("lider_id")
        .eq("setor", "vendas")
        .maybeSingle();

      if (setorError) {
        console.error("Erro ao buscar líder de vendas:", setorError);
        return null;
      }

      if (!setorLider) {
        console.log("Nenhum líder de vendas configurado");
        return null;
      }

      // Buscar informações do usuário
      const { data: usuario, error: usuarioError } = await supabase
        .from("admin_users")
        .select("user_id, nome, email, role, foto_perfil_url")
        .eq("user_id", setorLider.lider_id)
        .maybeSingle();

      if (usuarioError) {
        console.error("Erro ao buscar dados do líder:", usuarioError);
        return null;
      }

      return usuario as LiderVendas;
    },
  });
}
