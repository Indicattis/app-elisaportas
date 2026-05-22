import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type MontagemItem = {
  id: string;
  kit_id: string;
  custo_item_id: string;
  quantidade: number;
  custo_item: {
    id: string;
    descricao: string;
    categoria: string | null;
    unidade: string | null;
    custo_unitario: number;
    preco_venda: number;
    taxa_impostos: number;
    taxa_descontos: number;
    taxa_cartao: number;
  } | null;
};

export type KitMontagemResumo = {
  count: number;
  lucroTotal: number;
  custoTotal: number;
  vendaTotal: number;
};

const RESUMO_KEY = ["kits-montagem-resumo"] as const;
const MONT_KEY = (kitId: string) => ["kit-montagem", kitId] as const;

function computeLucroUnit(ci: NonNullable<MontagemItem["custo_item"]>): number {
  const preco = Number(ci.preco_venda || 0);
  const custo = Number(ci.custo_unitario || 0);
  const taxas =
    Number(ci.taxa_impostos || 0) +
    Number(ci.taxa_descontos || 0) +
    Number(ci.taxa_cartao || 0);
  const deducoes = preco * (taxas / 100);
  return preco - deducoes - custo;
}

export function useKitsMontagemResumo() {
  return useQuery({
    queryKey: RESUMO_KEY,
    queryFn: async (): Promise<Record<string, KitMontagemResumo>> => {
      const { data, error } = await supabase
        .from("tabela_precos_portas_montagem")
        .select(
          "kit_id, quantidade, custos_itens:custo_item_id (custo_unitario, preco_venda, taxa_impostos, taxa_descontos, taxa_cartao)"
        );
      if (error) throw error;
      const map: Record<string, KitMontagemResumo> = {};
      for (const row of (data ?? []) as any[]) {
        const ci = row.custos_itens;
        const q = Number(row.quantidade || 0);
        const entry = map[row.kit_id] ?? {
          count: 0,
          lucroTotal: 0,
          custoTotal: 0,
          vendaTotal: 0,
        };
        entry.count += 1;
        if (ci) {
          entry.lucroTotal += q * computeLucroUnit(ci);
          entry.custoTotal += q * Number(ci.custo_unitario || 0);
          entry.vendaTotal += q * Number(ci.preco_venda || 0);
        }
        map[row.kit_id] = entry;
      }
      return map;
    },
  });
}

export function useKitMontagem(kitId: string | null) {
  const queryClient = useQueryClient();
  const enabled = !!kitId;

  const query = useQuery({
    queryKey: MONT_KEY(kitId ?? ""),
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tabela_precos_portas_montagem")
        .select(
          "id, kit_id, custo_item_id, quantidade, custo_item:custo_item_id (id, descricao, categoria, unidade, custo_unitario, preco_venda, taxa_impostos, taxa_descontos, taxa_cartao)"
        )
        .eq("kit_id", kitId as string)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as MontagemItem[];
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: MONT_KEY(kitId ?? "") });
    queryClient.invalidateQueries({ queryKey: RESUMO_KEY });
  };

  const addItem = useMutation({
    mutationFn: async ({ custo_item_id, quantidade }: { custo_item_id: string; quantidade?: number }) => {
      if (!kitId) throw new Error("Kit inválido");
      const { error } = await supabase
        .from("tabela_precos_portas_montagem")
        .insert({ kit_id: kitId, custo_item_id, quantidade: quantidade ?? 1 });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Item adicionado à montagem");
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao adicionar item"),
  });

  const updateQuantidade = useMutation({
    mutationFn: async ({ id, quantidade }: { id: string; quantidade: number }) => {
      const { error } = await supabase
        .from("tabela_precos_portas_montagem")
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
        .from("tabela_precos_portas_montagem")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Item removido da montagem");
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

export { computeLucroUnit };