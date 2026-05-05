import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { useProducaoAuth } from "@/hooks/useProducaoAuth";

type TipoOrdem = 'pintura';

export function useOrdemPintura(onOrdemConcluida?: (pedidoId: string, tipoOrdem: TipoOrdem) => void) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useProducaoAuth();

  // Buscar todas as ordens de pintura
  const { data: ordens = [], isLoading } = useQuery({
    queryKey: ["ordens-pintura", user?.user_id],
    enabled: !!user?.user_id,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: 30_000,
    queryFn: async () => {
      if (!user?.user_id) return [];
      
      // Buscar as ordens, excluindo histórico
      // Todos os usuários veem todas as ordens ativas (não está no histórico)
      const { data: ordensData, error: ordensError } = await supabase
        .from("ordens_pintura")
        .select('*, capturada_em, tempo_conclusao_segundos, em_backlog, prioridade')
        .eq('historico', false)
        .order('prioridade', { ascending: false })
        .order('created_at', { ascending: false });

      if (ordensError) throw ordensError;
      if (!ordensData) return [];

      // Buscar dados relacionados para cada ordem
      const ordensComDados = await Promise.all(
        ordensData.map(async (ordem) => {
          // Buscar pedido com produtos
          const { data: pedido } = await supabase
            .from('pedidos_producao')
            .select(`
              id, 
              numero_pedido, 
              cliente_nome,
              venda_id,
              prioridade_etapa,
              em_backlog,
              observacoes,
              updated_at,
              ficha_visita_url,
              ficha_visita_nome,
              vendas(
                id,
                observacoes_venda,
                produtos:produtos_vendas(
                  id,
                  tipo_produto,
                  cor_id,
                  largura,
                  altura,
                  catalogo_cores(nome, codigo_hex)
                )
              )
            `)
            .eq('id', ordem.pedido_id)
            .maybeSingle();

          // Buscar responsável (apenas se houver responsavel_id)
          let responsavel = null;
          if (ordem.responsavel_id) {
            const { data } = await supabase
              .from('admin_users')
              .select('id, nome')
              .eq('user_id', ordem.responsavel_id)
              .maybeSingle();
            responsavel = data;
          }

          // Processar produtos da venda PRIMEIRO
          const vendasArray = Array.isArray(pedido?.vendas) ? pedido.vendas : [pedido?.vendas];
          const primeiraVenda = vendasArray.length > 0 ? vendasArray[0] : null;
          const produtos = primeiraVenda?.produtos || [];

          // Buscar linhas com nome atualizado do estoque e campo requer_pintura
          const { data: linhasRaw } = await supabase
            .from('linhas_ordens')
            .select(`
              id, item, quantidade, tamanho, concluida, largura, altura, estoque_id, produto_venda_id, indice_porta, cor_nome, tipo_pintura,
              estoque:estoque_id (nome_produto, requer_pintura)
            `)
            .eq('ordem_id', ordem.id)
            .eq('tipo_ordem', 'pintura');
          
          // Buscar linhas do pedido (origem) que têm produto_venda_id para fazer match
          const { data: linhasPedido } = await supabase
            .from('pedido_linhas')
            .select('id, nome_produto, produto_venda_id, quantidade, tamanho')
            .eq('pedido_id', ordem.pedido_id);
          
          // Processar linhas - usar match sequencial para evitar associações duplicadas
          const linhasPedidoUsadas = new Set<string>();

          const linhas = linhasRaw?.map((linha: any) => {
            // Se a linha já tem produto_venda_id, usar direto
            let produtoVendaId = linha.produto_venda_id;
            let linhaOriginal = null;
            
            // Se não tem, buscar nas linhas originais do pedido
            if (!produtoVendaId && linhasPedido) {
              // Encontrar TODAS as linhas que combinam
              const linhasMatch = linhasPedido.filter((lp: any) => 
                !linhasPedidoUsadas.has(lp.id) && // Ainda não usada
                (lp.nome_produto === linha.item || 
                 lp.nome_produto?.includes(linha.item) || 
                 linha.item?.includes(lp.nome_produto) ||
                 linha.estoque?.nome_produto === lp.nome_produto) &&
                lp.quantidade === linha.quantidade
              );
              
              // Se encontrou, usar a primeira NÃO USADA e marcar como usada
              if (linhasMatch.length > 0) {
                linhaOriginal = linhasMatch[0];
                linhasPedidoUsadas.add(linhaOriginal.id);
                produtoVendaId = linhaOriginal.produto_venda_id;
              }
            } else if (linhasPedido) {
              // Se já tem produto_venda_id, ainda buscar linha original para tamanho
              linhaOriginal = linhasPedido.find((lp: any) => 
                !linhasPedidoUsadas.has(lp.id) &&
                lp.produto_venda_id === produtoVendaId &&
                (lp.nome_produto === linha.item || 
                 lp.nome_produto?.includes(linha.item) || 
                 linha.item?.includes(lp.nome_produto) ||
                 linha.estoque?.nome_produto === lp.nome_produto) &&
                lp.quantidade === linha.quantidade
              );
              if (linhaOriginal) {
                linhasPedidoUsadas.add(linhaOriginal.id);
              }
            }
            
            // Buscar dimensões da porta
            const produtoVenda = produtos.find((p: any) => p.id === produtoVendaId);

            return {
              ...linha,
              item: linha.estoque?.nome_produto || linha.item,
              requer_pintura: linha.estoque?.requer_pintura ?? true,
              produto_venda_id: produtoVendaId,
              largura: linha.largura || null,
              altura: linha.altura || null,
              tamanho: linha.tamanho || linhaOriginal?.tamanho || null
            };
          }) || [];

          // Buscar observações da visita técnica
          const { data: observacoesVisita } = await supabase
            .from('pedido_porta_observacoes')
            .select('*')
            .eq('pedido_id', ordem.pedido_id);

          return {
            ...ordem,
            pedido: pedido ? {
              ...pedido,
              vendas: primeiraVenda ? { observacoes_venda: primeiraVenda.observacoes_venda } : undefined,
              produtos,
            } : { id: '', numero_pedido: '', cliente_nome: 'Cliente não encontrado', venda_id: undefined, produtos: [], vendas: undefined },
            admin_users: responsavel,
            linhas: linhas || [],
            observacoesVisita: observacoesVisita || [],
          };
        })
      );

      return ordensComDados;
    },
  });

  // Subscribe to realtime updates for linhas_ordens
  useEffect(() => {
    if (!user?.user_id) return;

    const channel = supabase
      .channel('linhas-ordens-pintura-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'linhas_ordens',
          filter: 'tipo_ordem=eq.pintura'
        },
        () => {
          // Invalidate queries on any update to refresh data
          queryClient.invalidateQueries({ queryKey: ['ordens-pintura'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, user?.user_id]);

  // Filtrar ordens por status e ordenar pela prioridade do PEDIDO
  const ordensParaPintar = ordens
    .filter((o: any) => o.status === 'pendente')
    .sort((a: any, b: any) => {
      // Ordenar por prioridade do PEDIDO (maior primeiro)
      const aPrio = a.pedido?.prioridade_etapa || 0;
      const bPrio = b.pedido?.prioridade_etapa || 0;
      if (bPrio !== aPrio) return bPrio - aPrio;
      // Desempate por created_at (mais antiga primeiro)
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  
  const ordensProntas = ordens.filter((o: any) => o.status === 'pronta');

  // Capturar ordem (atribuir responsável)
  const capturarOrdem = useMutation({
    mutationFn: async (ordemId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Verificar limite de 3 ordens capturadas
      const { count, error: countError } = await supabase
        .from('ordens_pintura')
        .select('*', { count: 'exact', head: true })
        .eq('responsavel_id', user.id)
        .eq('historico', false);

      if (countError) throw countError;
      if (count !== null && count >= 3) {
        throw new Error('Você já possui 3 ordens capturadas. Finalize uma antes de capturar outra.');
      }

      // Verificar se a ordem está em backlog
      const { data: ordemAtual } = await supabase
        .from("ordens_pintura")
        .select('em_backlog, capturada_em')
        .eq('id', ordemId)
        .maybeSingle() as { data: { em_backlog?: boolean; capturada_em?: string } | null };
      
      // Se está em backlog e já tem capturada_em, manter o tempo original
      const updateData: any = {
        responsavel_id: user.id,
      };
      
      // Só atualizar capturada_em se NÃO estiver em backlog ou se ainda não tiver sido capturada
      if (!ordemAtual?.em_backlog || !ordemAtual?.capturada_em) {
        updateData.capturada_em = new Date().toISOString();
      }

      const { error } = await supabase
        .from("ordens_pintura")
        .update(updateData)
        .eq("id", ordemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ordens-pintura"] });
      toast({
        title: "Ordem capturada",
        description: "Você agora é responsável por esta ordem",
      });
    },
    onError: (error: any) => {
      console.error("Erro ao capturar ordem:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível capturar a ordem",
        variant: "destructive",
      });
    },
  });


  // Finalizar pintura (pintando -> pronta)
  const finalizarPintura = useMutation({
    mutationFn: async (ordemId: string) => {
      // Verificar se todas as linhas estão concluídas (se existirem)
      const { data: linhas } = await supabase
        .from("linhas_ordens")
        .select("concluida")
        .eq("ordem_id", ordemId)
        .eq("tipo_ordem", "pintura");

      // Só verificar linhas se existirem
      if (linhas && linhas.length > 0 && linhas.some((l: any) => !l.concluida)) {
        throw new Error("Todas as linhas devem estar marcadas como concluídas");
      }

      // Buscar ordem completa para pegar pedido_id e capturada_em
      const { data: ordem, error: ordemError } = await supabase
        .from("ordens_pintura")
        .select("capturada_em, pedido_id")
        .eq("id", ordemId)
        .single();

      if (ordemError) {
        console.error("[finalizarPintura] Erro ao buscar ordem:", ordemError);
        throw ordemError;
      }

      if (!ordem?.pedido_id) {
        console.error("[finalizarPintura] pedido_id não encontrado na ordem");
        throw new Error("Pedido não encontrado para esta ordem");
      }

      let tempo_conclusao_segundos = null;
      if (ordem?.capturada_em) {
        const captura = new Date(ordem.capturada_em);
        const agora = new Date();
        tempo_conclusao_segundos = Math.floor((agora.getTime() - captura.getTime()) / 1000);
      }

      const { error } = await supabase
        .from("ordens_pintura")
        .update({ 
          status: 'pronta',
          data_conclusao: new Date().toISOString(),
          tempo_conclusao_segundos,
          historico: true, // Enviar para histórico ao finalizar
        })
        .eq("id", ordemId);

      if (error) throw error;
      
      console.log("[finalizarPintura] Ordem finalizada, pedido_id:", ordem.pedido_id);
      return ordem.pedido_id;
    },
    onSuccess: (pedidoId) => {
      queryClient.invalidateQueries({ queryKey: ["ordens-pintura"] });
      queryClient.invalidateQueries({ queryKey: ["ordens-count"] });
      toast({
        title: "Pintura finalizada",
        description: "A ordem foi concluída e está pronta",
      });

      // Tentar avanço automático do pedido
      console.log("[finalizarPintura] onSuccess - pedidoId:", pedidoId, "onOrdemConcluida:", !!onOrdemConcluida);
      if (pedidoId && onOrdemConcluida) {
        console.log("[finalizarPintura] Chamando onOrdemConcluida...");
        onOrdemConcluida(pedidoId, 'pintura');
      }
    },
    onError: (error: any) => {
      console.error("Erro ao finalizar pintura:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível finalizar a pintura",
        variant: "destructive",
      });
    },
  });

  // Marcar linha como concluída
  const marcarLinhaConcluida = useMutation({
    mutationFn: async ({ linhaId, concluida }: { linhaId: string; concluida: boolean }) => {
      const currentUserId = user?.user_id;
      if (!currentUserId) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from("linhas_ordens")
        .update({
          concluida,
          concluida_em: concluida ? new Date().toISOString() : null,
          concluida_por: concluida ? currentUserId : null,
        })
        .eq("id", linhaId)
        .select();

      if (error) throw error;
      return { linhaId, concluida };
    },
    onMutate: async ({ linhaId, concluida }) => {
      // Cancelar queries pendentes
      await queryClient.cancelQueries({ queryKey: ["ordens-pintura"] });
      await queryClient.cancelQueries({ queryKey: ["ordens-pintura", user?.user_id] });

      // Snapshot do valor anterior
      const previousOrdens = queryClient.getQueryData(["ordens-pintura", user?.user_id]);

      // Atualizar otimisticamente
      queryClient.setQueryData(["ordens-pintura", user?.user_id], (old: any[] = []) => {
        return old.map(ordem => ({
          ...ordem,
          linhas: ordem.linhas?.map((linha: any) =>
            linha.id === linhaId
              ? { ...linha, concluida }
              : linha
          ) || []
        }));
      });

      return { previousOrdens };
    },
    onError: (error, variables, context) => {
      // Reverter em caso de erro
      if (context?.previousOrdens) {
        queryClient.setQueryData(["ordens-pintura", user?.user_id], context.previousOrdens);
      }
      console.error("Erro ao marcar linha:", error);
      toast({
        title: "Erro",
        description: (error as any)?.message || "Não foi possível atualizar a linha",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      // Invalidar queries para refetch
      queryClient.invalidateQueries({ queryKey: ["ordens-pintura"] });
    },
  });

  // Enviar ordem para histórico
  const enviarParaHistorico = useMutation({
    mutationFn: async (ordemId: string) => {
      const { error } = await supabase
        .from("ordens_pintura" as any)
        .update({ historico: true })
        .eq("id", ordemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ordens-pintura"] });
      queryClient.invalidateQueries({ queryKey: ["historico-ordens"] });
      toast({
        title: "Ordem enviada para histórico",
        description: "A ordem não aparecerá mais na lista de produção",
      });
    },
    onError: (error: any) => {
      console.error("Erro ao enviar ordem para histórico:", error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar a ordem para o histórico",
        variant: "destructive",
      });
    },
  });

  return {
    ordens,
    ordensParaPintar,
    ordensProntas,
    isLoading,
    capturarOrdem,
    finalizarPintura,
    marcarLinhaConcluida,
    enviarParaHistorico,
  };
}
