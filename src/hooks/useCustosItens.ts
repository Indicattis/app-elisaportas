import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type CustoItem = {
  id: string;
  descricao: string;
  categoria: string | null;
  subcategoria: string | null;
  unidade: string | null;
  custo_unitario: number;
  preco_venda: number;
  fornecedor: string | null;
  quantidade: number;
  quantidade_ideal: number;
  quantidade_maxima: number;
  ordem: number;
  created_at: string;
  updated_at: string;
};

export type NewCustoItem = {
  descricao: string;
  categoria?: string | null;
  subcategoria?: string | null;
  unidade?: string | null;
  custo_unitario?: number;
  preco_venda?: number;
  fornecedor?: string | null;
  quantidade?: number;
  quantidade_ideal?: number;
  quantidade_maxima?: number;
  ordem?: number;
};

const QUERY_KEY = ["custos_itens"] as const;

export function useCustosItens() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custos_itens")
        .select("*")
        .order("categoria", { ascending: true, nullsFirst: false })
        .order("ordem", { ascending: true })
        .order("descricao", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CustoItem[];
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: QUERY_KEY });

  const createItem = useMutation({
    mutationFn: async (payload: NewCustoItem) => {
      const { data, error } = await supabase
        .from("custos_itens")
        .insert({
          descricao: payload.descricao,
          categoria: payload.categoria ?? null,
          subcategoria: payload.subcategoria ?? null,
          unidade: payload.unidade ?? null,
          custo_unitario: payload.custo_unitario ?? 0,
          preco_venda: payload.preco_venda ?? 0,
          fornecedor: payload.fornecedor ?? null,
          quantidade: payload.quantidade ?? 0,
          quantidade_ideal: payload.quantidade_ideal ?? 0,
          quantidade_maxima: payload.quantidade_maxima ?? 0,
          ordem: payload.ordem ?? 0,
        })
        .select()
        .single();
      if (error) throw error;
      return data as CustoItem;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Item criado");
    },
    onError: (err: any) => toast.error(err?.message ?? "Erro ao criar item"),
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<CustoItem> }) => {
      const { error } = await supabase.from("custos_itens").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
    onError: (err: any) => toast.error(err?.message ?? "Erro ao atualizar item"),
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("custos_itens").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Item excluído");
    },
    onError: (err: any) => toast.error(err?.message ?? "Erro ao excluir item"),
  });

  return {
    ...query,
    items: query.data ?? [],
    createItem,
    updateItem,
    deleteItem,
  };
}