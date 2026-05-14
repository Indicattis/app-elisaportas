import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatCurrency, cn } from "@/lib/utils";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowRight, Package, ChevronUp, ChevronDown, GripVertical, AlertCircle, CheckCircle, ArrowLeft, FileText, Paintbrush, Truck, Hammer, AlertTriangle, Archive, User, PauseCircle, PlayCircle, Boxes, Sparkles, UserMinus, Trash2, Clock, Wrench, CalendarPlus, CalendarX } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { CriarPedidoCorrecaoModal } from "./CriarPedidoCorrecaoModal";
import { EnviarCorrecaoModal } from "./EnviarCorrecaoModal";
import { useEnviarParaCorrecao } from "@/hooks/useEnviarParaCorrecao";
import { CronometroEtapaBadge } from "./CronometroEtapaBadge";
import React, { useState, useMemo } from "react";
import { AvisoFaltaModal } from "@/components/production/AvisoFaltaModal";
import { useGestaoOrdensProducao } from "@/hooks/useGestaoOrdensProducao";
import type { TipoOrdemProducao } from "@/lib/pausarOrdemProducao";

import { useNavigate, useLocation } from "react-router-dom";
import { PedidoDetalhesSheet } from "./PedidoDetalhesSheet";
import { AcaoEtapaModal } from "./AcaoEtapaModal";
import { RetrocederPedidoUnificadoModal } from "./RetrocederPedidoUnificadoModal";
import { AvancarQualidadeModal } from "./AvancarQualidadeModal";
import { ConfirmarAvancoModal } from "./ConfirmarAvancoModal";
import { ProcessoAvancoModal, Processo } from "./ProcessoAvancoModal";
import { VisualizarBacklogModal } from "./VisualizarBacklogModal";
import { AvisoEsperaModal } from "./AvisoEsperaModal";
import { ArquivarPedidoModal } from "./ArquivarPedidoModal";
import { ArquivamentoLoadingModal } from "./ArquivamentoLoadingModal";
import { ConfirmarExpedicaoModal } from "./ConfirmarExpedicaoModal";
import { ConcluirManutencaoModal } from "./ConcluirManutencaoModal";
import { RemoverResponsavelModal } from "./RemoverResponsavelModal";
import { ExcluirPedidoModal } from "./ExcluirPedidoModal";
import type { EtapaPedido } from "@/types/pedidoEtapa";
import { ETAPAS_CONFIG, getProximaEtapa, getEtapaAnterior } from "@/types/pedidoEtapa";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { formatarNumeroPedidoMensal } from "@/utils/pedidoFormatters";
interface PedidoCardProps {
  pedido: any;
  onMoverEtapa?: (pedidoId: string, skipCheckboxValidation?: boolean, onProgress?: (processoId: string, status: 'pending' | 'in_progress' | 'completed' | 'error') => void) => void;
  onRetrocederEtapa?: (pedidoId: string, etapaDestino: EtapaPedido, motivo: string) => void;
  onMoverPrioridade?: (pedidoId: string, direcao: 'frente' | 'tras') => void;
  onAvisoEspera?: (pedidoId: string, justificativa: string | null) => Promise<void>;
  onAgendar?: (pedidoId: string) => void;
  isAberto?: boolean;
  isDragging?: boolean;
  dragHandleProps?: any;
  posicao?: number;
  total?: number;
  viewMode?: 'grid' | 'list';
  onArquivar?: (pedidoId: string) => Promise<void>;
  onDeletar?: (pedidoId: string) => Promise<void>;
  onCorrecaoDetalhesClick?: (pedidoId: string) => void;
  onFinalizarDireto?: (pedidoId: string) => Promise<void>;
  onCarregarOrdem?: (pedidoId: string) => Promise<void>;
  onEnviarAguardandoCliente?: (pedidoId: string) => Promise<void>;
  onDevolverParaFinalizado?: (pedidoId: string) => Promise<void>;
  onResetarCarregamento?: (pedidoId: string) => Promise<void>;
  basePath?: string;
  readOnly?: boolean;
  disableClienteClick?: boolean;
  showEtapaBadge?: boolean;
  hideOrdensStatus?: boolean;
  hideCorrecaoButton?: boolean;
}
export function PedidoCard({
  pedido,
  onMoverEtapa,
  onRetrocederEtapa,
  onMoverPrioridade,
  onAvisoEspera,
  onAgendar,
  isAberto = false,
  isDragging = false,
  dragHandleProps,
  posicao,
  total,
  viewMode = 'grid',
  onArquivar,
  onDeletar,
  onCorrecaoDetalhesClick,
  onFinalizarDireto,
  onCarregarOrdem,
  onEnviarAguardandoCliente,
  onDevolverParaFinalizado,
  onResetarCarregamento,
  readOnly = false,
  disableClienteClick = false,
  showEtapaBadge = false,
  hideOrdensStatus = false,
  hideCorrecaoButton = false
}: PedidoCardProps) {
  const [showDetalhes, setShowDetalhes] = useState(false);
  const [showAcaoEtapa, setShowAcaoEtapa] = useState(false);
  const [showRetrocederEtapa, setShowRetrocederEtapa] = useState(false);
  const [showAvancarQualidade, setShowAvancarQualidade] = useState(false);
  const [showConfirmarAvanco, setShowConfirmarAvanco] = useState(false);
  const [showProgresso, setShowProgresso] = useState(false);
  const [showVisualizarBacklog, setShowVisualizarBacklog] = useState(false);
  const [showArquivar, setShowArquivar] = useState(false);
  const [showArquivamentoLoading, setShowArquivamentoLoading] = useState(false);
  const [showConfirmarExpedicao, setShowConfirmarExpedicao] = useState(false);
  const [showConcluirManutencao, setShowConcluirManutencao] = useState(false);
  const [showRemoverResponsavel, setShowRemoverResponsavel] = useState(false);
  const [showExcluirPedido, setShowExcluirPedido] = useState(false);
  const [isExcluindo, setIsExcluindo] = useState(false);
  const [showFinalizarDireto, setShowFinalizarDireto] = useState(false);
  const [isFinalizandoDireto, setIsFinalizandoDireto] = useState(false);
  const [showCarregarOrdem, setShowCarregarOrdem] = useState(false);
  const [isCarregando, setIsCarregando] = useState(false);
  const [showResetarCarregamento, setShowResetarCarregamento] = useState(false);
  const [isResetando, setIsResetando] = useState(false);
  const [showAvisoEspera, setShowAvisoEspera] = useState(false);
  const [ordemParaRemover, setOrdemParaRemover] = useState<{ ordem: any; nomeSetor: string } | null>(null);
  const [processos, setProcessos] = useState<Processo[]>([]);
  const [showCriarCorrecao, setShowCriarCorrecao] = useState(false);
  const [showEnviarCorrecao, setShowEnviarCorrecao] = useState(false);
  const [showAguardandoCliente, setShowAguardandoCliente] = useState(false);
  const [isEnviandoAguardandoCliente, setIsEnviandoAguardandoCliente] = useState(false);
  const [showDevolverFinalizado, setShowDevolverFinalizado] = useState(false);
  const [isDevolvendoFinalizado, setIsDevolvendoFinalizado] = useState(false);
  const [valorAReceberTemp, setValorAReceberTemp] = useState('');
  const [popoverValorAberto, setPopoverValorAberto] = useState(false);
  const [salvandoValor, setSalvandoValor] = useState(false);
  const [avisoFaltaOpen, setAvisoFaltaOpen] = useState(false);
  const [ordemParaPausar, setOrdemParaPausar] = useState<{
    ordemId: string;
    tipoOrdem: TipoOrdemProducao;
    pedidoId: string | null;
    numeroOrdem: string;
  } | null>(null);

  const handleAbrirPopoverValor = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Priorizar texto se existir, senão usar valor numérico
    const textoAtual = venda?.valor_a_receber_texto;
    const valorAtual = venda?.valor_a_receber;
    setValorAReceberTemp(textoAtual || (valorAtual ? String(valorAtual) : ''));
  };

  const handleSalvarValorAReceber = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!venda?.id) return;
    const textoOriginal = valorAReceberTemp.trim();
    if (!textoOriginal) return;
    setSalvandoValor(true);
    try {
      // Tentar parsear como número (remover pontos de milhar, trocar vírgula por ponto)
      const textoNormalizado = textoOriginal.replace(/\./g, '').replace(',', '.');
      const valorNumerico = parseFloat(textoNormalizado);
      const ehNumero = !isNaN(valorNumerico) && valorNumerico >= 0 && /^[\d.,\s]+$/.test(textoOriginal);

      const updateData: any = {
        valor_a_receber_texto: textoOriginal,
      };
      if (ehNumero) {
        updateData.valor_a_receber = valorNumerico;
      } else {
        updateData.valor_a_receber = null;
      }

      const { error } = await supabase
        .from('vendas')
        .update(updateData)
        .eq('id', venda.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['pedidos-etapas'] });
      setPopoverValorAberto(false);
      toast({ title: "Valor salvo", description: ehNumero ? `Valor a receber: ${formatCurrency(valorNumerico)}` : `Valor a receber: ${textoOriginal}` });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message || "Não foi possível salvar", variant: "destructive" });
    } finally {
      setSalvandoValor(false);
    }
  };

  const { enviarParaCorrecao, isEnviando: isEnviandoCorrecao } = useEnviarParaCorrecao();
  const {
    isAdmin
  } = useAuth();
  const {
    toast
  } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const isProducao = location.pathname.startsWith('/producao');
  const isAdministrativo = location.pathname.startsWith('/administrativo');
  const isDirecao = location.pathname.startsWith('/direcao');
  const isFabricaMontagem = location.pathname.startsWith('/fabrica/montagem-pedidos');

  const { pausarOrdem: pausarOrdemDirecao, despausarOrdem: despausarOrdemDirecao } = useGestaoOrdensProducao();

  // Carregar linhas da ordem que será pausada (sob demanda quando modal abre)
  const { data: linhasOrdemPausar = [] } = useQuery({
    queryKey: ['linhas-ordem-pausar', ordemParaPausar?.ordemId, ordemParaPausar?.tipoOrdem],
    enabled: !!ordemParaPausar && avisoFaltaOpen,
    queryFn: async () => {
      if (!ordemParaPausar) return [];
      const { data, error } = await supabase
        .from('linhas_ordens')
        .select('id, item, quantidade, tamanho, estoque:estoque_id (nome_produto)')
        .eq('ordem_id', ordemParaPausar.ordemId)
        .eq('tipo_ordem', ordemParaPausar.tipoOrdem);
      if (error) throw error;
      return (data || []).map((l: any) => ({
        id: l.id,
        item: l.estoque?.nome_produto || l.item,
        quantidade: l.quantidade,
        tamanho: l.tamanho,
      }));
    },
  });

  const handleAbrirPausarOrdem = (ordem: any) => {
    setOrdemParaPausar({
      ordemId: ordem.ordem_id,
      tipoOrdem: ordem.tipo_ordem as TipoOrdemProducao,
      pedidoId: ordem.pedido_id || pedido.id,
      numeroOrdem: pedido.numero_pedido || '',
    });
    setAvisoFaltaOpen(true);
  };

  const handleConfirmarPausa = async (
    justificativa: string,
    linhasProblemaIds?: string[],
    comentarioPedido?: string,
  ) => {
    if (!ordemParaPausar) return;
    await pausarOrdemDirecao.mutateAsync({
      ordemId: ordemParaPausar.ordemId,
      tipoOrdem: ordemParaPausar.tipoOrdem,
      justificativa,
      linhasProblemaIds,
      comentarioPedido,
    });
    setAvisoFaltaOpen(false);
    setOrdemParaPausar(null);
  };

  const handleRetomarOrdem = (ordem: any) => {
    despausarOrdemDirecao.mutate({
      ordemId: ordem.ordem_id,
      tipoOrdem: ordem.tipo_ordem as TipoOrdemProducao,
    });
  };


  // Mutation para remover responsável
  const removerResponsavelMutation = useMutation({
    mutationFn: async ({ ordemId, tipoOrdem }: { ordemId: string; tipoOrdem: string }) => {
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
      setShowRemoverResponsavel(false);
      setOrdemParaRemover(null);
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

  const handleRemoverResponsavel = (ordem: any, nomeSetor: string) => {
    setOrdemParaRemover({ ordem, nomeSetor });
    setShowRemoverResponsavel(true);
  };

  const confirmarRemoverResponsavel = () => {
    if (ordemParaRemover?.ordem?.ordem_id && ordemParaRemover?.ordem?.tipo_ordem) {
      removerResponsavelMutation.mutate({
        ordemId: ordemParaRemover.ordem.ordem_id,
        tipoOrdem: ordemParaRemover.ordem.tipo_ordem,
      });
    }
  };

  const handleConfirmarExclusao = async () => {
    if (onDeletar) {
      setIsExcluindo(true);
      try {
        await onDeletar(pedido.id);
        setShowExcluirPedido(false);
      } finally {
        setIsExcluindo(false);
      }
    }
  };

  // Helper component for buttons with tooltips
  const ButtonWithTooltip = ({ 
    children, 
    tooltip, 
    disabled, 
    ...props 
  }: { 
    children: React.ReactNode; 
    tooltip?: string; 
    disabled?: boolean;
    [key: string]: any;
  }) => {
    if (disabled && tooltip) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="w-full">
              {children}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="max-w-[200px]">{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      );
    }
    return <>{children}</>;
  };

  // Função de validação centralizada por etapa
  const getValidacaoAvancoEtapa = (etapa: string) => {
    switch (etapa) {
      case 'aberto':
        return {
          podeAvancar: temLinhas,
          mensagem: temLinhas 
            ? undefined 
            : "Preencha as linhas do pedido (Separação, Solda e Perfiladeira) para iniciar a produção"
        };
        
      case 'em_producao':
        return {
          podeAvancar: todasOrdensConcluidasEmProducao,
          mensagem: todasOrdensConcluidasEmProducao 
            ? undefined 
            : "Conclua todas as ordens de produção antes de avançar para inspeção de qualidade"
        };
        
      case 'inspecao_qualidade':
        return {
          podeAvancar: ordemQualidadeConcluida,
          mensagem: ordemQualidadeConcluida 
            ? undefined 
            : "Conclua a inspeção de qualidade antes de avançar"
        };
        
      case 'aguardando_pintura':
        return {
          podeAvancar: ordemPinturaConcluida,
          mensagem: ordemPinturaConcluida 
            ? undefined 
            : "Conclua a ordem de pintura antes de avançar para expedição"
        };
        
      case 'aguardando_coleta':
      case 'instalacoes':
      case 'correcoes':
        if (etapa === 'instalacoes' && finalizaSemCarregamento) {
          return {
            podeAvancar: true,
            mensagem: "Selecione a equipe/autorizado que executou o serviço para finalizar"
          };
        }
        return {
          podeAvancar: carregamentoConcluido,
          mensagem: carregamentoConcluido 
            ? undefined 
            : "Complete a ordem de carregamento em Expedição antes de finalizar o pedido"
        };
        
      default:
        return { podeAvancar: true, mensagem: undefined };
    }
  };

  // Buscar quantidade de linhas do pedido
  const {
    data: linhasCount = 0
  } = useQuery({
    queryKey: ['pedido-linhas-count', pedido.id],
    queryFn: async () => {
      const {
        count,
        error
      } = await supabase.from('pedido_linhas').select('*', {
        count: 'exact',
        head: true
      }).eq('pedido_id', pedido.id);
      if (error) throw error;
      return count || 0;
    }
  });

  // Detectar se o pedido contém apenas linhas de separação (sem solda nem perfiladeira)
  const { data: temApenasSeparacao = false } = useQuery({
    queryKey: ['pedido-linhas-categorias', pedido.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pedido_linhas')
        .select('categoria_linha')
        .eq('pedido_id', pedido.id);
      if (error) throw error;
      if (!data || data.length === 0) return false;
      return data.every((l: any) => l.categoria_linha === 'separacao');
    },
    enabled: pedido.etapa_atual === 'instalacoes',
  });

  // Buscar último comentário do pedido
  const { data: ultimoComentario } = useQuery({
    queryKey: ['pedido-ultimo-comentario', pedido.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pedido_comentarios')
        .select('comentario, autor_nome, created_at')
        .eq('pedido_id', pedido.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    }
  });

  // Verificar se todas as ordens de produção estão concluídas (para etapa em_producao)
  const {
    data: ordensStatus
  } = useQuery({
    queryKey: ['pedido-ordens-status', pedido.id],
    queryFn: async () => {
      if (pedido.etapa_atual !== 'em_producao') return null;
      const {
        data: todasConcluidas
      } = await supabase.rpc('verificar_ordens_pedido_concluidas', {
        p_pedido_id: pedido.id
      });
      return todasConcluidas;
    },
    enabled: pedido.etapa_atual === 'em_producao'
  });

  // Verificar se a ordem de qualidade está concluída (para etapa inspecao_qualidade)
  const {
    data: ordemQualidadeStatus
  } = useQuery({
    queryKey: ['pedido-qualidade-status', pedido.id],
    queryFn: async () => {
      if (pedido.etapa_atual !== 'inspecao_qualidade') return null;
      const {
        data: todasLinhasConcluidas
      } = await supabase.rpc('verificar_ordem_qualidade_concluida', {
        p_pedido_id: pedido.id
      });
      return todasLinhasConcluidas;
    },
    enabled: pedido.etapa_atual === 'inspecao_qualidade'
  });

  // Verificar se a ordem de pintura está concluída (para etapa aguardando_pintura)
  const {
    data: ordemPinturaStatus
  } = useQuery({
    queryKey: ['pedido-pintura-status', pedido.id],
    queryFn: async () => {
      if (pedido.etapa_atual !== 'aguardando_pintura') return null;
      const {
        data: ordemConcluida
      } = await supabase.rpc('verificar_ordem_pintura_concluida', {
        p_pedido_id: pedido.id
      });
      return ordemConcluida;
    },
    enabled: pedido.etapa_atual === 'aguardando_pintura'
  });

  // Verificar se a ordem de carregamento está concluída e buscar data
  const {
    data: carregamentoCompleto
  } = useQuery({
    queryKey: ['pedido-carregamento', pedido.id],
    queryFn: async () => {
      if (!['aguardando_coleta', 'instalacoes', 'correcoes', 'finalizado'].includes(pedido.etapa_atual)) {
        return {
          concluido: false,
          temData: true,
          dataCarregamento: null,
          responsavelNome: null,
          tipoCarregamento: null,
          vezesAgendado: 0
        };
      }

      // Consultar as 3 fontes em paralelo
      const [ordensRes, instRes, corrRes] = await Promise.all([
        supabase
          .from('ordens_carregamento')
          .select('data_carregamento, carregamento_concluido, responsavel_carregamento_nome, tipo_carregamento, vezes_agendado')
          .eq('pedido_id', pedido.id)
          .order('created_at', { ascending: false })
          .limit(1),
        supabase
          .from('instalacoes')
          .select('data_carregamento, carregamento_concluido, responsavel_carregamento_nome, tipo_carregamento, vezes_agendado')
          .eq('pedido_id', pedido.id)
          .order('created_at', { ascending: false })
          .limit(1),
        supabase
          .from('correcoes')
          .select('data_carregamento, carregamento_concluido, responsavel_carregamento_nome, tipo_carregamento, vezes_agendado')
          .eq('pedido_id', pedido.id)
          .order('created_at', { ascending: false })
          .limit(1),
      ]);

      const todasFontes = [ordensRes.data?.[0], instRes.data?.[0], corrRes.data?.[0]].filter(Boolean);

      // Priorizar fonte da etapa atual, fallback para qualquer concluída, fallback para qualquer
      const fontePorEtapa: Record<string, any> = {
        aguardando_coleta: ordensRes.data?.[0],
        instalacoes: instRes.data?.[0],
        correcoes: corrRes.data?.[0],
        finalizado: ordensRes.data?.[0],
      };
      const fontePrioritaria = fontePorEtapa[pedido.etapa_atual] || todasFontes.find(f => f.carregamento_concluido) || todasFontes[0];
      const concluido = fontePrioritaria?.carregamento_concluido || false;

      return {
        concluido,
        temData: !!fontePrioritaria?.data_carregamento,
        dataCarregamento: fontePrioritaria?.data_carregamento || null,
        responsavelNome: fontePrioritaria?.responsavel_carregamento_nome || null,
        tipoCarregamento: fontePrioritaria?.tipo_carregamento || null,
        vezesAgendado: fontePrioritaria?.vezes_agendado || 0
      };
    },
    enabled: pedido.etapa_atual === 'aguardando_coleta' || pedido.etapa_atual === 'instalacoes' || pedido.etapa_atual === 'correcoes' || pedido.etapa_atual === 'finalizado'
  });
  const carregamentoConcluido = carregamentoCompleto?.concluido || false;
  const temDataCarregamento = carregamentoCompleto?.temData || false;
  const dataCarregamento = carregamentoCompleto?.dataCarregamento || null;
  const vezesAgendado = carregamentoCompleto?.vezesAgendado || 0;

  // Verificar se está em backlog usando a view
  const emBacklog = pedido.backlog && pedido.backlog.length > 0;
  const motivoBacklog = pedido.backlog?.[0]?.motivo_backlog;
  const dataBacklog = pedido.backlog?.[0]?.data_backlog;
  const temHistoricoBacklog = pedido.tem_historico_backlog || false;

  // Tratar venda como array ou objeto único
  const vendaData = Array.isArray(pedido.vendas) ? pedido.vendas[0] : pedido.vendas;
  const venda = vendaData;

  // Helper para exibir valor a receber (prioriza texto)
  const exibirValorAReceber = (prefixo?: string) => {
    if (venda?.valor_a_receber_texto) {
      return prefixo ? `${prefixo}${venda.valor_a_receber_texto}` : venda.valor_a_receber_texto;
    }
    if (venda?.valor_a_receber && venda.valor_a_receber > 0) {
      return prefixo ? `${prefixo}${formatCurrency(venda.valor_a_receber)}` : formatCurrency(venda.valor_a_receber);
    }
    return null;
  };
  const temValorAReceber = !!(venda?.valor_a_receber_texto || (venda?.valor_a_receber && venda.valor_a_receber > 0));

  const etapaAtual = pedido.etapa_atual as EtapaPedido;
  const config = etapaAtual ? ETAPAS_CONFIG[etapaAtual] : null;
  const proximaEtapa = etapaAtual ? getProximaEtapa(etapaAtual) : null;
  const etapaAnterior = etapaAtual ? getEtapaAnterior(etapaAtual) : null;

  // Extrair data de entrada da etapa atual (onde data_saida é null)
  const etapasData = pedido.pedidos_etapas || [];
  const etapaAtualData = etapasData.find((e: any) => e.data_saida === null);
  const dataEntradaEtapaAtual = etapaAtualData?.data_entrada || null;
  const produtos = venda?.produtos_vendas || [];
  const temLinhas = linhasCount > 0;
  const todasOrdensConcluidasEmProducao = ordensStatus === true;
  const ordemQualidadeConcluida = ordemQualidadeStatus === true;
  const ordemPinturaConcluida = ordemPinturaStatus === true;

  // Identificar características do pedido
  const temPintura = produtos.some((p: any) => p.valor_pintura > 0);
  const temTerceirizacao = produtos.some((p: any) => p.tipo_fabricacao === 'terceirizado' || p.tipo_produto === 'porta_social');
  const apenasManutencao = produtos.length > 0 && produtos.every((p: any) => p.tipo_produto === 'manutencao');
  const finalizaSemCarregamento = apenasManutencao || temApenasSeparacao;
  const tipoEntrega = venda?.tipo_entrega;
  const isInstalacao = tipoEntrega === 'instalacao';
  const isEntrega = tipoEntrega === 'entrega';

  // Extrair cores únicas dos produtos com seus códigos hex
  const coresUnicasMap = new Map<string, { nome: string; codigo_hex: string }>();
  produtos.forEach((p: any) => {
    if (p.cor?.nome && p.cor?.codigo_hex) {
      coresUnicasMap.set(p.cor.nome, { nome: p.cor.nome, codigo_hex: p.cor.codigo_hex });
    }
  });
  const coresUnicas = Array.from(coresUnicasMap.values());

  // Extrair dados do atendente/criador da venda
  const atendente = venda?.atendente;
  const atendenteNome = atendente?.nome || 'Desconhecido';
  const atendenteFoto = atendente?.foto_perfil_url;
  const atendenteIniciais = atendenteNome
    .split(' ')
    .map((n: string) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const isAcoGalvanizado = (corNome: string) => {
    const normalized = corNome.toLowerCase().trim();
    return normalized.includes('aço') || normalized.includes('aco') || normalized.includes('galvanizado');
  };

  // Função para extrair dimensões do campo tamanho (string como "5.19x4.93")
  const parseTamanhoString = (tamanhoStr: string | null): { largura: number; altura: number } => {
    if (!tamanhoStr) return { largura: 0, altura: 0 };
    
    // Tenta fazer parse de formatos como "5.19x4.93" ou "5,19x4,93"
    // Usa regex global para substituir TODAS as vírgulas por pontos
    const normalizado = tamanhoStr.replace(/,/g, '.');
    const partes = normalizado.toLowerCase().split('x');
    
    if (partes.length === 2) {
      const largura = parseFloat(partes[0]) || 0;
      const altura = parseFloat(partes[1]) || 0;
      return { largura, altura };
    }
    
    return { largura: 0, altura: 0 };
  };

  // Calcular lista de portas P (pequenas ≤25m²) e G (grandes >25m²) com dimensões
  const portasEnrolar = produtos.filter((p: any) => p.tipo_produto === 'porta_enrolar');
  const listaPortasInfo: { tamanho: 'P' | 'G'; largura: number; altura: number; area: number; peso?: number }[] = [];
  portasEnrolar.forEach((p: any) => {
    // Primeiro tenta usar os campos numéricos, senão faz parse do campo tamanho
    let largura = p.largura || 0;
    let altura = p.altura || 0;
    
    // Se ambos são 0, tenta extrair do campo tamanho (string)
    if (largura === 0 && altura === 0 && p.tamanho) {
      const parsed = parseTamanhoString(p.tamanho);
      largura = parsed.largura;
      altura = parsed.altura;
    }
    
    const area = largura * altura; // área em m²
    const quantidade = p.quantidade || 1;
    const tamanhoCategoria = area > 25 ? 'G' : 'P';
    // Calcular peso da porta: (((largura * altura * 12) * 2) * 0.3)
    const peso = largura > 0 && altura > 0 ? (((largura * altura * 12) * 2) * 0.3) : null;
    
    for (let i = 0; i < quantidade; i++) {
      listaPortasInfo.push({ tamanho: tamanhoCategoria, largura, altura, area, peso });
    }
  });
  const portasPequenas = listaPortasInfo.filter(p => p.tamanho === 'P').length;
  const portasGrandes = listaPortasInfo.filter(p => p.tamanho === 'G').length;

  // Calcular se o pedido está atrasado (dias corridos desde criação)
  const temPortaEnrolar = portasEnrolar.length > 0;
  const LIMITE_DIAS_CORRIDOS = temPortaEnrolar ? 30 : 25;
  const isAtrasadoTotal = useMemo(() => {
    if (!pedido.created_at) return false;
    const diffMs = Date.now() - new Date(pedido.created_at).getTime();
    const diffDias = diffMs / (1000 * 60 * 60 * 24);
    return diffDias >= LIMITE_DIAS_CORRIDOS;
  }, [pedido.created_at, LIMITE_DIAS_CORRIDOS]);

  const calcularMetragemLinear = (): number => {
    const linhas = pedido.linhas_perfiladeira || [];
    let total = 0;
    
    linhas.forEach((linha: any) => {
      const tamanho = linha.tamanho || '0';
      // Parse "3,30" ou "3.30" para número
      const metros = parseFloat(tamanho.replace(',', '.')) || 0;
      const quantidade = linha.quantidade || 1;
      total += metros * quantidade;
    });
    
    return total;
  };

  // Calcular metragem quadrada (área total das portas de enrolar)
  const calcularMetragemQuadrada = (): number => {
    let total = 0;
    
    portasEnrolar.forEach((p: any) => {
      let largura = p.largura || 0;
      let altura = p.altura || 0;
      
      // Se ambos são 0, tenta extrair do campo tamanho (string)
      if (largura === 0 && altura === 0 && p.tamanho) {
        const parsed = parseTamanhoString(p.tamanho);
        largura = parsed.largura;
        altura = parsed.altura;
      }
      
      // Valores já estão em metros no banco de dados
      const quantidade = p.quantidade || 1;
      total += largura * altura * quantidade;
    });
    
    return total;
  };

  const metragemLinear = calcularMetragemLinear();
  const metragemQuadrada = calcularMetragemQuadrada();

  // Status das ordens de produção
  const ordens = pedido.ordens || {
    soldagem: { existe: false, status: null, capturada: false, pausada: false },
    perfiladeira: { existe: false, status: null, capturada: false, pausada: false },
    separacao: { existe: false, status: null, capturada: false, pausada: false },
    qualidade: { existe: false, status: null, capturada: false, pausada: false },
    pintura: { existe: false, status: null, capturada: false, pausada: false },
    embalagem: { existe: false, status: null, capturada: false, pausada: false },
  };

  // Helper para renderizar status de uma ordem
  const getStatusBorder = (status: string | null, pausada: boolean) => {
    if (pausada) {
      return "border-2 border-orange-500";
    }
    switch (status) {
      case "concluido":
      case "pronta":
        return "border border-green-500";
      case "em_andamento":
        return "border-2 border-yellow-500";
      case "pendente":
        return "border-2 border-gray-400";
      default:
        return "border-2 border-gray-300";
    }
  };

  const renderOrdemStatus = (ordem: any, nomeSetor: string) => {
    const tipoOrdemProducao =
      ordem?.tipo_ordem === 'soldagem' ||
      ordem?.tipo_ordem === 'perfiladeira' ||
      ordem?.tipo_ordem === 'separacao';
    const podeGerirPause = isDirecao && tipoOrdemProducao;

    if (!ordem?.existe) {
      if (podeGerirPause) {
        // Permitir pausar mesmo se a ordem não existe? Não — sem ordem nada a fazer.
        return <span className="text-gray-300 text-[10px]">—</span>;
      }
      return <span className="text-gray-300 text-[10px]">—</span>;
    }

    if (ordem.pausada) {
      if (podeGerirPause) {
        return (
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                onClick={(e) => e.stopPropagation()}
                className={`h-5 w-5 rounded-full ${getStatusBorder(ordem.status, ordem.pausada)} bg-orange-500/10 flex items-center justify-center cursor-pointer`}
              >
                <PauseCircle className="h-3 w-3 text-orange-600" />
              </button>
            </PopoverTrigger>
            <PopoverContent side="top" className="w-64 p-3" onClick={(e) => e.stopPropagation()}>
              <p className="text-xs font-semibold mb-1">{nomeSetor} — Pausada</p>
              {ordem.justificativa_pausa && (
                <p className="text-xs text-muted-foreground mb-3">{ordem.justificativa_pausa}</p>
              )}
              <Button
                size="sm"
                className="w-full"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRetomarOrdem(ordem);
                }}
                disabled={despausarOrdemDirecao.isPending}
              >
                <PlayCircle className="h-3.5 w-3.5 mr-2" />
                Retomar ordem
              </Button>
            </PopoverContent>
          </Popover>
        );
      }
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`h-5 w-5 rounded-full ${getStatusBorder(ordem.status, ordem.pausada)} bg-orange-500/10 flex items-center justify-center cursor-help`}>
              <PauseCircle className="h-3 w-3 text-orange-600" />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs font-medium">Pausada</p>
            {ordem.justificativa_pausa && (
              <p className="text-xs text-muted-foreground">{ordem.justificativa_pausa}</p>
            )}
          </TooltipContent>
        </Tooltip>
      );
    }

    // Tooltip com responsável e linhas concluídas para ordens capturadas
    if (ordem.capturada) {
      const temLinhasConcluidas = ordem.linhas_concluidas?.length > 0;
      
      const avatarContent = ordem.capturada_por_foto ? (
        <Avatar className={`h-5 w-5 ${getStatusBorder(ordem.status, false)} cursor-help`}>
          <AvatarImage src={ordem.capturada_por_foto} />
          <AvatarFallback className="text-[8px]">
            <User className="h-2.5 w-2.5" />
          </AvatarFallback>
        </Avatar>
      ) : (
        <div className={`h-5 w-5 rounded-full ${getStatusBorder(ordem.status, false)} bg-secondary flex items-center justify-center cursor-help`}>
          <User className="h-2.5 w-2.5" />
        </div>
      );

      const infoBlock = (
        <>
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              {ordem.capturada_por_foto && (
                <Avatar className="h-8 w-8">
                  <AvatarImage src={ordem.capturada_por_foto} />
                  <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                </Avatar>
              )}
              <div>
                <p className="text-xs font-semibold">{ordem.capturada_por_nome || 'Responsável'}</p>
                <p className="text-[10px] text-muted-foreground">{nomeSetor}</p>
              </div>
            </div>
            {isAdmin && ordem.ordem_id && ordem.status !== 'concluido' && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoverResponsavel(ordem, nomeSetor);
                }}
                title="Remover responsável"
              >
                <UserMinus className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>

          {temLinhasConcluidas ? (
            <div className="space-y-1 border-t pt-2">
              <p className="text-[10px] font-medium text-muted-foreground">
                Linhas concluídas ({ordem.linhas_concluidas.length}):
              </p>
              {ordem.linhas_concluidas.slice(0, 5).map((linha: any, idx: number) => (
                <div key={idx} className="flex items-center gap-1 text-[10px]">
                  <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                  <span className="truncate">
                    {linha.quantidade}x {linha.item}
                    {linha.tamanho && ` (${linha.tamanho})`}
                  </span>
                </div>
              ))}
              {ordem.linhas_concluidas.length > 5 && (
                <p className="text-[10px] text-muted-foreground">
                  +{ordem.linhas_concluidas.length - 5} mais...
                </p>
              )}
            </div>
          ) : (
            <p className="text-[10px] text-muted-foreground border-t pt-2">
              Nenhuma linha concluída ainda
            </p>
          )}
        </>
      );

      if (podeGerirPause && ordem.status !== 'concluido') {
        return (
          <Popover>
            <PopoverTrigger asChild>
              <button type="button" onClick={(e) => e.stopPropagation()} className="cursor-pointer">
                {avatarContent}
              </button>
            </PopoverTrigger>
            <PopoverContent side="top" className="w-72 p-3" onClick={(e) => e.stopPropagation()}>
              {infoBlock}
              <Button
                variant="destructive"
                size="sm"
                className="w-full mt-3"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAbrirPausarOrdem(ordem);
                }}
              >
                <PauseCircle className="h-3.5 w-3.5 mr-2" />
                Pausar ordem
              </Button>
            </PopoverContent>
          </Popover>
        );
      }

      return (
        <Tooltip>
          <TooltipTrigger asChild>
            {avatarContent}
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[280px] p-3">
            {infoBlock}
          </TooltipContent>
        </Tooltip>
      );
    }

    if (podeGerirPause && ordem.ordem_id) {
      return (
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              onClick={(e) => e.stopPropagation()}
              className="h-5 w-5 rounded-full bg-yellow-500/10 flex items-center justify-center cursor-pointer"
            >
              <AlertCircle className="h-3.5 w-3.5 text-yellow-600" />
            </button>
          </PopoverTrigger>
          <PopoverContent side="top" className="w-64 p-3" onClick={(e) => e.stopPropagation()}>
            <p className="text-xs font-semibold mb-1">{nomeSetor}</p>
            <p className="text-xs text-muted-foreground mb-3">Aguardando captura por um operador.</p>
            <Button
              variant="destructive"
              size="sm"
              className="w-full"
              onClick={(e) => {
                e.stopPropagation();
                handleAbrirPausarOrdem(ordem);
              }}
            >
              <PauseCircle className="h-3.5 w-3.5 mr-2" />
              Pausar ordem
            </Button>
          </PopoverContent>
        </Popover>
      );
    }

    return (
      <div className="h-5 w-5 rounded-full bg-yellow-500/10 flex items-center justify-center">
        <AlertCircle className="h-3.5 w-3.5 text-yellow-600" />
      </div>
    );
  };

  // Componente para renderizar círculo de cor
  const CorCirculo = ({ cor, size = 'sm' }: { cor: { nome: string; codigo_hex: string }; size?: 'sm' | 'md' }) => {
    const isAco = isAcoGalvanizado(cor.nome);
    const heightClass = size === 'sm' ? 'h-3' : 'h-3.5';
    
    if (isAco) {
      return (
        <div 
          className={`${heightClass} border-2 border-border relative bg-transparent`}
          style={{ width: '80px', borderRadius: '20px' }}
          title={cor.nome}
        >
          <div 
            className="absolute inset-0 flex items-center justify-center"
            style={{
              transform: 'rotate(-45deg)'
            }}
          >
            <div className="w-full h-[2px] bg-red-500" />
          </div>
        </div>
      );
    }
    
    return (
      <div 
        className={`${heightClass} border border-border`}
        style={{ backgroundColor: cor.codigo_hex, width: '80px', borderRadius: '20px' }} 
        title={cor.nome} 
      />
    );
  };

  // Função para determinar processos que serão executados
  const determinarProcessos = async (pedidoId: string) => {
    const lista: Processo[] = [];
    lista.push({
      id: 'fechar_etapa_atual',
      label: 'Fechando etapa atual',
      status: 'pending'
    }, {
      id: 'criar_nova_etapa',
      label: 'Criando nova etapa',
      status: 'pending'
    }, {
      id: 'atualizar_pedido',
      label: 'Atualizando status do pedido',
      status: 'pending'
    });
    if (etapaAtual === 'aberto') {
      const {
        data: linhas
      } = await supabase.from('pedido_linhas').select('*, estoque:estoque_id(setor_responsavel_producao)').eq('pedido_id', pedidoId);
      const temSolda = linhas?.some(l => !l.estoque?.setor_responsavel_producao || l.estoque?.setor_responsavel_producao === 'soldagem');
      const temPerfiladeira = linhas?.some(l => l.estoque?.setor_responsavel_producao === 'perfiladeira');
      const temSeparacao = linhas?.some(l => l.estoque?.setor_responsavel_producao === 'separacao');

      // Buscar dados da venda para determinar tipo de entrega
      const {
        data: pedidoData
      } = await supabase.from('pedidos_producao').select('venda_id').eq('id', pedidoId).single();
      let tipoEntrega = venda?.tipo_entrega;
      if (!tipoEntrega && pedidoData?.venda_id) {
        const {
          data: vendaData
        } = await supabase.from('vendas').select('tipo_entrega').eq('id', pedidoData.venda_id).single();
        tipoEntrega = vendaData?.tipo_entrega;
      }
      const ordensProcessos: Processo[] = [];
      if (temPerfiladeira) {
        ordensProcessos.push({
          id: 'criar_ordem_perfiladeira',
          label: 'Criando ordem de perfiladeira',
          status: 'pending'
        });
      }
      if (temSolda) {
        ordensProcessos.push({
          id: 'criar_ordem_solda',
          label: 'Criando ordem de solda',
          status: 'pending'
        });
      }
      if (temSeparacao) {
        ordensProcessos.push({
          id: 'criar_ordem_separacao',
          label: 'Criando ordem de separação',
          status: 'pending'
        });
      }
      if (tipoEntrega === 'instalacao') {
        ordensProcessos.push({
          id: 'criar_instalacao',
          label: 'Criando instalação',
          status: 'pending'
        });
      } else if (tipoEntrega === 'entrega') {
        ordensProcessos.push({
          id: 'criar_entrega',
          label: 'Criando entrega',
          status: 'pending'
        });
      }
      lista.unshift(...ordensProcessos);
    }
    if (proximaEtapa === 'inspecao_qualidade') {
      lista.unshift({
        id: 'criar_ordem_qualidade',
        label: 'Gerando ordem de qualidade',
        status: 'pending'
      });
    }
    if (proximaEtapa === 'aguardando_pintura') {
      lista.unshift({
        id: 'criar_ordem_pintura',
        label: 'Gerando ordem de pintura',
        status: 'pending'
      });
    }
    if (proximaEtapa === 'aguardando_coleta' || proximaEtapa === 'instalacoes') {
      lista.unshift({
        id: 'criar_ordem_carregamento',
        label: 'Criando ordem de carregamento',
        status: 'pending'
      });
    }

    // Se está na etapa de inspeção de qualidade, determinar destino
    if (etapaAtual === 'inspecao_qualidade') {
      // Buscar produtos da venda para verificar se tem pintura
      const {
        data: produtosComPintura
      } = await supabase.from('produtos_vendas').select('id').eq('venda_id', pedido.venda_id).gt('valor_pintura', 0).limit(1);
      if (produtosComPintura && produtosComPintura.length > 0) {
        // Tem pintura
        lista.push({
          id: 'criar_ordem_pintura',
          label: 'Enviando para pintura',
          status: 'pending'
        });
      } else {
        // Não tem pintura - verificar tipo de entrega
        const {
          data: venda
        } = await supabase.from('vendas').select('tipo_entrega').eq('id', pedido.venda_id).single();
        if (venda?.tipo_entrega === 'entrega') {
          lista.push({
            id: 'criar_ordem_carregamento',
            label: 'Criando ordem de carregamento',
            status: 'pending'
          });
          lista.push({
            id: 'preparar_coleta',
            label: 'Enviando para Coleta',
            status: 'pending'
          });
        } else {
          lista.push({
            id: 'criar_ordem_carregamento',
            label: 'Criando ordem de carregamento',
            status: 'pending'
          });
          lista.push({
            id: 'preparar_instalacao',
            label: 'Enviando para Instalação',
            status: 'pending'
          });
        }
      }
    }

    // Se está na etapa aguardando pintura, determinar destino
    if (etapaAtual === 'aguardando_pintura') {
      const {
        data: venda
      } = await supabase.from('vendas').select('tipo_entrega').eq('id', pedido.venda_id).single();
      if (venda?.tipo_entrega === 'entrega') {
        lista.push({
          id: 'criar_ordem_carregamento',
          label: 'Criando ordem de carregamento',
          status: 'pending'
        });
        lista.push({
          id: 'preparar_coleta',
          label: 'Enviando para Coleta',
          status: 'pending'
        });
      } else {
        lista.push({
          id: 'criar_ordem_carregamento',
          label: 'Criando ordem de carregamento',
          status: 'pending'
        });
        lista.push({
          id: 'preparar_instalacao',
          label: 'Enviando para Instalação',
          status: 'pending'
        });
      }
    }

    // Se está na etapa aguardando_coleta, verificar carregamento e finalizar
    if (etapaAtual === 'aguardando_coleta') {
      lista.push({
        id: 'verificar_carregamento',
        label: 'Verificando ordem de carregamento',
        status: 'pending'
      });
      lista.push({
        id: 'finalizando_pedido',
        label: 'Finalizando Pedido',
        status: 'pending'
      });
    }

    // Se está na etapa instalacoes, verificar carregamento e finalizar
    if (etapaAtual === 'instalacoes') {
      lista.push({
        id: 'verificar_carregamento',
        label: 'Verificando ordem de carregamento',
        status: 'pending'
      });
      lista.push({
        id: 'finalizando_pedido',
        label: 'Finalizando Pedido',
        status: 'pending'
      });
    }
    return lista;
  };

  const handleConfirmarArquivamento = async () => {
    setShowArquivar(false);
    setShowArquivamentoLoading(true);
    
    try {
      if (onArquivar) {
        await onArquivar(pedido.id);
      }
    } catch (error) {
      console.error('Erro ao arquivar:', error);
    } finally {
      setTimeout(() => {
        setShowArquivamentoLoading(false);
      }, 1000);
    }
  };

  // Handler para confirmar avanço (após modal de confirmação)
  const handleConfirmarAvanco = async () => {
    setShowConfirmarAvanco(false);

    // Se está na etapa aberto, aguardando_pintura, aguardando_coleta ou instalacoes, usa o sistema de processos
    if (etapaAtual === 'aberto' || etapaAtual === 'aguardando_pintura' || etapaAtual === 'aguardando_coleta' || etapaAtual === 'instalacoes') {
      const listaProcessos = await determinarProcessos(pedido.id);
      setProcessos(listaProcessos);
      setShowProgresso(true);
      if (onMoverEtapa) {
        await onMoverEtapa(pedido.id, true, (processoId, status) => {
          setProcessos(prev => prev.map(p => p.id === processoId ? {
            ...p,
            status
          } : p));
        });
        await new Promise(resolve => setTimeout(resolve, 1000));
        setShowProgresso(false);
      }
    }
  };

  // Handler para confirmar expedição (após modal de confirmação)
  const handleConfirmarExpedicao = async () => {
    setShowConfirmarExpedicao(false);
    const processosNecessarios = await determinarProcessos(pedido.id);
    setProcessos(processosNecessarios);
    setShowProgresso(true);
    
    if (onMoverEtapa) {
      // Verificar se o carregamento está concluído
      setProcessos(prev => prev.map(p => 
        p.id === 'verificar_carregamento' ? { ...p, status: 'in_progress' as const } : p
      ));
      
      // Consultar TODAS as fontes em paralelo
      const [ordensRes, instRes, corrRes] = await Promise.all([
        supabase.from('ordens_carregamento').select('carregamento_concluido').eq('pedido_id', pedido.id).order('created_at', { ascending: false }).limit(1),
        supabase.from('instalacoes').select('carregamento_concluido').eq('pedido_id', pedido.id).order('created_at', { ascending: false }).limit(1),
        supabase.from('correcoes').select('carregamento_concluido').eq('pedido_id', pedido.id).order('created_at', { ascending: false }).limit(1),
      ]);

      const todasFontes = [ordensRes.data?.[0], instRes.data?.[0], corrRes.data?.[0]].filter(Boolean);
      const carregamentoConcluido = todasFontes.some(f => f.carregamento_concluido);

      if (!carregamentoConcluido) {
        setProcessos(prev => prev.map(p => 
          p.id === 'verificar_carregamento' ? { ...p, status: 'error' as const } : p
        ));
        toast({
          title: "Erro",
          description: "A ordem de carregamento ainda não foi concluída em Expedição",
          variant: "destructive"
        });
        await new Promise(resolve => setTimeout(resolve, 2000));
        setShowProgresso(false);
        return;
      }
      
      setProcessos(prev => prev.map(p => 
        p.id === 'verificar_carregamento' ? { ...p, status: 'completed' as const } : p
      ));
      
      await onMoverEtapa(pedido.id, true, (processoId, status) => {
        setProcessos(prev => prev.map(p => p.id === processoId ? {
          ...p,
          status
        } : p));
      });
      await new Promise(resolve => setTimeout(resolve, 1000));
      setShowProgresso(false);
    }
  };

  // Badge de posição com cores especiais para top 3
  const getBadgeColor = () => {
    if (!posicao) return "bg-muted text-muted-foreground";
    if (posicao === 1) return "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/50";
    if (posicao === 2) return "bg-gray-400/20 text-gray-700 dark:text-gray-400 border-gray-500/50";
    if (posicao === 3) return "bg-orange-600/20 text-orange-700 dark:text-orange-400 border-orange-600/50";
    return "bg-muted text-muted-foreground";
  };

  // Layout compacto para visualização em lista
  if (viewMode === 'list') {
    return <>
        <Card 
          className={cn(
            "h-10 overflow-hidden cursor-pointer rounded-lg transition-all",
            "bg-white/5 border-white/10 backdrop-blur-xl text-white",
            "hover:bg-white/[0.08] hover:border-blue-400/30 hover:shadow-[0_0_0_1px_rgba(96,165,250,0.15)]",
            isDragging && "opacity-50 cursor-grabbing",
            
            (pedido as any).is_correcao && "border-l-4 border-l-purple-600",
            pedido.reprovado_ceo && "border-2 border-red-500 shadow-sm shadow-red-500/20"
          )}
          onClick={() => {
            if (onCorrecaoDetalhesClick && pedido.etapa_atual === 'correcoes') {
              onCorrecaoDetalhesClick(pedido.id);
            } else {
              setShowDetalhes(true);
            }
          }}
        >
          <CardContent className="p-0 h-full">
            <div className="grid items-center gap-1.5 h-full px-2 w-full" style={{ gridTemplateColumns: hideOrdensStatus ? (showEtapaBadge ? '20px 60px 20px 24px 180px 100px 20px 40px 40px 80px 70px 150px 50px 80px 65px 65px 1fr 55px' : '20px 20px 24px 180px 100px 20px 40px 40px 80px 70px 150px 50px 80px 65px 65px 1fr 55px') : (showEtapaBadge ? '20px 60px 20px 24px 180px 100px 20px 40px 40px 80px 70px 150px 50px 80px 65px 65px 24px 24px 24px 24px 24px 24px 1fr 55px' : '20px 20px 24px 180px 100px 20px 40px 40px 80px 70px 150px 50px 80px 65px 65px 24px 24px 24px 24px 24px 24px 1fr 55px') }}>
              {/* Col 1: Drag Handle ou Aviso de Espera */}
              <div>
                {dragHandleProps ? (
                  <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing" onClick={(e) => e.stopPropagation()}>
                    <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                ) : (
                  <span />
                )}
              </div>
              
              {/* Col 1.5: Badge de Etapa (apenas se showEtapaBadge=true) */}
              {showEtapaBadge && (
                <div className="flex items-center justify-center">
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-[8px] px-1.5 py-0.5 truncate max-w-[60px]",
                      config?.color
                    )}
                  >
                    {(() => {
                      const labelMap: Record<string, string> = {
                        'aberto': 'Aberto',
                        'em_producao': 'Produção',
                        'inspecao_qualidade': 'Qualidade',
                        'aguardando_pintura': 'Pintura',
                        'aguardando_coleta': 'Exp. Coleta',
                        'aguardando_instalacao': 'Exp. Instal.',
                        'instalacoes': 'Instalação',
                        'correcoes': 'Correções',
                        'finalizado': 'Finalizado'
                      };
                      return labelMap[etapaAtual] || config?.label || etapaAtual;
                    })()}
                  </Badge>
                </div>
              )}
              
              <div className="flex items-center justify-center">
                {(pedido as any).is_correcao && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center justify-center h-5 w-5 rounded bg-purple-500/10 border border-purple-500/50">
                        <Wrench className="h-3 w-3 text-purple-700 dark:text-purple-400" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>Correção</TooltipContent>
                  </Tooltip>
                )}
              </div>
              
              {/* Col 2: Foto do vendedor/criador */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={atendenteFoto || undefined} alt={atendenteNome} />
                    <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                      {atendenteIniciais}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Vendedor: {atendenteNome}</p>
                </TooltipContent>
              </Tooltip>
              
              {/* Col 3: Nome do cliente - flex grow */}
              <div className="min-w-0">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <h3 
                      className={cn(
                        "font-semibold text-sm truncate",
                        !disableClienteClick && "cursor-pointer hover:text-primary transition-colors"
                      )}
                      onClick={(e) => {
                        if (disableClienteClick) return;
                        e.stopPropagation();
                        if (isFabricaMontagem || isAdministrativo) {
                          navigate(`/fabrica/montagem-pedidos/${pedido.id}`);
                        } else if (isProducao) {
                          navigate(`/producao/controle/pedido/${pedido.id}/view`);
                        } else if (isDirecao) {
                          navigate(`/direcao/pedidos/${pedido.id}`);
                        } else {
                          navigate(`/dashboard/pedido/${pedido.id}/view`);
                        }
                      }}
                    >
                      {venda?.cliente_nome && venda.cliente_nome.length > 20 
                        ? `${venda.cliente_nome.substring(0, 20)}...` 
                        : venda?.cliente_nome}
                    </h3>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{venda?.cliente_nome}</p>
                  </TooltipContent>
                </Tooltip>
                {ultimoComentario && (
                  <p className="text-[9px] text-muted-foreground truncate" title={ultimoComentario.comentario}>
                    {ultimoComentario.comentario}
                  </p>
                )}
              </div>

              {/* Col 4: Cidade/Estado */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center justify-center text-center">
                    {(() => {
                      const vendaData = Array.isArray(pedido.vendas) ? pedido.vendas[0] : pedido.vendas;
                      const cidade = pedido.endereco_cidade || vendaData?.cidade;
                      const estado = pedido.endereco_estado || vendaData?.estado;
                      
                      if (cidade || estado) {
                        return (
                          <span className="text-[10px] text-muted-foreground truncate">
                            {cidade && estado 
                              ? `${cidade}/${estado}`
                              : cidade || estado}
                          </span>
                        );
                      }
                      return <span className="text-[9px] text-muted-foreground/50">—</span>;
                    })()}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">
                    {(() => {
                      const vendaData = Array.isArray(pedido.vendas) ? pedido.vendas[0] : pedido.vendas;
                      const cidade = pedido.endereco_cidade || vendaData?.cidade;
                      const estado = pedido.endereco_estado || vendaData?.estado;
                      return cidade && estado
                        ? `${cidade}, ${estado}`
                        : cidade || estado || 'Localização não informada';
                    })()}
                  </p>
                </TooltipContent>
              </Tooltip>

              {/* Col 4: Terceirização */}
              {temTerceirizacao ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center justify-center">
                      <span className="text-xs font-bold text-orange-500 bg-orange-500/10 rounded px-1.5 py-0.5">T</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Possui itens de terceirização</p>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <div />
              )}

              {/* Col 4: Metragem Linear (m) */}
              {etapaAtual === 'instalacoes' || etapaAtual === 'aguardando_coleta' ? (
                <div />
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="text-center">
                      <span className="text-[10px] font-medium text-blue-600">
                        {metragemLinear > 0 ? `${metragemLinear.toFixed(0)}m` : '—'}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Metragem linear (perfiladeira)</p>
                  </TooltipContent>
                </Tooltip>
              )}

              {/* Col 5: Metragem Quadrada (m²) */}
              {etapaAtual === 'instalacoes' || etapaAtual === 'aguardando_coleta' ? (
                <div />
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="text-center">
                      <span className="text-[10px] font-medium text-green-600">
                        {metragemQuadrada > 0 ? `${metragemQuadrada.toFixed(1)}m²` : '—'}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Área total das portas</p>
                  </TooltipContent>
                </Tooltip>
              )}
              
              {/* Col 6: Data de Carregamento */}
              <div className="text-center">
                {(() => {
                  const isExpedicao = etapaAtual === 'aguardando_coleta' || etapaAtual === 'instalacoes' || etapaAtual === 'correcoes';
                  
                  if (isExpedicao) {
                    // Se carregamento concluído, mostrar "Carregada"
                    if (carregamentoConcluido) {
                      return (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex flex-col items-center leading-tight cursor-help">
                              <span className="text-[9px] font-medium text-zinc-400">
                                Carregada
                              </span>
                              {dataCarregamento && (
                                <span className="text-xs font-bold text-zinc-500">
                                  {format(parseISO(dataCarregamento), "dd/MM/yy")}
                                </span>
                              )}
                            </div>
                          </TooltipTrigger>
                          {vezesAgendado >= 2 && (
                            <TooltipContent>
                              <p className="text-xs">Reagendado {vezesAgendado} vezes</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      );
                    }
                    
                    if (!dataCarregamento) {
                      return (
                        <span className="text-[10px] font-bold text-destructive">
                          Não agendado
                        </span>
                      );
                    }
                    
                    // Verificar se está atrasado (data no passado e não concluído)
                    const dataCarreg = parseISO(dataCarregamento);
                    const hoje = new Date();
                    hoje.setHours(0, 0, 0, 0);
                    dataCarreg.setHours(0, 0, 0, 0);
                    const atrasado = dataCarreg < hoje;
                    
                    return (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex flex-col items-center leading-tight cursor-help">
                            <span className={cn(
                              "text-[9px] font-medium",
                              atrasado ? "text-red-600" : "text-green-600"
                            )}>
                              {atrasado ? "Atrasado" : "Agendado"}
                            </span>
                            <span className={cn(
                              "text-xs font-bold",
                              atrasado ? "text-red-600" : "text-green-600"
                            )}>
                              {format(parseISO(dataCarregamento), "dd/MM/yy")}
                            </span>
                          </div>
                        </TooltipTrigger>
                        {vezesAgendado >= 2 && (
                          <TooltipContent>
                            <p className="text-xs">Reagendado {vezesAgendado} vezes</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    );
                  }
                  
                  // Para outras etapas
                  if (dataCarregamento) {
                    return (
                      <span title="Data de carregamento" className="text-[10px] font-medium text-muted-foreground">
                        {format(parseISO(dataCarregamento), "dd/MM/yy")}
                      </span>
                    );
                  }
                  
                  return <span className="text-[9px] text-muted-foreground/50">—</span>;
                })()}
              </div>
              
              {/* Col 7: Responsável Carregamento */}
              <div className="text-center overflow-hidden">
                {(() => {
                  const responsavelNome = carregamentoCompleto?.responsavelNome;
                  const tipoCarregamento = carregamentoCompleto?.tipoCarregamento;
                  
                  if (!responsavelNome) {
                    return <span className="text-[9px] text-muted-foreground/50">—</span>;
                  }
                  
                  // Definir cor baseado no tipo
                  const corClasse = tipoCarregamento === 'elisa' 
                    ? 'text-blue-600' 
                    : tipoCarregamento === 'autorizados' 
                      ? 'text-amber-600' 
                      : 'text-green-600';
                  
                  return (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className={cn("text-[10px] font-medium truncate block cursor-help", corClasse)}>
                          {responsavelNome.length > 10 
                            ? `${responsavelNome.substring(0, 10)}...` 
                            : responsavelNome}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">{responsavelNome}</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })()}
              </div>
              
              {/* Col 5: Portas P/G */}
              <div className="flex items-center gap-0.5 overflow-hidden">
                {listaPortasInfo.length > 0 ? (
                  <>
                    {listaPortasInfo.slice(0, 6).map((porta, idx) => (
                      <Tooltip key={idx}>
                        <TooltipTrigger asChild>
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "text-[9px] px-1 py-0 h-4 text-white cursor-default",
                              porta.tamanho === 'P' 
                                ? "bg-blue-500 border-blue-500"
                                : "bg-orange-500 border-orange-500"
                            )}
                            onMouseEnter={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {porta.tamanho}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="z-[100]">
                          <p className="font-medium">{porta.largura.toFixed(2)}m × {porta.altura.toFixed(2)}m</p>
                          <p className="text-xs text-muted-foreground">{porta.area.toFixed(2)} m²</p>
                          {porta.peso && porta.peso > 0 && (
                            <p className="text-xs text-muted-foreground">Peso: {porta.peso.toFixed(1)} kg</p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    ))}
                    {listaPortasInfo.length > 6 && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span 
                            className="text-[9px] text-muted-foreground cursor-default"
                            onMouseEnter={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                          >
                            +{listaPortasInfo.length - 6}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="z-[100]">
                          <p>{portasPequenas} porta(s) pequena(s) (≤25m²)</p>
                          <p>{portasGrandes} porta(s) grande(s) (&gt;25m²)</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </>
                ) : (
                  <span className="text-gray-300 text-[10px]">—</span>
                )}
              </div>

              {/* Col 6: Tags/Badges (Instalação/Entrega) */}
              <div className="flex items-center justify-center gap-1">
                {isInstalacao && (apenasManutencao ? (
                  <Badge variant="outline" className="text-[10px] px-1 py-0 h-5 bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/50">
                    <Wrench className="h-2.5 w-2.5" />
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] px-1 py-0 h-5 bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/50">
                    <Hammer className="h-2.5 w-2.5" />
                  </Badge>
                ))}
                
                {isEntrega && <Badge variant="outline" className="text-[10px] px-1 py-0 h-5 bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/50">
                    <Truck className="h-2.5 w-2.5" />
                  </Badge>}
                  
                {!isInstalacao && !isEntrega && <span className="text-gray-300 text-[10px]">—</span>}
              </div>
              
              {/* Col 7: Cores */}
              <div className="flex items-center gap-1">
                {coresUnicas.length > 0 ? (
                  <>
                    {coresUnicas.slice(0, 2).map((cor, idx) => (
                      <div 
                        key={idx}
                        className="h-5 flex-1 border border-border"
                        style={{ 
                          backgroundColor: isAcoGalvanizado(cor.nome) ? 'transparent' : cor.codigo_hex,
                          borderRadius: '20px'
                        }}
                        title={cor.nome}
                      />
                    ))}
                    {coresUnicas.length > 2 && (
                      <span className="text-[9px] text-muted-foreground">+{coresUnicas.length - 2}</span>
                    )}
                  </>
                ) : (
                  <Badge variant="outline" className="text-[8px] px-1 py-0 h-4 bg-gray-200/20 text-gray-500 border-gray-400/30">
                    Galvanizada
                  </Badge>
                )}
              </div>

              {/* Col: Valor da Venda */}
              <div className="text-center">
                <span className="text-[10px] text-muted-foreground">
                  {venda?.valor_venda ? formatCurrency(venda.valor_venda) : '—'}
                </span>
              </div>

              {/* Col: Valor a Receber */}
              <div className="text-center" onClick={(e) => e.stopPropagation()}>
                {venda?.valor_a_receber_faturamento ? (
                  <span
                    className={cn(
                      "text-[10px] rounded px-1 py-0.5",
                      temValorAReceber
                        ? "font-medium text-emerald-600 bg-emerald-500/10"
                        : "text-muted-foreground/50"
                    )}
                  >
                    {exibirValorAReceber() || '—'}
                  </span>
                ) : (
                <Popover open={popoverValorAberto} onOpenChange={setPopoverValorAberto}>
                  <PopoverTrigger asChild>
                    <button
                      onClick={handleAbrirPopoverValor}
                      className={cn(
                        "text-[10px] rounded px-1 py-0.5 cursor-pointer hover:opacity-80 transition-opacity",
                        venda?.pagamento_na_entrega
                          ? "font-medium text-amber-600 bg-amber-500/10"
                          : temValorAReceber
                            ? "font-medium text-emerald-600 bg-emerald-500/10"
                            : "text-muted-foreground/50 hover:text-muted-foreground"
                      )}
                    >
                      {exibirValorAReceber() || (venda?.pagamento_na_entrega ? '—' : '+ R$')}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-3" align="center" onClick={(e) => e.stopPropagation()}>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">Valor a Receber</label>
                      <Input
                        type="text"
                        placeholder="Ex: 1.500,00 ou texto"
                        value={valorAReceberTemp}
                        onChange={(e) => setValorAReceberTemp(e.target.value)}
                        className="h-8 text-sm"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button size="sm" className="flex-1 h-7 text-xs" onClick={handleSalvarValorAReceber} disabled={salvandoValor}>
                          {salvandoValor ? '...' : 'Salvar'}
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={(e) => { e.stopPropagation(); setPopoverValorAberto(false); }}>
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
                )}
              </div>

              {/* Col 8-12: Status das Ordens */}
              {!hideOrdensStatus && (
                <>
                  <div className="flex items-center justify-center" title="Soldagem">
                    {renderOrdemStatus(ordens.soldagem, 'Soldagem')}
                  </div>
                  <div className="flex items-center justify-center" title="Perfiladeira">
                    {renderOrdemStatus(ordens.perfiladeira, 'Perfiladeira')}
                  </div>
                  <div className="flex items-center justify-center" title="Separação">
                    {renderOrdemStatus(ordens.separacao, 'Separação')}
                  </div>
                  <div className="flex items-center justify-center" title="Qualidade">
                    {renderOrdemStatus(ordens.qualidade, 'Qualidade')}
                  </div>
                  <div className="flex items-center justify-center" title="Pintura">
                    {renderOrdemStatus(ordens.pintura, 'Pintura')}
                  </div>
                  <div className="flex items-center justify-center" title="Embalagem">
                    {renderOrdemStatus(ordens.embalagem, 'Embalagem')}
                  </div>
                </>
              )}
              
              {/* Col 13: Tempo na Etapa + Total */}
              <div className="text-center flex items-center justify-center gap-1">
                <CronometroEtapaBadge dataEntrada={dataEntradaEtapaAtual} compact etapa={etapaAtual} />
                {pedido.created_at && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="outline" className={cn(
                        "text-[10px] px-1.5 py-0.5 font-mono cursor-default",
                        isAtrasadoTotal
                          ? "bg-red-500/10 text-red-500 border-red-500/30"
                          : "bg-muted/50 text-muted-foreground border-muted-foreground/30"
                      )}>
                        <Clock className="h-2.5 w-2.5 mr-0.5" />
                        {formatDistanceToNow(new Date(pedido.created_at), { locale: ptBR })}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="p-3">
                      <div className="space-y-1 text-xs">
                        {venda?.created_at && (
                          <p>Venda criada: {format(new Date(venda.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                        )}
                        <p>Faturada: {format(new Date(pedido.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                        <p>Pedido criado: {format(new Date(pedido.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                        {dataEntradaEtapaAtual && (
                          <p>Etapa atual: {format(new Date(dataEntradaEtapaAtual), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
              
              {/* Col 14: Botões de ação */}
              {!readOnly && (
              <TooltipProvider>
                <div className="flex items-center justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
                  {(() => {
                    // Arrays separados para ordenação: retroceder à esquerda, outros no meio, avançar à direita
                    const retrocederButtons: React.ReactNode[] = [];
                    const middleButtons: React.ReactNode[] = [];
                    const avancarButtons: React.ReactNode[] = [];

                    // Botão de retroceder (vai para a esquerda)
                    const podeRetroceder = etapaAtual !== 'aberto' && etapaAtual !== 'finalizado' && etapaAtual !== 'correcoes' && etapaAnterior && onRetrocederEtapa;
                    if (podeRetroceder) {
                      retrocederButtons.push(
                        <Button key="retroceder" size="icon" variant="outline" onClick={(e) => { e.stopPropagation(); setShowRetrocederEtapa(true); }} title="Retroceder para etapa anterior" className="flex h-[20px] w-[20px] rounded-[3px] bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/50">
                          <ArrowLeft className="h-3 w-3" />
                        </Button>
                      );
                    }



                    // Botão de agendar / reagendar no calendário
                    // Permite reagendar mesmo quando já existe data, desde que o carregamento ainda não foi concluído
                    if (onAgendar && !carregamentoConcluido && !finalizaSemCarregamento && (etapaAtual === 'aguardando_coleta' || etapaAtual === 'instalacoes' || etapaAtual === 'correcoes')) {
                      const tooltipLabel = temDataCarregamento ? 'Reagendar no Calendário' : 'Agendar no Calendário';
                      middleButtons.push(
                        <Tooltip key="agendar">
                          <TooltipTrigger asChild>
                            <Button 
                              size="icon" 
                              variant="outline" 
                              onClick={(e) => { e.stopPropagation(); onAgendar(pedido.id); }} 
                              title={tooltipLabel}
                              className="flex h-[20px] w-[20px] rounded-[3px] bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border-blue-500/50"
                            >
                              <CalendarPlus className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <span className="text-xs">{tooltipLabel}</span>
                          </TooltipContent>
                        </Tooltip>
                      );
                    }

                    // Botão de gerar correção (etapas pós-produção) ou enviar para correções (instalacoes)
                    const etapasCorrecao = ['inspecao_qualidade', 'correcoes'];
                    if ((etapaAtual === 'instalacoes' || etapaAtual === 'aguardando_coleta') && !readOnly && !hideCorrecaoButton && carregamentoConcluido) {
                      middleButtons.push(
                        <Tooltip key="enviar-correcao-instalacoes">
                          <TooltipTrigger asChild>
                            <Button 
                              size="icon" 
                              variant="outline" 
                              onClick={(e) => { e.stopPropagation(); setShowEnviarCorrecao(true); }} 
                              title="Enviar para Correções" 
                              className="flex h-[20px] w-[20px] rounded-[3px] bg-purple-500/10 text-purple-600 hover:bg-purple-500/20 border-purple-500/50"
                            >
                              <Wrench className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <span className="text-xs">Enviar para Correções</span>
                          </TooltipContent>
                        </Tooltip>
                      );
                    } else if (etapasCorrecao.includes(etapaAtual) && !readOnly && !hideCorrecaoButton && (etapaAtual !== 'correcoes' || carregamentoConcluido)) {
                      middleButtons.push(
                        <Tooltip key="gerar-correcao">
                          <TooltipTrigger asChild>
                            <Button 
                              size="icon" 
                              variant="outline" 
                              onClick={(e) => { e.stopPropagation(); setShowCriarCorrecao(true); }} 
                              title="Gerar pedido de correção" 
                              className="flex h-[20px] w-[20px] rounded-[3px] bg-purple-500/10 text-purple-600 hover:bg-purple-500/20 border-purple-500/50"
                            >
                              <Wrench className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <span className="text-xs">Gerar Correção</span>
                          </TooltipContent>
                        </Tooltip>
                      );
                    }

                    // Botões de avançar (vão para a direita)
                    if (isAberto && onMoverEtapa) {
                      const validacao = getValidacaoAvancoEtapa('aberto');
                      avancarButtons.push(
                        <ButtonWithTooltip key="iniciar" tooltip={validacao.mensagem} disabled={!validacao.podeAvancar}>
                          <Button size="icon" onClick={(e) => { e.stopPropagation(); setShowConfirmarAvanco(true); }} disabled={!validacao.podeAvancar} className="flex h-[20px] w-full rounded-[3px]">
                            <ArrowRight className="h-3 w-3" />
                          </Button>
                        </ButtonWithTooltip>
                      );
                    } else if (etapaAtual === 'em_producao') {
                      const validacao = getValidacaoAvancoEtapa('em_producao');
                      avancarButtons.push(
                        <ButtonWithTooltip key="avançar-qualidade" tooltip={validacao.mensagem} disabled={!validacao.podeAvancar}>
                          <Button size="icon" onClick={(e) => { e.stopPropagation(); setShowAvancarQualidade(true); }} disabled={!validacao.podeAvancar} className="flex h-[20px] w-full rounded-[3px]">
                            <ArrowRight className="h-3 w-3" />
                          </Button>
                        </ButtonWithTooltip>
                      );
                    } else if (etapaAtual === 'inspecao_qualidade') {
                      const validacao = getValidacaoAvancoEtapa('inspecao_qualidade');
                      avancarButtons.push(
                        <ButtonWithTooltip key="avançar" tooltip={validacao.mensagem} disabled={!validacao.podeAvancar}>
                          <Button size="icon" onClick={async (e) => {
                            e.stopPropagation();
                            const processosNecessarios = await determinarProcessos(pedido.id);
                            setProcessos(processosNecessarios);
                            setShowProgresso(true);
                            if (onMoverEtapa) {
                              await onMoverEtapa(pedido.id, true, (processoId, status) => {
                                setProcessos(prev => prev.map(p => p.id === processoId ? {
                                  ...p,
                                  status
                                } : p));
                              });
                              await new Promise(resolve => setTimeout(resolve, 1000));
                              setShowProgresso(false);
                            }
}} disabled={!validacao.podeAvancar} className="flex h-[20px] w-full rounded-[3px]">
                            <ArrowRight className="h-3 w-3" />
                          </Button>
                        </ButtonWithTooltip>
                      );
                    } else if (etapaAtual === 'aguardando_pintura') {
                      const validacao = getValidacaoAvancoEtapa('aguardando_pintura');
                      avancarButtons.push(
                        <ButtonWithTooltip key="avançar" tooltip={validacao.mensagem} disabled={!validacao.podeAvancar}>
                          <Button size="icon" onClick={(e) => { e.stopPropagation(); setShowConfirmarAvanco(true); }} disabled={!validacao.podeAvancar} className="flex h-[20px] w-full rounded-[3px]">
                            <ArrowRight className="h-3 w-3" />
                          </Button>
                        </ButtonWithTooltip>
                      );
                    } else if ((etapaAtual === 'aguardando_coleta' || etapaAtual === 'instalacoes' || etapaAtual === 'correcoes') && (carregamentoConcluido || (etapaAtual === 'instalacoes' && finalizaSemCarregamento))) {
                      const validacao = getValidacaoAvancoEtapa(etapaAtual);
                      avancarButtons.push(
                        <ButtonWithTooltip key="avançar-expedicao" tooltip={validacao.mensagem} disabled={!validacao.podeAvancar}>
                          <Button 
                            size="icon" 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              if (etapaAtual === 'instalacoes' && finalizaSemCarregamento) {
                                setShowConcluirManutencao(true);
                              } else {
                                setShowConfirmarExpedicao(true);
                              }
                            }} 
                            disabled={!validacao.podeAvancar} 
className="flex h-[20px] w-full rounded-[3px]"
                          >
                            <ArrowRight className="h-3 w-3" />
                          </Button>
                        </ButtonWithTooltip>
                      );
                    } else if (etapaAtual === 'embalagem' && proximaEtapa && ordens.embalagem?.status === 'concluido') {
                      avancarButtons.push(
                        <Button key="avançar" size="icon" onClick={(e) => { e.stopPropagation(); setShowAcaoEtapa(true); }} title="Avançar" className="flex h-[20px] w-full rounded-[3px]">
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      );
                    } else if (proximaEtapa && etapaAtual !== 'finalizado' && etapaAtual !== 'aguardando_coleta' && etapaAtual !== 'instalacoes' && etapaAtual !== 'embalagem' && etapaAtual !== 'correcoes') {
                      avancarButtons.push(
                        <Button key="avançar" size="icon" onClick={(e) => { e.stopPropagation(); setShowAcaoEtapa(true); }} title="Avançar" className="flex h-[20px] w-full rounded-[3px]">
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      );
                    }

                    // Botão de enviar para correção (apenas etapa finalizado)
                    if (etapaAtual === 'finalizado' && !readOnly) {
                      middleButtons.push(
                        <Tooltip key="enviar-correcao">
                          <TooltipTrigger asChild>
                            <Button 
                              size="icon" 
                              variant="outline" 
                              onClick={(e) => { e.stopPropagation(); setShowEnviarCorrecao(true); }} 
                              title="Enviar para Correção" 
                              className="flex h-[20px] w-[20px] rounded-[3px] bg-purple-500/10 text-purple-600 hover:bg-purple-500/20 border-purple-500/50"
                            >
                              <Wrench className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <span className="text-xs">Enviar para Correção</span>
                          </TooltipContent>
                        </Tooltip>
                      );
                    }

                    // Botão de enviar para aguardando cliente (apenas etapa finalizado)
                    if (etapaAtual === 'finalizado' && onEnviarAguardandoCliente && !readOnly) {
                      middleButtons.push(
                        <Tooltip key="aguardando-cliente">
                          <TooltipTrigger asChild>
                            <Button 
                              size="icon" 
                              variant="outline" 
                              onClick={(e) => { e.stopPropagation(); setShowAguardandoCliente(true); }} 
                              title="Aguardando Cliente" 
                              className="flex h-[20px] w-[20px] rounded-[3px] bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20 border-yellow-500/50"
                            >
                              <Clock className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <span className="text-xs">Aguardando Cliente</span>
                          </TooltipContent>
                        </Tooltip>
                      );
                    }

                    // Botão de devolver para Finalizado (apenas etapa aguardando_cliente)
                    if (etapaAtual === 'aguardando_cliente' && onDevolverParaFinalizado && !readOnly) {
                      middleButtons.push(
                        <Tooltip key="devolver-finalizado">
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={(e) => { e.stopPropagation(); setShowDevolverFinalizado(true); }}
                              title="Devolver para Finalizado"
                              className="flex h-[20px] w-[20px] rounded-[3px] bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 border-emerald-500/50"
                            >
                              <CheckCircle className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <span className="text-xs">Devolver para Finalizado</span>
                          </TooltipContent>
                        </Tooltip>
                      );
                    }

                    const etapasCarregamento: EtapaPedido[] = ['aguardando_coleta', 'instalacoes', 'correcoes'];
                    const isEtapaCarregamento = etapasCarregamento.includes(etapaAtual);

                    if (onFinalizarDireto && etapaAtual !== 'finalizado' && !isEtapaCarregamento) {
                      middleButtons.push(
                        <Tooltip key="finalizar-direto">
                          <TooltipTrigger asChild>
                            <Button 
                              size="icon" 
                              variant="outline" 
                              onClick={(e) => { e.stopPropagation(); setShowFinalizarDireto(true); }} 
                              title="Finalizar Direto" 
                              className="flex h-[20px] w-[20px] rounded-[3px] bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 border-emerald-500/50"
                            >
                              <CheckCircle className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <span className="text-xs">Finalizar Direto</span>
                          </TooltipContent>
                        </Tooltip>
                      );
                    }

                    // Botão Carregar Ordem: somente para etapas de carregamento, com ordem agendada e ainda não carregada
                    if (
                      onCarregarOrdem &&
                      isEtapaCarregamento &&
                      temDataCarregamento &&
                      !carregamentoConcluido
                    ) {
                      middleButtons.push(
                        <Tooltip key="carregar-ordem">
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={(e) => { e.stopPropagation(); setShowCarregarOrdem(true); }}
                              title="Carregar Ordem"
                              className="flex h-[20px] w-[20px] rounded-[3px] bg-sky-500/10 text-sky-700 hover:bg-sky-500/20 border-sky-500/50"
                            >
                              <Truck className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <span className="text-xs">Carregar Ordem</span>
                          </TooltipContent>
                        </Tooltip>
                      );
                    }

                    // Botão Resetar Carregamento: limpa agendamento (data, hora, responsável) para reagendar do zero
                    if (
                      onResetarCarregamento &&
                      isEtapaCarregamento &&
                      temDataCarregamento &&
                      !carregamentoConcluido
                    ) {
                      middleButtons.push(
                        <Tooltip key="resetar-carregamento">
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={(e) => { e.stopPropagation(); setShowResetarCarregamento(true); }}
                              title="Resetar Carregamento"
                              className="flex h-[20px] w-[20px] rounded-[3px] bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 border-amber-500/50"
                            >
                              <CalendarX className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <span className="text-xs">Resetar Carregamento</span>
                          </TooltipContent>
                        </Tooltip>
                      );
                    }

                    // Botão de arquivar (apenas etapa finalizado)
                    if (etapaAtual === 'finalizado' && onArquivar) {
                      middleButtons.push(
                        <Tooltip key="arquivar">
                          <TooltipTrigger asChild>
                            <Button 
                              size="icon" 
                              variant="outline" 
                              onClick={(e) => { e.stopPropagation(); setShowArquivar(true); }} 
                              title="Arquivar Pedido" 
                              className="flex h-[20px] w-[20px] rounded-[3px] bg-orange-500/10 text-orange-700 hover:bg-orange-500/20 border-orange-500/50"
                            >
                              <Archive className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <span className="text-xs">Arquivar Pedido</span>
                          </TooltipContent>
                        </Tooltip>
                      );
                    }

                    // Retorna na ordem: retroceder (esquerda) + outros (meio) + avançar (direita)
                    return [...retrocederButtons, ...middleButtons, ...avancarButtons];
                  })()}
                </div>
              </TooltipProvider>
              )}
            </div>
          </CardContent>
        </Card>

        <CriarPedidoCorrecaoModal pedido={pedido} open={showCriarCorrecao} onOpenChange={setShowCriarCorrecao} />

        <EnviarCorrecaoModal
          open={showEnviarCorrecao}
          onOpenChange={setShowEnviarCorrecao}
          pedidoNumero={pedido.numero_pedido ? formatarNumeroPedidoMensal(pedido.numero_pedido) : pedido.id?.slice(0, 8)}
          isLoading={isEnviandoCorrecao}
          onConfirmar={async (comentario: string) => {
            const venda = pedido.venda || pedido.vendas;
            const { data: { user } } = await supabase.auth.getUser();
            const userId = user?.id || '';
            const { data: adminUser } = await supabase.from('admin_users').select('nome').eq('user_id', userId).single();
            await supabase.from("pedido_comentarios").insert({
              pedido_id: pedido.id,
              comentario,
              autor_id: userId,
              autor_nome: adminUser?.nome || 'Usuário',
            });
            await enviarParaCorrecao({
              pedidoId: pedido.id,
              vendaId: venda?.id || pedido.venda_id,
              nomeCliente: venda?.cliente_nome || pedido.cliente_nome || 'Cliente',
              endereco: venda?.endereco_completo || null,
              cidade: venda?.cidade || '',
              estado: venda?.estado || '',
              cep: venda?.cep || null,
              telefoneCliente: venda?.cliente_telefone || null,
              etapaOrigem: etapaAtual,
              descricaoMovimentacao: comentario,
            });
            setShowEnviarCorrecao(false);
          }}
        />

        <AlertDialog open={showAguardandoCliente} onOpenChange={setShowAguardandoCliente}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Enviar para Aguardando Cliente</AlertDialogTitle>
              <AlertDialogDescription>
                Deseja mover este pedido para "Aguardando Cliente"? O pedido ficará em uma etapa separada até que o cliente esteja pronto.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                disabled={isEnviandoAguardandoCliente}
                onClick={async () => {
                  if (!onEnviarAguardandoCliente) return;
                  setIsEnviandoAguardandoCliente(true);
                  try {
                    await onEnviarAguardandoCliente(pedido.id);
                  } finally {
                    setIsEnviandoAguardandoCliente(false);
                    setShowAguardandoCliente(false);
                  }
                }}
              >
                {isEnviandoAguardandoCliente ? 'Enviando...' : 'Confirmar'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={showDevolverFinalizado} onOpenChange={setShowDevolverFinalizado}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Devolver para Finalizado</AlertDialogTitle>
              <AlertDialogDescription>
                Deseja devolver este pedido para a etapa "Finalizado"? Ele sairá de "Aguardando Cliente" e voltará para o fluxo normal.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                disabled={isDevolvendoFinalizado}
                onClick={async () => {
                  if (!onDevolverParaFinalizado) return;
                  setIsDevolvendoFinalizado(true);
                  try {
                    await onDevolverParaFinalizado(pedido.id);
                  } finally {
                    setIsDevolvendoFinalizado(false);
                    setShowDevolverFinalizado(false);
                  }
                }}
              >
                {isDevolvendoFinalizado ? 'Devolvendo...' : 'Confirmar'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <PedidoDetalhesSheet pedido={pedido} open={showDetalhes} onOpenChange={setShowDetalhes} />

        <AcaoEtapaModal pedido={pedido} open={showAcaoEtapa} onOpenChange={setShowAcaoEtapa} onAvancar={onMoverEtapa || (() => {})} />

        <RetrocederPedidoUnificadoModal pedido={pedido} open={showRetrocederEtapa} onOpenChange={setShowRetrocederEtapa} />

        <VisualizarBacklogModal pedido={pedido} open={showVisualizarBacklog} onOpenChange={setShowVisualizarBacklog} />

        {onAvisoEspera && (
          <AvisoEsperaModal
            open={showAvisoEspera}
            onOpenChange={setShowAvisoEspera}
            pedidoNumero={pedido.numero_pedido || pedido.id?.slice(0, 8)}
            avisoAtual={pedido.aviso_espera}
            avisoData={pedido.aviso_espera_data}
            onSalvar={(justificativa) => onAvisoEspera(pedido.id, justificativa)}
            onRemover={() => onAvisoEspera(pedido.id, null)}
          />
        )}

        <AvancarQualidadeModal open={showAvancarQualidade} onOpenChange={setShowAvancarQualidade} onConfirmar={async () => {
          setShowAvancarQualidade(false);
          const listaProcessos = await determinarProcessos(pedido.id);
          setProcessos(listaProcessos);
          setShowProgresso(true);
          if (onMoverEtapa) {
            await onMoverEtapa(pedido.id, false, (processoId, status) => {
              setProcessos(prev => prev.map(p => p.id === processoId ? {
                ...p,
                status
              } : p));
            });
            await new Promise(resolve => setTimeout(resolve, 1000));
            setShowProgresso(false);
          }
        }} />

        <ConfirmarAvancoModal open={showConfirmarAvanco} onOpenChange={setShowConfirmarAvanco} onConfirmar={handleConfirmarAvanco} pedido={pedido} etapaAtual={config?.label || ''} proximaEtapa={proximaEtapa ? ETAPAS_CONFIG[proximaEtapa].label : ''} />

        <ProcessoAvancoModal open={showProgresso} processos={processos} onClose={() => setShowProgresso(false)} />
        
        <ConfirmarExpedicaoModal 
          open={showConfirmarExpedicao} 
          onOpenChange={setShowConfirmarExpedicao} 
          onConfirmar={handleConfirmarExpedicao} 
          pedido={pedido} 
          etapaAtual={config?.label || ''} 
        />

        <ConcluirManutencaoModal
          open={showConcluirManutencao}
          onOpenChange={setShowConcluirManutencao}
          pedidoId={pedido.id}
          pedidoNumero={pedido.numero_pedido}
          onConcluido={() => {
            if (onMoverEtapa) onMoverEtapa(pedido.id, true);
          }}
        />

        <ExcluirPedidoModal
          open={showExcluirPedido}
          onOpenChange={setShowExcluirPedido}
          onConfirmar={handleConfirmarExclusao}
          pedido={pedido}
          isLoading={isExcluindo}
        />

        <ArquivarPedidoModal
          open={showArquivar}
          onOpenChange={setShowArquivar}
          onConfirmar={handleConfirmarArquivamento}
          pedido={pedido}
        />

        <ArquivamentoLoadingModal open={showArquivamentoLoading} />

        <Dialog open={showCarregarOrdem} onOpenChange={(open) => { if (!isCarregando) setShowCarregarOrdem(open); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <Truck className="w-5 h-5 text-sky-600" />
                Carregar Ordem
              </DialogTitle>
              <DialogDescription asChild>
                <div className="space-y-3 pt-2">
                  <div className="rounded-lg bg-muted p-3 space-y-1.5">
                    <p className="text-sm font-medium text-foreground">{pedido.venda?.cliente?.nome || 'Cliente'}</p>
                    <p className="text-xs text-muted-foreground font-mono">{pedido.numero_pedido_mensal ? formatarNumeroPedidoMensal(pedido.numero_pedido_mensal) : pedido.id.slice(0, 8)}</p>
                    <p className="text-xs text-muted-foreground">Etapa atual: <span className="font-medium text-foreground">{ETAPAS_CONFIG[pedido.etapa_atual as EtapaPedido]?.label || pedido.etapa_atual}</span></p>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Ao confirmar, a ordem agendada será marcada como <span className="font-medium text-foreground">carregada</span>. Você passa a ser o responsável pela conclusão.
                  </div>
                </div>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setShowCarregarOrdem(false)} disabled={isCarregando}>
                Cancelar
              </Button>
              <Button
                className="bg-sky-600 hover:bg-sky-700 text-white"
                disabled={isCarregando}
                onClick={async () => {
                  if (!onCarregarOrdem) return;
                  setIsCarregando(true);
                  try {
                    await onCarregarOrdem(pedido.id);
                    setShowCarregarOrdem(false);
                  } finally {
                    setIsCarregando(false);
                  }
                }}
              >
                {isCarregando ? 'Carregando...' : 'Sim, Carregar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showResetarCarregamento} onOpenChange={(open) => { if (!isResetando) setShowResetarCarregamento(open); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <CalendarX className="w-5 h-5 text-amber-600" />
                Resetar Carregamento
              </DialogTitle>
              <DialogDescription asChild>
                <div className="space-y-3 pt-2">
                  <div className="rounded-lg bg-muted p-3 space-y-1.5">
                    <p className="text-sm font-medium text-foreground">{pedido.venda?.cliente?.nome || 'Cliente'}</p>
                    <p className="text-xs text-muted-foreground font-mono">{pedido.numero_pedido_mensal ? formatarNumeroPedidoMensal(pedido.numero_pedido_mensal) : pedido.id.slice(0, 8)}</p>
                    <p className="text-xs text-muted-foreground">Etapa atual: <span className="font-medium text-foreground">{ETAPAS_CONFIG[pedido.etapa_atual as EtapaPedido]?.label || pedido.etapa_atual}</span></p>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    O agendamento (data, hora e responsável) será removido. O pedido voltará a precisar ser <span className="font-medium text-foreground">agendado novamente</span> no calendário de expedição.
                  </div>
                </div>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setShowResetarCarregamento(false)} disabled={isResetando}>
                Cancelar
              </Button>
              <Button
                className="bg-amber-600 hover:bg-amber-700 text-white"
                disabled={isResetando}
                onClick={async () => {
                  if (!onResetarCarregamento) return;
                  setIsResetando(true);
                  try {
                    await onResetarCarregamento(pedido.id);
                    setShowResetarCarregamento(false);
                  } finally {
                    setIsResetando(false);
                  }
                }}
              >
                {isResetando ? 'Resetando...' : 'Sim, Resetar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>;
  }

  // Layout em grid (padrão)
  return <>
      <Card 
        className={cn("hover:shadow-md transition-all cursor-pointer", isDragging && "opacity-50 cursor-grabbing", (emBacklog || temHistoricoBacklog) && "border-2 border-red-500 shadow-lg shadow-red-500/20", (pedido as any).is_correcao && "border-l-4 border-l-purple-600", pedido.reprovado_ceo && "border-2 border-red-500 shadow-lg shadow-red-500/20")} 
        onClick={() => setShowDetalhes(true)}
      >
        {/* Header com número do pedido e tempo */}
        <CardHeader 
          className="py-2 px-3 bg-muted/30 border-b cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            if (isFabricaMontagem || isAdministrativo) {
              navigate(`/fabrica/montagem-pedidos/${pedido.id}`);
            } else if (isProducao) {
              navigate(`/producao/controle/pedido/${pedido.id}/view`);
            } else if (isDirecao) {
              navigate(`/direcao/pedidos/${pedido.id}`);
            } else {
              navigate(`/dashboard/pedido/${pedido.id}/view`);
            }
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              {dragHandleProps && <div 
                {...dragHandleProps} 
                className="cursor-grab active:cursor-grabbing"
                onClick={(e) => e.stopPropagation()}
              >
                  <GripVertical className="h-3 w-3 text-muted-foreground" />
                </div>}
              
              
              {(emBacklog || temHistoricoBacklog) && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AlertTriangle className="h-3.5 w-3.5 text-red-500 flex-shrink-0 animate-pulse" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{emBacklog ? 'Pedido está em backlog' : 'Pedido teve registro de backlog no histórico'}</p>
                  </TooltipContent>
                </Tooltip>
              )}
              
              <span className="text-[10px] font-semibold text-muted-foreground">
                {formatarNumeroPedidoMensal(pedido.numero_mes, pedido.mes_vigencia, pedido.numero_pedido)}
              </span>
              {(pedido as any).is_correcao && (
                <Badge variant="outline" className="text-[8px] px-1 py-0 bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/50">
                  CORREÇÃO
                </Badge>
              )}
              {pedido.reprovado_ceo && (
                <Badge variant="destructive" className="text-[8px] px-1 py-0">
                  REPROVADO CEO
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-1.5">
              <CronometroEtapaBadge dataEntrada={dataEntradaEtapaAtual} compact etapa={etapaAtual} />
              {pedido.created_at && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className={cn(
                      "text-[10px] px-1 py-0 font-mono cursor-default",
                      isAtrasadoTotal
                        ? "bg-red-500/10 text-red-500 border-red-500/30"
                        : "bg-muted/50 text-muted-foreground border-muted-foreground/30"
                    )}>
                      <Clock className="h-2.5 w-2.5 mr-0.5" />
                      {formatDistanceToNow(new Date(pedido.created_at), { locale: ptBR })}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="p-3">
                    <div className="space-y-1 text-xs">
                      {venda?.created_at && (
                        <p>Venda criada: {format(new Date(venda.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                      )}
                      <p>Faturada: {format(new Date(pedido.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                      <p>Pedido criado: {format(new Date(pedido.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                      {dataEntradaEtapaAtual && (
                        <p>Etapa atual: {format(new Date(dataEntradaEtapaAtual), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              )}
              
              {onMoverPrioridade && posicao && total && <>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    disabled={posicao === 1} 
                    onClick={(e) => {
                      e.stopPropagation();
                      onMoverPrioridade(pedido.id, 'frente');
                    }} 
                    title="Aumentar prioridade" 
                    className="h-5 w-5"
                  >
                    <ChevronUp className="h-2.5 w-2.5" />
                  </Button>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    disabled={posicao === total} 
                    onClick={(e) => {
                      e.stopPropagation();
                      onMoverPrioridade(pedido.id, 'tras');
                    }} 
                    title="Diminuir prioridade" 
                    className="h-5 w-5"
                  >
                    <ChevronDown className="h-2.5 w-2.5" />
                  </Button>
                </>}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-3 pb-2 space-y-2.5">
          {/* Informações do cliente com background */}
          <div className="bg-muted/30 rounded-md p-2 -mx-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Avatar className="h-6 w-6 flex-shrink-0">
                      <AvatarImage src={atendenteFoto || undefined} alt={atendenteNome} />
                      <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                        {atendenteIniciais}
                      </AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Vendedor: {atendenteNome}</p>
                  </TooltipContent>
                </Tooltip>
                <h3 className="font-semibold text-xs truncate">{venda?.cliente_nome}</h3>
                {ultimoComentario && (
                  <p className="text-[9px] text-muted-foreground truncate" title={ultimoComentario.comentario}>
                    {ultimoComentario.comentario}
                  </p>
                )}
              </div>
              
              {/* Círculos de cores à direita */}
              {coresUnicas.length > 0 && <div className="flex items-center gap-0.5 flex-shrink-0">
                  {coresUnicas.slice(0, 3).map((cor, idx) => (
                    <CorCirculo key={idx} cor={cor} size="sm" />
                  ))}
                  {coresUnicas.length > 3 && <span className="text-[10px] text-muted-foreground ml-0.5">
                      +{coresUnicas.length - 3}
                    </span>}
                </div>}
            </div>
            
            {/* Flags abaixo */}
            {(config || temPintura || isInstalacao || isEntrega) && <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                {config && <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0.5", (emBacklog || temHistoricoBacklog) ? "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/50" : "bg-muted/50")}>
                    {config.label}
                  </Badge>}
                
                {temPintura && <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/50">
                    <Paintbrush className="h-2.5 w-2.5 mr-0.5" />
                    Pintura
                  </Badge>}
                {isInstalacao && (apenasManutencao ? (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/50">
                    <Wrench className="h-2.5 w-2.5 mr-0.5" />
                    Manutenção
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/50">
                    <Hammer className="h-2.5 w-2.5 mr-0.5" />
                    Instalação
                  </Badge>
                ))}
                {isEntrega && <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/50">
                    <Truck className="h-2.5 w-2.5 mr-0.5" />
                    Entrega
                  </Badge>}
              </div>}
          </div>

          {/* Produtos */}
          {!isAberto && produtos.length > 0 && <div className="flex flex-wrap gap-1">
              {produtos.slice(0, 2).map((prod: any, idx: number) => <Badge key={idx} variant="outline" className="text-[10px]">
                  <Package className="h-3 w-3 mr-1" />
                  {prod.tipo_produto}
                </Badge>)}
              {produtos.length > 2 && <Badge variant="outline" className="text-[10px]">
                  +{produtos.length - 2}
                </Badge>}
            </div>}

          {/* Valor e Datas */}
          <div className="flex justify-between items-center text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-primary">
                {formatCurrency(venda?.valor_venda || 0)}
              </span>
              <div onClick={(e) => e.stopPropagation()}>
                {venda?.valor_a_receber_faturamento ? (
                  <span
                    className={cn(
                      "text-[10px] rounded px-1 py-0.5",
                      temValorAReceber
                        ? "font-medium text-emerald-600 bg-emerald-500/10"
                        : "text-muted-foreground/50"
                    )}
                  >
                    {exibirValorAReceber('Rec: ') || '—'}
                  </span>
                ) : (
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      onClick={handleAbrirPopoverValor}
                      className={cn(
                        "text-[10px] rounded px-1 py-0.5 cursor-pointer",
                        venda?.pagamento_na_entrega
                          ? "font-medium text-amber-600 bg-amber-500/10"
                          : temValorAReceber
                            ? "font-medium text-emerald-600 bg-emerald-500/10"
                            : "text-muted-foreground/50"
                      )}
                    >
                      {exibirValorAReceber('Rec: ') || '+ Receber'}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-3" align="start" onClick={(e) => e.stopPropagation()}>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">Valor a Receber</label>
                      <Input
                        type="text"
                        placeholder="Ex: 1.500,00 ou texto"
                        value={valorAReceberTemp}
                        onChange={(e) => setValorAReceberTemp(e.target.value)}
                        className="h-8 text-sm"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button size="sm" className="flex-1 h-7 text-xs" onClick={handleSalvarValorAReceber} disabled={salvandoValor}>
                          {salvandoValor ? '...' : 'Salvar'}
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-muted-foreground" title="Data prevista de entrega">
                {venda?.data_prevista_entrega ? format(new Date(venda.data_prevista_entrega), "dd/MM/yyyy") : format(new Date(venda?.created_at || Date.now()), "dd/MM/yyyy")}
              </span>
              {dataCarregamento && (
                <span className="text-[10px] text-muted-foreground" title="Data de carregamento">
                  Carreg: {format(parseISO(dataCarregamento), "dd/MM/yyyy")}
                </span>
              )}
            </div>
          </div>

          {/* Número do pedido */}
          {!isAberto && pedido.numero_pedido}
        </CardContent>

        <CardFooter className="pt-2 pb-2 bg-muted/20 border-t" onClick={(e) => e.stopPropagation()}>
          <TooltipProvider>
            {(() => {
              const actionButtons = [];

              // Build action buttons array
              // Botão de preparar pedido removido - funcionalidade movida para PedidoView
              if (isAberto && onMoverEtapa) {
                const validacao = getValidacaoAvancoEtapa('aberto');
                actionButtons.push(
                  <ButtonWithTooltip key="iniciar" tooltip={validacao.mensagem} disabled={!validacao.podeAvancar}>
                    <Button size="icon" onClick={(e) => { e.stopPropagation(); setShowConfirmarAvanco(true); }} disabled={!validacao.podeAvancar} className="flex w-full h-[35px]">
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </ButtonWithTooltip>
                );
              } else if (etapaAtual === 'em_producao') {
                const validacao = getValidacaoAvancoEtapa('em_producao');
                actionButtons.push(
                  <ButtonWithTooltip key="avançar-qualidade" tooltip={validacao.mensagem} disabled={!validacao.podeAvancar}>
                    <Button size="icon" onClick={(e) => { e.stopPropagation(); setShowAvancarQualidade(true); }} disabled={!validacao.podeAvancar} className="flex w-full h-[35px]">
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </ButtonWithTooltip>
                );
              } else if (etapaAtual === 'inspecao_qualidade') {
                const validacao = getValidacaoAvancoEtapa('inspecao_qualidade');
                actionButtons.push(
                  <ButtonWithTooltip key="avançar" tooltip={validacao.mensagem} disabled={!validacao.podeAvancar}>
                    <Button size="icon" onClick={async (e) => {
                      e.stopPropagation();
                      const processosNecessarios = await determinarProcessos(pedido.id);
                      setProcessos(processosNecessarios);
                      setShowProgresso(true);
                      if (onMoverEtapa) {
                        await onMoverEtapa(pedido.id, true, (processoId, status) => {
                          setProcessos(prev => prev.map(p => p.id === processoId ? {
                            ...p,
                            status
                          } : p));
                        });
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        setShowProgresso(false);
                      }
                    }} disabled={!validacao.podeAvancar} className="flex w-full h-[35px]">
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </ButtonWithTooltip>
                );
              } else if (etapaAtual === 'aguardando_pintura') {
                const validacao = getValidacaoAvancoEtapa('aguardando_pintura');
                actionButtons.push(
                  <ButtonWithTooltip key="avançar" tooltip={validacao.mensagem} disabled={!validacao.podeAvancar}>
                    <Button size="icon" onClick={(e) => { e.stopPropagation(); setShowConfirmarAvanco(true); }} disabled={!validacao.podeAvancar} className="flex w-full h-[35px]">
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </ButtonWithTooltip>
                );
              } else if (etapaAtual === 'aguardando_coleta' || etapaAtual === 'instalacoes' || etapaAtual === 'correcoes') {
                const validacao = getValidacaoAvancoEtapa(etapaAtual);
                actionButtons.push(
                  <ButtonWithTooltip key="avançar-expedicao" tooltip={validacao.mensagem} disabled={!validacao.podeAvancar}>
                    <Button 
                      size="icon" 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        if (etapaAtual === 'instalacoes' && finalizaSemCarregamento) {
                          setShowConcluirManutencao(true);
                        } else {
                          setShowConfirmarExpedicao(true);
                        }
                      }} 
                      disabled={!validacao.podeAvancar} 
                      className="flex w-full h-[35px]"
                    >
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </ButtonWithTooltip>
                );
              } else if (proximaEtapa && etapaAtual !== 'finalizado') {
                actionButtons.push(<Button key="avançar" size="icon" onClick={(e) => { e.stopPropagation(); setShowAcaoEtapa(true); }} title={`Avançar para ${ETAPAS_CONFIG[proximaEtapa].label}`} className="flex w-full h-[35px]">
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>);
              } else if (etapaAtual === 'finalizado' && onArquivar) {
                actionButtons.push(
                  <Button 
                    key="arquivar" 
                    size="icon" 
                    variant="outline"
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      setShowArquivar(true); 
                    }} 
                    title="Arquivar Pedido" 
                    className="flex w-full h-[35px] bg-orange-500/10 text-orange-700 hover:bg-orange-500/20 border-orange-500/50"
                  >
                    <Archive className="h-3.5 w-3.5" />
                  </Button>
                );
              }

              // Botão enviar para correção (mobile, etapa finalizado)
              if (etapaAtual === 'finalizado' && !readOnly && carregamentoConcluido) {
                actionButtons.push(
                  <Button 
                    key="enviar-correcao" 
                    size="icon" 
                    variant="outline"
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      setShowEnviarCorrecao(true); 
                    }} 
                    title="Enviar para Correção" 
                    className="flex w-full h-[35px] bg-purple-500/10 text-purple-600 hover:bg-purple-500/20 border-purple-500/50"
                  >
                    <Wrench className="h-3.5 w-3.5" />
                  </Button>
                );
              }

              // Botão devolver para Finalizado (etapa aguardando_cliente)
              if (etapaAtual === 'aguardando_cliente' && onDevolverParaFinalizado && !readOnly) {
                actionButtons.push(
                  <Button
                    key="devolver-finalizado"
                    size="icon"
                    variant="outline"
                    onClick={(e) => { e.stopPropagation(); setShowDevolverFinalizado(true); }}
                    title="Devolver para Finalizado"
                    className="flex w-full h-[35px] bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 border-emerald-500/50"
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                  </Button>
                );
              }

              // Backlog button removed - users should view order details page

              // Add retroceder button (para todos a partir de em_producao)
              const podeRetroceder = etapaAtual !== 'aberto' && etapaAtual !== 'finalizado' && etapaAtual !== 'correcoes' && etapaAnterior && onRetrocederEtapa;
              if (podeRetroceder) {
                actionButtons.push(<Button key="retroceder" size="icon" variant="outline" onClick={(e) => { e.stopPropagation(); setShowRetrocederEtapa(true); }} title="Retroceder para etapa anterior" className="flex w-full h-[35px] bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/50">
                      <ArrowLeft className="h-3.5 w-3.5" />
                    </Button>);
              }

              return <div className="w-full">
                    {actionButtons.length > 0 && <div className="grid grid-cols-4 gap-1.5 w-full">
                        {actionButtons}
                      </div>}
                    {!temDataCarregamento && !finalizaSemCarregamento && (etapaAtual === 'aguardando_coleta' || etapaAtual === 'instalacoes') && <span className="text-xs text-warning text-center block">
                        Defina data de carregamento
                      </span>}
                  </div>;
            })()}
          </TooltipProvider>
        </CardFooter>
      </Card>

      <CriarPedidoCorrecaoModal pedido={pedido} open={showCriarCorrecao} onOpenChange={setShowCriarCorrecao} />

      <EnviarCorrecaoModal
        open={showEnviarCorrecao}
        onOpenChange={setShowEnviarCorrecao}
        pedidoNumero={pedido.numero_pedido ? formatarNumeroPedidoMensal(pedido.numero_pedido) : pedido.id?.slice(0, 8)}
        isLoading={isEnviandoCorrecao}
        onConfirmar={async (comentario: string) => {
          const venda = pedido.venda || pedido.vendas;
          const { data: { user } } = await supabase.auth.getUser();
          const userId = user?.id || '';
          const { data: adminUser } = await supabase.from('admin_users').select('nome').eq('user_id', userId).single();
          await supabase.from("pedido_comentarios").insert({
            pedido_id: pedido.id,
            comentario,
            autor_id: userId,
            autor_nome: adminUser?.nome || 'Usuário',
          });
          await enviarParaCorrecao({
            pedidoId: pedido.id,
            vendaId: venda?.id || pedido.venda_id,
            nomeCliente: venda?.cliente_nome || pedido.cliente_nome || 'Cliente',
            endereco: venda?.endereco_completo || null,
            cidade: venda?.cidade || '',
            estado: venda?.estado || '',
            cep: venda?.cep || null,
            telefoneCliente: venda?.cliente_telefone || null,
            etapaOrigem: etapaAtual,
            descricaoMovimentacao: comentario,
          });
          setShowEnviarCorrecao(false);
        }}
      />

      <PedidoDetalhesSheet pedido={pedido} open={showDetalhes} onOpenChange={setShowDetalhes} />

      <AcaoEtapaModal pedido={pedido} open={showAcaoEtapa} onOpenChange={setShowAcaoEtapa} onAvancar={onMoverEtapa || (() => {})} />

      <RetrocederPedidoUnificadoModal pedido={pedido} open={showRetrocederEtapa} onOpenChange={setShowRetrocederEtapa} />

      <VisualizarBacklogModal pedido={pedido} open={showVisualizarBacklog} onOpenChange={setShowVisualizarBacklog} />

      <AlertDialog open={showDevolverFinalizado} onOpenChange={setShowDevolverFinalizado}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Devolver para Finalizado</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja devolver este pedido para a etapa "Finalizado"? Ele sairá de "Aguardando Cliente" e voltará para o fluxo normal.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDevolvendoFinalizado}
              onClick={async () => {
                if (!onDevolverParaFinalizado) return;
                setIsDevolvendoFinalizado(true);
                try {
                  await onDevolverParaFinalizado(pedido.id);
                } finally {
                  setIsDevolvendoFinalizado(false);
                  setShowDevolverFinalizado(false);
                }
              }}
            >
              {isDevolvendoFinalizado ? 'Devolvendo...' : 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {onAvisoEspera && (
        <AvisoEsperaModal
          open={showAvisoEspera}
          onOpenChange={setShowAvisoEspera}
          pedidoNumero={pedido.numero_pedido || pedido.id?.slice(0, 8)}
          avisoAtual={pedido.aviso_espera}
          avisoData={pedido.aviso_espera_data}
          onSalvar={(justificativa) => onAvisoEspera(pedido.id, justificativa)}
          onRemover={() => onAvisoEspera(pedido.id, null)}
        />
      )}

      <ArquivarPedidoModal
        open={showArquivar}
        onOpenChange={setShowArquivar}
        onConfirmar={handleConfirmarArquivamento}
        pedido={pedido}
      />
      
      <ArquivamentoLoadingModal open={showArquivamentoLoading} />

      <AvancarQualidadeModal open={showAvancarQualidade} onOpenChange={setShowAvancarQualidade} onConfirmar={async () => {
      setShowAvancarQualidade(false);
      const listaProcessos = await determinarProcessos(pedido.id);
      setProcessos(listaProcessos);
      setShowProgresso(true);
      if (onMoverEtapa) {
        await onMoverEtapa(pedido.id, false, (processoId, status) => {
          setProcessos(prev => prev.map(p => p.id === processoId ? {
            ...p,
            status
          } : p));
        });
        await new Promise(resolve => setTimeout(resolve, 1000));
        setShowProgresso(false);
      }
    }} />

      <ConfirmarAvancoModal open={showConfirmarAvanco} onOpenChange={setShowConfirmarAvanco} onConfirmar={handleConfirmarAvanco} pedido={pedido} etapaAtual={config?.label || ''} proximaEtapa={proximaEtapa ? ETAPAS_CONFIG[proximaEtapa].label : ''} />

      <ProcessoAvancoModal open={showProgresso} processos={processos} onClose={() => setShowProgresso(false)} />
      
      <ConfirmarExpedicaoModal 
        open={showConfirmarExpedicao} 
        onOpenChange={setShowConfirmarExpedicao} 
        onConfirmar={handleConfirmarExpedicao} 
        pedido={pedido} 
        etapaAtual={config?.label || ''} 
      />

      <ConcluirManutencaoModal
        open={showConcluirManutencao}
        onOpenChange={setShowConcluirManutencao}
        pedidoId={pedido.id}
        pedidoNumero={pedido.numero_pedido}
        onConcluido={() => {
          if (onMoverEtapa) onMoverEtapa(pedido.id, true);
        }}
      />

      <RemoverResponsavelModal
        open={showRemoverResponsavel}
        onOpenChange={setShowRemoverResponsavel}
        onConfirm={confirmarRemoverResponsavel}
        responsavelNome={ordemParaRemover?.ordem?.capturada_por_nome}
        responsavelFoto={ordemParaRemover?.ordem?.capturada_por_foto}
        nomeSetor={ordemParaRemover?.nomeSetor || ''}
        isLoading={removerResponsavelMutation.isPending}
      />

      <ExcluirPedidoModal
        open={showExcluirPedido}
        onOpenChange={setShowExcluirPedido}
        onConfirmar={handleConfirmarExclusao}
        pedido={pedido}
        isLoading={isExcluindo}
      />

      {ordemParaPausar && (
        <AvisoFaltaModal
          open={avisoFaltaOpen}
          onOpenChange={(open) => {
            setAvisoFaltaOpen(open);
            if (!open) setOrdemParaPausar(null);
          }}
          numeroOrdem={ordemParaPausar.numeroOrdem}
          linhas={linhasOrdemPausar}
          onConfirm={handleConfirmarPausa}
          isPausing={pausarOrdemDirecao.isPending}
        />
      )}

      <Dialog open={showFinalizarDireto} onOpenChange={(open) => { if (!isFinalizandoDireto) setShowFinalizarDireto(open); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Finalizar Pedido Diretamente
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3 pt-2">
                <div className="rounded-lg bg-muted p-3 space-y-1.5">
                  <p className="text-sm font-medium text-foreground">{pedido.venda?.cliente?.nome || 'Cliente'}</p>
                  <p className="text-xs text-muted-foreground font-mono">{pedido.numero_pedido_mensal ? formatarNumeroPedidoMensal(pedido.numero_pedido_mensal) : pedido.id.slice(0, 8)}</p>
                  <p className="text-xs text-muted-foreground">Etapa atual: <span className="font-medium text-foreground">{ETAPAS_CONFIG[pedido.etapa_atual as EtapaPedido]?.label || pedido.etapa_atual}</span></p>
                </div>
                <div className="text-sm text-muted-foreground space-y-1.5">
                  <p>Ao confirmar, as seguintes ações serão realizadas:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>A etapa atual <span className="font-medium">"{ETAPAS_CONFIG[pedido.etapa_atual as EtapaPedido]?.label || pedido.etapa_atual}"</span> será encerrada</li>
                    <li>Todas as etapas intermediárias serão <span className="font-medium">puladas</span></li>
                    <li>O pedido será movido diretamente para <span className="font-medium text-emerald-600">"Finalizado"</span></li>
                  </ul>
                </div>
                <p className="text-xs text-amber-600 font-medium flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Esta ação não pode ser desfeita.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowFinalizarDireto(false)} disabled={isFinalizandoDireto}>
              Cancelar
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={isFinalizandoDireto}
              onClick={async () => {
                if (!onFinalizarDireto) return;
                setShowFinalizarDireto(false);
                setIsFinalizandoDireto(true);
                try {
                  await onFinalizarDireto(pedido.id);
                } finally {
                  setIsFinalizandoDireto(false);
                }
              }}
            >
              {isFinalizandoDireto ? 'Finalizando...' : 'Sim, Finalizar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCarregarOrdem} onOpenChange={(open) => { if (!isCarregando) setShowCarregarOrdem(open); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Truck className="w-5 h-5 text-sky-600" />
              Carregar Ordem
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3 pt-2">
                <div className="rounded-lg bg-muted p-3 space-y-1.5">
                  <p className="text-sm font-medium text-foreground">{pedido.venda?.cliente?.nome || 'Cliente'}</p>
                  <p className="text-xs text-muted-foreground font-mono">{pedido.numero_pedido_mensal ? formatarNumeroPedidoMensal(pedido.numero_pedido_mensal) : pedido.id.slice(0, 8)}</p>
                  <p className="text-xs text-muted-foreground">Etapa atual: <span className="font-medium text-foreground">{ETAPAS_CONFIG[pedido.etapa_atual as EtapaPedido]?.label || pedido.etapa_atual}</span></p>
                </div>
                <div className="text-sm text-muted-foreground">
                  Ao confirmar, a ordem agendada será marcada como <span className="font-medium text-foreground">carregada</span>. Você passa a ser o responsável pela conclusão.
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowCarregarOrdem(false)} disabled={isCarregando}>
              Cancelar
            </Button>
            <Button
              className="bg-sky-600 hover:bg-sky-700 text-white"
              disabled={isCarregando}
              onClick={async () => {
                if (!onCarregarOrdem) return;
                setIsCarregando(true);
                try {
                  await onCarregarOrdem(pedido.id);
                  setShowCarregarOrdem(false);
                } finally {
                  setIsCarregando(false);
                }
              }}
            >
              {isCarregando ? 'Carregando...' : 'Sim, Carregar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showResetarCarregamento} onOpenChange={(open) => { if (!isResetando) setShowResetarCarregamento(open); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <CalendarX className="w-5 h-5 text-amber-600" />
              Resetar Carregamento
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3 pt-2">
                <div className="rounded-lg bg-muted p-3 space-y-1.5">
                  <p className="text-sm font-medium text-foreground">{pedido.venda?.cliente?.nome || 'Cliente'}</p>
                  <p className="text-xs text-muted-foreground font-mono">{pedido.numero_pedido_mensal ? formatarNumeroPedidoMensal(pedido.numero_pedido_mensal) : pedido.id.slice(0, 8)}</p>
                  <p className="text-xs text-muted-foreground">Etapa atual: <span className="font-medium text-foreground">{ETAPAS_CONFIG[pedido.etapa_atual as EtapaPedido]?.label || pedido.etapa_atual}</span></p>
                </div>
                <div className="text-sm text-muted-foreground">
                  O agendamento (data, hora e responsável) será removido. O pedido voltará a precisar ser <span className="font-medium text-foreground">agendado novamente</span> no calendário de expedição.
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowResetarCarregamento(false)} disabled={isResetando}>
              Cancelar
            </Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white"
              disabled={isResetando}
              onClick={async () => {
                if (!onResetarCarregamento) return;
                setIsResetando(true);
                try {
                  await onResetarCarregamento(pedido.id);
                  setShowResetarCarregamento(false);
                } finally {
                  setIsResetando(false);
                }
              }}
            >
              {isResetando ? 'Resetando...' : 'Sim, Resetar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>;
}