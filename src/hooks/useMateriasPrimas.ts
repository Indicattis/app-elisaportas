import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface MateriaPrima {
  id: string;
  nome: string;
  unidade: string;
  quantidade: number;
  custo_unitario: number;
  fornecedor_id: string | null;
  ativo: boolean;
  ordem: number;
  created_at: string;
  updated_at: string;
  fornecedor?: { id: string; nome: string } | null;
  itens_vinculados?: number;
}

export interface MateriaPrimaInput {
  nome: string;
  unidade: string;
  quantidade?: number;
  custo_unitario?: number;
  fornecedor_id?: string | null;
}

export const useMateriasPrimas = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: materiasPrimas = [], isLoading } = useQuery({
    queryKey: ["materias-primas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("materias_primas")
        .select("*, fornecedor:fornecedores(id, nome)")
        .eq("ativo", true)
        .order("ordem", { ascending: true })
        .order("nome", { ascending: true });
      if (error) throw error;

      // Conta itens vinculados
      const ids = (data || []).map((m: any) => m.id);
      let counts: Record<string, number> = {};
      if (ids.length) {
        const { data: vinc } = await supabase
          .from("estoque")
          .select("materia_prima_id")
          .in("materia_prima_id", ids)
          .eq("ativo", true);
        (vinc || []).forEach((v: any) => {
          if (v.materia_prima_id) {
            counts[v.materia_prima_id] = (counts[v.materia_prima_id] || 0) + 1;
          }
        });
      }
      return (data || []).map((m: any) => ({
        ...m,
        itens_vinculados: counts[m.id] || 0,
      })) as MateriaPrima[];
    },
  });

  const criar = useMutation({
    mutationFn: async (input: MateriaPrimaInput) => {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("materias_primas")
        .insert({
          nome: input.nome,
          unidade: input.unidade,
          quantidade: input.quantidade ?? 0,
          custo_unitario: input.custo_unitario ?? 0,
          fornecedor_id: input.fornecedor_id || null,
          created_by: userData?.user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materias-primas"] });
      toast({ title: "Matéria-prima criada", description: "Cadastrada com sucesso." });
    },
    onError: (e: any) => {
      toast({ title: "Erro ao criar", description: e.message, variant: "destructive" });
    },
  });

  const editar = useMutation({
    mutationFn: async ({ id, ...input }: MateriaPrimaInput & { id: string }) => {
      const { error } = await supabase
        .from("materias_primas")
        .update({
          nome: input.nome,
          unidade: input.unidade,
          quantidade: input.quantidade ?? 0,
          custo_unitario: input.custo_unitario ?? 0,
          fornecedor_id: input.fornecedor_id || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materias-primas"] });
      toast({ title: "Atualizada", description: "Matéria-prima atualizada." });
    },
    onError: (e: any) => {
      toast({ title: "Erro ao atualizar", description: e.message, variant: "destructive" });
    },
  });

  const ajustarQuantidade = useMutation({
    mutationFn: async ({ id, quantidade }: { id: string; quantidade: number }) => {
      const { error } = await supabase
        .from("materias_primas")
        .update({ quantidade })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materias-primas"] });
    },
    onError: (e: any) => {
      toast({ title: "Erro ao ajustar", description: e.message, variant: "destructive" });
    },
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      // Bloquear se houver itens vinculados
      const { count, error: countErr } = await supabase
        .from("estoque")
        .select("id", { count: "exact", head: true })
        .eq("materia_prima_id", id)
        .eq("ativo", true);
      if (countErr) throw countErr;
      if ((count ?? 0) > 0) {
        throw new Error(
          `Existem ${count} itens vinculados a esta matéria-prima. Desvincule antes de excluir.`
        );
      }
      const { error } = await supabase
        .from("materias_primas")
        .update({ ativo: false })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materias-primas"] });
      toast({ title: "Excluída", description: "Matéria-prima removida." });
    },
    onError: (e: any) => {
      toast({ title: "Erro ao excluir", description: e.message, variant: "destructive" });
    },
  });

  return {
    materiasPrimas,
    isLoading,
    criar: criar.mutateAsync,
    editar: editar.mutateAsync,
    excluir: excluir.mutateAsync,
    ajustarQuantidade: ajustarQuantidade.mutateAsync,
  };
};