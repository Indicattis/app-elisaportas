import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Multa {
  id: string;
  usuario_id: string | null;
  terceiro_nome?: string | null;
  valor: number;
  data_vencimento: string | null;
  data_ocorrido: string;
  descricao: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  usuario_nome?: string;
  usuario_foto?: string | null;
}

export function useMultas() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ["multas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("multas")
        .select("*, admin_users!multas_usuario_id_fkey(nome, foto_perfil_url)")
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map((m: any) => ({
        ...m,
        usuario_nome: m.admin_users?.nome || m.terceiro_nome || "Usuário desconhecido",
        usuario_foto: m.admin_users?.foto_perfil_url || null,
      })) as Multa[];
    },
  });

  const createMulta = useMutation({
    mutationFn: async (multa: { usuario_id?: string | null; terceiro_nome?: string | null; valor: number; data_ocorrido: string; descricao?: string; status?: string }) => {
      const { error } = await supabase.from("multas").insert({
        usuario_id: multa.usuario_id || null,
        terceiro_nome: multa.terceiro_nome || null,
        valor: multa.valor,
        data_ocorrido: multa.data_ocorrido,
        descricao: multa.descricao || null,
        status: multa.status || "pendente",
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

  const updateMulta = useMutation({
    mutationFn: async ({ id, ...campos }: { id: string } & Partial<Pick<Multa, "usuario_id" | "terceiro_nome" | "valor" | "data_ocorrido" | "descricao" | "status">>) => {
      const { error } = await supabase.from("multas").update(campos as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["multas"] });
      toast({ title: "Multa atualizada" });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar multa", variant: "destructive" });
    },
  });

  return { ...query, createMulta, updateStatus, updateMulta, deleteMulta };
}
