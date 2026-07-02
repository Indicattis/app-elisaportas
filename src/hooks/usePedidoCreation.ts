import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { gerarProximoNumero, formatarNumeroPedido } from '@/utils/numberingService';

export const usePedidoCreation = () => {
  const checkExistingPedido = async (vendaId: string): Promise<string | null> => {
    try {
      const { data: pedidoExistente } = await supabase
        .from('pedidos_producao')
        .select('id, numero_pedido')
        .eq('venda_id', vendaId)
        .maybeSingle();

      return pedidoExistente?.id || null;
    } catch (error) {
      console.error('Error checking existing pedido:', error);
      return null;
    }
  };

  const createPedidoFromVenda = async (vendaId: string): Promise<string | null> => {
    try {
      // Buscar dados da venda
      const { data: venda, error: vendaError } = await supabase
        .from('vendas')
        .select('*, pagamento_na_entrega, valor_venda, metodo_pagamento, numero_pedido')
        .eq('id', vendaId)
        .single();

      if (vendaError) throw vendaError;
      if (!venda) throw new Error('Venda não encontrada');

      // Buscar produtos da venda para determinar o tipo
      const { data: produtos, error: produtosError } = await supabase
        .from('produtos_vendas')
        .select('tipo_produto')
        .eq('venda_id', vendaId);

      if (produtosError) throw produtosError;

      // Verificar se é apenas manutenção
      const apenasManutencao = produtos && produtos.length > 0 && 
        produtos.every(p => p.tipo_produto === 'manutencao');

      // Buscar usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Reutilizar número já cadastrado na venda; senão gerar (fallback legado)
      let numeroPedido = (venda as any).numero_pedido as string | null;
      if (!numeroPedido) {
        const numeroSequencial = await gerarProximoNumero('pedido');
        numeroPedido = formatarNumeroPedido(numeroSequencial);
      }

      // Gerar número mensal (reinicia todo mês)
      const { data: numeroMesData } = await supabase.rpc('gerar_proximo_numero_mes');
      const numeroMes = numeroMesData?.[0]?.numero || 1;
      const mesVigencia = numeroMesData?.[0]?.mes;

      // Definir etapa e status inicial baseado no tipo de produto
      // Pedidos normais passam por Aprovação Diretor antes de ir para Aberto
      const etapaInicial = apenasManutencao ? 'instalacoes' : 'aprovacao_diretor';
      const statusInicial = apenasManutencao ? 'instalacoes' : 'aprovacao_diretor';

      // Criar pedido
      const { data: pedido, error: pedidoError } = await supabase
        .from('pedidos_producao')
        .insert({
          venda_id: vendaId as any,
          numero_pedido: numeroPedido,
          numero_mes: numeroMes,
          mes_vigencia: mesVigencia,
          cliente_nome: venda.cliente_nome,
          cliente_telefone: venda.cliente_telefone,
          cliente_email: venda.cliente_email,
          etapa_atual: etapaInicial,
          status: statusInicial,
          created_by: user.id,
          prioridade_etapa: 0,
        } as any)
        .select()
        .single();

      if (pedidoError) throw pedidoError;

      // Criar etapa inicial
      const { error: etapaError } = await supabase
        .from('pedidos_etapas')
        .insert({
          pedido_id: pedido.id,
          etapa: etapaInicial,
          checkboxes: [],
        });

      if (etapaError) throw etapaError;

      // Registrar movimentação de criação no histórico
      await supabase.from('pedidos_movimentacoes').insert({
        pedido_id: pedido.id,
        user_id: user.id,
        etapa_destino: etapaInicial,
        teor: 'criacao',
        descricao: apenasManutencao 
          ? `Pedido de manutenção criado - direto para expedição instalação`
          : `Pedido criado a partir da venda ${venda.cliente_nome}`
      });

      // Se for apenas manutenção, criar registros de instalação e ordem de carregamento
      if (apenasManutencao) {
        // Criar instalação com dados de pagamento na entrega
        const { error: instalacaoError } = await supabase
          .from('instalacoes')
          .insert({
            pedido_id: pedido.id,
            venda_id: vendaId,
            nome_cliente: venda.cliente_nome,
            hora: '08:00',
            status: 'pronta_fabrica',
            tipo_instalacao: 'elisa',
            created_by: user.id,
            valor_pagamento_entrega: venda.pagamento_na_entrega ? venda.valor_venda : 0,
            metodo_pagamento_entrega: venda.pagamento_na_entrega ? venda.metodo_pagamento : null
          });

        if (instalacaoError) {
          console.error('Error creating instalacao:', instalacaoError);
        }

        // Criar ordem de carregamento
        const { error: ordemError } = await supabase
          .from('ordens_carregamento')
          .insert({
            pedido_id: pedido.id,
            venda_id: vendaId,
            nome_cliente: venda.cliente_nome,
            hora: '08:00',
            status: 'pronta_fabrica',
            tipo_carregamento: null,
            created_by: user.id,
            data_carregamento: null
          });

        if (ordemError) {
          console.error('Error creating ordem_carregamento:', ordemError);
        }
      }

      toast.success(`Pedido ${numeroPedido} criado com sucesso!`);
      return pedido.id;
    } catch (error) {
      console.error('Error creating pedido:', error);
      toast.error('Erro ao criar pedido de produção');
      return null;
    }
  };

  return { createPedidoFromVenda, checkExistingPedido };
};
