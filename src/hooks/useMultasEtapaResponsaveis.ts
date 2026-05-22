import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type MultaStatus = "aberta" | "advertida" | "paga" | "concluida";

export interface MultaEtapaResponsavel {
  id: string;
  status: MultaStatus;
  responsavel_id: string | null;
  responsavel?: {
    user_id: string;
    nome: string;
    email: string;
    foto_perfil_url: string | null;
    setor: string | null;
  } | null;
}

export function useMultasEtapaResponsaveis() {
  const queryClient = useQueryClient();

  const { data: responsaveis = [], isLoading } = useQuery({
    queryKey: ["multas-etapa-responsaveis"],
    queryFn: async () => {
      const { data: etapaData, error: etapaError } = await supabase
        .from("multas_etapa_responsaveis")
        .select("*");

      if (etapaError) throw etapaError;

      const ids = (etapaData || [])
        .map((e: any) => e.responsavel_id)
        .filter(Boolean) as string[];

      if (ids.length === 0) {
        return (etapaData || []).map((e: any) => ({
          ...e,
          status: e.status as MultaStatus,
          responsavel: null,
        })) as MultaEtapaResponsavel[];
      }

      const { data: usuarios, error: usuariosError } = await supabase
        .from("admin_users")
        .select("user_id, nome, email, foto_perfil_url, setor")
        .in("user_id", ids);

      if (usuariosError) throw usuariosError;

      return (etapaData || []).map((e: any) => ({
        ...e,
        status: e.status as MultaStatus,
        responsavel: usuarios?.find((u: any) => u.user_id === e.responsavel_id) || null,
      })) as MultaEtapaResponsavel[];
    },
  });

  const atribuir = useMutation({
    mutationFn: async ({ status, responsavelId }: { status: MultaStatus; responsavelId: string }) => {
      const { data: existing } = await supabase
        .from("multas_etapa_responsaveis")
        .select("id")
        .eq("status", status)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("multas_etapa_responsaveis")
          .update({ responsavel_id: responsavelId, updated_at: new Date().toISOString() })
          .eq("status", status);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("multas_etapa_responsaveis")
          .insert({ status, responsavel_id: responsavelId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["multas-etapa-responsaveis"] });
      toast.success("Responsável atribuído!");
    },
    onError: (err) => {
      console.error(err);
      toast.error("Erro ao atribuir responsável");
    },
  });

  const remover = useMutation({
    mutationFn: async (status: MultaStatus) => {
      const { error } = await supabase
        .from("multas_etapa_responsaveis")
        .delete()
        .eq("status", status);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["multas-etapa-responsaveis"] });
      toast.success("Responsável removido");
    },
    onError: (err) => {
      console.error(err);
      toast.error("Erro ao remover responsável");
    },
  });

  const getResponsavel = (status: MultaStatus) =>
    responsaveis.find((r) => r.status === status)?.responsavel || null;

  return {
    responsaveis,
    isLoading,
    getResponsavel,
    atribuirResponsavel: atribuir.mutate,
    isAtribuindo: atribuir.isPending,
    removerResponsavel: remover.mutate,
    isRemovendo: remover.isPending,
  };
}