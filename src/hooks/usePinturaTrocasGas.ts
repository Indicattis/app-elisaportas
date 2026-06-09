import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useContext } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ProducaoAuthContext } from "@/hooks/useProducaoAuth";
import { useAuth } from "@/hooks/useAuth";

export interface PinturaTrocaGas {
  id: string;
  valor: number;
  observacoes: string | null;
  registrado_por: string | null;
  registrado_em: string;
  admin_users?: { id: string; nome: string; foto_perfil_url?: string | null } | null;
}

export function usePinturaTrocasGas() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const producaoContext = useContext(ProducaoAuthContext);
  const { user: authUser, userRole } = useAuth();
  const currentAdminUserId = producaoContext?.user?.admin_user_id || userRole?.id;
  const isAuthenticated = !!(producaoContext?.user || authUser);

  const { data: trocas = [], isLoading } = useQuery({
    queryKey: ["pintura-trocas-gas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pintura_trocas_gas" as any)
        .select("*")
        .order("registrado_em", { ascending: false });
      if (error) throw error;
      const rows = (data || []) as any[];

      const enriched = await Promise.all(
        rows.map(async (t) => {
          let userData: any = null;
          if (t.registrado_por) {
            const { data: byId } = await supabase
              .from("admin_users")
              .select("id, nome, foto_perfil_url")
              .eq("id", t.registrado_por)
              .maybeSingle();
            if (byId) userData = byId;
            else {
              const { data: byUserId } = await supabase
                .from("admin_users")
                .select("id, nome, foto_perfil_url")
                .eq("user_id", t.registrado_por)
                .maybeSingle();
              userData = byUserId;
            }
          }
          return { ...t, admin_users: userData } as PinturaTrocaGas;
        })
      );
      return enriched;
    },
  });

  const criarTroca = useMutation({
    mutationFn: async ({ valor, observacoes }: { valor: number; observacoes?: string }) => {
      if (!isAuthenticated) throw new Error("Usuário não autenticado");
      const { data, error } = await supabase
        .from("pintura_trocas_gas" as any)
        .insert({
          valor,
          observacoes: observacoes || null,
          registrado_por: currentAdminUserId,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pintura-trocas-gas"] });
      toast({ title: "Troca de gás registrada", description: "Troca de gás registrada com sucesso" });
    },
    onError: (error) => {
      console.error("Erro ao registrar troca de gás:", error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Não foi possível registrar a troca de gás",
        variant: "destructive",
      });
    },
  });

  const excluirTroca = useMutation({
    mutationFn: async (trocaId: string) => {
      if (!isAuthenticated) throw new Error("Usuário não autenticado");
      const { error } = await supabase
        .from("pintura_trocas_gas" as any)
        .delete()
        .eq("id", trocaId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pintura-trocas-gas"] });
      toast({ title: "Troca de gás excluída", description: "Registro removido com sucesso" });
    },
    onError: (error) => {
      console.error("Erro ao excluir troca de gás:", error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Não foi possível excluir a troca de gás",
        variant: "destructive",
      });
    },
  });

  return { trocas, isLoading, criarTroca, excluirTroca };
}