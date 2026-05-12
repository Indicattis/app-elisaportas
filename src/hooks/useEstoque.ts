import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface MovimentacaoEstoque {
  id: string;
  produto_id: string;
  tipo_movimentacao: 'entrada' | 'saida' | 'alteracao_categoria';
  quantidade: number;
  quantidade_anterior: number;
  quantidade_nova: number;
  observacoes: string | null;
  categoria_anterior: string | null;
  categoria_nova: string | null;
  created_by: string | null;
  created_at: string;
}

export interface ProdutoEstoque {
  id: string;
  sku: string | null;
  nome_produto: string;
  descricao_produto: string | null;
  quantidade: number;
  unidade: string;
  categoria: string;
  ativo: boolean;
  custo_unitario: number;
  subcategoria_id: string | null;
  peso_porta: number | null;
  setor_responsavel_producao: 'perfiladeira' | 'soldagem' | 'separacao' | 'pintura' | null;
  fornecedor_id: string | null;
  quantidade_ideal: number;
  quantidade_maxima: number;
  requer_pintura: boolean;
  pontuacao_producao: number;
  codigo_fornecedor: string | null;
  ipi_percent: number;
  // Novos campos de cálculo automático
  modulo_calculo: 'acrescimo' | 'desconto' | null;
  valor_calculo: number | null;
  eixo_calculo: 'largura' | 'altura' | null;
  item_padrao_porta_enrolar: boolean;
  conferir_estoque: boolean;
  quantidade_padrao: number;
  qtd_eixo_calculo: 'largura' | 'altura' | 'qtd_meia_cana' | null;
  qtd_operador: 'multiplicar' | 'dividir' | 'somar' | 'subtrair' | null;
  qtd_valor_calculo: number | null;
  qtd_modo_calculo?: 'formula' | 'por_tamanho';
  qtd_porta_p?: number | null;
  qtd_porta_g?: number | null;
  qtd_porta_gg?: number | null;
  materia_prima_id: string | null;
  materia_prima_conversao: number | null;
  subcategoria?: {
    id: string;
    nome: string;
  } | null;
  fornecedor?: {
    id: string;
    nome: string;
  } | null;
  materia_prima?: {
    id: string;
    nome: string;
    unidade: string;
  } | null;
}

export interface ProdutoEstoqueInput {
  nome_produto: string;
  descricao_produto?: string;
  quantidade?: number;
  unidade?: string;
  categoria?: string;
  custo_unitario?: number;
  subcategoria_id?: string | null;
  peso_porta?: number | null;
  setor_responsavel_producao?: 'perfiladeira' | 'soldagem' | 'separacao' | 'pintura' | null;
  fornecedor_id?: string | null;
  quantidade_ideal?: number;
  quantidade_maxima?: number;
  requer_pintura?: boolean;
  pontuacao_producao?: number;
  codigo_fornecedor?: string | null;
  ipi_percent?: number;
  // Novos campos de cálculo automático
  modulo_calculo?: 'acrescimo' | 'desconto' | null;
  valor_calculo?: number | null;
  eixo_calculo?: 'largura' | 'altura' | null;
  item_padrao_porta_enrolar?: boolean;
  conferir_estoque?: boolean;
  quantidade_padrao?: number;
  qtd_eixo_calculo?: 'largura' | 'altura' | 'qtd_meia_cana' | null;
  qtd_operador?: 'multiplicar' | 'dividir' | 'somar' | 'subtrair' | null;
  qtd_valor_calculo?: number | null;
  qtd_modo_calculo?: 'formula' | 'por_tamanho';
  qtd_porta_p?: number | null;
  qtd_porta_g?: number | null;
  qtd_porta_gg?: number | null;
  materia_prima_id?: string | null;
  materia_prima_conversao?: number | null;
}

export const useEstoque = (termoBuscaInicial: string = "", setorFiltro: 'perfiladeira' | 'soldagem' | 'separacao' | 'pintura' | null = null) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState(termoBuscaInicial);

  const { data: produtos = [], isLoading } = useQuery({
    queryKey: ["estoque", searchTerm, setorFiltro],
    queryFn: async () => {
      let query = supabase
        .from("estoque")
        .select(`
          *,
          subcategoria:estoque_subcategorias(id, nome),
          fornecedor:fornecedores(id, nome),
          materia_prima:materias_primas(id, nome, unidade)
        `)
        .eq("ativo", true)
        .order("ordem", { ascending: true });

      if (searchTerm) {
        query = query.or(
          `nome_produto.ilike.%${searchTerm}%,descricao_produto.ilike.%${searchTerm}%,sku.ilike.%${searchTerm}%`
        );
      }

      if (setorFiltro) {
        query = query.eq("setor_responsavel_producao", setorFiltro);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as ProdutoEstoque[];
    },
  });

  const adicionarProduto = useMutation({
    mutationFn: async (produto: ProdutoEstoqueInput) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from("estoque")
        .insert({
          ...produto,
          created_by: userData?.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["estoque"] });
      toast({
        title: "Produto adicionado",
        description: "O produto foi adicionado ao estoque com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao adicionar produto",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const movimentarEstoque = useMutation({
    mutationFn: async ({ 
      produtoId, 
      tipo, 
      quantidade, 
      observacoes 
    }: { 
      produtoId: string; 
      tipo: 'entrada' | 'saida'; 
      quantidade: number; 
      observacoes?: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      
      // Buscar quantidade atual
      const { data: produto, error: produtoError } = await supabase
        .from("estoque")
        .select("quantidade")
        .eq("id", produtoId)
        .single();

      if (produtoError) throw produtoError;

      const quantidadeAnterior = produto.quantidade;
      const quantidadeNova = tipo === 'entrada' 
        ? quantidadeAnterior + quantidade 
        : quantidadeAnterior - quantidade;

      if (quantidadeNova < 0) {
        throw new Error("Quantidade insuficiente em estoque");
      }

      // Atualizar estoque
      const { error: updateError } = await supabase
        .from("estoque")
        .update({ quantidade: quantidadeNova })
        .eq("id", produtoId);

      if (updateError) throw updateError;

      // Registrar movimentação
      const { error: movError } = await supabase
        .from("estoque_movimentacoes")
        .insert({
          produto_id: produtoId,
          tipo_movimentacao: tipo,
          quantidade,
          quantidade_anterior: quantidadeAnterior,
          quantidade_nova: quantidadeNova,
          observacoes,
          created_by: userData?.user?.id,
        });

      if (movError) throw movError;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["estoque"] });
      queryClient.invalidateQueries({ queryKey: ["movimentacoes"] });
      toast({
        title: "Movimentação registrada",
        description: `${variables.tipo === 'entrada' ? 'Entrada' : 'Saída'} de ${variables.quantidade} unidades registrada com sucesso.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro na movimentação",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const alterarCategoria = useMutation({
    mutationFn: async ({ 
      produtoId, 
      novaCategoria 
    }: { 
      produtoId: string; 
      novaCategoria: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      
      // Buscar categoria atual
      const { data: produto, error: produtoError } = await supabase
        .from("estoque")
        .select("categoria")
        .eq("id", produtoId)
        .maybeSingle();

      if (produtoError) throw produtoError;
      if (!produto) throw new Error("Produto não encontrado");

      const categoriaAnterior = produto.categoria;

      if (categoriaAnterior === novaCategoria) {
        throw new Error("A categoria selecionada já é a atual");
      }

      // Atualizar categoria
      const { error: updateError } = await supabase
        .from("estoque")
        .update({ categoria: novaCategoria })
        .eq("id", produtoId);

      if (updateError) throw updateError;

      // Registrar alteração no log
      const { error: logError } = await supabase
        .from("estoque_movimentacoes")
        .insert({
          produto_id: produtoId,
          tipo_movimentacao: 'alteracao_categoria',
          quantidade: 0,
          quantidade_anterior: 0,
          quantidade_nova: 0,
          categoria_anterior: categoriaAnterior,
          categoria_nova: novaCategoria,
          created_by: userData?.user?.id,
        });

      if (logError) throw logError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["estoque"] });
      queryClient.invalidateQueries({ queryKey: ["movimentacoes"] });
      toast({
        title: "Categoria alterada",
        description: "A categoria do produto foi alterada com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao alterar categoria",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const buscarMovimentacoes = (produtoId?: string) => {
    return useQuery({
      queryKey: ["movimentacoes", produtoId],
      queryFn: async () => {
        let query = supabase
          .from("estoque_movimentacoes")
          .select("*")
          .order("created_at", { ascending: false });

        if (produtoId) {
          query = query.eq("produto_id", produtoId);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data as MovimentacaoEstoque[];
      },
    });
  };

  const editarProduto = useMutation({
    mutationFn: async ({ id, ...produto }: ProdutoEstoqueInput & { id: string }) => {
      const { data, error } = await supabase
        .from("estoque")
        .update(produto)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["estoque"] });
      toast({
        title: "Produto atualizado",
        description: "O produto foi atualizado com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar produto",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const excluirProduto = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("estoque")
        .update({ ativo: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["estoque"] });
      toast({
        title: "Produto excluído",
        description: "O produto foi excluído com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir produto",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const reordenarProdutos = useMutation({
    mutationFn: async (items: { id: string; ordem: number }[]) => {
      // Update each item's ordem
      for (const item of items) {
        const { error } = await supabase
          .from("estoque")
          .update({ ordem: item.ordem })
          .eq("id", item.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["estoque"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao reordenar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const buscarProdutos = async (termo: string) => {
    setSearchTerm(termo);
  };

  return {
    produtos,
    loading: isLoading,
    buscarProdutos,
    adicionarProduto: adicionarProduto.mutateAsync,
    editarProduto: editarProduto.mutateAsync,
    excluirProduto: excluirProduto.mutateAsync,
    movimentarEstoque: movimentarEstoque.mutateAsync,
    alterarCategoria: alterarCategoria.mutateAsync,
    buscarMovimentacoes,
    reordenarProdutos: reordenarProdutos.mutateAsync,
  };
};
