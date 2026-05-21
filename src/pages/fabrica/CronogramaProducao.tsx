import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCw, Filter, X } from "lucide-react";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { AnimatedBreadcrumb } from "@/components/AnimatedBreadcrumb";
import { DelayedParticles } from "@/components/DelayedParticles";
import { ColunaOrdensProducao } from "@/components/cronograma/ColunaOrdensProducao";
import { CronogramaSidebar } from "@/components/cronograma/CronogramaSidebar";
import { OrdemLinhasSheet } from "@/components/fabrica/OrdemLinhasSheet";
import { useOrdensProducaoPrioridade, TipoOrdemProducao, OrdemProducaoSimples } from "@/hooks/useOrdensProducaoPrioridade";
import type { OrdemStatus, TipoOrdem } from "@/hooks/useOrdensPorPedido";

const COLUNAS: { tipo: TipoOrdemProducao; titulo: string; cor: string }[] = [
  { tipo: 'perfiladeira', titulo: 'Perfiladeira', cor: 'blue' },
  { tipo: 'soldagem', titulo: 'Solda', cor: 'orange' },
  { tipo: 'separacao', titulo: 'Separação', cor: 'purple' },
  { tipo: 'qualidade', titulo: 'Qualidade', cor: 'emerald' },
  { tipo: 'pintura', titulo: 'Pintura', cor: 'pink' },
];

export default function CronogramaProducao() {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  
  // Estado para controlar a sidebar esquerda (pedidos)
  const [sidebarAberta, setSidebarAberta] = useState(true);
  const [pedidoFiltrado, setPedidoFiltrado] = useState<string | null>(null);
  const [clienteFiltrado, setClienteFiltrado] = useState<string | null>(null);
  
  // Estado para controlar a sidebar de detalhes (direita)
  const [ordemSelecionada, setOrdemSelecionada] = useState<{
    ordem: OrdemStatus | null;
    numeroPedido: string;
    clienteNome: string;
  } | null>(null);

  // Hooks para cada tipo de ordem
  const perfiladeira = useOrdensProducaoPrioridade('perfiladeira');
  const soldagem = useOrdensProducaoPrioridade('soldagem');
  const separacao = useOrdensProducaoPrioridade('separacao');
  const qualidade = useOrdensProducaoPrioridade('qualidade');
  const pintura = useOrdensProducaoPrioridade('pintura');

  const ordensMap: Record<TipoOrdemProducao, {
    ordens: OrdemProducaoSimples[];
    isLoading: boolean;
    reorganizarOrdens: (ordens: OrdemProducaoSimples[]) => void;
    refetch: () => void;
  }> = {
    perfiladeira,
    soldagem,
    separacao,
    qualidade,
    pintura,
  };

  // Filtrar ordens por pedido_id quando filtro ativo
  const filtrarOrdens = (ordens: OrdemProducaoSimples[]) => {
    if (!pedidoFiltrado) return ordens;
    return ordens.filter(o => o.pedido_id === pedidoFiltrado);
  };

  // Determinar se drag está desabilitado
  const isDragDisabled = !!pedidoFiltrado;

  // Handler para filtro de pedido
  const handlePedidoClick = (pedidoId: string | null, clienteNome: string | null) => {
    setPedidoFiltrado(pedidoId);
    setClienteFiltrado(clienteNome);
  };

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    // Não permitir drag quando filtro ativo
    if (isDragDisabled) return;
    
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Encontrar qual coluna contém o item sendo arrastado
    for (const coluna of COLUNAS) {
      const ordensData = ordensMap[coluna.tipo];
      const activeIndex = ordensData.ordens.findIndex(o => o.id === active.id);
      const overIndex = ordensData.ordens.findIndex(o => o.id === over.id);

      if (activeIndex !== -1 && overIndex !== -1) {
        const novasOrdens = arrayMove(ordensData.ordens, activeIndex, overIndex);
        ordensData.reorganizarOrdens(novasOrdens);
        break;
      }
    }
  };

  const handleRefreshAll = () => {
    Object.values(ordensMap).forEach(data => data.refetch());
  };

  // Handler para converter OrdemProducaoSimples -> OrdemStatus e abrir sidebar
  const handleOrdemClick = (ordem: OrdemProducaoSimples, tipo: TipoOrdemProducao) => {
    const ordemStatus: OrdemStatus = {
      existe: true,
      id: ordem.id,
      numero_ordem: ordem.numero_ordem,
      status: ordem.status,
      tipo: tipo as TipoOrdem,
      responsavel: ordem.responsavel_nome ? {
        nome: ordem.responsavel_nome,
        foto_url: null,
        iniciais: ordem.responsavel_nome.substring(0, 2).toUpperCase(),
      } : null,
      responsavel_id: ordem.responsavel_id || null,
      pausada: ordem.pausada || false,
      justificativa_pausa: ordem.justificativa_pausa || null,
      pausada_em: null,
      linha_problema: null,
      linhas_concluidas: 0,
      total_linhas: 0,
      capturada_em: null,
      tempo_acumulado_segundos: null,
      tempo_conclusao_segundos: null,
      data_agendamento: null,
      hora_agendamento: null,
      responsavel_nome: null,
      tipo_responsavel: null,
    };
    
    setOrdemSelecionada({
      ordem: ordemStatus,
      numeroPedido: ordem.numero_pedido,
      clienteNome: ordem.cliente_nome,
    });
  };

  return (
    <div className="min-h-screen bg-black flex flex-col overflow-hidden relative">
      <DelayedParticles />
      
      <AnimatedBreadcrumb 
        items={[
          { label: "Home", path: "/home" },
          { label: "Fábrica", path: "/fabrica" },
          { label: "Cronograma" }
        ]} 
        mounted={mounted} 
      />
      {/* Header */}
      <header className="relative z-10 px-4 pt-4 pb-2">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/fabrica')}
            className="p-1.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10
                       hover:bg-white/10 transition-all duration-300"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'translateX(0)' : 'translateX(-20px)',
              transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 100ms'
            }}
          >
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-500/20">
              <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
            </div>
          </button>

          <div className="flex items-center gap-3">
            <h1 
              className="text-xl font-bold text-white"
              style={{
                opacity: mounted ? 1 : 0,
                transition: 'opacity 0.5s ease 200ms'
              }}
            >
              Cronograma de Produção
            </h1>
            
            {/* Badge de filtro ativo */}
            {pedidoFiltrado && clienteFiltrado && (
              <Badge 
                variant="secondary" 
                className="bg-blue-500/20 text-blue-200 border border-blue-500/30 gap-1.5"
              >
                <Filter className="h-3 w-3" />
                {clienteFiltrado}
                <button 
                  onClick={() => handlePedidoClick(null, null)}
                  className="ml-1 hover:bg-blue-500/30 rounded p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshAll}
            className="bg-white/5 border-white/10 text-white hover:bg-white/10"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'translateX(0)' : 'translateX(20px)',
              transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 100ms'
            }}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Main Content com Sidebar */}
      <main className="flex-1 relative z-10 flex overflow-hidden">
        {/* Sidebar Esquerda - Pedidos */}
        <CronogramaSidebar
          open={sidebarAberta}
          onOpenChange={setSidebarAberta}
          pedidoFiltrado={pedidoFiltrado}
          clienteFiltrado={clienteFiltrado}
          onPedidoClick={handlePedidoClick}
        />

        {/* Área das Colunas */}
        <div className="flex-1 p-4 overflow-hidden">
          <DndContext
            sensors={isDragDisabled ? [] : sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <ScrollArea className="h-full w-full">
              <div 
                className="flex gap-4 pb-4 min-h-[calc(100vh-140px)]"
                style={{
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? 'translateY(0)' : 'translateY(20px)',
                  transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 300ms'
                }}
              >
                {COLUNAS.map((coluna) => (
                  <ColunaOrdensProducao
                    key={coluna.tipo}
                    tipo={coluna.tipo}
                    titulo={coluna.titulo}
                    ordens={filtrarOrdens(ordensMap[coluna.tipo].ordens)}
                    isLoading={ordensMap[coluna.tipo].isLoading}
                    cor={coluna.cor}
                    onOrdemClick={(ordem) => handleOrdemClick(ordem, coluna.tipo)}
                    isDragDisabled={isDragDisabled}
                  />
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </DndContext>
        </div>
      </main>

      {/* Sidebar de detalhes da ordem (direita) */}
      <OrdemLinhasSheet
        ordem={ordemSelecionada?.ordem || null}
        numeroPedido={ordemSelecionada?.numeroPedido}
        clienteNome={ordemSelecionada?.clienteNome}
        open={!!ordemSelecionada}
        onOpenChange={(open) => !open && setOrdemSelecionada(null)}
      />
    </div>
  );
}
