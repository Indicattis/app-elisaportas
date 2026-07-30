import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { calcularTempoExpediente } from "@/utils/calcularTempoExpediente";
import { useProducaoAuth } from "@/hooks/useProducaoAuth";

type TipoOrdem = 'soldagem' | 'perfiladeira' | 'separacao' | 'qualidade';

interface LinhaOrdem {
  id: string;
  item: string;
  quantidade: number;
  tamanho?: string;
  concluida: boolean;
  concluida_em?: string;
  concluida_por?: string;
  estoque_id?: string;
  largura?: number;
  altura?: number;
  com_problema?: boolean;
  problema_descricao?: string;
  problema_reportado_em?: string;
  problema_reportado_por?: string;
}

interface ObservacaoVisita {
  id: string;
  produto_venda_id: string;
  indice_porta: number;
  interna_externa: string;
  lado_motor: string;
  posicao_guia: string;
  opcao_guia: string;
  aparencia_testeira: string;
  opcao_tubo: string;
  opcao_rolo: string;
  tubo_tiras_frontais: string;
  retirada_porta: boolean;
}

interface Ordem {
  id: string;
  numero_ordem: string;
  pedido_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  data_conclusao?: string;
  observacoes?: string;
  responsavel_id?: string;
  em_backlog?: boolean;
  prioridade?: number;
  linhas?: LinhaOrdem[];
  observacoesVisita?: ObservacaoVisita[];
  pedido?: {
    id: string;
    numero_pedido: string;
    cliente_nome: string;
    venda_id?: string;
    vendas?: {
      data_prevista_entrega?: string;
      observacoes_venda?: string;
    };
  };
  admin_users?: {
    nome: string;
    foto_perfil_url?: string;
  };
}

const TABELA_MAP: Record<TipoOrdem, string> = {
  soldagem: 'ordens_soldagem',
  perfiladeira: 'ordens_perfiladeira',
  separacao: 'ordens_separacao',
  qualidade: 'ordens_qualidade',
};

export function useOrdemProducao(tipoOrdem: TipoOrdem, onOrdemConcluida?: (pedidoId: string, tipoOrdem: TipoOrdem) => void) {
  const { user } = useProducaoAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Buscar todas as ordens do tipo
  const { data: ordens = [], isLoading } = useQuery({
    queryKey: ['ordens-producao', tipoOrdem, user?.user_id],
    enabled: !!user,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: 30_000,
    queryFn: async () => {
      if (!user?.user_id) return [];

      const tabelaOrdem = TABELA_MAP[tipoOrdem] as any;
      
      // Buscar todas as ordens ativas (não histórico) - visíveis para todos
      const { data: ordensData, error: ordensError } = await supabase
        .from(tabelaOrdem)
        .select(`
          *,
          capturada_em,
          tempo_conclusao_segundos,
          em_backlog,
          prioridade,
          pedido:pedidos_producao!pedido_id(
            id,
            numero_pedido,
            cliente_nome,
            venda_id,
            prioridade_etapa,
            em_backlog,
            observacoes,
            updated_at,
            vendas(
              data_prevista_entrega,
              observacoes_venda,
            produtos:produtos_vendas(
                id,
                tipo_produto,
                cor_id,
                quantidade,
                largura,
                altura,
                catalogo_cores(nome, codigo_hex)
              )
            )
          )
        `)
        .eq('historico', false)
        .order('prioridade', { ascending: false })
        .order('created_at', { ascending: true });
      
      if (ordensError) throw ordensError;
      if (!ordensData || ordensData.length === 0) return [];
      
      // Buscar linhas para todas as ordens de uma vez, incluindo nome atualizado do estoque
      const ordemIds = ordensData.map((o: any) => o.id);
      const { data: linhasData, error: linhasError } = await supabase
        .from('linhas_ordens')
        .select(`
          *,
          estoque:estoque_id (nome_produto)
        `)
        .in('ordem_id', ordemIds)
        .eq('tipo_ordem', tipoOrdem);
      
      if (linhasError) {
        console.error('[useOrdemProducao] Erro ao buscar linhas:', linhasError);
        // Continuar sem linhas, não quebrar a query
      }
      
      // Processar linhas para usar nome atualizado do estoque
      const linhasProcessadas = (linhasData || []).map((linha: any) => ({
        ...linha,
        item: linha.estoque?.nome_produto || linha.item,
      }));
      
      // Buscar dados dos responsáveis se houver
      const responsavelIds = ordensData
        .map((o: any) => o.responsavel_id)
        .filter((id: string | null) => id !== null);
      
      let responsaveisMap: Record<string, any> = {};
      if (responsavelIds.length > 0) {
        const { data: responsaveis } = await supabase
          .from('admin_users')
          .select('user_id, nome, foto_perfil_url')
          .in('user_id', responsavelIds);
        
        if (responsaveis) {
          responsaveisMap = responsaveis.reduce((acc, r) => {
            acc[r.user_id] = r;
            return acc;
          }, {} as Record<string, any>);
        }
      }

      // Buscar observações da visita técnica para cada pedido
      const pedidoIds = ordensData
        .map((o: any) => o.pedido?.id)
        .filter((id: string | undefined) => id);
      
      let observacoesMap: Record<string, ObservacaoVisita[]> = {};
      if (pedidoIds.length > 0) {
        const { data: observacoesData } = await supabase
          .from('pedido_porta_observacoes')
          .select('*')
          .in('pedido_id', pedidoIds);
        
        if (observacoesData) {
          observacoesData.forEach((obs: any) => {
            if (!observacoesMap[obs.pedido_id]) {
              observacoesMap[obs.pedido_id] = [];
            }
            observacoesMap[obs.pedido_id].push(obs);
          });
        }
      }
      
      // Mapear linhas para suas ordens
      const ordensProcessadas = ordensData.map((ordem: any) => {
        // Processar pedido e vendas
        let pedidoProcessado = null;
        let prioridadeEtapa = 0;
        if (ordem.pedido) {
          const vendasArray = Array.isArray(ordem.pedido.vendas) ? ordem.pedido.vendas : [ordem.pedido.vendas];
          const primeiraVenda = vendasArray.length > 0 ? vendasArray[0] : null;
          prioridadeEtapa = ordem.pedido.prioridade_etapa || 0;
          
          pedidoProcessado = {
            id: ordem.pedido.id,
            numero_pedido: ordem.pedido.numero_pedido,
            cliente_nome: ordem.pedido.cliente_nome,
            venda_id: ordem.pedido.venda_id,
            observacoes: ordem.pedido.observacoes,
            prioridade_etapa: prioridadeEtapa,
            vendas: primeiraVenda,
            produtos: primeiraVenda?.produtos || [],
          };
        }

        return {
          ...ordem,
          linhas: linhasProcessadas.filter((linha: any) => linha.ordem_id === ordem.id),
          pedido: pedidoProcessado,
          admin_users: ordem.responsavel_id ? responsaveisMap[ordem.responsavel_id] || null : null,
          observacoesVisita: ordem.pedido?.id ? observacoesMap[ordem.pedido.id] || [] : [],
          _prioridadeEtapa: prioridadeEtapa, // Campo auxiliar para ordenação
        };
      });

      // Ordenar pela prioridade da ORDEM (maior = mais prioritário)
      // Isso garante que a ordem definida no cronograma seja respeitada nas páginas de produção
      ordensProcessadas.sort((a: any, b: any) => {
        const aPrio = a.prioridade || 0;
        const bPrio = b.prioridade || 0;
        if (bPrio !== aPrio) return bPrio - aPrio;
        // Desempate por created_at (mais antiga primeiro)
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });

      return ordensProcessadas as Ordem[];
    },
  });

  // Subscribe to realtime updates for linhas_ordens (only when user is loaded)
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('linhas-ordens-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'linhas_ordens',
          filter: `tipo_ordem=eq.${tipoOrdem}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['ordens-producao', tipoOrdem] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tipoOrdem, queryClient, user]);

  // Subscribe to realtime updates for the order table itself (priority changes)
  useEffect(() => {
    if (!user) return;

    const tabelaOrdem = TABELA_MAP[tipoOrdem];
    
    const channel = supabase
      .channel(`ordens-${tipoOrdem}-prioridade-changes`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: tabelaOrdem,
        },
        (payload) => {
          if (payload.old && payload.new && (payload.old as any).prioridade !== (payload.new as any).prioridade) {
            queryClient.invalidateQueries({ queryKey: ['ordens-producao', tipoOrdem] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tipoOrdem, queryClient, user]);

  // Capturar ordem (atribuir responsável)
  const capturarOrdem = useMutation({
    mutationFn: async (ordemId: string) => {
      const currentUserId = user?.user_id;
      if (!currentUserId) throw new Error('Usuário não autenticado');

      const tabelaOrdem = TABELA_MAP[tipoOrdem] as any;
      
      // Verificar se o usuário já possui uma ordem ativa (uma ordem por vez)
      const { data: ordemExistente, error: checkError } = await supabase
        .from(tabelaOrdem)
        .select('id, numero_ordem')
        .eq('responsavel_id', currentUserId)
        .eq('historico', false)
        .eq('status', 'pendente')
        .maybeSingle() as { data: { id: string; numero_ordem: string } | null; error: any };
      
      if (checkError) throw checkError;
      
      if (ordemExistente) {
        throw new Error(`Você já possui a ordem ${ordemExistente.numero_ordem} capturada. Conclua-a antes de capturar outra.`);
      }
      
      // Verificar se a ordem está em backlog ou pausada
      const { data: ordemAtual } = await supabase
        .from(tabelaOrdem)
        .select('em_backlog, capturada_em, pausada')
        .eq('id', ordemId)
        .maybeSingle() as { data: { em_backlog?: boolean; capturada_em?: string; pausada?: boolean } | null };
      
      // Se está em backlog e já tem capturada_em, manter o tempo original
      const updateData: any = {
        responsavel_id: currentUserId,
      };
      
      // Se a ordem estava pausada, resetar os campos de pausa mas manter tempo_acumulado
      if (ordemAtual?.pausada) {
        updateData.pausada = false;
        updateData.pausada_em = null;
        updateData.justificativa_pausa = null;
        if (tipoOrdem !== 'qualidade') {
          updateData.linha_problema_id = null; // Limpar referência à linha problema
        }
        updateData.capturada_em = new Date().toISOString(); // Nova sessão
        
        // Limpar flags de problema das linhas associadas à ordem
        await supabase
          .from('linhas_ordens')
          .update({
            com_problema: false,
            problema_descricao: null,
            problema_reportado_em: null,
            problema_reportado_por: null,
          })
          .eq('ordem_id', ordemId)
          .eq('tipo_ordem', tipoOrdem);
      } else if (!ordemAtual?.em_backlog || !ordemAtual?.capturada_em) {
        // Só atualizar capturada_em se NÃO estiver em backlog ou se ainda não tiver sido capturada
        updateData.capturada_em = new Date().toISOString();
      }
      
      const { error } = await supabase
        .from(tabelaOrdem)
        .update(updateData)
        .eq('id', ordemId);

      if (error) throw error;
      return ordemId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordens-producao', tipoOrdem] });
      toast({
        title: "Ordem capturada",
        description: "Você agora é o responsável por esta ordem.",
      });
    },
    onError: (error: Error) => {
      console.error('Erro ao capturar ordem:', error);
      toast({
        title: "Não foi possível capturar",
        description: error.message || "Erro ao capturar a ordem.",
        variant: "destructive",
      });
    },
  });

  // Marcar linha como concluída com atualização otimista
  const marcarLinhaConcluida = useMutation({
    mutationFn: async ({ linhaId, concluida }: { linhaId: string; concluida: boolean }) => {
      const currentUserId = user?.user_id;
      
      // Atualizar linha como concluída
      // A pontuação será registrada automaticamente pelo trigger do banco
      const { error } = await supabase
        .from('linhas_ordens')
        .update({
          concluida,
          concluida_em: concluida ? new Date().toISOString() : null,
          concluida_por: concluida ? currentUserId || null : null,
          ...(concluida
            ? {
                com_problema: false,
                problema_descricao: null,
                problema_reportado_em: null,
                problema_reportado_por: null,
              }
            : {}),
        })
        .eq('id', linhaId);

      if (error) throw error;
      
      return { linhaId, concluida };
    },
    onMutate: async ({ linhaId, concluida }) => {
      // Cancel queries to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ['ordens-producao', tipoOrdem] });

      // Snapshot for rollback
      const previousOrdens = queryClient.getQueryData<Ordem[]>(['ordens-producao', tipoOrdem]);

      // Optimistic update: immediately update the cache
      queryClient.setQueryData<Ordem[]>(['ordens-producao', tipoOrdem], (oldData) => {
        if (!oldData) return oldData;
        
        // Create new array with updated linha
        return oldData.map(ordem => ({
          ...ordem,
          linhas: ordem.linhas?.map(linha => 
            linha.id === linhaId
              ? { ...linha, concluida }
              : linha
          ) || []
        }));
      });

      return { previousOrdens };
    },
    onError: (error, _, context) => {
      // Rollback on error
      if (context?.previousOrdens) {
        queryClient.setQueryData(['ordens-producao', tipoOrdem], context.previousOrdens);
      }
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a linha.",
        variant: "destructive",
      });
    },
    onSuccess: (data, variables) => {
      // Buscar pedidoId da linha para invalidar a query de status
      const ordemComLinha = ordens.find(o => 
        o.linhas?.some(l => l.id === variables.linhaId)
      );
      
      if (ordemComLinha?.pedido_id) {
        queryClient.invalidateQueries({ 
          queryKey: ['pedido-ordens-status', ordemComLinha.pedido_id] 
        });
        // Invalidar também status de qualidade se for ordem de qualidade
        if (tipoOrdem === 'qualidade') {
          queryClient.invalidateQueries({ 
            queryKey: ['pedido-qualidade-status', ordemComLinha.pedido_id] 
          });
        }
      }
      
      toast({
        title: "Atualizado",
      });
    },
  });

  // Concluir ordem e enviar diretamente para histórico
  const concluirOrdem = useMutation({
    mutationFn: async (ordemId: string) => {
      let pedidoId: string | null = null;
      const tabelaOrdem = TABELA_MAP[tipoOrdem] as any;

      // Buscar ordem para pegar capturada_em
      const { data: ordem, error: ordemError } = await supabase
        .from(tabelaOrdem)
        .select('pedido_id, capturada_em')
        .eq('id', ordemId)
        .maybeSingle();
        
      if (ordemError) throw ordemError;
      if (!ordem) throw new Error('Ordem não encontrada');
      
      pedidoId = (ordem as any).pedido_id;

      // Buscar tempo acumulado da ordem
      const { data: ordemCompleta } = await supabase
        .from(tabelaOrdem)
        .select('tempo_acumulado_segundos')
        .eq('id', ordemId)
        .maybeSingle();

      const tempoAcumulado = (ordemCompleta as any)?.tempo_acumulado_segundos || 0;

      // Calcular tempo de conclusão (apenas expediente: 7h-17h, seg-sex)
      let tempo_conclusao_segundos = null;
      if ((ordem as any)?.capturada_em) {
        const captura = new Date((ordem as any).capturada_em);
        const agora = new Date();
        const tempoSessao = calcularTempoExpediente(captura, agora);
        tempo_conclusao_segundos = tempoAcumulado + tempoSessao;
      }

      // Marcar todas as linhas da ordem como concluídas (sync preventivo)
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const { error: linhasError } = await supabase
        .from('linhas_ordens')
        .update({ 
          concluida: true, 
          concluida_em: new Date().toISOString(),
          concluida_por: currentUser?.id || null,
          com_problema: false,
          problema_descricao: null,
          problema_reportado_em: null,
          problema_reportado_por: null,
          updated_at: new Date().toISOString() 
        })
        .eq('ordem_id', ordemId)
        .eq('tipo_ordem', tipoOrdem);

      if (linhasError) {
        console.error('Erro ao marcar linhas como concluídas:', linhasError);
      }

      // Para ordens de perfiladeira, calcular metragem_linear das linhas
      let metragemLinear: number | undefined;
      if (tipoOrdem === 'perfiladeira') {
        const { data: linhasParaMetragem } = await supabase
          .from('linhas_ordens')
          .select('quantidade, tamanho')
          .eq('ordem_id', ordemId)
          .eq('tipo_ordem', 'perfiladeira');
        
        if (linhasParaMetragem) {
          metragemLinear = linhasParaMetragem.reduce((acc, linha) => {
            const metros = parseFloat(String(linha.tamanho || '0').replace(',', '.')) || 0;
            const quantidade = linha.quantidade || 1;
            return acc + (metros * quantidade);
          }, 0);
        }
      }

      // Atualizar ordem como concluída E enviar para histórico
      // IMPORTANTE: Resetar campos de pausa para garantir que auto-avanço funcione
      const updateData: Record<string, any> = {
        status: 'concluido',
        data_conclusao: new Date().toISOString(),
        tempo_conclusao_segundos,
        historico: true, // Enviar diretamente para histórico
        pausada: false,
        pausada_em: null,
        justificativa_pausa: null,
      };

      // Adicionar metragem linear para ordens de perfiladeira
      if (metragemLinear !== undefined) {
        updateData.metragem_linear = metragemLinear;
      }

      // linha_problema_id não existe em ordens_qualidade
      if (tipoOrdem !== 'qualidade') {
        updateData.linha_problema_id = null;
      }

      const { error } = await supabase
        .from(tabelaOrdem)
        .update(updateData)
        .eq('id', ordemId);
        
      if (error) throw error;

      if (!pedidoId) throw new Error('Pedido ID não encontrado');
      return pedidoId;
    },
    onSuccess: async (pedidoId) => {
      queryClient.invalidateQueries({ queryKey: ['ordens-producao', tipoOrdem] });
      queryClient.invalidateQueries({ queryKey: ['pedido-ordens-status', pedidoId] });
      queryClient.invalidateQueries({ queryKey: ['historico-ordens'] });
      
      // Invalidar também status de qualidade se for ordem de qualidade
      if (tipoOrdem === 'qualidade') {
        queryClient.invalidateQueries({ 
          queryKey: ['pedido-qualidade-status', pedidoId] 
        });
      }
      
      toast({
        title: "Ordem concluída e arquivada",
        description: "A ordem foi enviada para o histórico.",
      });

      // Tentar avanço automático do pedido
      if (onOrdemConcluida) {
        try {
          console.log('[concluirOrdem] Chamando onOrdemConcluida para pedido:', pedidoId, 'tipo:', tipoOrdem);
          await onOrdemConcluida(pedidoId, tipoOrdem);
          console.log('[concluirOrdem] onOrdemConcluida executado com sucesso para pedido:', pedidoId);
        } catch (error) {
          console.error('[concluirOrdem] Erro ao executar onOrdemConcluida:', error);
        }
      }
    },
    onError: (error) => {
      console.error('Erro ao concluir ordem:', error);
      toast({
        title: "Erro ao concluir",
        description: "Não foi possível concluir a ordem.",
        variant: "destructive",
      });
    },
  });

  // Separar ordens por status e ordenar pela prioridade da ORDEM (sincronizada com pedido pelo trigger)
  const ordensAFazer = ordens
    .filter(o => o.status === 'pendente')
    .sort((a, b) => {
      // Ordenar por prioridade da ORDEM (maior primeiro)
      const aPrio = a.prioridade || 0;
      const bPrio = b.prioridade || 0;
      if (bPrio !== aPrio) return bPrio - aPrio;
      // Desempate por created_at (mais antiga primeiro)
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

  // Enviar ordem para histórico
  const enviarParaHistorico = useMutation({
    mutationFn: async (ordemId: string) => {
      // Mapear nome da tabela de acordo com o tipo
      const tabelasMap = {
        soldagem: 'ordens_soldagem',
        perfiladeira: 'ordens_perfiladeira',
        separacao: 'ordens_separacao',
        qualidade: 'ordens_qualidade',
      } as const;

      const nomeTabela = tabelasMap[tipoOrdem];

      const { error } = await supabase
        .from(nomeTabela as any)
        .update({ historico: true })
        .eq("id", ordemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ordens-producao", tipoOrdem] });
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

  // Pausar ordem (Aviso de Falta) - para separação e perfiladeira
  const pausarOrdem = useMutation({
    mutationFn: async ({ ordemId, justificativa, linhasProblemaIds }: { ordemId: string; justificativa: string; linhasProblemaIds?: string[] }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const tabelaOrdem = TABELA_MAP[tipoOrdem] as 'ordens_separacao' | 'ordens_perfiladeira' | 'ordens_soldagem' | 'ordens_qualidade';

      // Se houver linhas selecionadas, marcar todas como com_problema
      if (linhasProblemaIds && linhasProblemaIds.length > 0) {
        const { error: linhasError } = await supabase
          .from('linhas_ordens')
          .update({
            com_problema: true,
            problema_reportado_em: new Date().toISOString(),
            problema_reportado_por: user.id,
          })
          .in('id', linhasProblemaIds);

        if (linhasError) throw linhasError;
      }

      // Buscar ordem para calcular tempo trabalhado até agora
      const { data: ordem, error: ordemError } = await supabase
        .from(tabelaOrdem)
        .select('capturada_em, tempo_acumulado_segundos')
        .eq('id', ordemId)
        .single();

      if (ordemError) throw ordemError;
      if (!ordem) throw new Error('Ordem não encontrada');

      // Calcular tempo trabalhado nesta sessão (apenas expediente: 7h-17h, seg-sex)
      let tempoSessao = 0;
      if (ordem.capturada_em) {
        const captura = new Date(ordem.capturada_em);
        const agora = new Date();
        tempoSessao = calcularTempoExpediente(captura, agora);
      }

      const tempoTotal = (ordem.tempo_acumulado_segundos || 0) + tempoSessao;

      // Atualizar ordem como pausada
      // Armazenar a primeira linha como linha_problema_id para compatibilidade (exceto qualidade)
      const updateData: Record<string, any> = {
        pausada: true,
        pausada_em: new Date().toISOString(),
        justificativa_pausa: justificativa,
        tempo_acumulado_segundos: tempoTotal,
        responsavel_id: null, // Liberar a ordem para outro operador
      };

      if (tipoOrdem !== 'qualidade') {
        updateData.linha_problema_id = linhasProblemaIds?.[0] || null;
      }

      const { error } = await supabase
        .from(tabelaOrdem)
        .update(updateData)
        .eq('id', ordemId);

      if (error) throw error;
      return ordemId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordens-producao', tipoOrdem] });
      toast({
        title: "Ordem pausada",
        description: "A ordem foi pausada e está disponível para outro operador.",
      });
    },
    onError: (error: Error) => {
      console.error('Erro ao pausar ordem:', error);
      toast({
        title: "Erro ao pausar",
        description: error.message || "Não foi possível pausar a ordem.",
        variant: "destructive",
      });
    },
  });

  // Marcar linha com problema (Falta/Problema)
  const marcarLinhaComProblema = useMutation({
    mutationFn: async ({ linhaId, ordemId, descricao }: { linhaId: string; ordemId: string; descricao: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const tabelaOrdem = TABELA_MAP[tipoOrdem] as 'ordens_separacao' | 'ordens_perfiladeira' | 'ordens_soldagem';

      // 1. Marcar a linha com problema
      const { error: linhaError } = await supabase
        .from('linhas_ordens')
        .update({
          com_problema: true,
          problema_descricao: descricao,
          problema_reportado_em: new Date().toISOString(),
          problema_reportado_por: user.id,
        })
        .eq('id', linhaId);

      if (linhaError) throw linhaError;

      // 2. Buscar ordem para calcular tempo trabalhado até agora
      const { data: ordem, error: ordemError } = await supabase
        .from(tabelaOrdem)
        .select('capturada_em, tempo_acumulado_segundos')
        .eq('id', ordemId)
        .single();

      if (ordemError) throw ordemError;
      if (!ordem) throw new Error('Ordem não encontrada');

      // 3. Calcular tempo trabalhado nesta sessão (apenas expediente: 7h-17h, seg-sex)
      let tempoSessao = 0;
      if (ordem.capturada_em) {
        const captura = new Date(ordem.capturada_em);
        const agora = new Date();
        tempoSessao = calcularTempoExpediente(captura, agora);
      }

      const tempoTotal = (ordem.tempo_acumulado_segundos || 0) + tempoSessao;

      // 4. Pausar a ordem automaticamente
      const { error: pausaError } = await supabase
        .from(tabelaOrdem)
        .update({
          pausada: true,
          pausada_em: new Date().toISOString(),
          justificativa_pausa: `Falta/Problema em item: ${descricao}`,
          tempo_acumulado_segundos: tempoTotal,
          responsavel_id: null, // Liberar a ordem
        })
        .eq('id', ordemId);

      if (pausaError) throw pausaError;

      return { linhaId, ordemId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordens-producao', tipoOrdem] });
      toast({
        title: "Problema registrado",
        description: "O item foi marcado com problema e a ordem foi pausada.",
      });
    },
    onError: (error: Error) => {
      console.error('Erro ao marcar linha com problema:', error);
      toast({
        title: "Erro ao registrar problema",
        description: error.message || "Não foi possível registrar o problema.",
        variant: "destructive",
      });
    },
  });

  // Resolver problema de uma linha
  const resolverProblemaLinha = useMutation({
    mutationFn: async ({ linhaId }: { linhaId: string }) => {
      const { error } = await supabase
        .from('linhas_ordens')
        .update({
          com_problema: false,
          problema_descricao: null,
          problema_reportado_em: null,
          problema_reportado_por: null,
        })
        .eq('id', linhaId);

      if (error) throw error;
      return linhaId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordens-producao', tipoOrdem] });
      toast({
        title: "Problema resolvido",
        description: "O item foi marcado como disponível.",
      });
    },
    onError: (error: Error) => {
      console.error('Erro ao resolver problema:', error);
      toast({
        title: "Erro",
        description: "Não foi possível resolver o problema.",
        variant: "destructive",
      });
    },
  });

  return {
    ordens,
    ordensAFazer,
    isLoading,
    capturarOrdem,
    marcarLinhaConcluida,
    concluirOrdem,
    enviarParaHistorico,
    pausarOrdem,
    marcarLinhaComProblema,
    resolverProblemaLinha,
  };
}
