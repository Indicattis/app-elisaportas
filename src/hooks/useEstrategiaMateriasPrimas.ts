import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type EstrategiaMateriaPrima = {
  id: string;
  custo_item_id: string;
  nome: string;
  unidade: string;
  quantidade_item: number;
  custo_total: number;
  fornecedor: string | null;
  observacoes: string | null;
  ordem: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
};

export type NewEstrategiaMateriaPrima = {
  custo_item_id: string;
  nome: string;
  unidade?: string;
  quantidade_item?: number;
  custo_total?: number;
  fornecedor?: string | null;
  observacoes?: string | null;
  ordem?: number;
};

const KEY = (custoItemId?: string) =>
  ["estrategia_materias_primas", custoItemId ?? "all"] as const;

export function useEstrategiaMateriasPrimas(custoItemId?: string) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: KEY(custoItemId),
    queryFn: async () => {
      let q = supabase
        .from("estrategia_materias_primas")
        .select("*")
        .eq("ativo", true)
        .order("ordem", { ascending: true })
        .order("created_at", { ascending: true });
      if (custoItemId) q = q.eq("custo_item_id", custoItemId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as EstrategiaMateriaPrima[];
    },
    enabled: custoItemId === undefined ? true : !!custoItemId,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["estrategia_materias_primas"] });
  };

  const criar = useMutation({
    mutationFn: async (payload: NewEstrategiaMateriaPrima) => {
      const { data, error } = await supabase
        .from("estrategia_materias_primas")
        .insert({
          custo_item_id: payload.custo_item_id,
          nome: payload.nome,
          unidade: payload.unidade ?? "un",
          quantidade_item: payload.quantidade_item ?? 0,
          custo_total: payload.custo_total ?? 0,
          fornecedor: payload.fornecedor ?? null,
          observacoes: payload.observacoes ?? null,
          ordem: payload.ordem ?? 0,
        })
        .select()
        .single();
      if (error) throw error;
      return data as EstrategiaMateriaPrima;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Matéria-prima adicionada");
    },
    onError: (e: any) => toast.error(`Erro ao criar: ${e.message}`),
  });

  const editar = useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<EstrategiaMateriaPrima>;
    }) => {
      const { error } = await supabase
        .from("estrategia_materias_primas")
        .update(patch)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
    onError: (e: any) => toast.error(`Erro ao atualizar: ${e.message}`),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("estrategia_materias_primas")
        .update({ ativo: false })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Matéria-prima removida");
    },
    onError: (e: any) => toast.error(`Erro ao excluir: ${e.message}`),
  });

  const reordenar = useMutation({
    mutationFn: async (ordens: { id: string; ordem: number }[]) => {
      await Promise.all(
        ordens.map((o) =>
          supabase
            .from("estrategia_materias_primas")
            .update({ ordem: o.ordem })
            .eq("id", o.id),
        ),
      );
    },
    onSuccess: () => invalidate(),
  });

  return {
    materiasPrimas: query.data ?? [],
    isLoading: query.isLoading,
    criar: criar.mutateAsync,
    editar: editar.mutateAsync,
    excluir: excluir.mutateAsync,
    reordenar: reordenar.mutateAsync,
  };
}