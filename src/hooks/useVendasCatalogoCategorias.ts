import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ORDEM_KEY = ["vendas_catalogo_categorias_ordem"] as const;
const CATALOGO_KEY = ["vendas-catalogo"] as const;

export type CategoriaOrdem = { categoria: string; ordem: number };

export function useVendasCatalogoCategoriasOrdem() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ORDEM_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendas_catalogo_categorias_ordem")
        .select("categoria, ordem")
        .order("ordem", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CategoriaOrdem[];
    },
  });

  const salvarOrdem = useMutation({
    mutationFn: async (ordens: CategoriaOrdem[]) => {
      if (ordens.length === 0) return;
      const { error } = await supabase
        .from("vendas_catalogo_categorias_ordem")
        .upsert(
          ordens.map((o) => ({ categoria: o.categoria, ordem: o.ordem })),
          { onConflict: "categoria" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORDEM_KEY });
      toast.success("Ordem das categorias salva");
    },
    onError: (err: any) => toast.error(err?.message ?? "Erro ao salvar ordem"),
  });

  return { ...query, categoriasOrdem: query.data ?? [], salvarOrdem };
}

export function useCriarCategoriaCatalogo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (nome: string) => {
      const nomeTrim = nome.trim();
      if (!nomeTrim) throw new Error("Nome da categoria não pode ser vazio");
      if (nomeTrim.toLowerCase() === "sem categoria") {
        throw new Error("Nome reservado");
      }
      const { data: existing } = await supabase
        .from("vendas_catalogo_categorias_ordem")
        .select("categoria")
        .eq("categoria", nomeTrim)
        .maybeSingle();
      if (existing) throw new Error("Já existe uma categoria com esse nome");

      const { data: itens } = await supabase
        .from("vendas_catalogo")
        .select("id")
        .eq("categoria", nomeTrim)
        .limit(1);
      if (itens && itens.length > 0) {
        throw new Error("Já existe uma categoria com esse nome");
      }

      const { data: maxRow } = await supabase
        .from("vendas_catalogo_categorias_ordem")
        .select("ordem")
        .order("ordem", { ascending: false })
        .limit(1)
        .maybeSingle();
      const proximaOrdem = (maxRow?.ordem ?? -1) + 1;

      const { error } = await supabase
        .from("vendas_catalogo_categorias_ordem")
        .insert({ categoria: nomeTrim, ordem: proximaOrdem });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORDEM_KEY });
      queryClient.invalidateQueries({ queryKey: CATALOGO_KEY });
      toast.success("Categoria criada");
    },
    onError: (err: any) => toast.error(err?.message ?? "Erro ao criar categoria"),
  });
}

export function useExcluirCategoriaCatalogo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (nome: string) => {
      const nomeTrim = nome.trim();
      if (!nomeTrim) throw new Error("Categoria inválida");
      if (nomeTrim === "Sem categoria") {
        throw new Error("A categoria 'Sem categoria' não pode ser excluída");
      }
      const { count, error: countErr } = await supabase
        .from("vendas_catalogo")
        .select("id", { count: "exact", head: true })
        .eq("categoria", nomeTrim)
        .eq("ativo", true);
      if (countErr) throw countErr;
      if ((count ?? 0) > 0) {
        throw new Error(`Categoria possui ${count} produto(s). Mova ou exclua antes.`);
      }
      const { error } = await supabase
        .from("vendas_catalogo_categorias_ordem")
        .delete()
        .eq("categoria", nomeTrim);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORDEM_KEY });
      queryClient.invalidateQueries({ queryKey: CATALOGO_KEY });
      toast.success("Categoria excluída");
    },
    onError: (err: any) => toast.error(err?.message ?? "Erro ao excluir categoria"),
  });
}

export function useRenomearCategoriaCatalogo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ from, to }: { from: string; to: string }) => {
      const fromTrim = from.trim();
      const toTrim = to.trim();
      if (!toTrim) throw new Error("Nome da categoria não pode ser vazio");
      if (fromTrim === toTrim) return;

      if (fromTrim === "Sem categoria") {
        const { error } = await supabase
          .from("vendas_catalogo")
          .update({ categoria: toTrim })
          .or("categoria.is.null,categoria.eq.");
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("vendas_catalogo")
          .update({ categoria: toTrim })
          .eq("categoria", fromTrim);
        if (error) throw error;
      }

      const { data: existing } = await supabase
        .from("vendas_catalogo_categorias_ordem")
        .select("ordem")
        .eq("categoria", fromTrim)
        .maybeSingle();
      if (existing) {
        await supabase
          .from("vendas_catalogo_categorias_ordem")
          .delete()
          .eq("categoria", fromTrim);
        await supabase
          .from("vendas_catalogo_categorias_ordem")
          .upsert(
            { categoria: toTrim, ordem: existing.ordem },
            { onConflict: "categoria" }
          );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATALOGO_KEY });
      queryClient.invalidateQueries({ queryKey: ORDEM_KEY });
      toast.success("Categoria renomeada");
    },
    onError: (err: any) => toast.error(err?.message ?? "Erro ao renomear categoria"),
  });
}