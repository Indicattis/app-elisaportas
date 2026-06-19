import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, RefreshCw, Factory, Clock, ClipboardCheck, Paintbrush, Wrench, CheckCircle2, ArrowLeft, LogOut, HardHat, AlertTriangle, ShieldCheck, Headset } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { usePedidosEtapas, usePedidosContadores } from "@/hooks/usePedidosEtapas";
import { PedidosDraggableList } from "@/components/pedidos/PedidosDraggableList";
import { PedidosFiltrosMinimalista } from "@/components/pedidos/PedidosFiltrosMinimalista";
import { PortasPorEtapa } from "@/components/producao/dashboard/PortasPorEtapa";
import { ORDEM_ETAPAS, ETAPAS_CONFIG } from "@/types/pedidoEtapa";
import type { EtapaPedido, DirecaoPrioridade } from "@/types/pedidoEtapa";
import { useState, useMemo, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis } from "@/components/ui/pagination";

// Mapa de ícones para cada etapa
const ETAPA_ICONS: Record<EtapaPedido, React.ComponentType<{ className?: string }>> = {
  aprovacao_diretor: ShieldCheck,
  aberto: Clock,
  aprovacao_ceo: ShieldCheck,
  em_producao: Factory,
  inspecao_qualidade: ClipboardCheck,
  aguardando_pintura: Paintbrush,
  embalagem: Package,
  aguardando_coleta: Package,
  instalacoes: HardHat,
  correcoes: AlertTriangle,
  finalizado: CheckCircle2,
  pos_vendas: Headset,
  aguardando_cliente: Clock
};
export default function PedidosStandalone() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {
    toast
  } = useToast();
  const {
    signOut,
    userRole
  } = useAuth();
  const [etapaAtiva, setEtapaAtiva] = useState<EtapaPedido>('aberto');
  const [searchTerm, setSearchTerm] = useState('');
  const viewMode = 'list';
  const [tipoEntrega, setTipoEntrega] = useState('todos');
  const [corPintura, setCorPintura] = useState('todas');
  const [mostrarProntos, setMostrarProntos] = useState(false);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const ITENS_POR_PAGINA = 25;
  const contadores = usePedidosContadores();
  const {
    pedidos,
    isLoading,
    moverParaProximaEtapa,
    retrocederEtapa,
    atualizarPrioridade,
    reorganizarPedidos,
    arquivarPedido
  } = usePedidosEtapas(etapaAtiva);
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
  const handleReorganizar = async (atualizacoes: {
    id: string;
    prioridade: number;
  }[]) => {
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
    await atualizarPrioridade.mutateAsync({
      pedidoId,
      novaPrioridade
    });
  };
  const pedidosFiltrados = useMemo(() => {
    let filtered = pedidos;
    if (searchTerm.trim()) {
      const termo = searchTerm.toLowerCase();
      filtered = filtered.filter((pedido: any) => {
        const vendaData = Array.isArray(pedido.vendas) ? pedido.vendas[0] : pedido.vendas;
        const clienteNome = vendaData?.cliente_nome?.toLowerCase() || '';
        return clienteNome.includes(termo);
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
  useEffect(() => {
    setPaginaAtual(1);
  }, [searchTerm, tipoEntrega, corPintura, mostrarProntos, etapaAtiva]);
  const totalPaginas = Math.ceil(pedidosFiltrados.length / ITENS_POR_PAGINA);
  const indiceInicio = (paginaAtual - 1) * ITENS_POR_PAGINA;
  const indiceFim = indiceInicio + ITENS_POR_PAGINA;
  const pedidosPaginados = pedidosFiltrados.slice(indiceInicio, indiceFim);
  const handleRefresh = () => {
    queryClient.invalidateQueries({
      queryKey: ['pedidos-etapas']
    });
    queryClient.invalidateQueries({
      queryKey: ['pedidos-contadores']
    });
    toast({
      title: "Atualizado",
      description: "Lista de pedidos atualizada com sucesso"
    });
  };
  const handleArquivar = async (pedidoId: string) => {
    await arquivarPedido.mutateAsync(pedidoId);
  };
  return <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/producao')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              <span className="font-semibold hidden sm:block">Gestão de Pedidos</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {userRole && <span className="text-sm text-muted-foreground hidden sm:block">
                {userRole.nome}
              </span>}
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto py-2 px-[5px] sm:py-6 sm:px-4 space-y-3 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Package className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Gestão de Pedidos</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Acompanhe o progresso dos pedidos por etapa
              </p>
            </div>
          </div>

          
        </div>

        {/* Portas por Etapa (Hoje) */}
        <PortasPorEtapa />

        {/* Tabs de Etapas */}
        <Tabs value={etapaAtiva} onValueChange={v => setEtapaAtiva(v as EtapaPedido)}>
          {/* Seletor mobile */}
          <div className="md:hidden mb-4">
            <Select value={etapaAtiva} onValueChange={v => setEtapaAtiva(v as EtapaPedido)}>
              <SelectTrigger className="w-full h-12">
                <SelectValue>
                  {(() => {
                  const config = ETAPAS_CONFIG[etapaAtiva];
                  const count = contadores[etapaAtiva] || 0;
                  const IconComponent = ETAPA_ICONS[etapaAtiva];
                  return <div className="flex items-center gap-2">
                        <IconComponent className="h-5 w-5" />
                        <span className="font-medium">{config.label}</span>
                        <Badge variant="secondary" className="ml-auto">
                          {count}
                        </Badge>
                      </div>;
                })()}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {ORDEM_ETAPAS.map(etapa => {
                const config = ETAPAS_CONFIG[etapa];
                const count = contadores[etapa] || 0;
                const IconComponent = ETAPA_ICONS[etapa];
                return <SelectItem key={etapa} value={etapa} className="cursor-pointer">
                      <div className="flex items-center gap-2 w-full">
                        <IconComponent className="h-4 w-4 flex-shrink-0" />
                        <span className="flex-1">{config.label}</span>
                        <Badge variant="secondary" className="text-xs">
                          {count}
                        </Badge>
                      </div>
                    </SelectItem>;
              })}
              </SelectContent>
            </Select>
          </div>

          {/* Tabs - Desktop */}
          <TabsList className="hidden md:flex w-full justify-start overflow-x-auto flex-nowrap h-auto p-1 gap-1 scrollbar-hide">
            {ORDEM_ETAPAS.map(etapa => {
            const config = ETAPAS_CONFIG[etapa];
            const count = contadores[etapa] || 0;
            const IconComponent = ETAPA_ICONS[etapa];
            return <TabsTrigger key={etapa} value={etapa} className="flex-shrink-0 px-2 xs:px-3 py-2 gap-1 xs:gap-1.5 sm:gap-2">
                  <IconComponent className="h-4 w-4 flex-shrink-0" />
                  <span className="text-xs">{config.label}</span>
                  <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-semibold">
                    {count}
                  </span>
                </TabsTrigger>;
          })}
          </TabsList>

          {ORDEM_ETAPAS.map(etapa => <TabsContent key={etapa} value={etapa} className="mt-3 sm:mt-6">
              <Card>
                <CardHeader className="pb-3 px-[5px] py-2 sm:px-6 sm:pb-4 sm:py-6">
                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <span>{ETAPAS_CONFIG[etapa].label}</span>
                      <span className="text-sm font-normal text-muted-foreground">
                        {pedidosFiltrados.length} {pedidosFiltrados.length === 1 ? 'pedido' : 'pedidos'}
                        {totalPaginas > 1 && ` (Página ${paginaAtual} de ${totalPaginas})`}
                      </span>
                    </CardTitle>
                    
                    <PedidosFiltrosMinimalista searchTerm={searchTerm} onSearchChange={setSearchTerm} tipoEntrega={tipoEntrega} onTipoEntregaChange={setTipoEntrega} corPintura={corPintura} onCorPinturaChange={setCorPintura} mostrarProntos={mostrarProntos} onMostrarProntosToggle={() => setMostrarProntos(!mostrarProntos)} />
                  </div>
                </CardHeader>
                <CardContent className="px-[5px] py-2 sm:px-6 sm:py-6">
                  {isLoading ? <div className="text-center py-8 text-muted-foreground">
                      Carregando...
                    </div> : pedidosFiltrados.length === 0 ? <div className="text-center py-8 text-muted-foreground">
                      {searchTerm ? 'Nenhum pedido encontrado' : 'Nenhum pedido nesta etapa'}
                    </div> : <>
                      <PedidosDraggableList pedidos={pedidosPaginados} etapa={etapa} isAberto={etapa === 'aberto'} viewMode={viewMode} onMoverEtapa={handleMoverEtapa} onRetrocederEtapa={handleRetrocederEtapa} onReorganizar={handleReorganizar} onMoverPrioridade={handleMoverPrioridade} onArquivar={handleArquivar} />
                      
                      {totalPaginas > 1 && <div className="mt-6 flex justify-center">
                          <Pagination>
                            <PaginationContent>
                              <PaginationItem>
                                <PaginationPrevious onClick={() => setPaginaAtual(prev => Math.max(1, prev - 1))} className={paginaAtual === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'} />
                              </PaginationItem>
                              
                              {Array.from({
                        length: totalPaginas
                      }, (_, i) => i + 1).map(pagina => {
                        const mostrarPagina = pagina === 1 || pagina === totalPaginas || pagina >= paginaAtual - 1 && pagina <= paginaAtual + 1;
                        const mostrarEllipsisAntes = pagina === paginaAtual - 2 && paginaAtual > 3;
                        const mostrarEllipsisDepois = pagina === paginaAtual + 2 && paginaAtual < totalPaginas - 2;
                        if (mostrarEllipsisAntes || mostrarEllipsisDepois) {
                          return <PaginationItem key={pagina}>
                                      <PaginationEllipsis />
                                    </PaginationItem>;
                        }
                        if (!mostrarPagina) return null;
                        return <PaginationItem key={pagina}>
                                    <PaginationLink onClick={() => setPaginaAtual(pagina)} isActive={paginaAtual === pagina} className="cursor-pointer">
                                      {pagina}
                                    </PaginationLink>
                                  </PaginationItem>;
                      })}
                              
                              <PaginationItem>
                                <PaginationNext onClick={() => setPaginaAtual(prev => Math.min(totalPaginas, prev + 1))} className={paginaAtual === totalPaginas ? 'pointer-events-none opacity-50' : 'cursor-pointer'} />
                              </PaginationItem>
                            </PaginationContent>
                          </Pagination>
                        </div>}
                    </>}
                </CardContent>
              </Card>
            </TabsContent>)}
        </Tabs>
      </main>
    </div>;
}