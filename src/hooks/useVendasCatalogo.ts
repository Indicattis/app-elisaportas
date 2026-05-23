import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ProdutoCatalogo {
  id: string;
  nome_produto: string;
  descricao_produto?: string;
  categoria: string;
  subcategoria_id?: string;
  quantidade: number;
  unidade: string;
  preco_venda: number;
  custo_produto?: number;
  preco_objetivo?: number | null;
  custo_ok?: boolean;
  ativo: boolean;
  imagem_url?: string;
  peso?: number;
  destaque: boolean;
  estoque_minimo: number;
  tags?: string[];
  sku?: string;
  tipo_fabricacao: 'interno' | 'terceirizado';
  ordem?: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface ProdutoCatalogoInput {
  nome_produto: string;
  descricao_produto?: string;
  categoria: string;
  subcategoria_id?: string;
  quantidade?: number;
  unidade?: string;
  preco_venda: number;
  custo_produto?: number;
  preco_objetivo?: number | null;
  custo_ok?: boolean;
  imagem_url?: string;
  peso?: number;
  destaque?: boolean;
  estoque_minimo?: number;
  tags?: string[];
  sku?: string;
  tipo_fabricacao?: 'interno' | 'terceirizado';
}

export function useVendasCatalogo(filtros?: {
  categoria?: string;
  destaque?: boolean;
  busca?: string;
}) {
  const queryClient = useQueryClient();

  // Buscar produtos do catálogo
  const { data: produtos = [], isLoading } = useQuery({
    queryKey: ["vendas-catalogo", filtros],
    queryFn: async () => {
      let query = supabase
        .from("vendas_catalogo")
        .select("*")
        .eq("ativo", true)
        .order("ordem", { ascending: true })
        .order("nome_produto", { ascending: true });

      if (filtros?.categoria) {
        query = query.eq("categoria", filtros.categoria);
      }

      if (filtros?.destaque !== undefined) {
        query = query.eq("destaque", filtros.destaque);
      }

      if (filtros?.busca) {
        query = query.or(
          `nome_produto.ilike.%${filtros.busca}%,descricao_produto.ilike.%${filtros.busca}%,sku.ilike.%${filtros.busca}%`
        );
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as ProdutoCatalogo[];
    },
  });

  // Adicionar produto ao catálogo
  const adicionarProduto = useMutation({
    mutationFn: async (produto: ProdutoCatalogoInput) => {
      const { data: user } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("vendas_catalogo")
        .insert({
          ...produto,
          quantidade: produto.quantidade ?? 0,
          created_by: user.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendas-catalogo"] });
      toast.success("Produto adicionado ao catálogo com sucesso!");
    },
    onError: (error: any) => {
      console.error("Erro ao adicionar produto:", error);
      toast.error("Erro ao adicionar produto ao catálogo");
    },
  });

  // Editar produto do catálogo
  const editarProduto = useMutation({
    mutationFn: async ({
      id,
      ...dados
    }: Partial<ProdutoCatalogoInput> & { id: string }) => {
      const { data, error } = await supabase
        .from("vendas_catalogo")
        .update(dados)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendas-catalogo"] });
      toast.success("Produto atualizado com sucesso!");
    },
    onError: (error: any) => {
      console.error("Erro ao editar produto:", error);
      toast.error("Erro ao atualizar produto");
    },
  });

  // Inativar produto (soft delete)
  const inativarProduto = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("vendas_catalogo")
        .update({ ativo: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendas-catalogo"] });
      toast.success("Produto removido do catálogo");
    },
    onError: (error: any) => {
      console.error("Erro ao inativar produto:", error);
      toast.error("Erro ao remover produto");
    },
  });

  // Reordenar produtos (drag-and-drop)
  const reordenarProdutos = useMutation({
    mutationFn: async (ids: string[]) => {
      // Atualiza coluna `ordem` em sequência (1..n)
      const updates = ids.map((id, index) =>
        supabase
          .from("vendas_catalogo")
          .update({ ordem: index + 1 })
          .eq("id", id)
      );
      const results = await Promise.all(updates);
      const firstError = results.find((r) => r.error)?.error;
      if (firstError) throw firstError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendas-catalogo"] });
    },
    onError: (error: any) => {
      console.error("Erro ao reordenar produtos:", error);
      toast.error("Erro ao salvar nova ordem");
    },
  });

  // Verificar disponibilidade
  const verificarDisponibilidade = (produtoId: string, quantidadeDesejada: number) => {
    const produto = produtos.find((p) => p.id === produtoId);
    if (!produto) return false;
    return produto.quantidade >= quantidadeDesejada;
  };

  // Buscar produtos em destaque
  const produtosEmDestaque = produtos.filter((p) => p.destaque);

  // Buscar produtos por categoria
  const buscarPorCategoria = (categoria: string) => {
    return produtos.filter((p) => p.categoria === categoria);
  };

  return {
    produtos,
    isLoading,
    adicionarProduto,
    editarProduto,
    inativarProduto,
    reordenarProdutos,
    verificarDisponibilidade,
    produtosEmDestaque,
    buscarPorCategoria,
  };
}
