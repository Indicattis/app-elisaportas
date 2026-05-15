import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { EtapaPedido, PedidoEtapa, PedidoCheckbox } from "@/types/pedidoEtapa";
import { ETAPAS_CONFIG, getProximaEtapa } from "@/types/pedidoEtapa";
import { calcularTempoExpediente } from "@/utils/calcularTempoExpediente";

// Função auxiliar para criar ordens de produção usando SECURITY DEFINER
async function criarOrdensProducao(pedidoId: string) {
  console.log('[criarOrdensProducao] Iniciando criação de ordens para pedido:', pedidoId);
  
  try {
    // Usar função SECURITY DEFINER para contornar políticas RLS
    const { error } = await supabase.rpc('criar_ordens_producao_automaticas', {
      p_pedido_id: pedidoId
    });

    if (error) {
      console.error('[criarOrdensProducao] Erro ao criar ordens:', error);
      throw error;
    }

    console.log('[criarOrdensProducao] Todas as ordens criadas com sucesso!');
  } catch (error) {
    console.error('[criarOrdensProducao] Erro geral:', error);
    throw error;
  }
}

// Hook para buscar contadores de todas as etapas
export function usePedidosContadores() {
  const { data: contadores = {} } = useQuery({
    queryKey: ['pedidos-contadores'],
    queryFn: async () => {
      // Buscar pedidos
      const { data, error } = await supabase
        .from('pedidos_producao')
        .select('etapa_atual')
        .eq('arquivado', false);

      if (error) throw error;

      const counts: Record<EtapaPedido, number> = {
        aprovacao_diretor: 0,
        aberto: 0,
        aprovacao_ceo: 0,
        em_producao: 0,
        inspecao_qualidade: 0,
        aguardando_pintura: 0,
        embalagem: 0,
        aguardando_coleta: 0,
        instalacoes: 0,
        correcoes: 0,
        finalizado: 0,
        aguardando_cliente: 0,
      };

      data?.forEach((pedido) => {
        const etapa = pedido.etapa_atual as EtapaPedido;
        if (etapa in counts) {
          counts[etapa]++;
        }
      });

      // Buscar neo_instalações não concluídas para adicionar ao contador de instalações
      const { count: neoCount, error: neoError } = await supabase
        .from('neo_instalacoes')
        .select('*', { count: 'exact', head: true })
        .eq('concluida', false)
        .neq('status', 'arquivada');

      if (!neoError && neoCount) {
        counts.instalacoes += neoCount;
      }

      // Buscar neo_correções não concluídas para adicionar ao contador de correções
      const { count: neoCorrecaoCount, error: neoCorrecaoError } = await supabase
        .from('neo_correcoes')
        .select('*', { count: 'exact', head: true })
        .eq('concluida', false)
        .neq('status', 'arquivada');

      if (!neoCorrecaoError && neoCorrecaoCount) {
        counts.correcoes += neoCorrecaoCount;
      }

      // Buscar neo_instalações concluídas para adicionar ao contador de finalizados (últimos 30 dias)
      const dataLimiteContador = new Date();
      dataLimiteContador.setDate(dataLimiteContador.getDate() - 30);

      const { count: neoInstalacaoFinalizadaCount, error: neoInstalacaoFinalizadaError } = await supabase
        .from('neo_instalacoes')
        .select('*', { count: 'exact', head: true })
        .eq('concluida', true)
        .neq('status', 'aguardando_cliente')
        .neq('status', 'arquivada')
        .gte('concluida_em', dataLimiteContador.toISOString());

      if (!neoInstalacaoFinalizadaError && neoInstalacaoFinalizadaCount) {
        counts.finalizado += neoInstalacaoFinalizadaCount;
      }

      // Buscar neo_correções concluídas para adicionar ao contador de finalizados (últimos 30 dias)
      const { count: neoCorrecaoFinalizadaCount, error: neoCorrecaoFinalizadaError } = await supabase
        .from('neo_correcoes')
        .select('*', { count: 'exact', head: true })
        .eq('concluida', true)
        .neq('status', 'aguardando_cliente')
        .neq('status', 'arquivada')
        .gte('concluida_em', dataLimiteContador.toISOString());

      if (!neoCorrecaoFinalizadaError && neoCorrecaoFinalizadaCount) {
        counts.finalizado += neoCorrecaoFinalizadaCount;
      }

      // Neos em Aguardando Cliente
      const { count: neoInstAgCli } = await supabase
        .from('neo_instalacoes')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'aguardando_cliente');
      const { count: neoCorrAgCli } = await supabase
        .from('neo_correcoes')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'aguardando_cliente');
      counts.aguardando_cliente += (neoInstAgCli || 0) + (neoCorrAgCli || 0);

      return counts;
    },
    refetchInterval: 5000, // Atualizar a cada 5 segundos
  });

  return contadores;
}

export function usePedidosEtapas(etapa?: EtapaPedido) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const shouldLoadPedidos = !!etapa;

  // Buscar pedidos por etapa
  const { data: pedidos = [], isLoading } = useQuery({
    queryKey: ['pedidos-etapas', etapa ?? 'disabled'],
    enabled: shouldLoadPedidos,
    queryFn: async () => {
      if (!etapa) return [];

      // Buscar pedidos
      const { data: pedidosData, error: pedidosError } = await supabase
        .from('pedidos_producao')
        .select(`
          *,
          vendas:venda_id (
            id,
            cliente_nome,
            cliente_telefone,
            cliente_id,
            valor_venda,
            pagamento_na_entrega,
            valor_a_receber,
            valor_a_receber_texto,
            valor_a_receber_faturamento,
            created_at,
            tipo_entrega,
            atendente_id,
            cidade,
            estado,
            atendente:admin_users!fk_vendas_atendente (
              nome,
              foto_perfil_url
            ),
            cliente:clientes!vendas_cliente_id_fkey (
              fidelizado,
              parceiro
            ),
            produtos_vendas (
              id,
              tipo_produto,
              valor_pintura,
              largura,
              altura,
              tamanho,
              quantidade,
              cor:catalogo_cores (nome, codigo_hex)
            )
          ),
          pedidos_etapas (*)
        `)
        .eq('etapa_atual', etapa)
        .eq('arquivado', false)
        .order('prioridade_etapa', { ascending: false })
        .order('created_at', { ascending: false });

      if (pedidosError) throw pedidosError;
      if (!pedidosData) return [];

      // Buscar informações de backlog e ordens para cada pedido
      const pedidosComBacklog = await Promise.all(
        pedidosData.map(async (pedido) => {
          // Buscar backlog
          const { data: backlogData } = await supabase
            .from('pedidos_backlog_ativo')
            .select('*')
            .eq('pedido_id', pedido.id)
            .maybeSingle();

          // Verificar se há histórico de backlog nas movimentações
          const { data: historicoBacklog } = await supabase
            .from('pedidos_movimentacoes')
            .select('id')
            .eq('pedido_id', pedido.id)
            .eq('teor', 'backlog')
            .limit(1)
            .maybeSingle();

          // Buscar status das ordens de produção (incluindo campos de métricas)
          const [soldagem, perfiladeira, separacao, qualidade, pintura, embalagem] = await Promise.all([
            supabase
              .from('ordens_soldagem')
              .select('id, status, responsavel_id, pausada, justificativa_pausa, pausada_em, capturada_em, tempo_acumulado_segundos, pedido_id, qtd_portas_p, qtd_portas_g')
              .eq('pedido_id', pedido.id)
              .maybeSingle(),
            supabase
              .from('ordens_perfiladeira')
              .select('id, status, responsavel_id, pausada, justificativa_pausa, pausada_em, capturada_em, tempo_acumulado_segundos, pedido_id, metragem_linear')
              .eq('pedido_id', pedido.id)
              .maybeSingle(),
            supabase
              .from('ordens_separacao')
              .select('id, status, responsavel_id, pausada, justificativa_pausa, pausada_em, capturada_em, tempo_acumulado_segundos, pedido_id')
              .eq('pedido_id', pedido.id)
              .maybeSingle(),
            supabase
              .from('ordens_qualidade')
              .select('id, status, responsavel_id, pausada, justificativa_pausa')
              .eq('pedido_id', pedido.id)
              .maybeSingle(),
            supabase
              .from('ordens_pintura')
              .select('id, status, responsavel_id, metragem_quadrada')
              .eq('pedido_id', pedido.id)
              .maybeSingle(),
            supabase
              .from('ordens_embalagem')
              .select('id, status, responsavel_id')
              .eq('pedido_id', pedido.id)
              .maybeSingle(),
          ]);

          // Função auxiliar para buscar foto e nome do responsável pelo user_id
          const fetchResponsavelInfo = async (responsavelId: string | null): Promise<{ foto: string | null; nome: string | null }> => {
            if (!responsavelId) return { foto: null, nome: null };
            
            const { data } = await supabase
              .from('admin_users')
              .select('foto_perfil_url, nome')
              .eq('user_id', responsavelId)
              .maybeSingle();
            
            return {
              foto: data?.foto_perfil_url || null,
              nome: data?.nome || null,
            };
          };

          // Função auxiliar para buscar linhas concluídas de uma ordem
          const fetchLinhasConcluidas = async (
            ordemId: string | null, 
            tipoOrdem: string
          ): Promise<Array<{ item: string; quantidade: number; tamanho: string | null }>> => {
            if (!ordemId) return [];
            
            const { data } = await supabase
              .from('linhas_ordens')
              .select('item, quantidade, tamanho')
              .eq('ordem_id', ordemId)
              .eq('tipo_ordem', tipoOrdem)
              .eq('concluida', true)
              .order('concluida_em', { ascending: true });
            
            return data || [];
          };

          // Função auxiliar para buscar TODAS as linhas de perfiladeira (para cálculo de metragem)
          const fetchLinhasPerfiladeira = async (
            ordemId: string | null
          ): Promise<Array<{ quantidade: number; tamanho: string | null }>> => {
            if (!ordemId) return [];
            
            const { data } = await supabase
              .from('linhas_ordens')
              .select('quantidade, tamanho')
              .eq('ordem_id', ordemId)
              .eq('tipo_ordem', 'perfiladeira');
            
            return data || [];
          };

          const buildOrdemStatus = async (result: any, tipoOrdem: string) => {
            const responsavelId = result.data?.responsavel_id || null;
            const ordemId = result.data?.id || null;
            
            const [responsavelInfo, linhasConcluidas] = await Promise.all([
              fetchResponsavelInfo(responsavelId),
              fetchLinhasConcluidas(ordemId, tipoOrdem),
            ]);
            
            return {
              existe: !!result.data,
              ordem_id: ordemId,
              tipo_ordem: tipoOrdem,
              status: result.data?.status || null,
              capturada: !!responsavelId,
              capturada_por_foto: responsavelInfo.foto,
              capturada_por_nome: responsavelInfo.nome,
              linhas_concluidas: linhasConcluidas,
              pausada: result.data?.pausada || false,
              justificativa_pausa: result.data?.justificativa_pausa || null,
              pausada_em: result.data?.pausada_em || null,
              capturada_em: result.data?.capturada_em || null,
              tempo_acumulado_segundos: result.data?.tempo_acumulado_segundos || 0,
              pedido_id: result.data?.pedido_id || null,
              // Campos de métricas
              qtd_portas_p: result.data?.qtd_portas_p || 0,
              qtd_portas_g: result.data?.qtd_portas_g || 0,
              metragem_quadrada: result.data?.metragem_quadrada || 0,
              metragem_linear: result.data?.metragem_linear || 0,
            };
          };

          const [ordemSoldagem, ordemPerfiladeira, ordemSeparacao, ordemQualidade, ordemPintura, ordemEmbalagem] = await Promise.all([
            buildOrdemStatus(soldagem, 'soldagem'),
            buildOrdemStatus(perfiladeira, 'perfiladeira'),
            buildOrdemStatus(separacao, 'separacao'),
            buildOrdemStatus(qualidade, 'qualidade'),
            buildOrdemStatus(pintura, 'pintura'),
            buildOrdemStatus(embalagem, 'embalagem'),
          ]);

          // Buscar linhas de perfiladeira para cálculo de metragem linear
          const linhasPerfiladeira = await fetchLinhasPerfiladeira(perfiladeira.data?.id || null);

          // Buscar dados de carregamento para ordenação
          let _carregamento_data: string | null = null;
          let _carregamento_concluido = false;

          if (etapa === 'aguardando_coleta') {
            const { data: ocArr } = await supabase
              .from('ordens_carregamento')
              .select('data_carregamento, carregamento_concluido')
              .eq('pedido_id', pedido.id)
              .order('data_carregamento', { ascending: false, nullsFirst: false })
              .limit(1);
            const oc = ocArr?.[0];
            _carregamento_data = oc?.data_carregamento || null;
            _carregamento_concluido = oc?.carregamento_concluido || false;
          } else if (etapa === 'instalacoes') {
            const { data: instArr } = await supabase
              .from('instalacoes')
              .select('data_carregamento, carregamento_concluido')
              .eq('pedido_id', pedido.id)
              .order('data_carregamento', { ascending: false, nullsFirst: false })
              .limit(1);
            const inst = instArr?.[0];
            _carregamento_data = inst?.data_carregamento || null;
            _carregamento_concluido = inst?.carregamento_concluido || false;
          } else if (etapa === 'correcoes') {
            const { data: corr } = await supabase
              .from('correcoes')
              .select('data_carregamento, carregamento_concluido')
              .eq('pedido_id', pedido.id)
              .eq('concluida', false)
              .order('created_at', { ascending: false })
              .limit(1);
            const corrData = corr?.[0];
            _carregamento_data = corrData?.data_carregamento || null;
            _carregamento_concluido = corrData?.carregamento_concluido || false;
          }

          return {
            ...pedido,
            backlog: backlogData ? [backlogData] : [],
            tem_historico_backlog: !!historicoBacklog,
            linhas_perfiladeira: linhasPerfiladeira,
            _carregamento_data,
            _carregamento_concluido,
            ordens: {
              soldagem: ordemSoldagem,
              perfiladeira: ordemPerfiladeira,
              separacao: ordemSeparacao,
              qualidade: ordemQualidade,
              pintura: ordemPintura,
              embalagem: ordemEmbalagem,
            }
          };
        })
      );

      // Função auxiliar para extrair primeira cor do pedido
      const extrairPrimeiraCor = (pedido: any): string | null => {
        const vendaData = Array.isArray(pedido.vendas) 
          ? pedido.vendas[0] 
          : pedido.vendas;
        const produtos = vendaData?.produtos_vendas || [];
        
        // Buscar primeira cor válida
        for (const produto of produtos) {
          if (produto.cor?.nome) {
            return produto.cor.nome;
          }
        }
        return null;
      };

      // Ordenar na etapa "aberto": prioridade manual primeiro, cor como desempate
      if (etapa === 'aberto') {
        return pedidosComBacklog.sort((a, b) => {
          // Prioridade manual tem precedência (maior primeiro)
          const prioA = (a as any).prioridade_etapa || 0;
          const prioB = (b as any).prioridade_etapa || 0;
          if (prioB !== prioA) return prioB - prioA;

          // Desempate por cor (alfabética)
          const corA = extrairPrimeiraCor(a);
          const corB = extrairPrimeiraCor(b);
          
          if (!corA && !corB) return 0;
          if (!corA) return 1;
          if (!corB) return -1;
          
          return corA.localeCompare(corB, 'pt-BR');
      });
      }

      // Ordenar na etapa "aguardando_pintura": prioridade manual primeiro, cor como desempate
      if (etapa === 'aguardando_pintura') {
        return pedidosComBacklog.sort((a, b) => {
          const prioA = (a as any).prioridade_etapa || 0;
          const prioB = (b as any).prioridade_etapa || 0;
          if (prioB !== prioA) return prioB - prioA;

          const corA = extrairPrimeiraCor(a);
          const corB = extrairPrimeiraCor(b);
          
          if (!corA && !corB) return 0;
          if (!corA) return 1;
          if (!corB) return -1;
          
          return corA.localeCompare(corB, 'pt-BR');
        });
      }

      // Ordenar por status de carregamento nas etapas aguardando_coleta e instalacoes
      if (etapa === 'aguardando_coleta' || etapa === 'instalacoes' || etapa === 'correcoes') {
        return pedidosComBacklog.sort((a, b) => {
          const getGrupo = (p: any) => {
            if (!p._carregamento_data) return 0; // Não agendado
            if (p._carregamento_concluido) return 3; // Carregado
            const hoje = new Date().toISOString().split('T')[0];
            if (p._carregamento_data < hoje) return 1; // Atrasado
            return 2; // Agendado
          };
          const grupoA = getGrupo(a);
          const grupoB = getGrupo(b);
          if (grupoA !== grupoB) return grupoA - grupoB;
          const dataA = a._carregamento_data || '9999-12-31';
          const dataB = b._carregamento_data || '9999-12-31';
          return dataA.localeCompare(dataB);
        });
      }

      return pedidosComBacklog;
    },
  });

  // Buscar etapa atual de um pedido
  const getEtapaAtual = async (pedidoId: string): Promise<PedidoEtapa | null> => {
    const { data, error } = await supabase
      .from('pedidos_etapas')
      .select('*')
      .eq('pedido_id', pedidoId)
      .is('data_saida', null)
      .maybeSingle();

    if (error || !data) return null;
    return {
      ...data,
      checkboxes: (data.checkboxes as any) || []
    } as PedidoEtapa;
  };

  // Atualizar checkbox
  const atualizarCheckbox = useMutation({
    mutationFn: async ({ 
      pedidoId, 
      checkboxId 
    }: { 
      pedidoId: string; 
      checkboxId: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const etapaAtual = await getEtapaAtual(pedidoId);
      if (!etapaAtual) throw new Error('Etapa atual não encontrada');

      const checkboxes = etapaAtual.checkboxes.map(cb => 
        cb.id === checkboxId 
          ? { 
              ...cb, 
              checked: !cb.checked,
              checked_at: !cb.checked ? new Date().toISOString() : undefined,
              checked_by: !cb.checked ? user.id : undefined
            }
          : cb
      );

      const { error } = await supabase
        .from('pedidos_etapas')
        .update({ checkboxes: checkboxes as any })
        .eq('id', etapaAtual.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos-etapas'] });
    },
    onError: (error) => {
      console.error('Erro ao atualizar checkbox:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o checkbox",
        variant: "destructive"
      });
    }
  });

  // Mover para próxima etapa
  const moverParaProximaEtapa = useMutation({
    mutationFn: async ({ 
      pedidoId, 
      skipCheckboxValidation = false,
      onProgress
    }: { 
      pedidoId: string; 
      skipCheckboxValidation?: boolean;
      onProgress?: (processoId: string, status: 'pending' | 'in_progress' | 'completed' | 'error') => void;
    }) => {
      // Helper para executar com delay mínimo de 0,5 segundos
      const executarComDelay = async (fn: () => Promise<void>, minDelay = 500) => {
        const start = Date.now();
        await fn();
        const elapsed = Date.now() - start;
        if (elapsed < minDelay) {
          await new Promise(resolve => setTimeout(resolve, minDelay - elapsed));
        }
      };
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Buscar pedido atual
      const { data: pedido, error: pedidoError } = await supabase
        .from('pedidos_producao')
        .select('etapa_atual, arquivado')
        .eq('id', pedidoId)
        .single();

      if (pedidoError) throw pedidoError;

      // Bloquear pedidos arquivados
      if (pedido.arquivado) {
        throw new Error('Pedido arquivado não pode ser movido');
      }

      const etapaAtualNome = pedido.etapa_atual as EtapaPedido;
      let proximaEtapa = getProximaEtapa(etapaAtualNome);

      if (!proximaEtapa) {
        throw new Error('Pedido já está na última etapa');
      }

      // Se está na etapa "aberto", validar se tem linhas cadastradas e observações da visita
      if (etapaAtualNome === 'aberto') {
        const { data: linhas, error: linhasError } = await supabase
          .from('pedido_linhas')
          .select('id')
          .eq('pedido_id', pedidoId);
        
        if (linhasError) throw linhasError;
        
        if (!linhas || linhas.length === 0) {
          throw new Error('O pedido precisa ter ao menos uma linha cadastrada antes de iniciar a produção');
        }

        // Validar observações da visita técnica para todas as portas de enrolar
        const { data: pedidoData } = await supabase
          .from('pedidos_producao')
          .select('venda_id')
          .eq('id', pedidoId)
          .single();

        if (pedidoData?.venda_id) {
          // Buscar portas de enrolar
          const { data: portasEnrolar } = await supabase
            .from('produtos_vendas')
            .select('id')
            .eq('venda_id', pedidoData.venda_id)
            .eq('tipo_produto', 'porta_enrolar');

          if (portasEnrolar && portasEnrolar.length > 0) {
            // Verificar se todas as portas têm observações com responsável preenchido
            const { data: observacoes } = await supabase
              .from('pedido_porta_observacoes')
              .select('produto_venda_id, responsavel_medidas_id, cliente_medeu')
              .eq('pedido_id', pedidoId);

            for (const porta of portasEnrolar) {
              const obs = observacoes?.find(o => o.produto_venda_id === porta.id);
              if (!obs || (!obs.responsavel_medidas_id && !(obs as any).cliente_medeu)) {
                throw new Error('Preencha o responsável pelas medidas em todas as portas antes de iniciar a produção');
              }
            }
          }
        }
      }

      // Se está em aguardando_coleta ou instalacoes, validar ordem de carregamento
      if (etapaAtualNome === 'aguardando_coleta' || etapaAtualNome === 'instalacoes') {
        // Consultar TODAS as fontes em paralelo
        const [ordensRes, instRes, corrRes] = await Promise.all([
          supabase.from('ordens_carregamento').select('data_carregamento, carregamento_concluido').eq('pedido_id', pedidoId).order('created_at', { ascending: false }).limit(1),
          supabase.from('instalacoes').select('data_carregamento, carregamento_concluido').eq('pedido_id', pedidoId).order('created_at', { ascending: false }).limit(1),
          supabase.from('correcoes').select('data_carregamento, carregamento_concluido').eq('pedido_id', pedidoId).order('created_at', { ascending: false }).limit(1),
        ]);

        const todasFontes = [ordensRes.data?.[0], instRes.data?.[0], corrRes.data?.[0]].filter(Boolean);

        if (todasFontes.length === 0) {
          throw new Error('Ordem de carregamento não encontrada para este pedido');
        }

        const algumaComData = todasFontes.some(f => f.data_carregamento);
        const algumaConcluida = todasFontes.some(f => f.carregamento_concluido);

        // Se já está concluído, aceita mesmo sem data preenchida (data inferida de carregamento_concluido_em)
        if (!algumaConcluida && !algumaComData) {
          throw new Error('Informe a data de carregamento antes de finalizar o pedido');
        }

        if (!algumaConcluida) {
          throw new Error('O carregamento deve ser concluído antes de finalizar o pedido');
        }
      }

      // Validar checkboxes obrigatórios (apenas se não for avanço automático)
      // Para etapa "em_producao", não validar checkboxes (apenas ordens concluídas)
      const etapaAtual = await getEtapaAtual(pedidoId);
      if (etapaAtual) {
        if (etapaAtualNome === 'aprovacao_ceo' || (!skipCheckboxValidation && etapaAtualNome !== 'em_producao')) {
          const checkboxesObrigatorios = etapaAtual.checkboxes.filter(cb => cb.required);
          const todosChecados = checkboxesObrigatorios.every(cb => cb.checked);

          if (!todosChecados) {
            throw new Error('Todos os checkboxes obrigatórios devem ser marcados');
          }
        }

        // Validar ordens de produção concluídas antes de sair de em_producao
        if (etapaAtualNome === 'em_producao') {
          // Buscar status das ordens principais para validação resiliente
          const tabelasOrdensPrincipais = ['ordens_soldagem', 'ordens_perfiladeira', 'ordens_separacao'] as const;
          const tipoOrdemMap: Record<string, string> = {
            ordens_soldagem: 'soldagem',
            ordens_perfiladeira: 'perfiladeira',
            ordens_separacao: 'separacao',
          };
          
          // Buscar quais tipos de ordem têm a ordem principal já concluída
          const tiposComOrdemConcluida = new Set<string>();
          for (const tabela of tabelasOrdensPrincipais) {
            const { data: ordemPrincipal } = await supabase
              .from(tabela)
              .select('status')
              .eq('pedido_id', pedidoId)
              .eq('historico', false)
              .maybeSingle();
            
            if (ordemPrincipal && (ordemPrincipal.status === 'concluido' || ordemPrincipal.status === 'pronta')) {
              tiposComOrdemConcluida.add(tipoOrdemMap[tabela]);
            }
          }

          const { data: linhasProducao } = await supabase
            .from('linhas_ordens')
            .select('concluida, tipo_ordem')
            .eq('pedido_id', pedidoId)
            .in('tipo_ordem', ['soldagem', 'perfiladeira', 'separacao']);
          
          if (linhasProducao && linhasProducao.length > 0) {
            // Filtrar linhas não concluídas, ignorando tipos cuja ordem principal já está concluída
            const linhasNaoConcluidas = linhasProducao.filter(
              l => !l.concluida && !tiposComOrdemConcluida.has(l.tipo_ordem)
            );
            
            if (linhasNaoConcluidas.length > 0) {
              // Contar por tipo para mensagem detalhada
              const pendentes: Record<string, number> = {};
              linhasNaoConcluidas.forEach(l => {
                pendentes[l.tipo_ordem] = (pendentes[l.tipo_ordem] || 0) + 1;
              });
              
              const detalhes = Object.entries(pendentes)
                .map(([tipo, qtd]) => `${tipo}: ${qtd}`)
                .join(', ');
              
              throw new Error(`Todas as ordens de produção devem estar concluídas antes de avançar. Pendentes: ${detalhes}`);
            }
          }
          
          // Verificar se há ordens pausadas ou não concluídas nas tabelas principais
          const tabelasOrdens = ['ordens_soldagem', 'ordens_perfiladeira', 'ordens_separacao'] as const;
          
          for (const tabela of tabelasOrdens) {
            const { data: ordens } = await supabase
              .from(tabela)
              .select('status, pausada, numero_ordem, historico')
              .eq('pedido_id', pedidoId);
            
            if (ordens && ordens.length > 0) {
              // Bloquear se houver qualquer ordem pausada (independente de histórico)
              const ordemPausada = ordens.find(o => o.pausada === true && o.status !== 'concluido');
              if (ordemPausada) {
                throw new Error(`A ordem ${ordemPausada.numero_ordem} está pausada. Retome ou cancele antes de avançar.`);
              }
              
              // Bloquear se houver ordem ativa (não histórico) não concluída
              const ordensAtivas = ordens.filter(o => !o.historico);
              const ordemNaoConcluida = ordensAtivas.find(o => o.status !== 'concluido');
              if (ordemNaoConcluida) {
                throw new Error(`A ordem ${ordemNaoConcluida.numero_ordem} ainda não foi concluída.`);
              }
            }
          }
        }

      // Fechar etapa atual
        if (onProgress) onProgress('fechar_etapa_atual', 'in_progress');
        await executarComDelay(async () => {
          // Calcular tempo de permanência em horas úteis
          const tempoPermanencia = calcularTempoExpediente(
            new Date(etapaAtual.data_entrada),
            new Date()
          );
          await supabase
            .from('pedidos_etapas')
            .update({ 
              data_saida: new Date().toISOString(),
              tempo_permanencia_segundos: tempoPermanencia
            } as any)
            .eq('id', etapaAtual.id);
        });
        if (onProgress) onProgress('fechar_etapa_atual', 'completed');
      }

      // ===== CALCULAR ETAPA DESTINO ANTES DE CRIAR A NOVA ETAPA =====
      // Lógica condicional quando sai da inspeção de qualidade
      let etapaDestino = proximaEtapa;

      // Lógica para pular inspeção de qualidade se pedido só tem separação
      if (etapaAtualNome === 'em_producao') {
        // Verificar se pedido tem linhas de soldagem ou perfiladeira
        const { data: linhasProducao } = await supabase
          .from('linhas_ordens')
          .select('tipo_ordem')
          .eq('pedido_id', pedidoId)
          .in('tipo_ordem', ['soldagem', 'perfiladeira', 'separacao']);
        
        const temSoldaOuPerfiladeira = linhasProducao?.some(
          l => l.tipo_ordem === 'soldagem' || l.tipo_ordem === 'perfiladeira'
        );
        
        if (!temSoldaOuPerfiladeira) {
          // Pedido só tem separação - pular inspeção de qualidade
          console.log('[moverParaProximaEtapa] Pedido só tem separação - pulando inspeção de qualidade');
          
          const { data: pedidoData } = await supabase
            .from('pedidos_producao')
            .select('venda_id')
            .eq('id', pedidoId)
            .single();
          
          if (pedidoData?.venda_id) {
            // Verificar se tem pintura
            const { data: produtosComPintura } = await supabase
              .from('produtos_vendas')
              .select('id')
              .eq('venda_id', pedidoData.venda_id)
              .gt('valor_pintura', 0)
              .limit(1);
            
            if (produtosComPintura && produtosComPintura.length > 0) {
              etapaDestino = 'aguardando_pintura';
              console.log('[moverParaProximaEtapa] → Destino: aguardando_pintura (tem pintura)');
            } else {
              // Sem pintura e só separação → pular embalagem também
              const { data: vendaEntrega } = await supabase
                .from('vendas')
                .select('tipo_entrega')
                .eq('id', pedidoData.venda_id)
                .single();

              if (vendaEntrega?.tipo_entrega === 'entrega') {
                etapaDestino = 'aguardando_coleta';
                console.log('[moverParaProximaEtapa] → Destino: aguardando_coleta (só separação, entrega)');
              } else {
                etapaDestino = 'instalacoes';
                console.log('[moverParaProximaEtapa] → Destino: instalacoes (só separação, instalação)');
              }
            }
          }
        }
      }

      if (etapaAtualNome === 'inspecao_qualidade') {
        // Buscar venda associada ao pedido
        const { data: pedidoData } = await supabase
          .from('pedidos_producao')
          .select('venda_id')
          .eq('id', pedidoId)
          .single();
        
        if (pedidoData?.venda_id) {
          // Verificar se tem pintura
          const { data: produtosComPintura } = await supabase
            .from('produtos_vendas')
            .select('id')
            .eq('venda_id', pedidoData.venda_id)
            .gt('valor_pintura', 0)
            .limit(1);
          
          if (produtosComPintura && produtosComPintura.length > 0) {
            // Tem pintura → avançar para aguardando_pintura
            etapaDestino = 'aguardando_pintura';
          } else {
            // Não tem pintura → pular embalagem, ir direto para coleta ou instalação
            const { data: vendaEntrega } = await supabase
              .from('vendas')
              .select('tipo_entrega')
              .eq('id', pedidoData.venda_id)
              .single();
            
            if (vendaEntrega?.tipo_entrega === 'entrega') {
              etapaDestino = 'aguardando_coleta';
              console.log('[moverParaProximaEtapa] Sem pintura → aguardando_coleta');
            } else {
              etapaDestino = 'instalacoes';
              console.log('[moverParaProximaEtapa] Sem pintura → instalacoes');
            }
          }
        }
      }

      // Lógica condicional quando sai de aguardando_pintura → vai para embalagem
      if (etapaAtualNome === 'aguardando_pintura') {
        etapaDestino = 'embalagem';
        console.log('[moverParaProximaEtapa] Saindo de aguardando_pintura → embalagem');
      }

      // Lógica condicional quando sai de embalagem → verificar tipo_entrega
      if (etapaAtualNome === 'embalagem') {
        const { data: pedidoData } = await supabase
          .from('pedidos_producao')
          .select('venda_id')
          .eq('id', pedidoId)
          .single();
        
        if (pedidoData?.venda_id) {
          const { data: venda } = await supabase
            .from('vendas')
            .select('tipo_entrega')
            .eq('id', pedidoData.venda_id)
            .single();
          
          if (venda?.tipo_entrega === 'entrega') {
            etapaDestino = 'aguardando_coleta';
            console.log('[moverParaProximaEtapa] Saindo de embalagem → aguardando_coleta');
          } else {
            etapaDestino = 'instalacoes';
            console.log('[moverParaProximaEtapa] Saindo de embalagem → instalacoes');
          }
        }
      }

      // Lógica condicional quando sai de aguardando_coleta
      // Se está em aguardando_coleta, é SEMPRE uma entrega e deve ir para finalizado
      if (etapaAtualNome === 'aguardando_coleta') {
        etapaDestino = 'finalizado';
        console.log('[moverParaProximaEtapa] Pedido em aguardando_coleta avançando para finalizado');
      }

      // Pedidos em instalacoes devem ir direto para finalizado (não para correcoes)
      if (etapaAtualNome === 'instalacoes') {
        etapaDestino = 'finalizado';
        console.log('[moverParaProximaEtapa] Pedido em instalacoes avançando para finalizado');
      }

      // ===== CRIAR NOVA ETAPA COM A ETAPA DESTINO CORRETA =====
      if (onProgress) onProgress('criar_nova_etapa', 'in_progress');
      await executarComDelay(async () => {
        const checkboxesNovos = ETAPAS_CONFIG[etapaDestino].checkboxes.map(cb => ({
          ...cb,
          checked: false
        }));

        const { error: etapaError } = await supabase
          .from('pedidos_etapas')
          .upsert({
            pedido_id: pedidoId,
            etapa: etapaDestino,
            checkboxes: checkboxesNovos as any,
            data_entrada: new Date().toISOString(),
            data_saida: null
          }, {
            onConflict: 'pedido_id,etapa'
          });

        if (etapaError) throw etapaError;
      });
      if (onProgress) onProgress('criar_nova_etapa', 'completed');

      // Registrar movimentação no histórico
      await supabase.from('pedidos_movimentacoes').insert({
        pedido_id: pedidoId,
        user_id: user.id,
        etapa_origem: etapaAtualNome,
        etapa_destino: etapaDestino,
        teor: 'avanco',
        descricao: `Pedido avançou de ${ETAPAS_CONFIG[etapaAtualNome].label} para ${ETAPAS_CONFIG[etapaDestino].label}`
      });

      // Calcular prioridade automática para aguardando_pintura (agrupar por cor)
      let novaPrioridade = 0;
      
      if (etapaDestino === 'aguardando_pintura') {
        try {
          // Buscar pedidos atuais na etapa com suas cores e prioridades
          const { data: pedidosNaEtapa } = await supabase
            .from('pedidos_producao')
            .select(`
              id, prioridade_etapa,
              vendas:venda_id (
                produtos_vendas (
                  cor:catalogo_cores (nome)
                )
              )
            `)
            .eq('etapa_atual', 'aguardando_pintura')
            .eq('arquivado', false)
            .order('prioridade_etapa', { ascending: false });

          // Buscar cor do pedido que está sendo movido
          const { data: pedidoAtual } = await supabase
            .from('pedidos_producao')
            .select(`vendas:venda_id (produtos_vendas (cor:catalogo_cores (nome)))`)
            .eq('id', pedidoId)
            .single();

          // Extrair cor do pedido atual
          const extrairCorDoPedido = (p: any): string | null => {
            const vendaData = Array.isArray(p?.vendas) ? p.vendas[0] : p?.vendas;
            const produtos = vendaData?.produtos_vendas || [];
            for (const prod of produtos) {
              if (prod.cor?.nome) return prod.cor.nome;
            }
            return null;
          };

          const corAtual = extrairCorDoPedido(pedidoAtual);
          
          if (corAtual && pedidosNaEtapa && pedidosNaEtapa.length > 0) {
            // Encontrar o último pedido com a mesma cor (menor prioridade entre os da mesma cor)
            let ultimoPrioridadeMesmaCor: number | null = null;
            
            for (const p of pedidosNaEtapa) {
              const corP = extrairCorDoPedido(p);
              if (corP === corAtual) {
                const prio = (p as any).prioridade_etapa || 0;
                if (ultimoPrioridadeMesmaCor === null || prio < ultimoPrioridadeMesmaCor) {
                  ultimoPrioridadeMesmaCor = prio;
                }
              }
            }
            
            if (ultimoPrioridadeMesmaCor !== null) {
              // Posicionar logo abaixo do último pedido com mesma cor
              novaPrioridade = ultimoPrioridadeMesmaCor - 1;
            } else {
              // Nenhum pedido com mesma cor: posicionar no final
              const menorPrioridade = Math.min(...pedidosNaEtapa.map((p: any) => (p as any).prioridade_etapa || 0));
              novaPrioridade = menorPrioridade - 1;
            }
          } else if (pedidosNaEtapa && pedidosNaEtapa.length > 0) {
            // Sem cor definida: posicionar no final
            const menorPrioridade = Math.min(...pedidosNaEtapa.map((p: any) => (p as any).prioridade_etapa || 0));
            novaPrioridade = menorPrioridade - 1;
          }
          
          console.log('[moverParaProximaEtapa] Prioridade calculada para aguardando_pintura:', { corAtual, novaPrioridade });
        } catch (err) {
          console.error('[moverParaProximaEtapa] Erro ao calcular prioridade por cor:', err);
          novaPrioridade = 0;
        }
      }

      // Atualizar pedido e definir prioridade
      if (onProgress) onProgress('atualizar_pedido', 'in_progress');
      await executarComDelay(async () => {
        const updatePayload: any = { 
            etapa_atual: etapaDestino,
            status: etapaDestino === 'finalizado' ? 'concluido' : 'em_andamento',
            prioridade_etapa: novaPrioridade
          };
        // Resetar flag de reprovação CEO ao avançar de "aberto"
        if (etapaAtualNome === 'aberto') {
          updatePayload.reprovado_ceo = false;
        }
        const { error: updateError } = await supabase
          .from('pedidos_producao')
          .update(updatePayload)
          .eq('id', pedidoId);

        if (updateError) throw updateError;

        // Sincronizar status da instalação com a etapa do pedido (se existir)
        // Mapeamento de etapas para status válidos de instalação
        const statusInstalacao = 
          etapaDestino === 'aberto' ? 'pendente_producao' :
          etapaDestino === 'em_producao' ? 'em_producao' :
          etapaDestino === 'inspecao_qualidade' ? 'em_producao' :
          etapaDestino === 'aguardando_pintura' ? 'em_producao' :
          etapaDestino === 'embalagem' ? 'em_producao' :
          etapaDestino === 'instalacoes' ? 'pronta_fabrica' :
          etapaDestino === 'finalizado' ? 'finalizada' :
          'pendente_producao';
        
        console.log('[moverParaProximaEtapa] Sincronizando instalação:', { etapaDestino, statusInstalacao });
        const { data: instalacaoData, error: instalacaoError } = await supabase
          .from('instalacoes')
          .update({ status: statusInstalacao })
          .eq('pedido_id', pedidoId)
          .select('id, status');

        if (instalacaoError) {
          console.error('[moverParaProximaEtapa] Erro ao atualizar status da instalação:', instalacaoError);
        } else if (instalacaoData && instalacaoData.length > 0) {
          console.log('[moverParaProximaEtapa] Status da instalação atualizado:', instalacaoData);
        }

        // Tabela entregas foi removida - sincronização não é mais necessária

        // Criar ordem de carregamento se avançar para aguardando_coleta ou instalacoes
        if (etapaDestino === 'aguardando_coleta' || etapaDestino === 'instalacoes') {
          if (onProgress) onProgress('criar_ordem_carregamento', 'in_progress');
          await executarComDelay(async () => {
            console.log('[moverParaProximaEtapa] Verificando necessidade de criar ordem de carregamento');
            
            // Verificar se já existe uma ordem de carregamento para este pedido
            const { data: ordemExistente } = await supabase
              .from('ordens_carregamento')
              .select('id')
              .eq('pedido_id', pedidoId)
              .maybeSingle();

            if (!ordemExistente) {
              // Buscar dados da venda para criar a ordem de carregamento
              const { data: pedidoData } = await supabase
                .from('pedidos_producao')
                .select('venda_id')
                .eq('id', pedidoId)
                .single();

              if (pedidoData?.venda_id) {
                const { data: venda } = await supabase
                  .from('vendas')
                  .select('cliente_nome, tipo_entrega')
                  .eq('id', pedidoData.venda_id)
                  .single();

                if (venda) {
                  const { error: ordemError } = await supabase
                    .from('ordens_carregamento')
                    .insert({
                      pedido_id: pedidoId,
                      venda_id: pedidoData.venda_id,
                      nome_cliente: venda.cliente_nome,
                      hora: '08:00',
                      status: 'pronta_fabrica',
                      tipo_carregamento: 'elisa', // Default para ambos (instalação e entrega)
                      created_by: user.id,
                      data_carregamento: null // Explicitamente sem data - deve ser agendada manualmente
                    });

                  if (ordemError) {
                    console.error('[moverParaProximaEtapa] Erro ao criar ordem de carregamento:', ordemError);
                  } else {
                    console.log('[moverParaProximaEtapa] ✓ Ordem de carregamento criada com sucesso');
                  }
                }
              }
            } else {
              console.log('[moverParaProximaEtapa] Ordem de carregamento já existe, sincronizando status');
              // Atualizar status da ordem existente
              await supabase
                .from('ordens_carregamento')
                .update({ status: 'pronta_fabrica' })
                .eq('pedido_id', pedidoId);
            }
          });
          if (onProgress) onProgress('criar_ordem_carregamento', 'completed');
        }
      });
      if (onProgress) onProgress('atualizar_pedido', 'completed');

      // Se avançou para produção, criar ordens automaticamente
      if (proximaEtapa === 'em_producao') {
        // Buscar linhas para determinar quais ordens criar
        const { data: linhas } = await supabase
          .from('pedido_linhas')
          .select('*, estoque:estoque_id(setor_responsavel_producao)')
          .eq('pedido_id', pedidoId);

        const temSolda = linhas?.some(l => 
          !l.estoque?.setor_responsavel_producao || 
          l.estoque?.setor_responsavel_producao === 'soldagem'
        );
        const temPerfiladeira = linhas?.some(l => 
          l.estoque?.setor_responsavel_producao === 'perfiladeira'
        );
        const temSeparacao = linhas?.some(l => 
          l.estoque?.setor_responsavel_producao === 'separacao'
        );

        // Criar ordens com progresso
        if (temPerfiladeira && onProgress) {
          onProgress('criar_ordem_perfiladeira', 'in_progress');
          await executarComDelay(async () => {});
          onProgress('criar_ordem_perfiladeira', 'completed');
        }

        if (temSolda && onProgress) {
          onProgress('criar_ordem_solda', 'in_progress');
          await executarComDelay(async () => {});
          onProgress('criar_ordem_solda', 'completed');
        }

        if (temSeparacao && onProgress) {
          onProgress('criar_ordem_separacao', 'in_progress');
          await executarComDelay(async () => {});
          onProgress('criar_ordem_separacao', 'completed');
        }

        // Executar criação real das ordens
        await criarOrdensProducao(pedidoId);

        // Verificar se precisa criar instalação ou entrega
        const { data: pedidoData } = await supabase
          .from('pedidos_producao')
          .select('venda_id')
          .eq('id', pedidoId)
          .single();

        if (pedidoData?.venda_id) {
          const { data: venda } = await supabase
            .from('vendas')
            .select('tipo_entrega')
            .eq('id', pedidoData.venda_id)
            .single();

          if (venda?.tipo_entrega === 'instalacao' && onProgress) {
            onProgress('criar_instalacao', 'in_progress');
            await executarComDelay(async () => {
              console.log('[moverParaProximaEtapa] Criando instalação para pedido:', pedidoId);
              
              // Buscar dados da venda para criar a instalação
              const { data: vendaCompleta } = await supabase
                .from('vendas')
                .select('cliente_nome, cliente_telefone, cidade, estado')
                .eq('id', pedidoData.venda_id)
                .single();
              
              if (vendaCompleta) {
                const { error: instalacaoError } = await supabase
                  .from('instalacoes')
                  .insert({
                    pedido_id: pedidoId,
                    venda_id: pedidoData.venda_id,
                    nome_cliente: vendaCompleta.cliente_nome || 'Cliente',
                    hora: '08:00',
                    status: 'em_producao',
                    tipo_instalacao: 'elisa',
                    created_by: user.id
                  });
                
                if (instalacaoError) {
                  console.error('[moverParaProximaEtapa] Erro ao criar instalação:', instalacaoError);
                } else {
                  console.log('[moverParaProximaEtapa] ✓ Instalação criada com sucesso');
                }
              }
            });
            onProgress('criar_instalacao', 'completed');
          }
          // Tabela entregas foi removida - lógica de entrega não é mais necessária
        }
      }

      // Se avançou para inspeção de qualidade, criar ordem de qualidade
      if (proximaEtapa === 'inspecao_qualidade') {
        if (onProgress) onProgress('criar_ordem_qualidade', 'in_progress');
        await executarComDelay(async () => {
          console.log('[moverParaProximaEtapa] Criando ordem de qualidade para pedido:', pedidoId);
          const { error: qualidadeError } = await supabase.rpc('criar_ordem_qualidade', {
            p_pedido_id: pedidoId
          });

          if (qualidadeError) {
            console.error('[moverParaProximaEtapa] Erro ao criar ordem de qualidade:', qualidadeError);
            throw qualidadeError;
          }
          console.log('[moverParaProximaEtapa] Ordem de qualidade criada com sucesso');
        });
        if (onProgress) onProgress('criar_ordem_qualidade', 'completed');
      }

      // Se avançou para aguardando_pintura, criar ordem de pintura
      if (etapaDestino === 'aguardando_pintura') {
        if (onProgress) onProgress('criar_ordem_pintura', 'in_progress');
        await executarComDelay(async () => {
          console.log('[moverParaProximaEtapa] Criando ordem de pintura para pedido:', pedidoId);
          const { error: pinturaError } = await supabase.rpc('criar_ordem_pintura', {
            p_pedido_id: pedidoId
          });

          if (pinturaError) {
            console.error('[moverParaProximaEtapa] Erro ao criar ordem de pintura:', pinturaError);
            throw pinturaError;
          }
          console.log('[moverParaProximaEtapa] Ordem de pintura criada com sucesso');
        });
        if (onProgress) onProgress('criar_ordem_pintura', 'completed');
      }

      // Se avançou para embalagem, criar ordem de embalagem
      if (etapaDestino === 'embalagem') {
        if (onProgress) onProgress('criar_ordem_embalagem', 'in_progress');
        await executarComDelay(async () => {
          console.log('[moverParaProximaEtapa] Criando ordem de embalagem para pedido:', pedidoId);
          const { error: embalagemError } = await supabase.rpc('criar_ordem_embalagem', {
            p_pedido_id: pedidoId
          });

          if (embalagemError) {
            console.error('[moverParaProximaEtapa] Erro ao criar ordem de embalagem:', embalagemError);
            throw embalagemError;
          }
          console.log('[moverParaProximaEtapa] Ordem de embalagem criada com sucesso');
        });
        if (onProgress) onProgress('criar_ordem_embalagem', 'completed');
      }

      // Se avançou para aguardando_coleta
      if (etapaDestino === 'aguardando_coleta') {
        if (onProgress) onProgress('preparar_coleta', 'in_progress');
        await executarComDelay(async () => {
          console.log('[moverParaProximaEtapa] Preparando coleta para pedido:', pedidoId);
        });
        if (onProgress) onProgress('preparar_coleta', 'completed');
      }

      // Se avançou para instalacoes, garantir que a instalação existe
      if (etapaDestino === 'instalacoes') {
        if (onProgress) onProgress('preparar_instalacao', 'in_progress');
        await executarComDelay(async () => {
          console.log('[moverParaProximaEtapa] Preparando instalação para pedido:', pedidoId);
          
          // Verificar se já existe instalação
          const { data: instalacaoExistente } = await supabase
            .from('instalacoes')
            .select('id, status')
            .eq('pedido_id', pedidoId)
            .maybeSingle();
          
          if (instalacaoExistente) {
            // Atualizar status da instalação existente
            console.log('[moverParaProximaEtapa] Instalação já existe, atualizando status para pronta_fabrica');
            await supabase
              .from('instalacoes')
              .update({ status: 'pronta_fabrica' })
              .eq('id', instalacaoExistente.id);
          } else {
            // Criar instalação se não existir
            console.log('[moverParaProximaEtapa] ⚠️ Instalação não existe, criando agora...');
            
            const { data: pedidoData } = await supabase
              .from('pedidos_producao')
              .select('venda_id')
              .eq('id', pedidoId)
              .single();
            
            if (pedidoData?.venda_id) {
              const { data: vendaCompleta } = await supabase
                .from('vendas')
                .select('cliente_nome, cliente_telefone, cidade, estado')
                .eq('id', pedidoData.venda_id)
                .single();
              
              if (vendaCompleta) {
                const { error: instalacaoError } = await supabase
                  .from('instalacoes')
                  .insert({
                    pedido_id: pedidoId,
                    venda_id: pedidoData.venda_id,
                    nome_cliente: vendaCompleta.cliente_nome || 'Cliente',
                    hora: '08:00',
                    status: 'pronta_fabrica',
                    tipo_instalacao: 'elisa',
                    created_by: user.id
                  });
                
                if (instalacaoError) {
                  console.error('[moverParaProximaEtapa] Erro ao criar instalação faltante:', instalacaoError);
                  throw new Error('Não foi possível criar a instalação');
                } else {
                  console.log('[moverParaProximaEtapa] ✓ Instalação criada com sucesso (criação tardia)');
                }
              }
            }
          }
        });
        if (onProgress) onProgress('preparar_instalacao', 'completed');
      }

      return { etapaAtualNome, proximaEtapa: etapaDestino };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pedidos-etapas'] });
      toast({
        title: "Etapa avançada",
        description: `Pedido movido para ${ETAPAS_CONFIG[data.proximaEtapa].label}`
      });
    },
    onError: (error: any) => {
      console.error('Erro ao mover etapa:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível avançar a etapa",
        variant: "destructive"
      });
    }
  });

  // Atualizar prioridade de um pedido
  const atualizarPrioridade = useMutation({
    mutationFn: async ({ 
      pedidoId, 
      novaPrioridade 
    }: { 
      pedidoId: string; 
      novaPrioridade: number;
    }) => {
      const { error } = await supabase
        .from('pedidos_producao')
        .update({ prioridade_etapa: novaPrioridade })
        .eq('id', pedidoId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos-etapas'] });
      queryClient.invalidateQueries({ queryKey: ['ordens-producao'] });
      queryClient.invalidateQueries({ queryKey: ['ordens-pintura'] });
      toast({
        title: "Prioridade atualizada",
        description: "A prioridade do pedido foi atualizada"
      });
    },
    onError: (error) => {
      console.error('Erro ao atualizar prioridade:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a prioridade",
        variant: "destructive"
      });
    },
  });

  // Reorganizar múltiplos pedidos (drag-and-drop) com Optimistic Update
  const reorganizarPedidos = useMutation({
    mutationFn: async (atualizacoes: { id: string; prioridade: number }[]) => {
      const updates = atualizacoes.map(({ id, prioridade }) =>
        supabase
          .from('pedidos_producao')
          .update({ prioridade_etapa: prioridade })
          .eq('id', id)
      );
      
      const results = await Promise.all(updates);
      const errors = results.filter(r => r.error);
      
      if (errors.length > 0) throw errors[0].error;
    },
    // Optimistic Update - atualiza UI imediatamente antes da resposta do servidor
    onMutate: async (atualizacoes) => {
      // Cancelar queries em andamento para evitar sobrescrever nosso update otimista
      await queryClient.cancelQueries({ queryKey: ['pedidos-etapas', etapa] });
      
      // Salvar estado anterior para rollback em caso de erro
      const previousPedidos = queryClient.getQueryData(['pedidos-etapas', etapa]);
      
      // Atualizar cache imediatamente com a nova ordem
      queryClient.setQueryData(['pedidos-etapas', etapa], (old: any[]) => {
        if (!old) return old;
        
        // Criar mapa de novas prioridades
        const prioridadeMap = new Map(
          atualizacoes.map(a => [a.id, a.prioridade])
        );
        
        // Atualizar prioridades
        const updated = old.map(pedido => ({
          ...pedido,
          prioridade_etapa: prioridadeMap.get(pedido.id) ?? pedido.prioridade_etapa
        }));
        
        // Ordenar por prioridade (decrescente)
        return updated.sort((a, b) => 
          (b.prioridade_etapa || 0) - (a.prioridade_etapa || 0)
        );
      });
      
      return { previousPedidos };
    },
    onSuccess: () => {
      // Sincronizar queries relacionadas em background
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['ordens-producao'] });
        queryClient.invalidateQueries({ queryKey: ['ordens-pintura'] });
      }, 1000);
    },
    // Rollback em caso de erro
    onError: (error, _variables, context) => {
      // Reverter para estado anterior
      if (context?.previousPedidos) {
        queryClient.setQueryData(['pedidos-etapas', etapa], context.previousPedidos);
      }
      
      console.error('Erro ao reorganizar pedidos:', error);
      toast({
        title: "Erro",
        description: "Não foi possível reorganizar os pedidos",
        variant: "destructive"
      });
    },
    // Sincronização final em background
    onSettled: () => {
      // Refetch silencioso após 3 segundos para garantir sincronização
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['pedidos-etapas'] });
      }, 3000);
    }
  });

  // Retroceder pedido para qualquer etapa (backlog)
  const retrocederEtapa = useMutation({
    mutationFn: async ({ pedidoId, etapaDestino, motivo }: { 
      pedidoId: string; 
      etapaDestino: EtapaPedido; 
      motivo: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Verificar se é admin
      const { data: adminData, error: adminError } = await supabase
        .from('admin_users')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (adminError || adminData?.role !== 'administrador') {
        throw new Error('Apenas administradores podem retroceder pedidos');
      }

      // Bloquear pedidos arquivados
      const { data: pedidoCheck } = await supabase
        .from('pedidos_producao')
        .select('arquivado')
        .eq('id', pedidoId)
        .single();

      if (pedidoCheck?.arquivado) {
        throw new Error('Pedido arquivado não pode ser retrocedido');
      }

      // Chamar função RPC que faz o retrocesso
      const { data, error } = await supabase.rpc('retroceder_pedido_para_etapa', {
        p_pedido_id: pedidoId,
        p_etapa_destino: etapaDestino,
        p_motivo_backlog: motivo,
        p_user_id: user.id
      });

      if (error) throw error;
      
      // Verificar retorno da função RPC (pode retornar success: false)
      if (data && typeof data === 'object' && 'success' in data && data.success === false) {
        throw new Error((data as any).error || 'Erro ao retroceder pedido');
      }

      return { etapaDestino };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pedidos-etapas'] });
      queryClient.invalidateQueries({ queryKey: ['pedidos-contadores'] });
      queryClient.invalidateQueries({ queryKey: ['pedido-view'] });
      toast({
        title: "Pedido Retornado",
        description: `O pedido foi marcado como BACKLOG e retornou para: ${ETAPAS_CONFIG[data.etapaDestino].label}`
      });
    },
    onError: (error: any) => {
      console.error('Erro ao retroceder pedido:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível retroceder o pedido",
        variant: "destructive"
      });
    }
  });

  const arquivarPedido = useMutation({
    mutationFn: async (pedidoId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');
      
      // Atualizar pedido para arquivado
      const { error } = await supabase
        .from('pedidos_producao')
        .update({ 
          arquivado: true,
          data_arquivamento: new Date().toISOString(),
          arquivado_por: user.id
        })
        .eq('id', pedidoId)
        .eq('etapa_atual', 'finalizado');
      
      if (error) throw error;

      // Registrar movimentação de arquivamento no histórico
      await supabase.from('pedidos_movimentacoes').insert({
        pedido_id: pedidoId,
        user_id: user.id,
        etapa_origem: 'finalizado',
        etapa_destino: 'finalizado',
        teor: 'avanco',
        descricao: 'Pedido arquivado'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos-etapas'] });
      queryClient.invalidateQueries({ queryKey: ['pedidos-contadores'] });
      toast({ 
        title: "Pedido arquivado", 
        description: "O pedido foi arquivado com sucesso" 
      });
    },
    onError: (error) => {
      console.error('[arquivarPedido] Erro:', error);
      toast({ 
        title: "Erro ao arquivar", 
        description: "Não foi possível arquivar o pedido", 
        variant: "destructive" 
      });
    }
  });

  // Deletar pedido e todas as suas ordens
  const deletarPedido = useMutation({
    mutationFn: async (pedidoId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Verificar se é admin
      const { data: adminData, error: adminError } = await supabase
        .from('admin_users')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (adminError || adminData?.role !== 'administrador') {
        throw new Error('Apenas administradores podem deletar pedidos');
      }

      // Chamar função RPC que deleta tudo
      const { error } = await supabase.rpc('deletar_pedido_completo', {
        p_pedido_id: pedidoId
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos-etapas'] });
      queryClient.invalidateQueries({ queryKey: ['pedidos-contadores'] });
      queryClient.invalidateQueries({ queryKey: ['historico-ordens'] });
      toast({
        title: "Pedido deletado",
        description: "O pedido e todas as suas ordens foram deletados com sucesso"
      });
    },
    onError: (error: any) => {
      console.error('Erro ao deletar pedido:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível deletar o pedido",
        variant: "destructive"
      });
    }
  });

  // Remover responsável de uma ordem
  const removerResponsavelOrdem = useMutation({
    mutationFn: async ({ ordemId, tipoOrdem }: { ordemId: string; tipoOrdem: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Mapear tipo de ordem para tabela
      const tabelaMap: Record<string, string> = {
        soldagem: 'ordens_soldagem',
        perfiladeira: 'ordens_perfiladeira',
        separacao: 'ordens_separacao',
        qualidade: 'ordens_qualidade',
        pintura: 'ordens_pintura',
        embalagem: 'ordens_embalagem',
      };

      const tabela = tabelaMap[tipoOrdem];
      if (!tabela) throw new Error('Tipo de ordem inválido');

      // Atualizar a ordem removendo o responsável e voltando status para pendente
      const { error } = await supabase
        .from(tabela as any)
        .update({ 
          responsavel_id: null,
          status: 'pendente',
          data_inicio: null,
        })
        .eq('id', ordemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos-etapas'] });
      queryClient.invalidateQueries({ queryKey: ['ordens-producao'] });
      toast({
        title: "Responsável removido",
        description: "O responsável foi removido da ordem com sucesso"
      });
    },
    onError: (error: any) => {
      console.error('Erro ao remover responsável:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível remover o responsável",
        variant: "destructive"
      });
    }
  });

  // Mutation para finalizar direto (pular etapas)
  const finalizarDireto = useMutation({
    mutationFn: async (pedidoId: string) => {
      const now = new Date().toISOString();

      // 1. Fechar etapa atual (setar data_saida)
      const { error: errorClose } = await supabase
        .from('pedidos_etapas')
        .update({ data_saida: now, updated_at: now })
        .eq('pedido_id', pedidoId)
        .is('data_saida', null);
      if (errorClose) throw errorClose;

      // 2. Upsert etapa finalizado
      const { error: errorUpsert } = await supabase
        .from('pedidos_etapas')
        .upsert({
          pedido_id: pedidoId,
          etapa: 'finalizado',
          data_entrada: now,
          data_saida: null,
          checkboxes: [],
          created_at: now,
          updated_at: now,
        }, { onConflict: 'pedido_id,etapa' });
      if (errorUpsert) throw errorUpsert;

      // 3. Atualizar etapa_atual no pedidos_producao
      const { error } = await supabase
        .from('pedidos_producao')
        .update({ etapa_atual: 'finalizado', updated_at: now })
        .eq('id', pedidoId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos-etapas'] });
      queryClient.invalidateQueries({ queryKey: ['pedidos-contadores'] });
      toast({ title: 'Pedido finalizado diretamente' });
    },
    onError: (error) => {
      console.error('Erro ao finalizar direto:', error);
      toast({ variant: 'destructive', title: 'Erro ao finalizar pedido' });
    },
  });

  return {
    pedidos,
    isLoading,
    atualizarCheckbox,
    moverParaProximaEtapa,
    retrocederEtapa,
    getEtapaAtual,
    atualizarPrioridade,
    reorganizarPedidos,
    arquivarPedido,
    deletarPedido,
    removerResponsavelOrdem,
    finalizarDireto,
  };
}
