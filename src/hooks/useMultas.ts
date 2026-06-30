import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Multa {
  id: string;
  usuario_id: string | null;
  terceiro_nome?: string | null;
  valor: number;
  data_vencimento: string;
  descricao: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  usuario_nome?: string;
}

export function useMultas() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ["multas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("multas")
        .select("*, admin_users!multas_usuario_id_fkey(nome)")
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map((m: any) => ({
        ...m,
        usuario_nome: m.admin_users?.nome || m.terceiro_nome || "Usuário desconhecido",
      })) as Multa[];
    },
  });

  const createMulta = useMutation({
    mutationFn: async (multa: { usuario_id?: string | null; terceiro_nome?: string | null; valor: number; data_vencimento: string; descricao?: string }) => {
      const { error } = await supabase.from("multas").insert({
        usuario_id: multa.usuario_id || null,
        terceiro_nome: multa.terceiro_nome || null,
        valor: multa.valor,
        data_vencimento: multa.data_vencimento,
        descricao: multa.descricao || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["multas"] });
      toast({ title: "Multa cadastrada com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro ao cadastrar multa", variant: "destructive" });
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("multas").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["multas"] });
      toast({ title: "Status atualizado" });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar status", variant: "destructive" });
    },
  });

  const deleteMulta = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("multas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["multas"] });
      toast({ title: "Multa excluída" });
    },
    onError: () => {
      toast({ title: "Erro ao excluir multa", variant: "destructive" });
    },
  });

  return { ...query, createMulta, updateStatus, deleteMulta };
}
