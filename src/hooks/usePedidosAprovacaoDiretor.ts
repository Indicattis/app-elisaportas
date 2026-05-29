import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ProdutoAprovacao {
  id: string;
  tipo_produto: string;
  descricao?: string;
  largura?: number;
  altura?: number;
  tamanho?: string;
  quantidade: number;
  valor: number;
  preco_producao?: number;
  valor_pintura?: number;
  valor_instalacao?: number;
  cor?: { nome: string; codigo_hex: string } | null;
  acessorio?: { nome: string } | null;
}

export interface PedidoAprovacaoDiretor {
  id: string;
  numero_pedido: string;
  cliente_nome: string;
  created_at: string;
  venda_id: string;
  venda: {
    id: string;
    cliente_nome: string;
    valor_venda: number;
    tipo_entrega: string;
    cidade: string | null;
    estado: string | null;
  };
  produtos: ProdutoAprovacao[];
}

export function usePedidosAprovacaoDiretor() {
  const queryClient = useQueryClient();

  const { data: pedidos = [], isLoading, refetch } = useQuery({
    queryKey: ['pedidos-aprovacao-diretor'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pedidos_producao')
        .select(`
          id, numero_pedido, cliente_nome, created_at, venda_id,
          vendas!pedidos_producao_venda_id_fkey (
            id, cliente_nome, valor_venda, tipo_entrega, cidade, estado
          )
        `)
        .eq('etapa_atual', 'aprovacao_diretor')
        .eq('arquivado', false)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch products for each pedido
      const vendaIds = (data || []).map((p: any) => {
        const venda = Array.isArray(p.vendas) ? p.vendas[0] : p.vendas;
        return venda?.id;
      }).filter(Boolean);

      let produtosMap: Record<string, any[]> = {};
      if (vendaIds.length > 0) {
        const { data: produtos } = await supabase
          .from('produtos_vendas')
          .select(`
            id, tipo_produto, descricao, largura, altura, tamanho, quantidade, valor,
            preco_producao, valor_pintura, valor_instalacao,
            catalogo_cores (nome, codigo_hex),
            acessorios (nome),
            custos_itens (descricao)
          `)
          .in('venda_id', vendaIds);

        if (produtos) {
          // Group by venda_id - need to refetch with venda_id
          const { data: produtosWithVenda } = await supabase
            .from('produtos_vendas')
            .select('id, venda_id')
            .in('venda_id', vendaIds);

          const vendaIdMap: Record<string, string> = {};
          produtosWithVenda?.forEach((p: any) => { vendaIdMap[p.id] = p.venda_id; });

          produtos.forEach((p: any) => {
            const vid = vendaIdMap[p.id];
            if (vid) {
              if (!produtosMap[vid]) produtosMap[vid] = [];
              produtosMap[vid].push({
                ...p,
                cor: p.catalogo_cores,
                acessorio: p.acessorios,
                custos_itens: p.custos_itens,
              });
            }
          });
        }
      }

      return (data || []).map((p: any) => {
        const venda = Array.isArray(p.vendas) ? p.vendas[0] : p.vendas;
        return {
          id: p.id,
          numero_pedido: p.numero_pedido,
          cliente_nome: p.cliente_nome,
          created_at: p.created_at,
          venda_id: venda?.id || p.venda_id,
          venda: venda || {},
          produtos: produtosMap[venda?.id] || [],
        } as PedidoAprovacaoDiretor;
      });
    },
  });

  const aprovarPedido = useMutation({
    mutationFn: async (pedidoId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      // Move to 'aberto' stage
      const { error: updateError } = await supabase
        .from('pedidos_producao')
        .update({ etapa_atual: 'aberto' } as any)
        .eq('id', pedidoId);
      if (updateError) throw updateError;

      // Create/upsert pedidos_etapas for 'aberto'
      const { error: etapaError } = await supabase
        .from('pedidos_etapas')
        .upsert({
          pedido_id: pedidoId,
          etapa: 'aberto',
          checkboxes: [],
          data_entrada: new Date().toISOString(),
          data_saida: null,
        }, { onConflict: 'pedido_id,etapa' });
      if (etapaError) throw etapaError;

      // Close aprovacao_diretor etapa
      await supabase
        .from('pedidos_etapas')
        .update({ data_saida: new Date().toISOString() })
        .eq('pedido_id', pedidoId)
        .eq('etapa', 'aprovacao_diretor');

      // Log movement
      await supabase.from('pedidos_movimentacoes').insert({
        pedido_id: pedidoId,
        user_id: user.id,
        etapa_origem: 'aprovacao_diretor',
        etapa_destino: 'aberto',
        teor: 'avanco',
        descricao: 'Pedido aprovado pelo diretor',
      });
    },
    onSuccess: () => {
      toast.success('Pedido aprovado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['pedidos-aprovacao-diretor'] });
      queryClient.invalidateQueries({ queryKey: ['pedidos-etapas'] });
      queryClient.invalidateQueries({ queryKey: ['pedidos-contadores'] });
    },
    onError: () => toast.error('Erro ao aprovar pedido'),
  });

  const reprovarPedido = useMutation({
    mutationFn: async (pedidoId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      // Get venda_id
      const { data: pedido } = await supabase
        .from('pedidos_producao')
        .select('venda_id')
        .eq('id', pedidoId)
        .single();
      if (!pedido?.venda_id) throw new Error('Venda não encontrada');

      // Update venda status
      await supabase
        .from('vendas')
        .update({ status_aprovacao: 'reprovado' } as any)
        .eq('id', pedido.venda_id as string);

      // Log movement before deletion
      await supabase.from('pedidos_movimentacoes').insert({
        pedido_id: pedidoId,
        user_id: user.id,
        etapa_origem: 'aprovacao_diretor',
        etapa_destino: 'reprovado',
        teor: 'reprovacao',
        descricao: 'Pedido reprovado pelo diretor',
      });

      // Archive the pedido
      await supabase
        .from('pedidos_producao')
        .update({ arquivado: true, data_arquivamento: new Date().toISOString(), arquivado_por: user.id })
        .eq('id', pedidoId);
    },
    onSuccess: () => {
      toast.success('Pedido reprovado');
      queryClient.invalidateQueries({ queryKey: ['pedidos-aprovacao-diretor'] });
      queryClient.invalidateQueries({ queryKey: ['pedidos-etapas'] });
      queryClient.invalidateQueries({ queryKey: ['pedidos-contadores'] });
    },
    onError: () => toast.error('Erro ao reprovar pedido'),
  });

  return { pedidos, isLoading, refetch, aprovarPedido, reprovarPedido };
}
