import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, CalendarDays, LogOut, Plus, Hammer, Wrench, Package, HardHat, AlertTriangle, UserPlus, RefreshCw, CheckCircle } from "lucide-react";

import { MinimalistLayout } from "@/components/MinimalistLayout";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis } from "@/components/ui/pagination";
import { useOrdensCarregamentoCalendario } from "@/hooks/useOrdensCarregamentoCalendario";
import { useOrdensCarregamentoUnificadas } from "@/hooks/useOrdensCarregamentoUnificadas";
import { OrdemCarregamentoUnificada } from "@/types/ordemCarregamentoUnificada";
import { useNeoInstalacoes, useNeoInstalacoesSemData } from "@/hooks/useNeoInstalacoes";
import { useNeoCorrecoes, useNeoCorrecoesSemData } from "@/hooks/useNeoCorrecoes";
import { useCorrecoes, useCorrecoesSemData } from "@/hooks/useCorrecoes";
import { usePedidosEtapas, usePedidosContadores } from "@/hooks/usePedidosEtapas";
import { useNeoInstalacoesListagem } from "@/hooks/useNeoInstalacoes";
import { useNeoCorrecoesListagem } from "@/hooks/useNeoCorrecoes";
import { useEtapaResponsaveis } from "@/hooks/useEtapaResponsaveis";
import { PedidosDraggableList } from "@/components/pedidos/PedidosDraggableList";
import { PedidosFiltrosMinimalista } from "@/components/pedidos/PedidosFiltrosMinimalista";
import { NeoInstalacaoCardGestao } from "@/components/pedidos/NeoInstalacaoCardGestao";
import { NeoCorrecaoCardGestao } from "@/components/pedidos/NeoCorrecaoCardGestao";
import { NeoInstalacoesDraggableList, NeoCorrecoesDraggableList } from "@/components/pedidos/NeoDraggableList";
import { SelecionarResponsavelEtapaModal } from "@/components/pedidos/SelecionarResponsavelEtapaModal";
import { ETAPAS_CONFIG } from "@/types/pedidoEtapa";
import type { EtapaPedido, DirecaoPrioridade } from "@/types/pedidoEtapa";
import { OrdemCarregamentoDetails } from "@/components/expedicao/OrdemCarregamentoDetails";
import { CorrecaoDetalhesSheet } from "@/components/pedidos/CorrecaoDetalhesSheet";
import { EditarOrdemCarregamentoDrawer } from "@/components/expedicao/EditarOrdemCarregamentoDrawer";
import { NeoInstalacaoModal } from "@/components/expedicao/NeoInstalacaoModal";
import { NeoCorrecaoModal } from "@/components/expedicao/NeoCorrecaoModal";
import { NeoInstalacaoDetails } from "@/components/expedicao/NeoInstalacaoDetails";
import { NeoCorrecaoDetails } from "@/components/expedicao/NeoCorrecaoDetails";
import { AdicionarOrdemCalendarioModal } from "@/components/expedicao/AdicionarOrdemCalendarioModal";
import { CalendarioSemanalExpedicaoMobile } from "@/components/expedicao/CalendarioSemanalExpedicaoMobile";
import { CalendarioSemanalExpedicaoDesktop } from "@/components/expedicao/CalendarioSemanalExpedicaoDesktop";
import { CalendarioMensalExpedicaoDesktop } from "@/components/expedicao/CalendarioMensalExpedicaoDesktop";
import { useIsMobile } from "@/hooks/use-mobile";
import { format, addDays, startOfWeek, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { OrdemCarregamento } from "@/types/ordemCarregamento";
import { NeoInstalacao, CriarNeoInstalacaoData } from "@/types/neoInstalacao";
import { NeoCorrecao, CriarNeoCorrecaoData } from "@/types/neoCorrecao";
import { Correcao } from "@/types/correcao";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export default function ExpedicaoMinimalista() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { signOut } = useAuth();
  const queryClient = useQueryClient();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<'week' | 'month'>('month');
  const [selectedOrdem, setSelectedOrdem] = useState<OrdemCarregamento | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [editingOrdem, setEditingOrdem] = useState<OrdemCarregamento | null>(null);
  const [neoModalOpen, setNeoModalOpen] = useState(false);
  const [neoCorrecaoModalOpen, setNeoCorrecaoModalOpen] = useState(false);
  
  // States for editing Neo Instalação/Correção
  const [editingNeoInstalacao, setEditingNeoInstalacao] = useState<NeoInstalacao | null>(null);
  const [editingNeoCorrecao, setEditingNeoCorrecao] = useState<NeoCorrecao | null>(null);
  
  // States for details sidebars
  const [selectedNeoInstalacao, setSelectedNeoInstalacao] = useState<NeoInstalacao | null>(null);
  const [neoInstalacaoDetailsOpen, setNeoInstalacaoDetailsOpen] = useState(false);
  const [selectedNeoCorrecao, setSelectedNeoCorrecao] = useState<NeoCorrecao | null>(null);
  const [neoCorrecaoDetailsOpen, setNeoCorrecaoDetailsOpen] = useState(false);
  const [legendaFiltro, setLegendaFiltro] = useState<string | null>(null);
  const [correcaoDetalhesPedidoId, setCorrecaoDetalhesPedidoId] = useState<string | null>(null);
  const [correcaoDetalhesOpen, setCorrecaoDetalhesOpen] = useState(false);

  // States para a listagem de pedidos por etapa (tabs)
  const [etapaAtiva, setEtapaAtiva] = useState<EtapaPedido>('aguardando_coleta');
  const [searchTermPedidos, setSearchTermPedidos] = useState('');
  const [tipoEntrega, setTipoEntrega] = useState('todos');
  const [corPintura, setCorPintura] = useState('todas');
  const [mostrarProntos, setMostrarProntos] = useState(false);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [modalResponsavelAberto, setModalResponsavelAberto] = useState(false);
  const [etapaParaAtribuir, setEtapaParaAtribuir] = useState<EtapaPedido | null>(null);
  const [agendarModalOpen, setAgendarModalOpen] = useState(false);
  const [agendarData, setAgendarData] = useState(new Date());
  const [ordemPreSelecionadaAgendar, setOrdemPreSelecionadaAgendar] = useState<OrdemCarregamentoUnificada | null>(null);
  const ITENS_POR_PAGINA = 25;
  const { toast: toastShadcn } = useToast();

  const { ordens, isLoading, updateOrdem } = useOrdensCarregamentoCalendario(currentDate, viewType);
  const { ordens: ordensUnificadas, concluirCarregamento } = useOrdensCarregamentoUnificadas();
  const { neoInstalacoes, createNeoInstalacao, updateNeoInstalacao, deleteNeoInstalacao, concluirNeoInstalacao, isConcluindo: isConcluindoInstalacao } = useNeoInstalacoes(currentDate, viewType);
  const { neoCorrecoes, createNeoCorrecao, updateNeoCorrecao, deleteNeoCorrecao, concluirNeoCorrecao, isConcluindo: isConcluindoCorrecao } = useNeoCorrecoes(currentDate, viewType);
  
  // Hooks para serviços sem data (pendentes de agendamento)
  const { neoInstalacoesSemData, updateNeoInstalacao: updateNeoInstalacaoSemData, isLoading: isLoadingInstalacoesSemData, reorganizarNeoInstalacoes } = useNeoInstalacoesSemData();
  const { neoCorrecoesSemData, updateNeoCorrecao: updateNeoCorrecaoSemData, isLoading: isLoadingCorrecoesSemData, reorganizarNeoCorrecoes } = useNeoCorrecoesSemData();

  // Hooks para correções de pedidos
  const { correcoes: correcoesPedido, updateCorrecao, concluirCorrecao, isConcluindo: isConcluindoCorrecaoPedido } = useCorrecoes(currentDate, viewType);
  const { correcoesSemData, updateCorrecao: updateCorrecaoSemData, isLoading: isLoadingCorrecoesSemDataPedido } = useCorrecoesSemData();

  // Hooks para listagem de pedidos por etapa
  const contadores = usePedidosContadores();
  const { neoInstalacoes: neoInstalacoesListagem, concluirNeoInstalacao: concluirNeoInstalacaoListagem, isConcluindo: isConcluindoInstalacaoListagem, reorganizarNeoInstalacoes: reorganizarNeoInstalacoesListagem } = useNeoInstalacoesListagem();
  const { neoCorrecoes: neoCorrecoesListagem, concluirNeoCorrecao: concluirNeoCorrecaoListagem, reorganizarNeoCorrecoes: reorganizarNeoCorrecoesListagem } = useNeoCorrecoesListagem();
  const { getResponsavel, atribuirResponsavel, removerResponsavel, isAtribuindo } = useEtapaResponsaveis();
  const {
    pedidos: pedidosEtapa,
    isLoading: isLoadingPedidos,
    moverParaProximaEtapa,
    retrocederEtapa,
    atualizarPrioridade,
    reorganizarPedidos,
    arquivarPedido,
    deletarPedido
  } = usePedidosEtapas(etapaAtiva);

  // Etapas da logística
  const ETAPAS_LOGISTICA: EtapaPedido[] = ['aguardando_coleta', 'instalacoes', 'correcoes', 'finalizado'];
  const ETAPA_ICONS: Record<string, any> = {
    aguardando_coleta: Package,
    instalacoes: HardHat,
    correcoes: AlertTriangle,
    finalizado: CheckCircle,
  };

  // Handlers para pedidos
  const handleMoverEtapa = async (pedidoId: string, skipCheckboxValidation?: boolean, onProgress?: (processoId: string, status: 'pending' | 'in_progress' | 'completed' | 'error') => void) => {
    await moverParaProximaEtapa.mutateAsync({ pedidoId, skipCheckboxValidation: skipCheckboxValidation || false, onProgress });
  };
  const handleRetrocederEtapa = (pedidoId: string, etapaDestino: EtapaPedido, motivo: string) => {
    retrocederEtapa.mutate({ pedidoId, etapaDestino, motivo });
  };
  const handleReorganizar = async (atualizacoes: { id: string; prioridade: number; }[]) => {
    await reorganizarPedidos.mutateAsync(atualizacoes);
  };
  const handleMoverPrioridade = async (pedidoId: string, direcao: DirecaoPrioridade) => {
    const index = pedidosEtapa.findIndex(p => p.id === pedidoId);
    if (index === -1) return;
    let novaPrioridade: number;
    if (direcao === 'frente' && index > 0) {
      novaPrioridade = ((pedidosEtapa[index - 1] as any).prioridade_etapa || 0) + 1;
    } else if (direcao === 'tras' && index < pedidosEtapa.length - 1) {
      novaPrioridade = ((pedidosEtapa[index + 1] as any).prioridade_etapa || 0) - 1;
    } else { return; }
    await atualizarPrioridade.mutateAsync({ pedidoId, novaPrioridade });
  };
  const handleArquivar = async (pedidoId: string) => { await arquivarPedido.mutateAsync(pedidoId); };
  const handleDeletarPedido = async (pedidoId: string) => { await deletarPedido.mutateAsync(pedidoId); };
  const handleCarregarOrdem = async (pedidoId: string) => {
    const ordem = ordensUnificadas?.find(o => o.pedido_id === pedidoId && !o.carregamento_concluido);
    if (!ordem) {
      toast.error("Nenhuma ordem agendada disponível para carregar.");
      return;
    }
    await concluirCarregamento({ ordem });
  };
  const handleConcluirNeoInstalacaoListagem = async (id: string) => { await concluirNeoInstalacaoListagem(id); };
  const handleConcluirNeoCorrecaoListagem = async (id: string) => { await concluirNeoCorrecaoListagem.mutateAsync(id); };
  const handleAbrirModalResponsavel = (etapa: EtapaPedido) => {
    setEtapaParaAtribuir(etapa);
    setModalResponsavelAberto(true);
  };
  const handleAtribuirResponsavel = (userId: string) => {
    if (etapaParaAtribuir) { atribuirResponsavel({ etapa: etapaParaAtribuir, responsavelId: userId }); setModalResponsavelAberto(false); setEtapaParaAtribuir(null); }
  };
  const handleRemoverResponsavel = () => {
    if (etapaParaAtribuir) { removerResponsavel(etapaParaAtribuir); setModalResponsavelAberto(false); setEtapaParaAtribuir(null); }
  };
  const handleAgendarPedido = (pedidoId: string) => {
    let ordemEncontrada = ordensUnificadas?.find(o => o.pedido_id === pedidoId) || null;
    
    if (!ordemEncontrada) {
      const pedido = pedidosFiltrados?.find((p: any) => p.id === pedidoId);
      if (pedido) {
        const vendaData = Array.isArray(pedido.vendas) ? pedido.vendas?.[0] : pedido.vendas;
        const tipoEntregaVal = vendaData?.tipo_entrega || 'entrega';
        const etapaPedido = (pedido as any).etapa_atual;
        // Determinar fonte correta baseado na etapa do pedido (correções têm fonte própria)
        const fonteFallback: 'ordens_carregamento' | 'instalacoes' | 'correcoes' =
          etapaPedido === 'correcoes'
            ? 'correcoes'
            : (tipoEntregaVal === 'instalacao' || tipoEntregaVal === 'manutencao' || etapaPedido === 'instalacoes')
              ? 'instalacoes'
              : 'ordens_carregamento';
        ordemEncontrada = {
          id: pedido.id,
          fonte: fonteFallback,
          pedido_id: pedido.id,
          venda_id: pedido.venda_id || null,
          nome_cliente: vendaData?.cliente_nome || '',
          data_carregamento: null,
          hora_carregamento: null,
          hora: null,
          tipo_carregamento: null,
          responsavel_carregamento_id: null,
          responsavel_carregamento_nome: null,
          carregamento_concluido: false,
          status: null,
          tipo_entrega: tipoEntregaVal,
          pedido: { id: pedido.id, numero_pedido: pedido.numero_pedido },
          venda: vendaData || null,
        } as OrdemCarregamentoUnificada;
      }
    }
    
    setOrdemPreSelecionadaAgendar(ordemEncontrada);
    setAgendarData(new Date());
    setAgendarModalOpen(true);
  };

  // Filtros para pedidos
  const pedidosFiltrados = useMemo(() => {
    let filtered = pedidosEtapa;
    if (searchTermPedidos.trim()) {
      const termo = searchTermPedidos.toLowerCase().trim();
      filtered = filtered.filter((pedido: any) => {
        const vendaData = Array.isArray(pedido.vendas) ? pedido.vendas[0] : pedido.vendas;
        const clienteNome = vendaData?.cliente_nome?.toLowerCase() || '';
        const numeroPedido = pedido.numero_pedido?.toString() || '';
        return clienteNome.includes(termo) || numeroPedido.includes(termo);
      });
    }
    if (tipoEntrega !== 'todos') {
      filtered = filtered.filter((pedido: any) => {
        const vendaData = Array.isArray(pedido.vendas) ? pedido.vendas[0] : pedido.vendas;
        return vendaData?.tipo_entrega === tipoEntrega;
      });
    }
    if (corPintura !== 'todas') {
      filtered = filtered.filter((pedido: any) => {
        const vendaData = Array.isArray(pedido.vendas) ? pedido.vendas[0] : pedido.vendas;
        const produtos = vendaData?.produtos_vendas || [];
        return produtos.some((p: any) => (p.cor?.nome || '').toLowerCase().includes(corPintura.toLowerCase()));
      });
    }
    if (mostrarProntos) {
      filtered = filtered.filter((pedido: any) => {
        const etapaAtualPedido = pedido.pedidos_etapas?.find((e: any) => e.etapa === etapaAtiva);
        if (!etapaAtualPedido || !etapaAtualPedido.checkboxes) return false;
        const checkboxes = etapaAtualPedido.checkboxes as any[];
        return checkboxes.filter((cb: any) => cb.required).every((cb: any) => cb.checked === true);
      });
    }
    return filtered;
  }, [pedidosEtapa, searchTermPedidos, tipoEntrega, corPintura, mostrarProntos, etapaAtiva]);

  const totalPortasEtapa = useMemo(() => {
    return pedidosFiltrados.reduce((total, pedido: any) => {
      const vendaData = Array.isArray(pedido.vendas) ? pedido.vendas[0] : pedido.vendas;
      const produtos = vendaData?.produtos_vendas || [];
      const portasEnrolar = produtos.filter((p: any) => p.tipo_produto === 'porta_enrolar');
      return total + portasEnrolar.reduce((sum: number, p: any) => sum + (p.quantidade || 1), 0);
    }, 0);
  }, [pedidosFiltrados]);

  useEffect(() => { setPaginaAtual(1); }, [searchTermPedidos, tipoEntrega, corPintura, mostrarProntos, etapaAtiva]);

  const totalPaginas = Math.ceil(pedidosFiltrados.length / ITENS_POR_PAGINA);
  const pedidosPaginados = pedidosFiltrados.slice((paginaAtual - 1) * ITENS_POR_PAGINA, paginaAtual * ITENS_POR_PAGINA);

  // Mapear correções de pedido para formato NeoCorrecao para reutilizar componentes do calendário
  const correcoesPedidoAsNeoCorrecao: NeoCorrecao[] = (correcoesPedido || []).map(c => ({
    id: c.id,
    nome_cliente: c.nome_cliente,
    cidade: c.cidade,
    estado: c.estado,
    data_correcao: c.data_correcao,
    hora: c.hora,
    descricao: c.observacoes || `Correção de pedido${c.pedido?.numero_pedido ? ` #${c.pedido.numero_pedido}` : ''}`,
    equipe_id: null,
    equipe_nome: c.responsavel_correcao_nome,
    tipo_responsavel: null,
    autorizado_id: null,
    autorizado_nome: null,
    valor_total: 0,
    valor_a_receber: 0,
    status: c.status,
    concluida: c.concluida,
    concluida_em: c.concluida_em,
    concluida_por: c.concluida_por,
    created_by: c.created_by,
    created_at: c.created_at,
    updated_at: c.updated_at,
    vezes_agendado: c.vezes_agendado,
    etapa_causadora: null,
    prioridade_gestao: 0,
    _tipo: 'neo_correcao' as const,
  }));

  const correcoesSemDataAsNeoCorrecao: NeoCorrecao[] = (correcoesSemData || []).map(c => ({
    id: c.id,
    nome_cliente: c.nome_cliente,
    cidade: c.cidade,
    estado: c.estado,
    data_correcao: c.data_correcao,
    hora: c.hora,
    descricao: c.observacoes || `Correção de pedido${c.pedido?.numero_pedido ? ` #${c.pedido.numero_pedido}` : ''}`,
    equipe_id: null,
    equipe_nome: c.responsavel_correcao_nome,
    tipo_responsavel: null,
    autorizado_id: null,
    autorizado_nome: null,
    valor_total: 0,
    valor_a_receber: 0,
    status: c.status,
    concluida: c.concluida,
    concluida_em: c.concluida_em,
    concluida_por: c.concluida_por,
    created_by: c.created_by,
    created_at: c.created_at,
    updated_at: c.updated_at,
    vezes_agendado: c.vezes_agendado,
    etapa_causadora: null,
    prioridade_gestao: 0,
    _tipo: 'neo_correcao' as const,
  }));

  // Combinar neo correções com correções de pedido
  const todasNeoCorrecoes = [...(neoCorrecoes || []), ...correcoesPedidoAsNeoCorrecao];
  const todasNeoCorrecoesSemData = [...(neoCorrecoesSemData || []), ...correcoesSemDataAsNeoCorrecao];

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 6);

  const handlePreviousWeek = () => setCurrentDate(prev => addDays(prev, -7));
  const handleNextWeek = () => setCurrentDate(prev => addDays(prev, 7));
  const handleToday = () => {
    if (viewType === 'month') {
      setCurrentDate(startOfMonth(new Date()));
    } else {
      setCurrentDate(startOfWeek(new Date(), { weekStartsOn: 1 }));
    }
  };

  const handleUpdateOrdem = async (params: { id: string; data: Partial<OrdemCarregamento>; fonte?: 'ordens_carregamento' | 'instalacoes' | 'correcoes' }) => {
    await updateOrdem(params);
  };

  const handleEdit = (ordem: OrdemCarregamento) => {
    setEditingOrdem(ordem);
    setEditDrawerOpen(true);
  };

  const handleSaveEdit = async (data: any) => {
    if (editingOrdem) {
      await updateOrdem({ id: editingOrdem.id, data, fonte: editingOrdem.fonte });
      setEditDrawerOpen(false);
      setEditingOrdem(null);
    }
  };

  const handleOrdemCriada = () => {
    queryClient.invalidateQueries({ queryKey: ['ordens-carregamento-disponiveis'] });
  };

  const handleOrdemDropped = () => {
    queryClient.invalidateQueries({ queryKey: ['ordens-carregamento-disponiveis'] });
  };

  const handleRemoverDoCalendario = async (ordemId: string) => {
    const ordem = ordens?.find(o => o.id === ordemId);
    const fonte = ordem?.fonte || 'ordens_carregamento';
    try {
      await updateOrdem({ 
        id: ordemId, 
        data: { 
          data_carregamento: null, 
          status: fonte === 'instalacoes' ? 'pendente_producao' : 'pendente',
          tipo_carregamento: null,
          responsavel_carregamento_id: null,
          responsavel_carregamento_nome: null,
          hora_carregamento: null,
        },
        fonte
      });
      queryClient.invalidateQueries({ queryKey: ['ordens-carregamento-disponiveis'] });
      toast.success("Ordem removida do calendário");
    } catch (error) {
      console.error("Erro ao remover:", error);
      toast.error("Erro ao remover ordem do calendário");
    }
  };

  const handleRemoverNeoInstalacaoDoCalendario = async (id: string) => {
    await updateNeoInstalacao({
      id,
      data: {
        data_instalacao: null,
        hora: null,
      }
    });
    toast.success("Instalação removida do calendário");
  };

  const handleRemoverNeoCorrecaoDoCalendario = async (id: string) => {
    // Check if it's a correcao de pedido
    const isCorrecaoPedido = correcoesPedido.some(c => c.id === id);
    if (isCorrecaoPedido) {
      await updateCorrecao({ id, data: { data_correcao: null, hora: null } as any });
    } else {
      await updateNeoCorrecao({
        id,
        data: { data_correcao: null, hora: null }
      });
    }
    toast.success("Correção removida do calendário");
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['ordens-carregamento-calendario'] });
  };

  const handleOrdemClick = (ordem: OrdemCarregamento) => {
    setSelectedOrdem(ordem);
    setDetailsOpen(true);
  };

  const handleMonthChange = (date: Date) => {
    setCurrentDate(date);
  };

  // Handlers para abrir detalhes
  const handleOpenNeoInstalacaoDetails = (neoInstalacao: NeoInstalacao) => {
    setSelectedNeoInstalacao(neoInstalacao);
    setNeoInstalacaoDetailsOpen(true);
  };

  const handleOpenNeoCorrecaoDetails = (neoCorrecao: NeoCorrecao) => {
    setSelectedNeoCorrecao(neoCorrecao);
    setNeoCorrecaoDetailsOpen(true);
  };

  const handleConcluirNeoInstalacao = async (id: string) => {
    await concluirNeoInstalacao(id);
    setNeoInstalacaoDetailsOpen(false);
  };

  const handleConcluirNeoCorrecao = async (id: string) => {
    // Check if it's a correcao de pedido
    const isCorrecaoPedido = correcoesPedido.some(c => c.id === id);
    if (isCorrecaoPedido) {
      await concluirCorrecao(id);
    } else {
      await concluirNeoCorrecao(id);
    }
    setNeoCorrecaoDetailsOpen(false);
  };

  // Handlers para edição
  const handleEditarNeoInstalacao = (neo: NeoInstalacao) => {
    navigate(`/logistica/expedicao/editar-neo/${neo.id}?tipo=instalacao`);
  };

  const handleEditarNeoCorrecao = (neo: NeoCorrecao) => {
    navigate(`/logistica/expedicao/editar-neo/${neo.id}?tipo=correcao`);
  };

  const handleSaveNeoInstalacao = async (dados: CriarNeoInstalacaoData) => {
    if (editingNeoInstalacao) {
      await updateNeoInstalacao({ id: editingNeoInstalacao.id, data: dados });
      toast.success("Instalação atualizada com sucesso!");
    } else {
      await createNeoInstalacao(dados);
    }
    setEditingNeoInstalacao(null);
  };

  const handleSaveNeoCorrecao = async (dados: CriarNeoCorrecaoData) => {
    if (editingNeoCorrecao) {
      await updateNeoCorrecao({ id: editingNeoCorrecao.id, data: dados });
      toast.success("Correção atualizada com sucesso!");
    } else {
      await createNeoCorrecao(dados);
    }
    setEditingNeoCorrecao(null);
  };

  const handleCloseNeoInstalacaoModal = (open: boolean) => {
    setNeoModalOpen(open);
    if (!open) setEditingNeoInstalacao(null);
  };

  const handleCloseNeoCorrecaoModal = (open: boolean) => {
    setNeoCorrecaoModalOpen(open);
    if (!open) setEditingNeoCorrecao(null);
  };

  // Handlers para agendar serviços sem data
  const handleAgendarInstalacao = async (id: string, data: string) => {
    await updateNeoInstalacaoSemData({ id, data: { data_instalacao: data, hora: null } });
  };

  const handleAgendarCorrecao = async (id: string, data: string) => {
    // Check if it's a correcao de pedido or neo correcao
    const isCorrecaoPedido = correcoesSemData.some(c => c.id === id);
    if (isCorrecaoPedido) {
      await updateCorrecaoSemData({ id, data: { data_correcao: data, hora: null } as any });
    } else {
      await updateNeoCorrecaoSemData({ id, data: { data_correcao: data, hora: null } });
    }
  };

  const handleLegendToggle = (legend: string) => {
    setLegendaFiltro(prev => prev === legend ? null : legend);
  };

  // Filtragem por legenda
  const ordensFiltradas = !legendaFiltro ? (ordens || [])
    : legendaFiltro === 'elisa' ? (ordens || []).filter(o => o.tipo_carregamento === 'elisa' && o.venda?.tipo_entrega !== 'entrega')
    : legendaFiltro === 'autorizados' ? (ordens || []).filter(o => o.tipo_carregamento === 'autorizados')
    : legendaFiltro === 'entrega' ? (ordens || []).filter(o => o.venda?.tipo_entrega === 'entrega')
    : [];

  const neoInstalacoesFiltradas = !legendaFiltro || legendaFiltro === 'neo_instalacao' ? (neoInstalacoes || []) : [];
  const neoCorrecoesFiltradas = !legendaFiltro || legendaFiltro === 'neo_correcao' ? todasNeoCorrecoes : [];

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const headerActions = (
    <div className="flex items-center gap-1 sm:gap-2">
      <Button
        variant="outline"
        size="sm"
        className="bg-white/5 border-blue-500/10 text-white hover:bg-white/10"
        onClick={() => navigate('/logistica/expedicao/nova-neo')}
      >
        <Plus className="h-4 w-4 sm:mr-1" />
        <span className="hidden sm:inline">Novo Neo</span>
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setViewType(viewType === 'week' ? 'month' : 'week')}
        className="bg-white/5 border-blue-500/10 text-white hover:bg-white/10"
      >
        {viewType === 'week' ? <CalendarDays className="h-4 w-4" /> : <Calendar className="h-4 w-4" />}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleToday}
        className="bg-white/5 border-blue-500/10 text-white hover:bg-white/10"
      >
        Hoje
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={signOut}
        className="bg-white/5 border-blue-500/10 text-white hover:bg-white/10"
      >
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );

  const subtitlePeriodo = viewType === 'week'
    ? `${format(weekStart, "dd/MM", { locale: ptBR })} - ${format(weekEnd, "dd/MM/yyyy", { locale: ptBR })}`
    : format(currentDate, "MMMM 'de' yyyy", { locale: ptBR });

  return (
    <MinimalistLayout
      title="Expedição"
      subtitle={subtitlePeriodo}
      backPath="/logistica"
      breadcrumbItems={[
        { label: "Home", path: "/home" },
        { label: "Logística", path: "/logistica" },
        { label: "Expedição" }
      ]}
      headerActions={headerActions}
      fullWidth
    >
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Calendário */}
          <Card className="bg-white/5 border-white/10 backdrop-blur-xl rounded-xl">
                <CardContent className="p-4">
                  {isMobile ? (
                    <CalendarioSemanalExpedicaoMobile
                      startDate={weekStart}
                      ordens={ordensFiltradas}
                      neoInstalacoes={neoInstalacoesFiltradas}
                      neoCorrecoes={neoCorrecoesFiltradas}
                      activeLegend={legendaFiltro}
                      onLegendToggle={handleLegendToggle}
                      onPreviousWeek={handlePreviousWeek}
                      onNextWeek={handleNextWeek}
                      onToday={handleToday}
                      onDayClick={() => {}}
                      onEdit={handleEdit}
                      onRemoverDoCalendario={handleRemoverDoCalendario}
                      onUpdateOrdem={handleUpdateOrdem}
                      onOrdemAdded={handleOrdemCriada}
                      onOpenNeoInstalacaoDetails={handleOpenNeoInstalacaoDetails}
                      onOpenNeoCorrecaoDetails={handleOpenNeoCorrecaoDetails}
                      onExcluirNeoInstalacao={deleteNeoInstalacao}
                      onExcluirNeoCorrecao={deleteNeoCorrecao}
                    />
                  ) : viewType === 'week' ? (
                    <CalendarioSemanalExpedicaoDesktop
                      startDate={weekStart}
                      ordens={ordensFiltradas}
                      neoInstalacoes={neoInstalacoesFiltradas}
                      neoCorrecoes={neoCorrecoesFiltradas}
                      activeLegend={legendaFiltro}
                      onLegendToggle={handleLegendToggle}
                      onPreviousWeek={handlePreviousWeek}
                      onNextWeek={handleNextWeek}
                      onToday={handleToday}
                      onUpdateOrdem={handleUpdateOrdem}
                      onUpdateNeoInstalacao={async (params) => {
                        await updateNeoInstalacao(params);
                      }}
                      onUpdateNeoCorrecao={async (params) => {
                        const isCorrecaoPedido = correcoesPedido.some(c => c.id === params.id);
                        if (isCorrecaoPedido) {
                          await updateCorrecao({ id: params.id, data: params.data as any });
                        } else {
                          await updateNeoCorrecao(params);
                        }
                      }}
                      onEdit={handleEdit}
                      onRemoverDoCalendario={handleRemoverDoCalendario}
                      onRemoverNeoInstalacaoDoCalendario={handleRemoverNeoInstalacaoDoCalendario}
                      onRemoverNeoCorrecaoDoCalendario={handleRemoverNeoCorrecaoDoCalendario}
                      onOrdemCriada={handleOrdemCriada}
                      onOrdemDropped={handleOrdemDropped}
                      onOrdemClick={handleOrdemClick}
                      onOpenNeoInstalacaoDetails={handleOpenNeoInstalacaoDetails}
                      onOpenNeoCorrecaoDetails={handleOpenNeoCorrecaoDetails}
                      onExcluirNeoInstalacao={deleteNeoInstalacao}
                      onExcluirNeoCorrecao={deleteNeoCorrecao}
                      onEditarNeoInstalacao={handleEditarNeoInstalacao}
                      onEditarNeoCorrecao={handleEditarNeoCorrecao}
                    />
                  ) : (
                    <CalendarioMensalExpedicaoDesktop
                      currentMonth={currentDate}
                      ordens={ordensFiltradas}
                      neoInstalacoes={neoInstalacoesFiltradas}
                      neoCorrecoes={neoCorrecoesFiltradas}
                      activeLegend={legendaFiltro}
                      onLegendToggle={handleLegendToggle}
                      onMonthChange={handleMonthChange}
                      onUpdateOrdem={handleUpdateOrdem}
                      onUpdateNeoInstalacao={async (params) => {
                        await updateNeoInstalacao(params);
                      }}
                      onUpdateNeoCorrecao={async (params) => {
                        const isCorrecaoPedido = correcoesPedido.some(c => c.id === params.id);
                        if (isCorrecaoPedido) {
                          await updateCorrecao({ id: params.id, data: params.data as any });
                        } else {
                          await updateNeoCorrecao(params);
                        }
                      }}
                      onEdit={handleEdit}
                      onRemoverDoCalendario={handleRemoverDoCalendario}
                      onRemoverNeoInstalacaoDoCalendario={handleRemoverNeoInstalacaoDoCalendario}
                      onRemoverNeoCorrecaoDoCalendario={handleRemoverNeoCorrecaoDoCalendario}
                      onOrdemCriada={handleOrdemCriada}
                      onOrdemDropped={handleOrdemDropped}
                      onOrdemClick={handleOrdemClick}
                      onOpenNeoInstalacaoDetails={handleOpenNeoInstalacaoDetails}
                      onOpenNeoCorrecaoDetails={handleOpenNeoCorrecaoDetails}
                      onExcluirNeoInstalacao={deleteNeoInstalacao}
                      onExcluirNeoCorrecao={deleteNeoCorrecao}
                      onEditarNeoInstalacao={handleEditarNeoInstalacao}
                      onEditarNeoCorrecao={handleEditarNeoCorrecao}
                    />
                  )}
                </CardContent>
              </Card>

          {/* Listagem de Pedidos por Etapa com DnD */}
          <Card className="bg-white/5 border-white/10 backdrop-blur-xl rounded-xl">
                <Tabs value={etapaAtiva} onValueChange={v => setEtapaAtiva(v as EtapaPedido)}>
                  {/* Seletor mobile */}
                  <div className="md:hidden px-4 pt-4">
                    <Select value={etapaAtiva} onValueChange={v => setEtapaAtiva(v as EtapaPedido)}>
                      <SelectTrigger className="w-full h-12 bg-white/5 border-blue-500/10 text-white">
                        <SelectValue>
                          {(() => {
                            const config = ETAPAS_CONFIG[etapaAtiva];
                            const count = contadores[etapaAtiva] || 0;
                            const IconComponent = ETAPA_ICONS[etapaAtiva as keyof typeof ETAPA_ICONS];
                            return (
                              <div className="flex items-center gap-2">
                                {IconComponent && <IconComponent className="h-5 w-5" />}
                                <span className="font-medium">{config.label}</span>
                                <Badge variant="secondary" className="ml-auto bg-blue-500/20 text-blue-400">{count}</Badge>
                              </div>
                            );
                          })()}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-blue-500/10">
                        {ETAPAS_LOGISTICA.map(etapa => {
                          const config = ETAPAS_CONFIG[etapa];
                          const count = contadores[etapa] || 0;
                          const IconComponent = ETAPA_ICONS[etapa as keyof typeof ETAPA_ICONS];
                          return (
                            <SelectItem key={etapa} value={etapa} className="text-white cursor-pointer">
                              <div className="flex items-center gap-2 w-full">
                                {IconComponent && <IconComponent className="h-4 w-4 flex-shrink-0" />}
                                <span className="flex-1">{config.label}</span>
                                <Badge variant="secondary" className="text-xs bg-blue-500/20 text-blue-400">{count}</Badge>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Tabs - Desktop */}
                  <div className="hidden md:block px-4 pt-4">
                    <TabsList className="w-full justify-start overflow-x-auto flex-nowrap h-[85px] p-1.5 gap-2 bg-white/5 border border-white/10 backdrop-blur-xl rounded-xl">
                      <TooltipProvider>
                        {ETAPAS_LOGISTICA.map(etapa => {
                          const config = ETAPAS_CONFIG[etapa];
                          const count = contadores[etapa] || 0;
                          const IconComponent = ETAPA_ICONS[etapa as keyof typeof ETAPA_ICONS];
                          const responsavel = getResponsavel(etapa);
                          return (
                            <TabsTrigger
                              key={etapa}
                              value={etapa}
                              className="flex-shrink-0 flex-row items-center justify-start h-full min-w-[150px] px-3 py-2 gap-2.5 rounded-lg bg-white/5 border border-white/10 backdrop-blur-xl text-white/70 hover:bg-white/[0.08] hover:border-blue-400/30 transition-all data-[state=active]:bg-blue-500/15 data-[state=active]:border-blue-400/50 data-[state=active]:text-white data-[state=active]:shadow-[0_0_0_1px_rgba(96,165,250,0.3)]"
                            >
                              {responsavel ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Avatar className="h-9 w-9 flex-shrink-0 border border-blue-500/30">
                                      <AvatarImage src={responsavel.foto_perfil_url || undefined} />
                                      <AvatarFallback className="text-xs bg-blue-500/20 text-blue-400">{responsavel.nome.charAt(0).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                  </TooltipTrigger>
                                  <TooltipContent><p className="text-xs">Responsável: {responsavel.nome}</p></TooltipContent>
                                </Tooltip>
                              ) : (
                                <div className="h-9 w-9 flex-shrink-0 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
                                  {IconComponent && <IconComponent className="h-4 w-4 text-blue-400" />}
                                </div>
                              )}
                              <div className="flex flex-col items-start gap-1 min-w-0">
                                <span className="text-xs font-medium leading-tight truncate">{config.label}</span>
                                <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded-full text-[10px] font-semibold leading-none">{count}</span>
                              </div>
                            </TabsTrigger>
                          );
                        })}
                      </TooltipProvider>
                    </TabsList>
                  </div>

                  {ETAPAS_LOGISTICA.map(etapa => (
                    <TabsContent key={etapa} value={etapa} className="mt-0">
                      <CardHeader className="pb-3 px-4 py-4">
                        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                          <CardTitle className="text-lg flex items-center gap-2 text-white">
                            <span>{ETAPAS_CONFIG[etapa].label}</span>
                            <span className="text-sm font-normal text-white/60">
                              {(() => {
                                const totalItensEtapa = etapaAtiva === 'instalacoes'
                                  ? pedidosFiltrados.length + neoInstalacoesListagem.length
                                  : etapaAtiva === 'correcoes'
                                  ? pedidosFiltrados.length + neoCorrecoesListagem.length
                                  : pedidosFiltrados.length;
                                const label = (etapaAtiva === 'instalacoes' || etapaAtiva === 'correcoes')
                                  ? (totalItensEtapa === 1 ? 'item' : 'itens')
                                  : (totalItensEtapa === 1 ? 'pedido' : 'pedidos');
                                return `${totalItensEtapa} ${label}`;
                              })()}
                              {totalPaginas > 1 && ` (Página ${paginaAtual} de ${totalPaginas})`}
                            </span>
                            {totalPortasEtapa > 0 && (
                              <Badge variant="secondary" className="text-xs ml-2 bg-primary/10 text-white">
                                🚪 {totalPortasEtapa} {totalPortasEtapa === 1 ? 'porta' : 'portas'}
                              </Badge>
                            )}
                            {/* Responsável da Etapa */}
                            <div className="flex items-center gap-2 ml-4">
                              {(() => {
                                const responsavel = getResponsavel(etapa);
                                return responsavel ? (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <button 
                                          onClick={() => handleAbrirModalResponsavel(etapa)}
                                          className="flex items-center gap-2 px-2 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors"
                                        >
                                          <Avatar className="h-6 w-6 border border-primary/30">
                                            <AvatarImage src={responsavel.foto_perfil_url || undefined} />
                                            <AvatarFallback className="text-[10px] bg-primary/20">{responsavel.nome.charAt(0).toUpperCase()}</AvatarFallback>
                                          </Avatar>
                                          <span className="text-xs text-white/80">{responsavel.nome.split(' ')[0]}</span>
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent><p className="text-xs">Clique para alterar o responsável</p></TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                ) : (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button variant="ghost" size="sm" onClick={() => handleAbrirModalResponsavel(etapa)} className="h-7 px-2 text-white/50 hover:text-white hover:bg-primary/10">
                                          <UserPlus className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent><p className="text-xs">Atribuir responsável</p></TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                );
                              })()}
                            </div>
                          </CardTitle>
                          <PedidosFiltrosMinimalista 
                            searchTerm={searchTermPedidos} 
                            onSearchChange={setSearchTermPedidos} 
                            tipoEntrega={tipoEntrega} 
                            onTipoEntregaChange={setTipoEntrega} 
                            corPintura={corPintura} 
                            onCorPinturaChange={setCorPintura} 
                            mostrarProntos={mostrarProntos} 
                            onMostrarProntosToggle={() => setMostrarProntos(!mostrarProntos)} 
                          />
                        </div>
                      </CardHeader>
                      <CardContent className="px-4 py-4">
                        {isLoadingPedidos ? (
                          <div className="text-center py-8 text-white/60">Carregando...</div>
                        ) : pedidosFiltrados.length === 0 && !(etapaAtiva === 'instalacoes' && neoInstalacoesListagem.length > 0) && !(etapaAtiva === 'correcoes' && neoCorrecoesListagem.length > 0) ? (
                          <div className="text-center py-8 text-white/60">
                            {searchTermPedidos ? 'Nenhum pedido encontrado' : 'Nenhum pedido nesta etapa'}
                          </div>
                        ) : (
                          <>
                            {/* Neo Instalações - apenas na etapa instalacoes */}
                            {etapaAtiva === 'instalacoes' && neoInstalacoesListagem.length > 0 && (
                              <div className="mb-4 space-y-2">
                                <h3 className="text-sm font-medium text-white/70 mb-2">Instalações Avulsas ({neoInstalacoesListagem.length})</h3>
                                <NeoInstalacoesDraggableList
                                  neos={neoInstalacoesListagem}
                                  viewMode="list"
                                  onConcluir={handleConcluirNeoInstalacaoListagem}
                                  isConcluindo={isConcluindoInstalacaoListagem}
                                  onAgendar={(id) => {
                                    let ordemEncontrada = ordensUnificadas?.find(o => o.id === id || o.pedido_id === id) || null;
                                    if (!ordemEncontrada) {
                                      const neo = neoInstalacoesListagem.find(n => n.id === id);
                                      if (neo) {
                                        ordemEncontrada = {
                                          id: neo.id, fonte: 'instalacoes', pedido_id: null, venda_id: null,
                                          nome_cliente: neo.nome_cliente, data_carregamento: null, hora_carregamento: null,
                                          hora: null, tipo_carregamento: null, responsavel_carregamento_id: null,
                                          responsavel_carregamento_nome: null, carregamento_concluido: false, status: null,
                                          tipo_entrega: 'instalacao', pedido: null, venda: null,
                                        } as OrdemCarregamentoUnificada;
                                      }
                                    }
                                    setOrdemPreSelecionadaAgendar(ordemEncontrada);
                                    setAgendarData(new Date());
                                    setAgendarModalOpen(true);
                                  }}
                                  onEditar={handleEditarNeoInstalacao}
                                  onReorganizar={reorganizarNeoInstalacoesListagem}
                                />
                                {pedidosFiltrados.length > 0 && (
                                  <h3 className="text-sm font-medium text-white/70 mt-4 mb-2">Pedidos ({pedidosFiltrados.length})</h3>
                                )}
                              </div>
                            )}

                            {/* Neo Correções - apenas na etapa correcoes */}
                            {etapaAtiva === 'correcoes' && neoCorrecoesListagem.length > 0 && (
                              <div className="mb-4 space-y-2">
                                <h3 className="text-sm font-medium text-white/70 mb-2">Correções Avulsas ({neoCorrecoesListagem.length})</h3>
                                <NeoCorrecoesDraggableList
                                  neos={neoCorrecoesListagem}
                                  viewMode="list"
                                  onConcluir={handleConcluirNeoCorrecaoListagem}
                                  onAgendar={(id) => {
                                    let ordemEncontrada = ordensUnificadas?.find(o => o.id === id || o.pedido_id === id) || null;
                                    if (!ordemEncontrada) {
                                      const neo = neoCorrecoesListagem.find(n => n.id === id);
                                      if (neo) {
                                        ordemEncontrada = {
                                          id: neo.id, fonte: 'instalacoes', pedido_id: null, venda_id: null,
                                          nome_cliente: neo.nome_cliente, data_carregamento: null, hora_carregamento: null,
                                          hora: null, tipo_carregamento: null, responsavel_carregamento_id: null,
                                          responsavel_carregamento_nome: null, carregamento_concluido: false, status: null,
                                          tipo_entrega: 'manutencao', pedido: null, venda: null,
                                        } as OrdemCarregamentoUnificada;
                                      }
                                    }
                                    setOrdemPreSelecionadaAgendar(ordemEncontrada);
                                    setAgendarData(new Date());
                                    setAgendarModalOpen(true);
                                  }}
                                  onEditar={handleEditarNeoCorrecao}
                                  onReorganizar={reorganizarNeoCorrecoesListagem}
                                />
                                {pedidosFiltrados.length > 0 && (
                                  <h3 className="text-sm font-medium text-white/70 mt-4 mb-2">Pedidos ({pedidosFiltrados.length})</h3>
                                )}
                              </div>
                            )}
                            
                            <PedidosDraggableList 
                              pedidos={pedidosPaginados}
                              pedidosParaTotais={pedidosFiltrados}
                              etapa={etapa} 
                              isAberto={false} 
                              viewMode="list" 
                              onReorganizar={handleReorganizar} 
                              onMoverPrioridade={handleMoverPrioridade}
                              onMoverEtapa={handleMoverEtapa}
                              onRetrocederEtapa={handleRetrocederEtapa}
                              onArquivar={etapa === 'finalizado' ? undefined : handleArquivar}
                              onDeletar={handleDeletarPedido}
                              onAgendar={handleAgendarPedido}
                              onCarregarOrdem={['aguardando_coleta','instalacoes','correcoes'].includes(etapa) ? handleCarregarOrdem : undefined}
                              onCorrecaoDetalhesClick={etapa === 'correcoes' ? (pedidoId: string) => {
                                setCorrecaoDetalhesPedidoId(pedidoId);
                                setCorrecaoDetalhesOpen(true);
                              } : undefined}
                              enableDragAndDrop={true}
                              showPosicao={true}
                              hideOrdensStatus={true}
                              hideCorrecaoButton={false}
                            />
                            
                            {totalPaginas > 1 && (
                              <div className="mt-6 flex justify-center">
                                <Pagination>
                                  <PaginationContent>
                                    <PaginationItem>
                                      <PaginationPrevious 
                                        onClick={() => setPaginaAtual(prev => Math.max(1, prev - 1))}
                                        className={`${paginaAtual === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'} text-white`}
                                      />
                                    </PaginationItem>
                                    {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((pagina) => {
                                      const mostrarPagina = pagina === 1 || pagina === totalPaginas || (pagina >= paginaAtual - 1 && pagina <= paginaAtual + 1);
                                      const mostrarEllipsisAntes = pagina === paginaAtual - 2 && paginaAtual > 3;
                                      const mostrarEllipsisDepois = pagina === paginaAtual + 2 && paginaAtual < totalPaginas - 2;
                                      if (mostrarEllipsisAntes || mostrarEllipsisDepois) return <PaginationItem key={pagina}><PaginationEllipsis className="text-white" /></PaginationItem>;
                                      if (!mostrarPagina) return null;
                                      return (
                                        <PaginationItem key={pagina}>
                                          <PaginationLink onClick={() => setPaginaAtual(pagina)} isActive={paginaAtual === pagina} className="cursor-pointer text-white">{pagina}</PaginationLink>
                                        </PaginationItem>
                                      );
                                    })}
                                    <PaginationItem>
                                      <PaginationNext 
                                        onClick={() => setPaginaAtual(prev => Math.min(totalPaginas, prev + 1))}
                                        className={`${paginaAtual === totalPaginas ? 'pointer-events-none opacity-50' : 'cursor-pointer'} text-white`}
                                      />
                                    </PaginationItem>
                                  </PaginationContent>
                                </Pagination>
                              </div>
                            )}
                          </>
                        )}
                      </CardContent>
                    </TabsContent>
                  ))}
                </Tabs>
              </Card>
        </div>
      )}

      {/* Detalhes da Ordem */}
      <OrdemCarregamentoDetails
        ordem={selectedOrdem}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />

      {/* Drawer de Edição */}
      <EditarOrdemCarregamentoDrawer
        ordem={editingOrdem}
        open={editDrawerOpen}
        onOpenChange={setEditDrawerOpen}
        onSave={handleSaveEdit}
      />

      {/* Modal Neo Instalação (Criar/Editar) */}
      <NeoInstalacaoModal
        open={neoModalOpen}
        onOpenChange={handleCloseNeoInstalacaoModal}
        neoInstalacao={editingNeoInstalacao}
        onConfirm={handleSaveNeoInstalacao}
      />

      {/* Modal Neo Correção (Criar/Editar) */}
      <NeoCorrecaoModal
        open={neoCorrecaoModalOpen}
        onOpenChange={handleCloseNeoCorrecaoModal}
        neoCorrecao={editingNeoCorrecao}
        onConfirm={handleSaveNeoCorrecao}
      />

      {/* Sidebar de Detalhes - Neo Instalação */}
      <NeoInstalacaoDetails
        neoInstalacao={selectedNeoInstalacao}
        open={neoInstalacaoDetailsOpen}
        onOpenChange={setNeoInstalacaoDetailsOpen}
        onConcluir={handleConcluirNeoInstalacao}
        onEditar={handleEditarNeoInstalacao}
        isConcluindo={isConcluindoInstalacao}
      />

      {/* Sidebar de Detalhes - Neo Correção */}
      <NeoCorrecaoDetails
        neoCorrecao={selectedNeoCorrecao}
        open={neoCorrecaoDetailsOpen}
        onOpenChange={setNeoCorrecaoDetailsOpen}
        onConcluir={handleConcluirNeoCorrecao}
        onEditar={handleEditarNeoCorrecao}
        isConcluindo={isConcluindoCorrecao}
      />

      {/* Modal para agendar no calendário */}
      <AdicionarOrdemCalendarioModal
        open={agendarModalOpen}
        onOpenChange={(open) => {
          setAgendarModalOpen(open);
          if (!open) setOrdemPreSelecionadaAgendar(null);
        }}
        ordemPreSelecionada={ordemPreSelecionadaAgendar}
        dataSelecionada={agendarData}
        onConfirm={async (params) => {
          await handleUpdateOrdem({
            id: params.ordemId,
            data: {
              data_carregamento: params.data_carregamento,
              hora_carregamento: params.hora,
              tipo_carregamento: params.tipo_carregamento,
              responsavel_carregamento_id: params.responsavel_carregamento_id,
              responsavel_carregamento_nome: params.responsavel_carregamento_nome,
              status: params.fonte === 'instalacoes' ? 'pronta_fabrica' : 'agendada',
            } as any,
            fonte: params.fonte,
          });
          handleOrdemCriada();
        }}
      />

      {/* Modal para atribuir responsável de etapa */}
      {etapaParaAtribuir && (
        <SelecionarResponsavelEtapaModal
          open={modalResponsavelAberto}
          onOpenChange={setModalResponsavelAberto}
          etapa={etapaParaAtribuir}
          responsavelAtualId={getResponsavel(etapaParaAtribuir)?.user_id}
          onConfirm={handleAtribuirResponsavel}
          onRemover={handleRemoverResponsavel}
          isLoading={isAtribuindo}
        />
      )}

      {/* Sheet de Detalhes da Correção */}
      {correcaoDetalhesPedidoId && (() => {
        const pedidoCorrecao = pedidosEtapa.find((p: any) => p.id === correcaoDetalhesPedidoId);
        const vendaData = pedidoCorrecao ? (Array.isArray(pedidoCorrecao.vendas) ? pedidoCorrecao.vendas[0] : pedidoCorrecao.vendas) : null;
        return (
          <CorrecaoDetalhesSheet
            open={correcaoDetalhesOpen}
            onOpenChange={(open) => {
              setCorrecaoDetalhesOpen(open);
              if (!open) setCorrecaoDetalhesPedidoId(null);
            }}
            pedidoId={correcaoDetalhesPedidoId}
            numeroPedido={pedidoCorrecao?.numero_pedido?.toString() || ''}
            nomeCliente={vendaData?.cliente_nome || ''}
          />
        );
      })()}
    </MinimalistLayout>
  );
}
