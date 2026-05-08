import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";
import { Package, RefreshCw, Factory, CheckCircle, Paintbrush, Truck, HardHat, AlertTriangle, CheckCircle2, ShieldCheck, Archive, Clock, ClipboardCheck, Wrench } from "lucide-react";
import type { EtapaPedido } from "@/types/pedidoEtapa";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { usePedidosEtapas } from "@/hooks/usePedidosEtapas";
import { PedidoCard } from "@/components/pedidos/PedidoCard";
import { MinimalistLayout } from "@/components/MinimalistLayout";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis } from "@/components/ui/pagination";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PedidosFiltrosMinimalista } from "@/components/pedidos/PedidosFiltrosMinimalista";

import { supabase } from "@/integrations/supabase/client";
import { usePedidosArquivados } from "@/hooks/usePedidosArquivados";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";


const ITEMS_PER_PAGE = 25;

interface EtapaConfig {
  id: EtapaPedido;
  label: string;
  shortLabel: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

const ETAPAS_CONFIG: EtapaConfig[] = [
  { 
    id: 'aberto', 
    label: 'Pedidos em Aberto', 
    shortLabel: 'Aberto',
    icon: Package, 
    color: 'text-blue-400', 
    bgColor: 'bg-blue-500/20' 
  },
  { 
    id: 'aprovacao_ceo' as EtapaPedido, 
    label: 'Aprovação CEO', 
    shortLabel: 'Aprovação',
    icon: ShieldCheck, 
    color: 'text-orange-400', 
    bgColor: 'bg-orange-500/20' 
  },
  { 
    id: 'em_producao', 
    label: 'Em Produção', 
    shortLabel: 'Produção',
    icon: Factory, 
    color: 'text-orange-400', 
    bgColor: 'bg-orange-500/20' 
  },
  { 
    id: 'inspecao_qualidade', 
    label: 'Inspeção de Qualidade', 
    shortLabel: 'Qualidade',
    icon: CheckCircle, 
    color: 'text-purple-400', 
    bgColor: 'bg-purple-500/20' 
  },
  { 
    id: 'aguardando_pintura', 
    label: 'Aguardando Pintura', 
    shortLabel: 'Pintura',
    icon: Paintbrush, 
    color: 'text-pink-400', 
    bgColor: 'bg-pink-500/20' 
  },
  { 
    id: 'embalagem', 
    label: 'Embalagem', 
    shortLabel: 'Embalagem',
    icon: Package, 
    color: 'text-cyan-400', 
    bgColor: 'bg-cyan-500/20' 
  },
  { 
    id: 'aguardando_coleta', 
    label: 'Expedição Coleta', 
    shortLabel: 'Coleta',
    icon: Truck, 
    color: 'text-yellow-400', 
    bgColor: 'bg-yellow-500/20' 
  },
  { 
    id: 'instalacoes', 
    label: 'Instalações', 
    shortLabel: 'Instalações',
    icon: HardHat, 
    color: 'text-teal-400', 
    bgColor: 'bg-teal-500/20' 
  },
  { 
    id: 'correcoes', 
    label: 'Correções', 
    shortLabel: 'Correções',
    icon: AlertTriangle, 
    color: 'text-red-400', 
    bgColor: 'bg-red-500/20' 
  },
  { 
    id: 'finalizado', 
    label: 'Finalizados', 
    shortLabel: 'Finalizado',
    icon: CheckCircle2, 
    color: 'text-green-400', 
    bgColor: 'bg-green-500/20' 
  },
];

export default function PedidosAdminMinimalista() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [tipoEntrega, setTipoEntrega] = useState<string>("todos");
  const [activeTab, setActiveTab] = useState<string>("aberto");
  const [currentPages, setCurrentPages] = useState<Record<string, number>>({});
  const [arquivoPage, setArquivoPage] = useState(1);
  // Hooks para cada etapa
  const { 
    pedidos: pedidosAberto, 
    isLoading: isLoadingAberto,
    moverParaProximaEtapa,
    retrocederEtapa,
    deletarPedido
  } = usePedidosEtapas("aberto");
  const { pedidos: pedidosAprovacao, isLoading: isLoadingAprovacao } = usePedidosEtapas("aprovacao_ceo");
  const { pedidos: pedidosProducao, isLoading: isLoadingProducao } = usePedidosEtapas("em_producao");
  const { pedidos: pedidosQualidade, isLoading: isLoadingQualidade } = usePedidosEtapas("inspecao_qualidade");
  const { pedidos: pedidosPintura, isLoading: isLoadingPintura } = usePedidosEtapas("aguardando_pintura");
  const { pedidos: pedidosEmbalagem, isLoading: isLoadingEmbalagem } = usePedidosEtapas("embalagem");
  const { pedidos: pedidosColeta, isLoading: isLoadingColeta } = usePedidosEtapas("aguardando_coleta");
  const { pedidos: pedidosInstalacoes, isLoading: isLoadingInstalacoes } = usePedidosEtapas("instalacoes");
  const { pedidos: pedidosCorrecoes, isLoading: isLoadingCorrecoes } = usePedidosEtapas("correcoes");
  const { pedidos: pedidosFinalizados, isLoading: isLoadingFinalizados } = usePedidosEtapas("finalizado");

  // Arquivo morto
  const { data: pedidosArquivados = [], isLoading: isLoadingArquivados } = usePedidosArquivados(
    activeTab === 'arquivo_morto' ? searchTerm : ''
  );

  // Mapeamento de pedidos e loading por etapa
  const pedidosPorEtapa: Record<string, any[]> = {
    aberto: pedidosAberto,
    aprovacao_ceo: pedidosAprovacao,
    em_producao: pedidosProducao,
    inspecao_qualidade: pedidosQualidade,
    aguardando_pintura: pedidosPintura,
    embalagem: pedidosEmbalagem,
    aguardando_coleta: pedidosColeta,
    instalacoes: pedidosInstalacoes,
    correcoes: pedidosCorrecoes,
    finalizado: pedidosFinalizados,
  };

  const loadingPorEtapa: Record<string, boolean> = {
    aberto: isLoadingAberto,
    aprovacao_ceo: isLoadingAprovacao,
    em_producao: isLoadingProducao,
    inspecao_qualidade: isLoadingQualidade,
    aguardando_pintura: isLoadingPintura,
    embalagem: isLoadingEmbalagem,
    aguardando_coleta: isLoadingColeta,
    instalacoes: isLoadingInstalacoes,
    correcoes: isLoadingCorrecoes,
    finalizado: isLoadingFinalizados,
  };

  // Handler para avançar etapa
  const handleMoverEtapa = async (
    pedidoId: string, 
    skipCheckboxValidation?: boolean,
    onProgress?: (processoId: string, status: 'pending' | 'in_progress' | 'completed' | 'error') => void
  ) => {
    try {
      await moverParaProximaEtapa.mutateAsync({ 
        pedidoId, 
        skipCheckboxValidation,
        onProgress 
      });
      toast({
        title: "Sucesso",
        description: "Pedido avançado com sucesso",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao avançar pedido",
        variant: "destructive"
      });
    }
  };

  // Handler para retroceder etapa
  const handleRetrocederEtapa = async (
    pedidoId: string, 
    etapaDestino: EtapaPedido, 
    motivo: string
  ) => {
    try {
      await retrocederEtapa.mutateAsync({ pedidoId, etapaDestino, motivo });
      toast({
        title: "Sucesso", 
        description: "Pedido retrocedido com sucesso",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao retroceder pedido",
        variant: "destructive"
      });
    }
  };

  // Handler para excluir pedido
  const handleDeletarPedido = async (pedidoId: string) => {
    try {
      await deletarPedido.mutateAsync(pedidoId);
      toast({
        title: "Sucesso",
        description: "Pedido excluído com sucesso",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir pedido",
        variant: "destructive"
      });
    }
  };


  // Filtrar pedidos por etapa
  const filtrarPedidos = (pedidos: any[]) => {
    let filtrados = pedidos;

    if (searchTerm.trim()) {
      const termo = searchTerm.toLowerCase();
      filtrados = filtrados.filter(
        (p) =>
          p.numero_pedido?.toLowerCase().includes(termo) ||
          p.vendas?.cliente_nome?.toLowerCase().includes(termo)
      );
    }

    if (tipoEntrega !== "todos") {
      filtrados = filtrados.filter((p) => p.vendas?.tipo_entrega === tipoEntrega);
    }

    return filtrados;
  };

  // Calcular total de portas
  const calcularTotalPortas = (pedidos: any[]) => {
    return pedidos.reduce((total, pedido) => {
      const produtos = (pedido.vendas as any)?.produtos_vendas as any[] | undefined;
      if (!produtos) return total;
      
      const portasEnrolar = produtos.filter((p: any) => 
        p.categoria_produto === "porta_enrolar" || p.tipo_produto === "porta_enrolar"
      );
      
      return total + portasEnrolar.reduce((sum: number, p: any) => sum + (p.quantidade || 1), 0);
    }, 0);
  };

  // Pedidos filtrados por etapa
  const pedidosFiltradosPorEtapa = useMemo(() => {
    const resultado: Record<string, any[]> = {};
    for (const etapa of ETAPAS_CONFIG) {
      resultado[etapa.id] = filtrarPedidos(pedidosPorEtapa[etapa.id] || []);
    }
    return resultado;
  }, [pedidosPorEtapa, searchTerm, tipoEntrega]);

  // Gerar páginas para paginação
  const getPageNumbers = (currentPage: number, totalPages: number) => {
    const pages: (number | 'ellipsis')[] = [];
    
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      
      if (currentPage > 3) {
        pages.push('ellipsis');
      }
      
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (currentPage < totalPages - 2) {
        pages.push('ellipsis');
      }
      
      pages.push(totalPages);
    }
    
    return pages;
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["pedidos-etapas"] });
    toast({
      title: "Atualizado",
      description: "Dados atualizados com sucesso",
    });
  };

  // Contar total de pedidos ativos (excluindo finalizados)
  const totalPedidosAtivos = ETAPAS_CONFIG
    .filter(e => e.id !== 'finalizado')
    .reduce((sum, etapa) => sum + (pedidosFiltradosPorEtapa[etapa.id]?.length || 0), 0);

  // Renderizar conteúdo de uma etapa
  const renderEtapaContent = (etapaConfig: EtapaConfig) => {
    const pedidosFiltrados = pedidosFiltradosPorEtapa[etapaConfig.id] || [];
    const isLoading = loadingPorEtapa[etapaConfig.id];
    const currentPage = currentPages[etapaConfig.id] || 1;
    const totalPages = Math.ceil(pedidosFiltrados.length / ITEMS_PER_PAGE);
    const pedidosPaginados = pedidosFiltrados.slice(
      (currentPage - 1) * ITEMS_PER_PAGE,
      currentPage * ITEMS_PER_PAGE
    );
    const totalPortas = calcularTotalPortas(pedidosFiltrados);
    const Icon = etapaConfig.icon;

    return (
      <Card className="bg-white/5 border-blue-500/10 backdrop-blur-xl w-full max-w-none">
        <CardHeader className="pb-3 px-4 py-4">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <CardTitle className="text-lg flex items-center gap-2 text-white">
              <Icon className={`w-5 h-5 ${etapaConfig.color}`} />
              <span>{etapaConfig.label}</span>
              <span className="text-sm font-normal text-white/60">
                {pedidosFiltrados.length} {pedidosFiltrados.length === 1 ? 'pedido' : 'pedidos'}
              </span>
              {totalPortas > 0 && (
                <Badge variant="secondary" className="text-xs ml-2 bg-blue-500/10 text-white">
                  🚪 {totalPortas} {totalPortas === 1 ? 'porta' : 'portas'}
                </Badge>
              )}
            </CardTitle>
            <PedidosFiltrosMinimalista
              searchTerm={searchTerm}
              onSearchChange={(v) => { setSearchTerm(v); setCurrentPages({}); }}
              tipoEntrega={tipoEntrega}
              onTipoEntregaChange={(v) => { setTipoEntrega(v); setCurrentPages({}); }}
              corPintura="todas"
              onCorPinturaChange={() => {}}
              mostrarProntos={false}
              onMostrarProntosToggle={() => {}}
            />
          </div>
        </CardHeader>
        <CardContent className="px-4 py-4">
          {isLoading ? (
            <div className="text-center py-8 text-white/60">Carregando...</div>
          ) : pedidosPaginados.length === 0 ? (
            <div className="text-center py-8 text-white/60">
              {searchTerm ? 'Nenhum pedido encontrado' : 'Nenhum pedido nesta etapa'}
            </div>
          ) : (
            <div className="space-y-2">
              {pedidosPaginados.map((pedido) => (
                <PedidoCard
                  key={pedido.id}
                  pedido={pedido}
                  isAberto={etapaConfig.id === 'aberto'}
                  viewMode="list"
                  readOnly={etapaConfig.id !== 'aberto' && etapaConfig.id !== 'aprovacao_ceo'}
                  onMoverEtapa={handleMoverEtapa}
                  onRetrocederEtapa={handleRetrocederEtapa}
                  onDeletar={etapaConfig.id === 'aberto' || etapaConfig.id === 'aprovacao_ceo' ? handleDeletarPedido : undefined}
                  
                />
              ))}
            </div>
          )}

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="mt-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setCurrentPages(prev => ({
                        ...prev,
                        [etapaConfig.id]: Math.max(1, currentPage - 1)
                      }))}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  
                  {getPageNumbers(currentPage, totalPages).map((page, index) => (
                    <PaginationItem key={index}>
                      {page === 'ellipsis' ? (
                        <PaginationEllipsis />
                      ) : (
                        <PaginationLink
                          onClick={() => setCurrentPages(prev => ({
                            ...prev,
                            [etapaConfig.id]: page as number
                          }))}
                          isActive={currentPage === page}
                          className="cursor-pointer"
                        >
                          {page}
                        </PaginationLink>
                      )}
                    </PaginationItem>
                  ))}
                  
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setCurrentPages(prev => ({
                        ...prev,
                        [etapaConfig.id]: Math.min(totalPages, currentPage + 1)
                      }))}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <MinimalistLayout 
      title="Pedidos" 
      subtitle={`${totalPedidosAtivos} pedidos ativos`}
      backPath="/fabrica"
      fullWidth
      breadcrumbItems={[
        { label: "Home", path: "/home" },
        { label: "Fábrica", path: "/fabrica" },
        { label: "Pedidos" }
      ]}
      headerActions={
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="p-2 rounded-lg bg-white/5 border border-blue-500/10 hover:bg-white/10 transition-all"
            title="Atualizar"
          >
            <RefreshCw className="w-4 h-4 text-white/70" />
          </button>
        </div>
      }
    >
      {/* Tabs para alternar entre etapas - estilo Gestão de Fábrica */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Seletor mobile */}
        <div className="md:hidden mb-4">
          <Select value={activeTab} onValueChange={setActiveTab}>
            <SelectTrigger className="w-full h-12 bg-white/5 border-blue-500/10 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-blue-500/10">
              {ETAPAS_CONFIG.map((etapa) => {
                const Icon = etapa.icon;
                const count = pedidosFiltradosPorEtapa[etapa.id]?.length || 0;
                return (
                  <SelectItem key={etapa.id} value={etapa.id} className="text-white cursor-pointer">
                    <div className="flex items-center gap-2 w-full">
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      <span className="flex-1">{etapa.label}</span>
                      <Badge variant="secondary" className="text-xs bg-blue-500/10">{count}</Badge>
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

        {/* Tabs - Desktop com grupos coloridos */}
        <TabsList className="hidden md:flex w-full justify-start overflow-x-auto flex-nowrap h-auto p-1 gap-2 bg-white/5 border border-blue-500/10">
          {/* Grupo Vermelho: Produção */}
          <div className="flex gap-1 border-2 border-red-500/50 rounded-lg p-1">
            {(['aberto', 'aprovacao_ceo', 'em_producao', 'inspecao_qualidade', 'aguardando_pintura', 'embalagem'] as const).map((etapaId) => {
              const etapa = ETAPAS_CONFIG.find(e => e.id === etapaId);
              if (!etapa) return null;
              const Icon = etapa.icon;
              const count = pedidosFiltradosPorEtapa[etapa.id]?.length || 0;
              return (
                <TabsTrigger
                  key={etapa.id}
                  value={etapa.id}
                  className="flex-shrink-0 px-2 xs:px-3 py-2 gap-1 xs:gap-1.5 sm:gap-2 text-white/60 data-[state=active]:bg-blue-500/10 data-[state=active]:text-white"
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span className="text-xs">{etapa.shortLabel}</span>
                  <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded-full text-xs font-semibold">
                    {count}
                  </span>
                </TabsTrigger>
              );
            })}
          </div>

          {/* Grupo Amarelo: Expedição */}
          <div className="flex gap-1 border-2 border-yellow-500/50 rounded-lg p-1">
            {(['aguardando_coleta', 'instalacoes', 'correcoes'] as const).map((etapaId) => {
              const etapa = ETAPAS_CONFIG.find(e => e.id === etapaId);
              if (!etapa) return null;
              const Icon = etapa.icon;
              const count = pedidosFiltradosPorEtapa[etapa.id]?.length || 0;
              return (
                <TabsTrigger
                  key={etapa.id}
                  value={etapa.id}
                  className="flex-shrink-0 px-2 xs:px-3 py-2 gap-1 xs:gap-1.5 sm:gap-2 text-white/60 data-[state=active]:bg-blue-500/10 data-[state=active]:text-white"
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span className="text-xs">{etapa.shortLabel}</span>
                  <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded-full text-xs font-semibold">
                    {count}
                  </span>
                </TabsTrigger>
              );
            })}
          </div>

          {/* Grupo Verde: Finalizados */}
          <div className="flex gap-1 border-2 border-green-500/50 rounded-lg p-1">
            {(['finalizado'] as const).map((etapaId) => {
              const etapa = ETAPAS_CONFIG.find(e => e.id === etapaId);
              if (!etapa) return null;
              const Icon = etapa.icon;
              const count = pedidosFiltradosPorEtapa[etapa.id]?.length || 0;
              return (
                <TabsTrigger
                  key={etapa.id}
                  value={etapa.id}
                  className="flex-shrink-0 px-2 xs:px-3 py-2 gap-1 xs:gap-1.5 sm:gap-2 text-white/60 data-[state=active]:bg-blue-500/10 data-[state=active]:text-white"
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span className="text-xs">{etapa.shortLabel}</span>
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
              <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-semibold">
                {pedidosArquivados.length}
              </span>
            </TabsTrigger>
          </div>
        </TabsList>

        {/* Conteúdo de cada tab */}
        {ETAPAS_CONFIG.map((etapa) => (
          <TabsContent key={etapa.id} value={etapa.id} className="mt-4">
            {renderEtapaContent(etapa)}
          </TabsContent>
        ))}

        {/* Arquivo Morto Tab Content */}
        <TabsContent value="arquivo_morto" className="mt-4">
          <Card className="bg-white/5 border-blue-500/10 backdrop-blur-xl w-full max-w-none">
            <CardHeader className="pb-3 px-4 py-4">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                <CardTitle className="text-lg flex items-center gap-2 text-white">
                  <Archive className="w-5 h-5 text-emerald-400" />
                  <span>Arquivo Morto</span>
                  <span className="text-sm font-normal text-white/60">
                    {pedidosArquivados.length} {pedidosArquivados.length === 1 ? 'pedido' : 'pedidos'}
                  </span>
                </CardTitle>
                <PedidosFiltrosMinimalista
                  searchTerm={searchTerm}
                  onSearchChange={(v) => { setSearchTerm(v); setArquivoPage(1); }}
                  tipoEntrega={tipoEntrega}
                  onTipoEntregaChange={setTipoEntrega}
                  corPintura="todas"
                  onCorPinturaChange={() => {}}
                  mostrarProntos={false}
                  onMostrarProntosToggle={() => {}}
                />
              </div>
            </CardHeader>
            <CardContent className="px-4 py-4">
              {isLoadingArquivados ? (
                <div className="text-center py-8 text-white/60">Carregando...</div>
              ) : pedidosArquivados.length === 0 ? (
                <div className="text-center py-8 text-white/60">Nenhum pedido arquivado</div>
              ) : (
                <div className="space-y-1">
                  {pedidosArquivados
                    .slice((arquivoPage - 1) * ITEMS_PER_PAGE, arquivoPage * ITEMS_PER_PAGE)
                    .map((pedido) => (
                    <div
                      key={pedido.id}
                      onClick={() => navigate(`/fabrica/montagem-pedidos/${pedido.id}`)}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5 border border-blue-500/10 hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      <span className="text-xs font-mono text-emerald-400 flex-shrink-0">
                        #{pedido.numero_pedido}
                      </span>
                      <span className="text-sm font-medium text-white truncate flex-1">
                        {pedido.cliente_nome}
                      </span>
                      {pedido.valor_venda && (
                        <span className="text-xs text-emerald-400 flex-shrink-0">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pedido.valor_venda)}
                        </span>
                      )}
                      <span className="text-xs text-white/50 flex-shrink-0">
                        {pedido.data_arquivamento
                          ? (() => { try { return format(new Date(pedido.data_arquivamento), "dd/MM/yyyy", { locale: ptBR }); } catch { return "-"; } })()
                          : "-"}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Paginação */}
              {Math.ceil(pedidosArquivados.length / ITEMS_PER_PAGE) > 1 && (
                <div className="mt-4">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => setArquivoPage(p => Math.max(1, p - 1))}
                          className={arquivoPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                      {getPageNumbers(arquivoPage, Math.ceil(pedidosArquivados.length / ITEMS_PER_PAGE)).map((page, index) => (
                        <PaginationItem key={index}>
                          {page === 'ellipsis' ? (
                            <PaginationEllipsis />
                          ) : (
                            <PaginationLink
                              onClick={() => setArquivoPage(page as number)}
                              isActive={arquivoPage === page}
                              className="cursor-pointer"
                            >
                              {page}
                            </PaginationLink>
                          )}
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext
                          onClick={() => setArquivoPage(p => Math.min(Math.ceil(pedidosArquivados.length / ITEMS_PER_PAGE), p + 1))}
                          className={arquivoPage === Math.ceil(pedidosArquivados.length / ITEMS_PER_PAGE) ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

    </MinimalistLayout>
  );
}
