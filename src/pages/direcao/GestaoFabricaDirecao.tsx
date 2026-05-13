import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, RefreshCw, Factory, Clock, ClipboardCheck, Paintbrush, Wrench, CheckCircle2, HardHat, AlertTriangle, UserPlus, ShieldCheck, CalendarDays, Archive, Search, Calendar, User, Undo2, ChevronDown, Truck, Settings, CalendarIcon, DollarSign, ShoppingCart } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { usePedidosArquivados } from "@/hooks/usePedidosArquivados";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarioExpedicaoModal } from "@/components/pedidos/CalendarioExpedicaoModal";
import { SelecionarPedidoInstalacaoModal } from "@/components/instalacoes/SelecionarPedidoInstalacaoModal";

import { SelecionarResponsavelEtapaModal } from "@/components/pedidos/SelecionarResponsavelEtapaModal";

import { AdicionarOrdemCalendarioModal } from "@/components/expedicao/AdicionarOrdemCalendarioModal";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useQueryClient } from "@tanstack/react-query";
import { usePedidosEtapas, usePedidosContadores } from "@/hooks/usePedidosEtapas";
import { useVendasPendentePedido } from "@/hooks/useVendasPendentePedido";
import { useVendasPendenteFaturamento } from "@/hooks/useVendasPendenteFaturamento";
import { VendaPendentePedidoCard } from "@/components/pedidos/VendaPendentePedidoCard";

import { VendasPendenteDraggableList } from "@/components/pedidos/VendasPendenteDraggableList";
import { useNeoInstalacoesListagem, useNeoInstalacoesFinalizadas, useNeoInstalacoesAguardandoCliente } from "@/hooks/useNeoInstalacoes";
import { useNeoCorrecoesListagem, useNeoCorrecoesFinalizadas, useNeoCorrecoesAguardandoCliente } from "@/hooks/useNeoCorrecoes";
import { useEtapaResponsaveis } from "@/hooks/useEtapaResponsaveis";
import { useOrdensCarregamentoCalendario } from "@/hooks/useOrdensCarregamentoCalendario";
import { useOrdensCarregamentoUnificadas } from "@/hooks/useOrdensCarregamentoUnificadas";
import { PedidosDraggableList } from "@/components/pedidos/PedidosDraggableList";
import { PedidosFiltrosMinimalista } from "@/components/pedidos/PedidosFiltrosMinimalista";
import { NeoInstalacaoCardGestao } from "@/components/pedidos/NeoInstalacaoCardGestao";
import { NeoCorrecaoCardGestao } from "@/components/pedidos/NeoCorrecaoCardGestao";
import { NeoInstalacoesDraggableList, NeoCorrecoesDraggableList } from "@/components/pedidos/NeoDraggableList";
import { PortasPorEtapa } from "@/components/producao/dashboard/PortasPorEtapa";
import { ORDEM_ETAPAS, ETAPAS_CONFIG } from "@/types/pedidoEtapa";
import type { EtapaPedido, DirecaoPrioridade } from "@/types/pedidoEtapa";
import type { NeoInstalacao } from "@/types/neoInstalacao";
import type { NeoCorrecao } from "@/types/neoCorrecao";
import type { OrdemCarregamento } from "@/types/ordemCarregamento";
import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import type { VendaPendentePedido } from "@/hooks/useVendasPendentePedido";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { enviarParaAguardandoCliente } from "@/lib/aguardandoCliente";
import { gerarListaComprasPDF, type ItemListaCompras } from "@/utils/listaComprasPDF";
import { buscarDadosPedidoProducaoPDF } from "@/utils/buscarDadosPedidoProducaoPDF";
import { imprimirPedidosProducaoPDFBatch } from "@/utils/pedidoProducaoPDFGenerator";
import { PedidosSelecaoBar } from "@/components/pedidos/PedidosSelecaoBar";

import { MinimalistLayout } from "@/components/MinimalistLayout";
import { useIsMobile } from "@/hooks/use-mobile";
import { GestaoFabricaMobile } from "@/components/direcao/GestaoFabricaMobile";

const ETAPA_ICONS = {
  aprovacao_diretor: ShieldCheck,
  aberto: Clock,
  aprovacao_ceo: ShieldCheck,
  em_producao: Factory,
  inspecao_qualidade: ClipboardCheck,
  aguardando_pintura: Paintbrush,
  embalagem: Package,
  aguardando_coleta: Package,
  aguardando_instalacao: Wrench,
  instalacoes: HardHat,
  correcoes: AlertTriangle,
  finalizado: CheckCircle2,
  aguardando_cliente: Clock,
  arquivo_morto: Archive
};

export default function GestaoFabricaDirecao() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [etapaAtiva, setEtapaAtiva] = useState<EtapaPedido | 'arquivo_morto' | 'pendente_pedido'>('aprovacao_diretor');
  const [arquivoSearch, setArquivoSearch] = useState('');
  const [debouncedArquivoSearch, setDebouncedArquivoSearch] = useState('');
  const [desarquivandoId, setDesarquivandoId] = useState<string | null>(null);
  const [arquivoDataInicio, setArquivoDataInicio] = useState<Date | undefined>(undefined);
  const [arquivoDataFim, setArquivoDataFim] = useState<Date | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const viewMode = 'list';
  const [tipoEntrega, setTipoEntrega] = useState('todos');
  const [corPintura, setCorPintura] = useState('todas');
  const [mostrarProntos, setMostrarProntos] = useState(false);
  
  
  const [modalResponsavelAberto, setModalResponsavelAberto] = useState(false);
  const [etapaParaAtribuir, setEtapaParaAtribuir] = useState<EtapaPedido | null>(null);
  const [showCalendarioModal, setShowCalendarioModal] = useState(false);
  const [showCalendarioInstalacoesModal, setShowCalendarioInstalacoesModal] = useState(false);
  const [agendarModalOpen, setAgendarModalOpen] = useState(false);
  const [agendarData, setAgendarData] = useState(new Date());
  const [agendarPedidoId, setAgendarPedidoId] = useState<string | null>(null);
  const [gerandoListaEtapa, setGerandoListaEtapa] = useState<EtapaPedido | null>(null);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [gerandoListaSelecao, setGerandoListaSelecao] = useState(false);
  const [imprimindoSelecao, setImprimindoSelecao] = useState(false);

  // Resetar seleção quando trocar de etapa
  useEffect(() => {
    setSelecionados(new Set());
  }, [etapaAtiva]);

  const toggleSelecionado = useCallback((id: string) => {
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const limparSelecao = useCallback(() => setSelecionados(new Set()), []);

  const gerarListaParaPedidos = useCallback(async (
    pedidoIds: string[],
    etapaLabel: string
  ) => {
    try {
      if (pedidoIds.length === 0) {
        toast({ title: 'Sem pedidos', description: 'Nenhum pedido para gerar a lista.' });
        return;
      }
      const { data: linhas, error: lErr } = await supabase
        .from('pedido_linhas')
        .select(`
          quantidade, largura, altura, tamanho, estoque_id,
          estoque:estoque_id ( id, nome_produto, categoria, unidade, quantidade_padrao, materia_prima_id, materia_prima_conversao )
        `)
        .in('pedido_id', pedidoIds)
        .not('estoque_id', 'is', null);
      if (lErr) throw lErr;

      // Resolver categorias: estoque.categoria pode ser UUID (referência a
      // estoque_categorias.id) ou string legada (ex: "motor", "geral").
      const { data: cats } = await supabase
        .from('estoque_categorias')
        .select('id, nome');
      const catMap = new Map<string, string>();
      (cats || []).forEach((c: any) => catMap.set(String(c.id), c.nome));
      const resolverCategoria = (raw: string | null | undefined): string => {
        if (!raw) return 'Sem categoria';
        if (catMap.has(raw)) return catMap.get(raw)!;
        return raw.charAt(0).toUpperCase() + raw.slice(1);
      };

      const map = new Map<string, ItemListaCompras>();
      (linhas || []).forEach((linha: any) => {
        if (!linha.estoque) return;
        const e = linha.estoque;
        const qtd = Number(linha.quantidade) || 0;
        let necessario = 0;
        if (linha.largura && linha.altura) {
          necessario = qtd * Number(linha.largura) * Number(linha.altura);
        } else if (linha.tamanho) {
          const t = parseFloat(String(linha.tamanho).replace(',', '.'));
          necessario = !isNaN(t) ? qtd * t : qtd;
        } else {
          necessario = qtd;
        }
        if (map.has(e.id)) {
          map.get(e.id)!.necessario += necessario;
        } else {
          map.set(e.id, {
            estoque_id: e.id,
            nome_produto: e.nome_produto,
            categoria: resolverCategoria(e.categoria),
            unidade: e.unidade || 'un',
            quantidade_padrao: e.quantidade_padrao,
            necessario,
            materia_prima_id: e.materia_prima_id || null,
            materia_prima_conversao: e.materia_prima_conversao || null,
          });
        }
      });

      const itens = Array.from(map.values());
      if (itens.length === 0) {
        toast({ title: 'Sem materiais', description: 'Nenhum material vinculado.' });
        return;
      }

      // Buscar matérias-primas vinculadas para enriquecer os itens
      const mpIds = Array.from(
        new Set(itens.map((i) => i.materia_prima_id).filter((id): id is string => !!id))
      );
      if (mpIds.length > 0) {
        const { data: mps } = await supabase
          .from('materias_primas')
          .select('id, nome, unidade')
          .in('id', mpIds);
        const mpMap = new Map<string, { nome: string; unidade: string }>();
        (mps || []).forEach((m: any) =>
          mpMap.set(String(m.id), { nome: m.nome, unidade: m.unidade })
        );
        itens.forEach((it) => {
          if (it.materia_prima_id && mpMap.has(it.materia_prima_id)) {
            const mp = mpMap.get(it.materia_prima_id)!;
            it.materia_prima_nome = mp.nome;
            it.materia_prima_unidade = mp.unidade;
          }
        });
      }

      await gerarListaComprasPDF(etapaLabel, itens);
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Erro', description: err.message || 'Falha ao gerar lista', variant: 'destructive' });
    }
  }, [toast]);

  const handleGerarListaCompras = useCallback(async (etapa: EtapaPedido) => {
    try {
      setGerandoListaEtapa(etapa);
      const { data: peds, error: pErr } = await supabase
        .from('pedidos_producao')
        .select('id')
        .eq('etapa_atual', etapa as any);
      if (pErr) throw pErr;
      const pedidoIds = (peds || []).map((p: any) => p.id);
      await gerarListaParaPedidos(pedidoIds, ETAPAS_CONFIG[etapa]?.label || String(etapa));
    } finally {
      setGerandoListaEtapa(null);
    }
  }, [gerarListaParaPedidos]);

  const handleGerarListaSelecao = useCallback(async () => {
    try {
      setGerandoListaSelecao(true);
      const usarTodos = selecionados.size === 0;
      const ids = usarTodos
        ? pedidosFiltrados.map((p: any) => p.id)
        : Array.from(selecionados);
      if (ids.length === 0) return;
      const baseLabel = etapaAtiva && etapaAtiva !== 'arquivo_morto' && etapaAtiva !== 'pendente_pedido'
        ? ETAPAS_CONFIG[etapaAtiva as EtapaPedido]?.label || etapaAtiva
        : 'Seleção';
      const etapaLabel = usarTodos ? String(baseLabel) : `${baseLabel} (seleção)`;
      await gerarListaParaPedidos(ids, etapaLabel);
    } finally {
      setGerandoListaSelecao(false);
    }
  }, [selecionados, etapaAtiva, gerarListaParaPedidos, pedidosFiltrados]);

  const handleImprimirSelecao = useCallback(async () => {
    try {
      setImprimindoSelecao(true);
      const ids = selecionados.size === 0
        ? pedidosFiltrados.map((p: any) => p.id)
        : Array.from(selecionados);
      if (ids.length === 0) return;
      const dados = await Promise.all(ids.map((id) => buscarDadosPedidoProducaoPDF(id)));
      const filtrados = dados.filter((d): d is NonNullable<typeof d> => !!d);
      if (filtrados.length === 0) {
        toast({ title: 'Sem dados', description: 'Não foi possível carregar os pedidos.' });
        return;
      }
      imprimirPedidosProducaoPDFBatch(filtrados);
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Erro', description: err.message || 'Falha ao imprimir', variant: 'destructive' });
    } finally {
      setImprimindoSelecao(false);
    }
  }, [selecionados, toast, pedidosFiltrados]);
  
  // Debounce para busca do arquivo morto
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedArquivoSearch(arquivoSearch), 300);
    return () => clearTimeout(timer);
  }, [arquivoSearch]);

  const contadores = usePedidosContadores();
  const { data: vendasPendentePedido = [], isLoading: isLoadingPendentes } = useVendasPendentePedido();
  const { data: vendasPendenteFaturamento = [], isLoading: isLoadingFaturamento } = useVendasPendenteFaturamento();
  const { data: pedidosArquivados = [], isLoading: isLoadingArquivados } = usePedidosArquivados({
    search: debouncedArquivoSearch,
    dataInicio: arquivoDataInicio || null,
    dataFim: arquivoDataFim || null,
  });
  const { neoInstalacoes, concluirNeoInstalacao, isConcluindo, reorganizarNeoInstalacoes } = useNeoInstalacoesListagem();
  const { neoCorrecoes, concluirNeoCorrecao, reorganizarNeoCorrecoes } = useNeoCorrecoesListagem();
  const { neoInstalacoesFinalizadas, retornarNeoInstalacao, isRetornando: isRetornandoInstalacao, arquivarNeoInstalacao, enviarAguardandoClienteNeoInstalacao } = useNeoInstalacoesFinalizadas();
  const { neoCorrecoesFinalizadas, retornarNeoCorrecao, isRetornando: isRetornandoCorrecao, arquivarNeoCorrecao, enviarAguardandoClienteNeoCorrecao } = useNeoCorrecoesFinalizadas();
  const { neoInstalacoesAguardandoCliente, retornarParaFinalizadoNeoInstalacao } = useNeoInstalacoesAguardandoCliente();
  const { neoCorrecoesAguardandoCliente, retornarParaFinalizadoNeoCorrecao } = useNeoCorrecoesAguardandoCliente();
  const { 
    getResponsavel, 
    atribuirResponsavel, 
    removerResponsavel, 
    isAtribuindo 
  } = useEtapaResponsaveis();
  const etapaParaQuery = (etapaAtiva === 'arquivo_morto' || etapaAtiva === 'pendente_pedido') ? 'aberto' : etapaAtiva;
  const {
    pedidos,
    isLoading,
    moverParaProximaEtapa,
    retrocederEtapa,
    atualizarPrioridade,
    reorganizarPedidos,
    arquivarPedido,
    deletarPedido,
    finalizarDireto
  } = usePedidosEtapas(etapaParaQuery);
  const { updateOrdem } = useOrdensCarregamentoCalendario(new Date(), 'month');
  const { ordens: ordensUnificadas, concluirCarregamento } = useOrdensCarregamentoUnificadas();

  const handleDesarquivar = async (pedidoId: string) => {
    try {
      setDesarquivandoId(pedidoId);
      const { error } = await supabase
        .from('pedidos_producao')
        .update({ arquivado: false, data_arquivamento: null, arquivado_por: null })
        .eq('id', pedidoId);
      if (error) throw error;
      toast({ title: 'Pedido retornado para Finalizado' });
      queryClient.invalidateQueries({ queryKey: ['pedidos-arquivados'] });
      queryClient.invalidateQueries({ queryKey: ['pedidos-contadores'] });
      queryClient.invalidateQueries({ queryKey: ['pedidos-etapas'] });
    } catch (err) {
      console.error(err);
      toast({ variant: 'destructive', title: 'Erro ao desarquivar pedido' });
    } finally {
      setDesarquivandoId(null);
    }
  };

  const handleAgendarPedido = (pedidoId: string) => {
    setAgendarPedidoId(pedidoId);
    setAgendarData(new Date());
    setAgendarModalOpen(true);
  };

  const ordemPreSelecionada = useMemo(() => {
    if (!agendarPedidoId) return null;
    return ordensUnificadas.find(o => o.pedido_id === agendarPedidoId) || null;
  }, [agendarPedidoId, ordensUnificadas]);

  const handleEditarNeoInstalacao = (neo: NeoInstalacao) => {
    navigate(`/logistica/expedicao/editar-neo/${neo.id}?tipo=instalacao`);
  };

  const handleEditarNeoCorrecao = (neo: NeoCorrecao) => {
    navigate(`/logistica/expedicao/editar-neo/${neo.id}?tipo=correcao`);
  };

  const handleUpdateOrdem = async (params: { id: string; data: Partial<OrdemCarregamento>; fonte?: 'ordens_carregamento' | 'instalacoes' | 'correcoes' }) => {
    await updateOrdem(params);
  };

  const handleOrdemCriada = () => {
    queryClient.invalidateQueries({ queryKey: ['pedidos-etapas'] });
    queryClient.invalidateQueries({ queryKey: ['pedidos-contadores'] });
  };

  const handleMoverEtapa = async (pedidoId: string, skipCheckboxValidation?: boolean, onProgress?: (processoId: string, status: 'pending' | 'in_progress' | 'completed' | 'error') => void) => {
    await moverParaProximaEtapa.mutateAsync({
      pedidoId,
      skipCheckboxValidation: skipCheckboxValidation || false,
      onProgress
    });
  };

  const handleRetrocederEtapa = (pedidoId: string, etapaDestino: EtapaPedido, motivo: string) => {
    retrocederEtapa.mutate({
      pedidoId,
      etapaDestino,
      motivo
    });
  };

  const handleReorganizar = async (atualizacoes: { id: string; prioridade: number; }[]) => {
    await reorganizarPedidos.mutateAsync(atualizacoes);
  };

  const handleMoverPrioridade = async (pedidoId: string, direcao: DirecaoPrioridade) => {
    const index = pedidos.findIndex(p => p.id === pedidoId);
    if (index === -1) return;
    const pedidoAtual = pedidos[index];
    if (!('numero_pedido' in pedidoAtual)) return;
    
    let novaPrioridade: number;
    if (direcao === 'frente' && index > 0) {
      const anterior = pedidos[index - 1];
      novaPrioridade = ((anterior as any).prioridade_etapa || 0) + 1;
    } else if (direcao === 'tras' && index < pedidos.length - 1) {
      const proximo = pedidos[index + 1];
      novaPrioridade = ((proximo as any).prioridade_etapa || 0) - 1;
    } else {
      return;
    }
    await atualizarPrioridade.mutateAsync({ pedidoId, novaPrioridade });
  };

  const pedidosFiltrados = useMemo(() => {
    let filtered = pedidos;

    if (searchTerm.trim()) {
      const termo = searchTerm.toLowerCase().trim();
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
        return produtos.some((p: any) => {
          const corNome = p.cor?.nome || '';
          return corNome.toLowerCase().includes(corPintura.toLowerCase());
        });
      });
    }

    if (mostrarProntos) {
      filtered = filtered.filter((pedido: any) => {
        const etapaAtual = pedido.pedidos_etapas?.find((e: any) => e.etapa === etapaAtiva);
        if (!etapaAtual || !etapaAtual.checkboxes) return false;
        const checkboxes = etapaAtual.checkboxes as any[];
        return checkboxes.filter((cb: any) => cb.required).every((cb: any) => cb.checked === true);
      });
    }
    return filtered;
  }, [pedidos, searchTerm, tipoEntrega, corPintura, mostrarProntos, etapaAtiva]);

  const [vendasOrdemLocal, setVendasOrdemLocal] = useState<VendaPendentePedido[]>([]);

  // Sync local order when data changes
  useEffect(() => {
    if (vendasPendentePedido.length > 0 && vendasOrdemLocal.length === 0) {
      setVendasOrdemLocal(vendasPendentePedido);
    } else if (vendasPendentePedido.length > 0) {
      // Merge: keep local order, add new items, remove deleted
      const idSet = new Set(vendasPendentePedido.map(v => v.id));
      const existingIds = new Set(vendasOrdemLocal.map(v => v.id));
      const kept = vendasOrdemLocal.filter(v => idSet.has(v.id)).map(v => {
        const fresh = vendasPendentePedido.find(f => f.id === v.id);
        return fresh || v;
      });
      const newItems = vendasPendentePedido.filter(v => !existingIds.has(v.id));
      setVendasOrdemLocal([...kept, ...newItems]);
    }
  }, [vendasPendentePedido]);

  const vendasPendenteFiltradas = useMemo(() => {
    const base = vendasOrdemLocal.length > 0 ? vendasOrdemLocal : vendasPendentePedido;
    if (!searchTerm.trim()) return base;
    const termo = searchTerm.toLowerCase().trim();
    return base.filter(venda => {
      const nome = venda.cliente_nome?.toLowerCase() || '';
      const atendente = venda.atendente_nome?.toLowerCase() || '';
      return nome.includes(termo) || atendente.includes(termo);
    });
  }, [vendasOrdemLocal, vendasPendentePedido, searchTerm]);

  const vendasFaturamentoFiltradas = useMemo(() => {
    let filtered = vendasPendenteFaturamento;
    if (searchTerm.trim()) {
      const termo = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(venda => {
        const nome = venda.cliente_nome?.toLowerCase() || '';
        const atendente = venda.atendente_nome?.toLowerCase() || '';
        return nome.includes(termo) || atendente.includes(termo);
      });
    }
    if (tipoEntrega !== 'todos') {
      filtered = filtered.filter(venda => venda.tipo_entrega === tipoEntrega);
    }
    if (corPintura !== 'todas') {
      filtered = filtered.filter(venda => {
        return venda.cores?.some(c => c.nome.toLowerCase().includes(corPintura.toLowerCase()));
      });
    }
    return filtered;
  }, [vendasPendenteFaturamento, searchTerm, tipoEntrega, corPintura]);

  const handleReorganizarVendas = useCallback((novaOrdem: VendaPendentePedido[]) => {
    setVendasOrdemLocal(novaOrdem);
  }, []);

  const totalPortasEtapa = useMemo(() => {
    return pedidosFiltrados.reduce((total, pedido: any) => {
      const vendaData = Array.isArray(pedido.vendas) ? pedido.vendas[0] : pedido.vendas;
      const produtos = vendaData?.produtos_vendas || [];
      const portasEnrolar = produtos.filter((p: any) => p.tipo_produto === 'porta_enrolar');
      return total + portasEnrolar.reduce((sum: number, p: any) => sum + (p.quantidade || 1), 0);
    }, 0);
  }, [pedidosFiltrados]);


  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['pedidos-etapas'] });
    queryClient.invalidateQueries({ queryKey: ['pedidos-contadores'] });
    queryClient.invalidateQueries({ queryKey: ['vendas-pendente-pedido'] });
    queryClient.invalidateQueries({ queryKey: ['vendas-pendente-faturamento'] });
    queryClient.invalidateQueries({ queryKey: ['neo_instalacoes_listagem'] });
    queryClient.invalidateQueries({ queryKey: ['neo_correcoes_listagem'] });
    queryClient.invalidateQueries({ queryKey: ['neo_instalacoes_finalizadas'] });
    queryClient.invalidateQueries({ queryKey: ['neo_correcoes_finalizadas'] });
    queryClient.invalidateQueries({ queryKey: ['etapa-responsaveis'] });
    toast({ title: "Atualizado", description: "Lista de pedidos atualizada com sucesso" });
  };

  const handleAbrirModalResponsavel = (etapa: EtapaPedido) => {
    setEtapaParaAtribuir(etapa);
    setModalResponsavelAberto(true);
  };

  const handleAtribuirResponsavel = (userId: string) => {
    if (etapaParaAtribuir) {
      atribuirResponsavel({ etapa: etapaParaAtribuir, responsavelId: userId });
      setModalResponsavelAberto(false);
      setEtapaParaAtribuir(null);
    }
  };

  const handleRemoverResponsavel = () => {
    if (etapaParaAtribuir) {
      removerResponsavel(etapaParaAtribuir);
      setModalResponsavelAberto(false);
      setEtapaParaAtribuir(null);
    }
  };

  const handleConcluirNeoCorrecao = async (id: string) => {
    await concluirNeoCorrecao.mutateAsync(id);
  };

  const handleConcluirNeoInstalacao = async (id: string) => {
    await concluirNeoInstalacao(id);
  };

  const handleRetornarNeoInstalacao = async (id: string) => {
    await retornarNeoInstalacao(id);
    queryClient.invalidateQueries({ queryKey: ["neo_correcoes_listagem"] });
  };

  const handleRetornarNeoCorrecao = async (id: string) => {
    await retornarNeoCorrecao(id);
  };

  const handleArquivarNeoInstalacao = async (id: string) => {
    await arquivarNeoInstalacao(id);
  };

  const handleArquivarNeoCorrecao = async (id: string) => {
    await arquivarNeoCorrecao(id);
  };

  const handleUpdateValorNeoInstalacao = async (id: string, data: { valor_a_receber: number | null; valor_a_receber_texto: string }) => {
    const { error } = await supabase
      .from('neo_instalacoes')
      .update({ valor_a_receber: data.valor_a_receber, valor_a_receber_texto: data.valor_a_receber_texto } as any)
      .eq('id', id);
    if (error) {
      toast({ title: "Erro", description: "Não foi possível atualizar o valor", variant: "destructive" });
    } else {
      queryClient.invalidateQueries({ queryKey: ['neo_instalacoes_listagem'] });
      queryClient.invalidateQueries({ queryKey: ['neo_instalacoes_finalizadas'] });
    }
  };

  const handleUpdateValorNeoCorrecao = async (id: string, data: { valor_a_receber: number | null; valor_a_receber_texto: string }) => {
    const { error } = await supabase
      .from('neo_correcoes')
      .update({ valor_a_receber: data.valor_a_receber, valor_a_receber_texto: data.valor_a_receber_texto } as any)
      .eq('id', id);
    if (error) {
      toast({ title: "Erro", description: "Não foi possível atualizar o valor", variant: "destructive" });
    } else {
      queryClient.invalidateQueries({ queryKey: ['neo_correcoes_listagem'] });
      queryClient.invalidateQueries({ queryKey: ['neo_correcoes_finalizadas'] });
    }
  };

  const handleArquivar = async (pedidoId: string) => {
    await arquivarPedido.mutateAsync(pedidoId);
  };

  const handleFinalizarDireto = async (pedidoId: string) => {
    await finalizarDireto.mutateAsync(pedidoId);
  };

  const handleCarregarOrdem = async (pedidoId: string) => {
    const ordem = ordensUnificadas.find(o => o.pedido_id === pedidoId && !o.carregamento_concluido);
    if (!ordem) {
      toast({ title: "Ordem não encontrada", description: "Nenhuma ordem agendada disponível para carregar.", variant: "destructive" });
      return;
    }
    await concluirCarregamento({ ordem });
  };

  const handleDeletarPedido = async (pedidoId: string) => {
    await deletarPedido.mutateAsync(pedidoId);
  };

  const handleAvisoEspera = async (pedidoId: string, justificativa: string | null) => {
    const { error } = await supabase
      .from('pedidos_producao')
      .update({
        aviso_espera: justificativa,
        aviso_espera_data: justificativa ? new Date().toISOString() : null,
        prioridade_etapa: justificativa ? 0 : 1,
      })
      .eq('id', pedidoId);
    if (error) {
      toast({ title: "Erro", description: "Não foi possível salvar o aviso de espera", variant: "destructive" });
    } else {
      queryClient.invalidateQueries({ queryKey: ['pedidos-etapas'] });
      queryClient.invalidateQueries({ queryKey: ['pedidos-contadores'] });
    }
  };

  const handleEnviarAguardandoCliente = async (pedidoId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await enviarParaAguardandoCliente(supabase, pedidoId, user?.id || '');

      toast({ title: 'Pedido enviado para Aguardando Cliente' });
      queryClient.invalidateQueries({ queryKey: ['pedidos-etapas'] });
      queryClient.invalidateQueries({ queryKey: ['pedidos-contadores'] });
    } catch (err) {
      console.error(err);
      toast({ variant: 'destructive', title: 'Erro ao enviar para Aguardando Cliente' });
    }
  };

  const handleRetornarDeAguardandoCliente = async (pedidoId: string) => {
    const agora = new Date().toISOString();
    try {
      const { error: errUpdate } = await supabase
        .from('pedidos_producao')
        .update({ etapa_atual: 'finalizado' })
        .eq('id', pedidoId);
      if (errUpdate) throw errUpdate;

      // Fechar etapa aguardando_cliente preservando data_entrada
      const { error: errCloseAguardando } = await supabase
        .from('pedidos_etapas')
        .update({ data_saida: agora })
        .eq('pedido_id', pedidoId)
        .eq('etapa', 'aguardando_cliente');
      if (errCloseAguardando) throw errCloseAguardando;

      // Reabrir etapa finalizado
      const { error: errReopenFinalizado } = await supabase
        .from('pedidos_etapas')
        .upsert({
          pedido_id: pedidoId,
          etapa: 'finalizado',
          data_entrada: agora,
          data_saida: null,
          checkboxes: [],
        }, { onConflict: 'pedido_id,etapa' });
      if (errReopenFinalizado) throw errReopenFinalizado;

      // Registrar movimentação
      const { data: { user } } = await supabase.auth.getUser();
      const { error: errMov } = await supabase.from('pedidos_movimentacoes').insert({
        pedido_id: pedidoId,
        etapa_origem: 'aguardando_cliente',
        etapa_destino: 'finalizado',
        teor: 'avanco',
        user_id: user?.id || '',
        descricao: 'Pedido retornado de Aguardando Cliente para Finalizado',
      });
      if (errMov) throw errMov;

      toast({ title: 'Pedido retornado para Finalizado' });
      queryClient.invalidateQueries({ queryKey: ['pedidos-etapas'] });
      queryClient.invalidateQueries({ queryKey: ['pedidos-contadores'] });
    } catch (err) {
      console.error(err);
      toast({ variant: 'destructive', title: 'Erro ao retornar pedido' });
    }
  };

  const headerActions = (
    <div className="flex items-center gap-2">
      <Button 
        variant="outline" 
        onClick={() => setEtapaAtiva('aguardando_cliente' as EtapaPedido)} 
        size="sm" 
        className="bg-yellow-500/10 border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/20"
      >
        <Clock className="h-4 w-4 mr-2" />
        Aguardando Cliente
        {((contadores as any).aguardando_cliente || 0) > 0 && (
          <Badge variant="secondary" className="ml-1 bg-yellow-500/20 text-yellow-400 text-xs px-1.5 py-0">
            {(contadores as any).aguardando_cliente}
          </Badge>
        )}
      </Button>
      <Button variant="outline" onClick={handleRefresh} size="sm" className="bg-white/5 border-blue-500/10 text-white hover:bg-white/10">
        <RefreshCw className="h-4 w-4" />
      </Button>
    </div>
  );

  if (isMobile) {
    return <GestaoFabricaMobile />;
  }

  return (
    <MinimalistLayout 
      title="Gestão de Fábrica" 
      subtitle="Acompanhe o progresso dos pedidos"
      backPath="/direcao"
      breadcrumbItems={[
        { label: "Home", path: "/home" },
        { label: "Direção", path: "/direcao" },
        { label: "Gestão de Fábrica" }
      ]}
      headerActions={headerActions}
      fullWidth
    >
      {/* Portas por Etapa (Hoje) */}
      <div className="mb-6">
        <PortasPorEtapa />
      </div>

      {/* Tabs de Etapas */}
      <Tabs value={etapaAtiva} onValueChange={v => setEtapaAtiva(v as EtapaPedido | 'arquivo_morto' | 'pendente_pedido')}>
        {/* Seletor mobile */}
        <div className="md:hidden mb-4">
          <Select value={etapaAtiva} onValueChange={v => setEtapaAtiva(v as EtapaPedido | 'arquivo_morto' | 'pendente_pedido')}>
            <SelectTrigger className="w-full h-12 bg-white/5 border-blue-500/10 text-white">
              <SelectValue>
                {(() => {
                  if (etapaAtiva === 'pendente_pedido') {
                    return (
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5" />
                        <span className="font-medium">Pend. Faturamento</span>
                        <Badge variant="secondary" className="ml-auto bg-blue-500/20 text-blue-400">
                          {vendasPendenteFaturamento.length}
                        </Badge>
                      </div>
                    );
                  }
                  if (etapaAtiva === 'arquivo_morto') {
                    return (
                      <div className="flex items-center gap-2">
                        <Archive className="h-5 w-5" />
                        <span className="font-medium">Arquivo Morto</span>
                        <Badge variant="secondary" className="ml-auto bg-emerald-500/20 text-emerald-400">
                          {pedidosArquivados.length}
                        </Badge>
                      </div>
                    );
                  }
                  const config = ETAPAS_CONFIG[etapaAtiva];
                  const count = contadores[etapaAtiva] || 0;
                  const IconComponent = ETAPA_ICONS[etapaAtiva];
                  return (
                    <div className="flex items-center gap-2">
                      <IconComponent className="h-5 w-5" />
                      <span className="font-medium">{config.label}</span>
                      <Badge variant="secondary" className="ml-auto bg-blue-500/10">
                        {count}
                      </Badge>
                    </div>
                  );
                })()}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-blue-500/10">
              <SelectItem value="pendente_pedido" className="text-white cursor-pointer">
                <div className="flex items-center gap-2 w-full">
                  <DollarSign className="h-4 w-4 flex-shrink-0 text-blue-400" />
                  <span className="flex-1 text-blue-400">Pend. Faturamento</span>
                  <Badge variant="secondary" className="text-xs bg-blue-500/20 text-blue-400">
                    {vendasPendenteFaturamento.length}
                  </Badge>
                </div>
              </SelectItem>
              {ORDEM_ETAPAS.map(etapa => {
                const config = ETAPAS_CONFIG[etapa];
                const count = contadores[etapa] || 0;
                const IconComponent = ETAPA_ICONS[etapa];
                return (
                  <SelectItem key={etapa} value={etapa} className="text-white cursor-pointer">
                    <div className="flex items-center gap-2 w-full">
                      <IconComponent className="h-4 w-4 flex-shrink-0" />
                      <span className="flex-1">{config.label}</span>
                      <Badge variant="secondary" className="text-xs bg-blue-500/10">
                        {count}
                      </Badge>
                    </div>
                  </SelectItem>
                );
              })}
              <SelectItem value="arquivo_morto" className="text-white cursor-pointer">
                <div className="flex items-center gap-2 w-full">
                  <Archive className="h-4 w-4 flex-shrink-0 text-emerald-400" />
                  <span className="flex-1 text-emerald-400">Arquivo Morto</span>
                  <Badge variant="secondary" className="text-xs bg-emerald-500/20 text-emerald-400">
                    {pedidosArquivados.length}
                  </Badge>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tabs - Desktop */}
        <TabsList className="hidden md:flex w-full justify-start overflow-x-auto flex-nowrap h-auto p-1 gap-2 bg-white/5 border border-blue-500/10">
          <TooltipProvider>
            {/* Grupo Azul: Pré-Produção */}
            <div className="flex gap-1 border-2 border-blue-500/50 rounded-lg p-1">
              <TabsTrigger 
                value="pendente_pedido" 
                className="flex-shrink-0 px-2 xs:px-3 py-2 gap-1 xs:gap-1.5 sm:gap-2 text-white/60 data-[state=active]:bg-blue-500/10 data-[state=active]:text-white"
              >
                {(() => {
                  const resp = getResponsavel('pendente_pedido' as any);
                  return resp ? (
                    <Avatar className="h-5 w-5 flex-shrink-0">
                      <AvatarImage src={resp.foto_perfil_url || undefined} />
                      <AvatarFallback className="text-[8px] bg-blue-500/20 text-blue-400 border border-blue-500/50">
                        {resp.nome.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <DollarSign className="h-4 w-4 flex-shrink-0" />
                  );
                })()}
                <span className="text-xs">Pend. Faturamento</span>
                <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded-full text-xs font-semibold">
                  {vendasPendenteFaturamento.length}
                </span>
              </TabsTrigger>
              {(['aprovacao_diretor'] as const).map(etapa => {
                const config = ETAPAS_CONFIG[etapa];
                const count = contadores[etapa] || 0;
                const IconComponent = ETAPA_ICONS[etapa];
                const responsavel = getResponsavel(etapa);
                return (
                  <TabsTrigger 
                    key={etapa} 
                    value={etapa} 
                    className="flex-shrink-0 px-2 xs:px-3 py-2 gap-1 xs:gap-1.5 sm:gap-2 text-white/60 data-[state=active]:bg-blue-500/10 data-[state=active]:text-white"
                  >
                    {responsavel ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Avatar className="h-5 w-5 border border-blue-500/30">
                            <AvatarImage src={responsavel.foto_perfil_url || undefined} />
                            <AvatarFallback className="text-[10px] bg-blue-500/20">
                              {responsavel.nome.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Responsável: {responsavel.nome}</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <IconComponent className="h-4 w-4 flex-shrink-0" />
                    )}
                    <span className="text-xs">{config.label}</span>
                    <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded-full text-xs font-semibold">
                      {count + vendasPendentePedido.length}
                    </span>
                  </TabsTrigger>
                );
              })}
            </div>

            {/* Grupo Vermelho: Produção */}
            <div className="flex gap-1 border-2 border-red-500/50 rounded-lg p-1">
              {(['aberto', 'aprovacao_ceo', 'em_producao', 'inspecao_qualidade', 'aguardando_pintura', 'embalagem'] as const).map(etapa => {
                const config = ETAPAS_CONFIG[etapa];
                const count = contadores[etapa] || 0;
                const IconComponent = ETAPA_ICONS[etapa];
                const responsavel = getResponsavel(etapa);
                return (
                  <TabsTrigger 
                    key={etapa} 
                    value={etapa} 
                    className="flex-shrink-0 px-2 xs:px-3 py-2 gap-1 xs:gap-1.5 sm:gap-2 text-white/60 data-[state=active]:bg-blue-500/10 data-[state=active]:text-white"
                  >
                    {responsavel ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Avatar className="h-5 w-5 border border-blue-500/30">
                            <AvatarImage src={responsavel.foto_perfil_url || undefined} />
                            <AvatarFallback className="text-[10px] bg-blue-500/20">
                              {responsavel.nome.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Responsável: {responsavel.nome}</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <IconComponent className="h-4 w-4 flex-shrink-0" />
                    )}
                    <span className="text-xs">{config.label}</span>
                    <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded-full text-xs font-semibold">
                      {count}
                    </span>
                  </TabsTrigger>
                );
              })}
            </div>

            {/* Grupo Amarelo: Expedição */}
            <div className="flex gap-1 border-2 border-yellow-500/50 rounded-lg p-1">
              {(['aguardando_coleta', 'instalacoes', 'correcoes'] as const).map(etapa => {
                const config = ETAPAS_CONFIG[etapa];
                const count = contadores[etapa] || 0;
                const IconComponent = ETAPA_ICONS[etapa];
                const responsavel = getResponsavel(etapa);
                return (
                  <TabsTrigger 
                    key={etapa} 
                    value={etapa} 
                    className="flex-shrink-0 px-2 xs:px-3 py-2 gap-1 xs:gap-1.5 sm:gap-2 text-white/60 data-[state=active]:bg-blue-500/10 data-[state=active]:text-white"
                  >
                    {responsavel ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Avatar className="h-5 w-5 border border-blue-500/30">
                            <AvatarImage src={responsavel.foto_perfil_url || undefined} />
                            <AvatarFallback className="text-[10px] bg-blue-500/20">
                              {responsavel.nome.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Responsável: {responsavel.nome}</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <IconComponent className="h-4 w-4 flex-shrink-0" />
                    )}
                    <span className="text-xs">{config.label}</span>
                    <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded-full text-xs font-semibold">
                      {count}
                    </span>
                  </TabsTrigger>
                );
              })}
            </div>

            {/* Grupo Verde: Finalizados */}
            <div className="flex gap-1 border-2 border-green-500/50 rounded-lg p-1">
              {(['finalizado'] as const).map(etapa => {
                const config = ETAPAS_CONFIG[etapa];
                const count = contadores[etapa] || 0;
                const IconComponent = ETAPA_ICONS[etapa];
                const responsavel = getResponsavel(etapa);
                return (
                  <TabsTrigger 
                    key={etapa} 
                    value={etapa} 
                    className="flex-shrink-0 px-2 xs:px-3 py-2 gap-1 xs:gap-1.5 sm:gap-2 text-white/60 data-[state=active]:bg-blue-500/10 data-[state=active]:text-white"
                  >
                    {responsavel ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Avatar className="h-5 w-5 border border-blue-500/30">
                            <AvatarImage src={responsavel.foto_perfil_url || undefined} />
                            <AvatarFallback className="text-[10px] bg-blue-500/20">
                              {responsavel.nome.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Responsável: {responsavel.nome}</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <IconComponent className="h-4 w-4 flex-shrink-0" />
                    )}
                    <span className="text-xs">{config.label}</span>
                    <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded-full text-xs font-semibold">
                      {count}
                    </span>
                  </TabsTrigger>
                );
              })}
              <TabsTrigger 
                value="arquivo_morto" 
                className="flex-shrink-0 px-2 xs:px-3 py-2 gap-1 xs:gap-1.5 sm:gap-2 text-emerald-400/60 data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-400"
              >
                <Archive className="h-4 w-4 flex-shrink-0" />
                <span className="text-xs">Arquivo Morto</span>
              </TabsTrigger>
            </div>
          </TooltipProvider>
        </TabsList>

        {/* Aba Pendente Faturamento - vendas NÃO faturadas */}
        <TabsContent value="pendente_pedido" className="mt-4">
          <Card className="bg-white/5 border-blue-500/10 backdrop-blur-xl w-full max-w-none">
            <CardHeader className="pb-3 px-4 py-4">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                <CardTitle className="text-lg flex items-center gap-2 text-white">
                  <DollarSign className="h-5 w-5 text-yellow-400" />
                  <span>Vendas Pendentes de Faturamento</span>
                  <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400">
                    {vendasFaturamentoFiltradas.length}
                  </Badge>
                </CardTitle>
                <PedidosFiltrosMinimalista 
                  searchTerm={searchTerm} 
                  onSearchChange={setSearchTerm} 
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
              {isLoadingFaturamento ? (
                <div className="text-center py-8 text-white/50">Carregando...</div>
              ) : vendasFaturamentoFiltradas.length === 0 ? (
                <div className="text-center py-8 text-white/50">
                  {searchTerm || tipoEntrega !== 'todos' || corPintura !== 'todas' 
                    ? 'Nenhuma venda encontrada com os filtros aplicados' 
                    : 'Todas as vendas estão faturadas'}
                </div>
              ) : (
                <VendasPendenteDraggableList
                  vendas={vendasFaturamentoFiltradas}
                  onReorganizar={handleReorganizarVendas}
                  mode="faturamento"
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {ORDEM_ETAPAS.map(etapa => (
          <TabsContent key={etapa} value={etapa} className="mt-4">
            <Card className="bg-white/5 border-blue-500/10 backdrop-blur-xl w-full max-w-none">
              <CardHeader className="pb-3 px-4 py-4">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                  <CardTitle className="text-lg flex items-center gap-3 text-white">
                    {/* Responsável da Etapa - destaque antes do título */}
                    {(() => {
                      const responsavel = getResponsavel(etapa);
                      return responsavel ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => handleAbrirModalResponsavel(etapa)}
                                className="rounded-full ring-2 ring-blue-500/40 hover:ring-blue-500/70 transition-all"
                              >
                                <Avatar style={{ width: 50, height: 50 }}>
                                  <AvatarImage src={responsavel.foto_perfil_url || undefined} />
                                  <AvatarFallback className="text-base bg-blue-500/20">
                                    {responsavel.nome.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">Responsável: {responsavel.nome}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => handleAbrirModalResponsavel(etapa)}
                                style={{ width: 50, height: 50 }}
                                className="rounded-full flex items-center justify-center bg-white/5 border border-dashed border-white/20 text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                              >
                                <UserPlus className="h-5 w-5" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">Atribuir responsável</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      );
                    })()}
                    <span>{ETAPAS_CONFIG[etapa].label}</span>
                    <span className="text-sm font-normal text-white/60">
                      {pedidosFiltrados.length} {pedidosFiltrados.length === 1 ? 'pedido' : 'pedidos'}
                    </span>
                    <div className="flex items-center gap-2 ml-4">
                      {(etapaAtiva === 'instalacoes' || etapaAtiva === 'aguardando_coleta') && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (etapaAtiva === 'instalacoes') {
                                    setShowCalendarioInstalacoesModal(true);
                                  } else {
                                    setShowCalendarioModal(true);
                                  }
                                }}
                                className="h-7 px-2 text-white/70 hover:text-white hover:bg-white/10"
                              >
                                <CalendarDays className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">
                                {etapaAtiva === 'instalacoes' ? 'Ver calendário de instalações' : 'Ver calendário de expedição'}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleGerarListaCompras(etapa)}
                              disabled={gerandoListaEtapa === etapa}
                              className="h-7 px-2 text-white/70 hover:text-white hover:bg-white/10 gap-1"
                            >
                              <ShoppingCart className="h-4 w-4" />
                              <span className="text-xs">
                                {gerandoListaEtapa === etapa ? 'Gerando...' : 'Lista de material'}
                              </span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">Gerar PDF com materiais necessários desta etapa</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </CardTitle>
                  
                  <div className="flex items-center justify-end w-full lg:w-auto">
                    <PedidosSelecaoBar
                      selecionadosCount={selecionados.size}
                      totalFiltrados={pedidosFiltrados.length}
                      onSelecionarTodos={() => setSelecionados(new Set(pedidosFiltrados.map((p: any) => p.id)))}
                      onLimpar={limparSelecao}
                      onGerarLista={handleGerarListaSelecao}
                      onImprimir={handleImprimirSelecao}
                      isGerandoLista={gerandoListaSelecao}
                      isImprimindo={imprimindoSelecao}
                    />
                  </div>
                </div>
              </CardHeader>
              <div className="px-4 py-3 border-t border-white/5">
                <PedidosFiltrosMinimalista
                  searchTerm={searchTerm}
                  onSearchChange={setSearchTerm}
                  tipoEntrega={tipoEntrega}
                  onTipoEntregaChange={setTipoEntrega}
                  corPintura={corPintura}
                  onCorPinturaChange={setCorPintura}
                  mostrarProntos={mostrarProntos}
                  onMostrarProntosToggle={() => setMostrarProntos(!mostrarProntos)}
                />
              </div>
              <CardContent className="px-4 py-4">
                {/* Vendas faturadas aguardando criação de pedido - apenas na aba aprovacao_diretor */}
                {etapaAtiva === 'aprovacao_diretor' && vendasPendentePedido.length > 0 && (
                  <div className="mb-6">
                    <VendasPendenteDraggableList
                      vendas={vendasPendenteFiltradas}
                      onReorganizar={handleReorganizarVendas}
                    />
                  </div>
                )}

                {isLoading ? (
                  <div className="text-center py-8 text-white/60">
                    Carregando...
                  </div>
                ) : pedidosFiltrados.length === 0 && !(etapaAtiva === 'aprovacao_diretor' && vendasPendentePedido.length > 0) && !(etapaAtiva === 'instalacoes' && neoInstalacoes.length > 0) && !(etapaAtiva === 'correcoes' && neoCorrecoes.length > 0) && !(etapaAtiva === 'finalizado' && (neoInstalacoesFinalizadas.length > 0 || neoCorrecoesFinalizadas.length > 0)) ? (
                  <div className="text-center py-8 text-white/60">
                    {searchTerm ? 'Nenhum pedido encontrado' : 'Nenhum pedido nesta etapa'}
                  </div>
                ) : (
                  <>
                    
                    <PedidosDraggableList
                      pedidos={pedidosFiltrados}
                      pedidosParaTotais={pedidosFiltrados}
                      etapa={etapa} 
                      isAberto={etapa === 'aberto'} 
                      viewMode={viewMode} 
                      onMoverEtapa={handleMoverEtapa} 
                      onRetrocederEtapa={handleRetrocederEtapa} 
                      onReorganizar={handleReorganizar} 
                      onMoverPrioridade={handleMoverPrioridade}
                      onArquivar={handleArquivar}
                      onDeletar={handleDeletarPedido}
                      onAgendar={['aguardando_coleta','instalacoes','correcoes'].includes(etapa) ? handleAgendarPedido : undefined}
                      hideOrdensStatus={['aguardando_coleta','instalacoes','correcoes','finalizado'].includes(etapa)}
                      onFinalizarDireto={etapa !== 'finalizado' && !['aguardando_coleta','instalacoes','correcoes'].includes(etapa) ? handleFinalizarDireto : undefined}
                      onCarregarOrdem={['aguardando_coleta','instalacoes','correcoes'].includes(etapa) ? handleCarregarOrdem : undefined}
                      onEnviarAguardandoCliente={etapa === 'finalizado' ? handleEnviarAguardandoCliente : undefined}
                      showPosicao={true}
                      onAvisoEspera={handleAvisoEspera}
                      enableDragAndDrop={true}
                      selectionEnabled={true}
                      selecionados={selecionados}
                      onToggleSelecionado={toggleSelecionado}
                    />

                    {/* Neo Finalizados - após os pedidos */}
                    {etapaAtiva === 'finalizado' && (neoInstalacoesFinalizadas.length > 0 || neoCorrecoesFinalizadas.length > 0) && (
                      <div className="mt-4 space-y-2">
                        <h3 className="text-sm font-medium text-white/70 mb-2 flex items-center gap-2">
                          <span>Serviços Avulsos Finalizados</span>
                          <span className="text-emerald-400">({neoInstalacoesFinalizadas.length + neoCorrecoesFinalizadas.length})</span>
                          <span className="text-xs text-white/40 ml-auto">últimos 30 dias</span>
                        </h3>
                        <div className="space-y-1">
                          {neoInstalacoesFinalizadas
                            .sort((a, b) => {
                              const dateA = a.concluida_em ? new Date(a.concluida_em).getTime() : 0;
                              const dateB = b.concluida_em ? new Date(b.concluida_em).getTime() : 0;
                              return dateB - dateA;
                            })
                            .map((neo) => (
                              <NeoInstalacaoCardGestao
                                key={neo.id}
                                neoInstalacao={neo}
                                viewMode="list"
                                onConcluir={handleConcluirNeoInstalacao}
                                isConcluindo={isConcluindo}
                                showConcluido
                                onRetornar={handleRetornarNeoInstalacao}
                                onArquivar={handleArquivarNeoInstalacao}
                                onEnviarAguardandoCliente={(id) => enviarAguardandoClienteNeoInstalacao(id)}
                              />
                            ))}
                          {neoCorrecoesFinalizadas
                            .sort((a, b) => {
                              const dateA = a.concluida_em ? new Date(a.concluida_em).getTime() : 0;
                              const dateB = b.concluida_em ? new Date(b.concluida_em).getTime() : 0;
                              return dateB - dateA;
                            })
                            .map((neo) => (
                              <NeoCorrecaoCardGestao
                                key={neo.id}
                                neoCorrecao={neo}
                                viewMode="list"
                                onConcluir={handleConcluirNeoCorrecao}
                                showConcluido
                                onRetornar={handleRetornarNeoCorrecao}
                                onArquivar={handleArquivarNeoCorrecao}
                                onEnviarAguardandoCliente={(id) => enviarAguardandoClienteNeoCorrecao(id)}
                              />
                            ))}
                        </div>
                      </div>
                    )}

                    {etapaAtiva === 'instalacoes' && neoInstalacoes.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <h3 className="text-sm font-medium text-white/70 mb-2">Instalações Avulsas ({neoInstalacoes.length})</h3>
                        <NeoInstalacoesDraggableList
                          neos={neoInstalacoes}
                          viewMode={viewMode}
                          onConcluir={handleConcluirNeoInstalacao}
                          isConcluindo={isConcluindo}
                          onAgendar={(id) => {
                            setAgendarData(new Date());
                            setAgendarModalOpen(true);
                          }}
                          onEditar={handleEditarNeoInstalacao}
                          onUpdateValor={handleUpdateValorNeoInstalacao}
                          onReorganizar={reorganizarNeoInstalacoes}
                        />
                      </div>
                    )}

                    {/* Neo Correções - abaixo dos pedidos normais */}
                    {etapaAtiva === 'correcoes' && neoCorrecoes.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <h3 className="text-sm font-medium text-white/70 mb-2">Correções Avulsas ({neoCorrecoes.length})</h3>
                        <NeoCorrecoesDraggableList
                          neos={neoCorrecoes}
                          viewMode={viewMode}
                          onConcluir={handleConcluirNeoCorrecao}
                          onAgendar={(id) => {
                            setAgendarData(new Date());
                            setAgendarModalOpen(true);
                          }}
                          onEditar={handleEditarNeoCorrecao}
                          onUpdateValor={handleUpdateValorNeoCorrecao}
                          onReorganizar={reorganizarNeoCorrecoes}
                        />
                      </div>
                    )}
                    
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}

        {/* Tab Content - Aguardando Cliente */}
        <TabsContent value="aguardando_cliente" className="mt-4">
          <Card className="bg-white/5 border-blue-500/10 backdrop-blur-xl w-full max-w-none">
            <CardHeader className="pb-3 px-4 py-4">
              <CardTitle className="text-lg flex items-center gap-2 text-white">
                <Clock className="h-5 w-5 text-yellow-400" />
                <span>Aguardando Cliente</span>
                <span className="text-sm font-normal text-white/60">
                  {pedidosFiltrados.length + neoInstalacoesAguardandoCliente.length + neoCorrecoesAguardandoCliente.length} {(pedidosFiltrados.length + neoInstalacoesAguardandoCliente.length + neoCorrecoesAguardandoCliente.length) === 1 ? 'item' : 'itens'}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 py-4">
              {isLoading ? (
                <div className="text-center py-8 text-white/60">Carregando...</div>
              ) : (pedidosFiltrados.length === 0 && neoInstalacoesAguardandoCliente.length === 0 && neoCorrecoesAguardandoCliente.length === 0) ? (
                <div className="text-center py-8 text-white/60">Nenhum item aguardando cliente</div>
              ) : (
                <>
                  {pedidosFiltrados.length > 0 && (
                    <PedidosDraggableList
                      pedidos={pedidosFiltrados}
                      pedidosParaTotais={pedidosFiltrados}
                      etapa={'aguardando_cliente' as EtapaPedido}
                      isAberto={false}
                      viewMode={viewMode}
                      onDevolverParaFinalizado={async (pedidoId) => { await handleRetornarDeAguardandoCliente(pedidoId); }}
                      onReorganizar={handleReorganizar}
                      onMoverPrioridade={handleMoverPrioridade}
                      onArquivar={handleArquivar}
                      showPosicao={true}
                      enableDragAndDrop={true}
                      hideOrdensStatus={true}
                    />
                  )}
                  {(neoInstalacoesAguardandoCliente.length > 0 || neoCorrecoesAguardandoCliente.length > 0) && (
                    <div className="mt-4 space-y-2">
                      <h3 className="text-sm font-medium text-white/70 mb-2 flex items-center gap-2">
                        <span>Serviços Avulsos Aguardando Cliente</span>
                        <span className="text-yellow-400">({neoInstalacoesAguardandoCliente.length + neoCorrecoesAguardandoCliente.length})</span>
                      </h3>
                      <div className="space-y-1">
                        {neoInstalacoesAguardandoCliente.map((neo) => (
                          <NeoInstalacaoCardGestao
                            key={neo.id}
                            neoInstalacao={neo}
                            viewMode="list"
                            showAguardandoCliente
                            onRetornarParaFinalizado={(id) => retornarParaFinalizadoNeoInstalacao(id)}
                            onArquivar={handleArquivarNeoInstalacao}
                          />
                        ))}
                        {neoCorrecoesAguardandoCliente.map((neo) => (
                          <NeoCorrecaoCardGestao
                            key={neo.id}
                            neoCorrecao={neo}
                            viewMode="list"
                            showAguardandoCliente
                            onRetornarParaFinalizado={(id) => retornarParaFinalizadoNeoCorrecao(id)}
                            onArquivar={handleArquivarNeoCorrecao}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Content - Arquivo Morto */}
        <TabsContent value="arquivo_morto" className="mt-4">
          <Card className="bg-white/5 border-blue-500/10 backdrop-blur-xl w-full max-w-none">
            <CardHeader className="pb-3 px-4 py-4">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <CardTitle className="text-lg flex items-center gap-2 text-white">
                    <Archive className="h-5 w-5 text-emerald-400" />
                    <span>Arquivo Morto</span>
                    <span className="text-sm font-normal text-white/60">
                      {pedidosArquivados.length} pedido{pedidosArquivados.length !== 1 ? 's' : ''}
                    </span>
                  </CardTitle>
                  <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nº ou cliente..."
                      value={arquivoSearch}
                      onChange={(e) => setArquivoSearch(e.target.value)}
                      className="pl-10 bg-white/5 border-blue-500/10 text-foreground placeholder:text-muted-foreground"
                    />
                  </div>
                </div>
                {/* Filtro de datas */}
                <div className="flex flex-wrap items-center gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "h-9 justify-start text-left font-normal text-sm bg-white/5 border-blue-500/10",
                          !arquivoDataInicio && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                        {arquivoDataInicio ? format(arquivoDataInicio, "dd/MM/yyyy", { locale: ptBR }) : "De"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={arquivoDataInicio}
                        onSelect={setArquivoDataInicio}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "h-9 justify-start text-left font-normal text-sm bg-white/5 border-blue-500/10",
                          !arquivoDataFim && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                        {arquivoDataFim ? format(arquivoDataFim, "dd/MM/yyyy", { locale: ptBR }) : "Até"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={arquivoDataFim}
                        onSelect={setArquivoDataFim}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                  {(arquivoDataInicio || arquivoDataFim) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 text-muted-foreground hover:text-foreground"
                      onClick={() => { setArquivoDataInicio(undefined); setArquivoDataFim(undefined); }}
                    >
                      Limpar datas
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4 py-4">
              {isLoadingArquivados ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
                </div>
              ) : pedidosArquivados.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Archive className="w-12 h-12 mb-3 opacity-50" />
                  <p className="text-sm">
                    {arquivoSearch ? 'Nenhum pedido encontrado' : 'Nenhum pedido arquivado'}
                  </p>
                </div>
              ) : (
                (() => {
                  const instalacoes = pedidosArquivados.filter(p => p.tipo_entrega === 'instalacao');
                  const manutencoes = pedidosArquivados.filter(p => p.tipo_entrega === 'manutencao');
                  const entregas = pedidosArquivados.filter(p => p.tipo_entrega !== 'instalacao' && p.tipo_entrega !== 'manutencao');

                  const renderColumn = (title: string, icon: React.ReactNode, items: typeof pedidosArquivados, colorClass: string) => (
                    <div className="flex-1 min-w-0">
                      <div className={`flex items-center gap-2 mb-3 pb-2 border-b border-blue-500/10`}>
                        {icon}
                        <span className={`font-semibold text-sm ${colorClass}`}>{title}</span>
                        <Badge variant="outline" className={`text-xs ${colorClass} border-current/30`}>
                          {items.length}
                        </Badge>
                      </div>
                      {items.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-4">Nenhum pedido</p>
                      ) : (
                        <div className="space-y-1.5">
                          {items.map((pedido) => {
                            // Get size labels for portas
                            const getSizeLabel = (tamanho: string) => {
                              const t = tamanho?.toUpperCase();
                              if (t?.includes('GG') || t === '3.0' || t === '3.00' || parseFloat(tamanho) >= 3) return 'GG';
                              if (t?.includes('G') || t === '2.5' || t === '2.50' || (parseFloat(tamanho) >= 2 && parseFloat(tamanho) < 3)) return 'G';
                              return 'P';
                            };

                            const portas = pedido.produtos || [];
                            const sizes = portas.map(p => getSizeLabel(p.tamanho));
                            const uniqueColors = portas
                              .filter(p => p.cor_hex)
                              .reduce((acc, p) => {
                                if (!acc.find(c => c.hex === p.cor_hex)) {
                                  acc.push({ hex: p.cor_hex!, nome: p.cor_nome || '' });
                                }
                                return acc;
                              }, [] as { hex: string; nome: string }[]);

                            const responsavel = pedido.responsavel_instalacao_nome || pedido.responsavel_entrega_nome;
                            const tipoResponsavel = pedido.responsavel_instalacao_nome
                              ? (pedido.tipo_instalacao === 'autorizados' ? 'Aut.' : '')
                              : '';

                            return (
                              <div
                                key={pedido.id}
                                className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-white/5 border border-blue-500/10 hover:bg-white/10 transition-colors cursor-pointer"
                                style={{ maxHeight: '50px' }}
                                onClick={() => navigate(`/fabrica/montagem-pedidos/${pedido.id}`)}
                              >
                                {/* Client name - main highlight */}
                                <span className="text-xs font-semibold text-foreground truncate min-w-0 flex-1">
                                  {pedido.cliente_nome}
                                </span>

                                {/* Size badges */}
                                {sizes.length > 0 && (
                                  <div className="flex items-center gap-0.5 flex-shrink-0">
                                    {sizes.map((size, i) => (
                                      <span
                                        key={i}
                                        className={`text-[9px] font-bold px-1 py-0.5 rounded ${
                                          size === 'GG' ? 'bg-red-500/20 text-red-300' :
                                          size === 'G' ? 'bg-amber-500/20 text-amber-300' :
                                          'bg-blue-500/20 text-blue-300'
                                        }`}
                                      >
                                        {size}
                                      </span>
                                    ))}
                                  </div>
                                )}

                                {/* Color dots */}
                                {uniqueColors.length > 0 && (
                                  <div className="flex items-center gap-0.5 flex-shrink-0">
                                    {uniqueColors.map((cor, i) => (
                                      <Tooltip key={i}>
                                        <TooltipTrigger asChild>
                                          <div
                                            className="w-3 h-3 rounded-full border border-white/20"
                                            style={{ backgroundColor: cor.hex }}
                                          />
                                        </TooltipTrigger>
                                        <TooltipContent>{cor.nome}</TooltipContent>
                                      </Tooltip>
                                    ))}
                                  </div>
                                )}

                                {/* Responsible */}
                                {responsavel && (
                                  <span className="text-[10px] text-muted-foreground truncate max-w-[80px] flex-shrink-0">
                                    {tipoResponsavel ? `${tipoResponsavel} ` : ''}{responsavel.split(' ')[0]}
                                  </span>
                                )}

                                {/* Date */}
                                <span className="text-[10px] text-muted-foreground flex-shrink-0">
                                  {pedido.data_arquivamento
                                    ? (() => { try { return format(new Date(pedido.data_arquivamento), "dd/MM", { locale: ptBR }); } catch { return "-"; } })()
                                    : "-"}
                                </span>

                                {/* Unarchive button */}
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300 flex-shrink-0"
                                      disabled={desarquivandoId === pedido.id}
                                      onClick={(e) => { e.stopPropagation(); handleDesarquivar(pedido.id); }}
                                    >
                                      {desarquivandoId === pedido.id ? (
                                        <RefreshCw className="w-3 h-3 animate-spin" />
                                      ) : (
                                        <Undo2 className="w-3 h-3" />
                                      )}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Retornar para Finalizado</TooltipContent>
                                </Tooltip>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {renderColumn("Instalações", <Wrench className="h-4 w-4 text-blue-400" />, instalacoes, "text-blue-400")}
                      {renderColumn("Manutenções", <Settings className="h-4 w-4 text-amber-400" />, manutencoes, "text-amber-400")}
                      {renderColumn("Entregas", <Truck className="h-4 w-4 text-emerald-400" />, entregas, "text-emerald-400")}
                    </div>
                  );
                })()
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Legenda dos limites de tempo por etapa */}
      <Collapsible className="mt-6">
        <CollapsibleTrigger className="w-full p-4 rounded-lg bg-white/5 border border-blue-500/10 flex items-center justify-between cursor-pointer hover:bg-white/10 transition-colors">
          <h3 className="text-sm font-semibold text-foreground">Legenda — Limites de tempo por etapa</h3>
          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent className="px-4 pb-4 rounded-b-lg bg-white/5 border border-t-0 border-blue-500/10">
          <div className="pt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5"><Clock className="h-3 w-3" /> Pedidos em Aberto</span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-red-500/10 text-red-500 border-red-500/30 font-mono">{'>'} 6h</Badge>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5"><ShieldCheck className="h-3 w-3" /> Aprovação CEO</span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-red-500/10 text-red-500 border-red-500/30 font-mono">{'>'} 6h</Badge>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5"><Factory className="h-3 w-3" /> Em Produção</span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-red-500/10 text-red-500 border-red-500/30 font-mono">{'>'} 4 dias</Badge>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5"><ClipboardCheck className="h-3 w-3" /> Inspeção de Qualidade</span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-red-500/10 text-red-500 border-red-500/30 font-mono">{'>'} 3h</Badge>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5"><Paintbrush className="h-3 w-3" /> Aguardando Pintura</span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-red-500/10 text-red-500 border-red-500/30 font-mono">{'>'} 4 dias</Badge>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5"><Package className="h-3 w-3" /> Embalagem</span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-red-500/10 text-red-500 border-red-500/30 font-mono">{'>'} 3h</Badge>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5"><Package className="h-3 w-3" /> Expedição Coleta</span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-red-500/10 text-red-500 border-red-500/30 font-mono">{'>'} 48 dias</Badge>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5"><HardHat className="h-3 w-3" /> Instalações</span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-red-500/10 text-red-500 border-red-500/30 font-mono">{'>'} 3 dias</Badge>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5"><AlertTriangle className="h-3 w-3" /> Correções</span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-red-500/10 text-red-500 border-red-500/30 font-mono">{'>'} 3 dias</Badge>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-blue-500/10">
            <h4 className="text-xs font-semibold text-foreground mb-2">Tempo total do pedido (dias corridos)</h4>
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-red-500/10 text-red-500 border-red-500/30 font-mono">{'>'} 25 dias</Badge>
                <span>Pedidos sem porta de enrolar</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-red-500/10 text-red-500 border-red-500/30 font-mono">{'>'} 30 dias</Badge>
                <span>Pedidos com porta de enrolar</span>
              </div>
            </div>
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground/60">* Horário comercial: 07:00 às 17:00, seg-sex. Tempo total usa dias corridos.</p>
        </CollapsibleContent>
      </Collapsible>


      {/* Modal para atribuir responsável */}
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

      <CalendarioExpedicaoModal
        open={showCalendarioModal}
        onOpenChange={setShowCalendarioModal}
      />

      <SelecionarPedidoInstalacaoModal
        open={showCalendarioInstalacoesModal}
        onOpenChange={setShowCalendarioInstalacoesModal}
        dataSelecionada={new Date()}
        onPedidoSelecionado={() => {
          queryClient.invalidateQueries({ queryKey: ['pedidos-etapas'] });
          queryClient.invalidateQueries({ queryKey: ['pedidos-contadores'] });
        }}
      />

      {/* Modal para agendar no calendário */}
      <AdicionarOrdemCalendarioModal
        open={agendarModalOpen}
        onOpenChange={(open) => {
          setAgendarModalOpen(open);
          if (!open) setAgendarPedidoId(null);
        }}
        dataSelecionada={agendarData}
        ordemPreSelecionada={ordemPreSelecionada}
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

    </MinimalistLayout>
  );
}
