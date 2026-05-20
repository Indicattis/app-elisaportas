import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ProdutoVenda } from "./useVendas";

export const useProdutosVenda = (vendaId?: string) => {
  const queryClient = useQueryClient();

  // Buscar produtos de uma venda específica
  const { data: produtos, isLoading, refetch } = useQuery({
    queryKey: ['produtos-venda', vendaId],
    queryFn: async () => {
      if (!vendaId) return [];
      
      const { data, error } = await supabase
        .from('produtos_vendas')
        .select(`
          *,
          catalogo_cores(nome, codigo_hex),
          vendas_catalogo(unidade)
        `)
        .eq('venda_id', vendaId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      // Expor unidade do catálogo no nível do produto para renderização.
      return (data || []).map((p: any) => ({
        ...p,
        unidade: p.vendas_catalogo?.unidade ?? p.unidade ?? null,
      }));
    },
    enabled: !!vendaId,
  });

  // Adicionar produto
  const addProdutoMutation = useMutation({
    mutationFn: async (produto: ProdutoVenda & { venda_id: string }) => {
      // Remover campos que nao existem na tabela produtos_vendas
      const { unidade, ...produtoSemExtra } = produto as any;
      
      const produtoLimpo = {
        ...produtoSemExtra,
        tamanho: produtoSemExtra.tamanho || (produtoSemExtra.largura && produtoSemExtra.altura ? `${produtoSemExtra.largura}x${produtoSemExtra.altura}` : ''),
        largura: produtoSemExtra.largura || null,
        altura: produtoSemExtra.altura || null,
        cor_id: produtoSemExtra.cor_id || null,
        acessorio_id: produtoSemExtra.acessorio_id || null,
        adicional_id: produtoSemExtra.adicional_id || null,
        vendas_catalogo_id: produtoSemExtra.vendas_catalogo_id || null,
        descricao: produtoSemExtra.tipo_produto === 'porta_enrolar' ? 'Porta de Enrolar' : (produtoSemExtra.tipo_produto === 'instalacao' ? (produtoSemExtra.descricao || 'Instalação') : (produtoSemExtra.descricao || null)),
        observacao_item: produtoSemExtra.observacao_item ?? null,
      };

      const { data, error } = await supabase
        .from('produtos_vendas')
        .insert([produtoLimpo])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['produtos-venda'] });
      queryClient.invalidateQueries({ queryKey: ['vendas'] });
      toast.success("Produto adicionado com sucesso!");
    },
    onError: (error: any) => {
      console.error('Erro ao adicionar produto:', error);
      toast.error("Erro ao adicionar produto");
    },
  });

  // Remover produto
  const deleteProdutoMutation = useMutation({
    mutationFn: async (produtoId: string) => {
      const { error } = await supabase
        .from('produtos_vendas')
        .delete()
        .eq('id', produtoId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['produtos-venda'] });
      queryClient.invalidateQueries({ queryKey: ['vendas'] });
      toast.success("Produto removido com sucesso!");
    },
    onError: (error: any) => {
      console.error('Erro ao remover produto:', error);
      toast.error("Erro ao remover produto");
    },
  });

  // Atualizar lucro do produto
  const updateLucroItemMutation = useMutation({
    mutationFn: async ({ 
      produtoId, 
      lucroItem,
      custoProducao,
      faturamento
    }: { 
      produtoId: string; 
      lucroItem: number;
      custoProducao: number;
      faturamento?: boolean;
    }) => {
      // Simplesmente atualizar os valores sem recalcular
      const updatePayload: any = { 
        lucro_item: lucroItem,
        custo_producao: custoProducao
      };
      if (faturamento !== undefined) updatePayload.faturamento = faturamento;
      const { data, error } = await supabase
        .from('produtos_vendas')
        .update(updatePayload)
        .eq('id', produtoId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['produtos-venda'] });
      queryClient.invalidateQueries({ queryKey: ['vendas'] });
      toast.success("Lucro atualizado com sucesso!");
    },
    onError: (error: any) => {
      console.error('Erro ao atualizar lucro:', error);
      toast.error("Erro ao atualizar lucro");
    },
  });

  // Atualizar produto (desconto, crédito, etc.)
  const updateProdutoMutation = useMutation({
    mutationFn: async ({ 
      produtoId, 
      updates 
    }: { 
      produtoId: string; 
      updates: Partial<{
        tipo_desconto: 'percentual' | 'valor';
        desconto_percentual: number;
        desconto_valor: number;
        valor_produto: number;
        valor_pintura: number;
        valor_instalacao: number;
        quantidade: number;
        observacao_item: string | null;
      }>;
    }) => {
      const { data, error } = await supabase
        .from('produtos_vendas')
        .update(updates)
        .eq('id', produtoId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['produtos-venda'] });
      queryClient.invalidateQueries({ queryKey: ['vendas'] });
    },
    onError: (error: any) => {
      console.error('Erro ao atualizar produto:', error);
      toast.error("Erro ao atualizar produto");
    },
  });

  // Mutation para finalizar faturamento da venda
  const finalizarFaturamentoMutation = useMutation({
    mutationFn: async ({ 
      vendaId, 
      custoTotal, 
      lucroTotal,
      produtosIds,
      lucroInstalacao = 0,
      custoInstalacao = 0,
      valorAReceber,
    }: { 
      vendaId: string; 
      custoTotal: number; 
      lucroTotal: number;
      produtosIds: string[];
      lucroInstalacao?: number;
      custoInstalacao?: number;
      valorAReceber?: number;
    }) => {
      // Atualizar venda com lucro total (produtos + instalação)
      const lucroTotalFinal = lucroTotal + lucroInstalacao;
      
      const updateData: any = { 
        custo_total: custoTotal + custoInstalacao,
        lucro_total: lucroTotalFinal,
        frete_aprovado: true,
        lucro_instalacao: lucroInstalacao > 0 ? lucroInstalacao : null,
        custo_instalacao: custoInstalacao > 0 ? custoInstalacao : null,
        instalacao_faturada: lucroInstalacao > 0,
      };

      if (valorAReceber !== undefined && valorAReceber > 0) {
        updateData.valor_a_receber = valorAReceber;
        updateData.valor_a_receber_faturamento = true;
      }

      const { error: vendaError } = await supabase
        .from('vendas')
        .update(updateData)
        .eq('id', vendaId);

      if (vendaError) throw vendaError;

      // Marcar TODOS os produtos como faturados
      const { error: produtosError } = await supabase
        .from('produtos_vendas')
        .update({ faturamento: true })
        .in('id', produtosIds);

      if (produtosError) throw produtosError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendas'] });
      queryClient.invalidateQueries({ queryKey: ['produtos-venda'] });
      toast.success("Faturamento finalizado com sucesso!");
    },
    onError: (error: any) => {
      console.error('Erro ao finalizar faturamento:', error);
      toast.error("Erro ao finalizar faturamento");
    },
  });

  return {
    produtos: produtos || [],
    isLoading,
    refetch,
    addProduto: addProdutoMutation.mutate,
    isAdding: addProdutoMutation.isPending,
    deleteProduto: deleteProdutoMutation.mutate,
    isDeleting: deleteProdutoMutation.isPending,
    updateProduto: updateProdutoMutation.mutateAsync,
    isUpdating: updateProdutoMutation.isPending,
    updateLucroItem: updateLucroItemMutation.mutate,
    isUpdatingLucro: updateLucroItemMutation.isPending,
    finalizarFaturamento: finalizarFaturamentoMutation.mutateAsync,
    isFinalizandoFaturamento: finalizarFaturamentoMutation.isPending,
  };
};
