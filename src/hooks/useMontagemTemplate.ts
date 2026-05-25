import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { computeLucroUnit, type MontagemItem } from "./useKitMontagem";

export type TemplateItem = {
  id: string;
  custo_item_id: string;
  quantidade: number;
  custo_item: MontagemItem["custo_item"];
};

const TEMPLATE_KEY = ["montagem-template"] as const;

export function useMontagemTemplate() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: TEMPLATE_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tabela_precos_montagem_template")
        .select(
          "id, custo_item_id, quantidade, custo_item:custo_item_id (id, descricao, categoria, unidade, custo_unitario, preco_venda, taxa_impostos, taxa_descontos, taxa_cartao)"
        )
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as TemplateItem[];
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: TEMPLATE_KEY });

  const addItem = useMutation({
    mutationFn: async ({ custo_item_id, quantidade }: { custo_item_id: string; quantidade?: number }) => {
      const { error } = await supabase
        .from("tabela_precos_montagem_template")
        .insert({ custo_item_id, quantidade: quantidade ?? 1 });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Item adicionado ao template");
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao adicionar item"),
  });

  const updateQuantidade = useMutation({
    mutationFn: async ({ id, quantidade }: { id: string; quantidade: number }) => {
      const { error } = await supabase
        .from("tabela_precos_montagem_template")
        .update({ quantidade })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: any) => toast.error(e?.message ?? "Erro ao atualizar quantidade"),
  });

  const removeItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("tabela_precos_montagem_template")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Item removido do template");
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao remover item"),
  });

  return {
    items: query.data ?? [],
    isLoading: query.isLoading,
    computeLucroUnit,
    addItem,
    updateQuantidade,
    removeItem,
  };
}

export async function applyTemplateToKit(kitId: string, existingCustoItemIds: Set<string>) {
  const { data, error } = await supabase
    .from("tabela_precos_montagem_template")
    .select("custo_item_id, quantidade");
  if (error) throw error;
  const all = (data ?? []) as Array<{ custo_item_id: string; quantidade: number }>;
  const toInsert = all
    .filter((r) => !existingCustoItemIds.has(r.custo_item_id))
    .map((r) => ({ kit_id: kitId, custo_item_id: r.custo_item_id, quantidade: r.quantidade }));
  const skipped = all.length - toInsert.length;
  if (toInsert.length > 0) {
    const { error: insErr } = await supabase
      .from("tabela_precos_portas_montagem")
      .insert(toInsert);
    if (insErr) throw insErr;
  }
  return { added: toInsert.length, skipped, total: all.length };
}