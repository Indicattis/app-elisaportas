import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, CalendarDays, ArrowLeft } from "lucide-react";
import { AnimatedBreadcrumb } from "@/components/AnimatedBreadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useOrdensCarregamentoCalendario } from "@/hooks/useOrdensCarregamentoCalendario";
import { useNeoInstalacoes } from "@/hooks/useNeoInstalacoes";
import { useNeoCorrecoes } from "@/hooks/useNeoCorrecoes";
import { useCorrecoes } from "@/hooks/useCorrecoes";
import { CalendarioSemanalExpedicaoMobile } from "@/components/expedicao/CalendarioSemanalExpedicaoMobile";
import { CalendarioSemanalExpedicaoDesktop } from "@/components/expedicao/CalendarioSemanalExpedicaoDesktop";
import { CalendarioMensalExpedicaoDesktop } from "@/components/expedicao/CalendarioMensalExpedicaoDesktop";
import { OrdemCarregamentoDetails } from "@/components/expedicao/OrdemCarregamentoDetails";
import { NeoInstalacaoDetails } from "@/components/expedicao/NeoInstalacaoDetails";
import { NeoCorrecaoDetails } from "@/components/expedicao/NeoCorrecaoDetails";
import { useIsMobile } from "@/hooks/use-mobile";
import { format, addDays, startOfWeek, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { OrdemCarregamento } from "@/types/ordemCarregamento";
import { NeoInstalacao } from "@/types/neoInstalacao";
import { NeoCorrecao } from "@/types/neoCorrecao";

// noop handlers for read-only
const noop = async () => {};

export default function CalendarioExpedicaoReadOnly() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<'week' | 'month'>('month');
  const [legendaFiltro, setLegendaFiltro] = useState<string | null>(null);

  // Details sidebars (view-only)
  const [selectedOrdem, setSelectedOrdem] = useState<OrdemCarregamento | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedNeoInstalacao, setSelectedNeoInstalacao] = useState<NeoInstalacao | null>(null);
  const [neoInstalacaoDetailsOpen, setNeoInstalacaoDetailsOpen] = useState(false);
  const [selectedNeoCorrecao, setSelectedNeoCorrecao] = useState<NeoCorrecao | null>(null);
  const [neoCorrecaoDetailsOpen, setNeoCorrecaoDetailsOpen] = useState(false);

  const { ordens, isLoading } = useOrdensCarregamentoCalendario(currentDate, viewType);
  const { neoInstalacoes } = useNeoInstalacoes(currentDate, viewType);
  const { neoCorrecoes } = useNeoCorrecoes(currentDate, viewType);
  const { correcoes: correcoesPedido } = useCorrecoes(currentDate, viewType);

  // Map correcoes de pedido para NeoCorrecao format
  const correcoesPedidoAsNeoCorrecao: NeoCorrecao[] = (correcoesPedido || []).map(c => ({
    id: c.id,
    nome_cliente: c.nome_cliente,
    cidade: c.cidade,
    estado: c.estado,
    data_correcao: c.data_correcao,
    hora: c.hora,
    descricao: c.observacoes || `Correção de pedido${c.pedido?.numero_pedido ? ` #${c.pedido.numero_pedido}` : ''}`,
    equipe_id: null, equipe_nome: c.responsavel_correcao_nome, tipo_responsavel: null,
    autorizado_id: null, autorizado_nome: null, valor_total: 0, valor_a_receber: 0,
    status: c.status, concluida: c.concluida, concluida_em: c.concluida_em, concluida_por: c.concluida_por,
    created_by: c.created_by, created_at: c.created_at, updated_at: c.updated_at,
    vezes_agendado: c.vezes_agendado, etapa_causadora: null, prioridade_gestao: 0,
    _tipo: 'neo_correcao' as const,
  }));

  const todasNeoCorrecoes = [...(neoCorrecoes || []), ...correcoesPedidoAsNeoCorrecao];

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 6);

  const handlePreviousWeek = () => setCurrentDate(prev => addDays(prev, -7));
  const handleNextWeek = () => setCurrentDate(prev => addDays(prev, 7));
  const handleToday = () => {
    if (viewType === 'month') setCurrentDate(startOfMonth(new Date()));
    else setCurrentDate(startOfWeek(new Date(), { weekStartsOn: 1 }));
  };
  const handleMonthChange = (date: Date) => setCurrentDate(date);
  const handleLegendToggle = (legend: string) => setLegendaFiltro(prev => prev === legend ? null : legend);

  const ordensFiltradas = !legendaFiltro ? (ordens || [])
    : legendaFiltro === 'elisa' ? (ordens || []).filter(o => o.tipo_carregamento === 'elisa' && !['entrega','autorizado'].includes(o.venda?.tipo_entrega || ''))
    : legendaFiltro === 'autorizados' ? (ordens || []).filter(o => o.tipo_carregamento === 'autorizados')
    : legendaFiltro === 'entrega' ? (ordens || []).filter(o => ['entrega','autorizado'].includes(o.venda?.tipo_entrega || ''))
    : [];
  const neoInstalacoesFiltradas = !legendaFiltro || legendaFiltro === 'neo_instalacao' ? (neoInstalacoes || []) : [];
  const neoCorrecoesFiltradas = !legendaFiltro || legendaFiltro === 'neo_correcao' ? todasNeoCorrecoes : [];

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const handleOrdemClick = (ordem: OrdemCarregamento) => {
    setSelectedOrdem(ordem);
    setDetailsOpen(true);
  };
  const handleOpenNeoInstalacaoDetails = (neo: NeoInstalacao) => {
    setSelectedNeoInstalacao(neo);
    setNeoInstalacaoDetailsOpen(true);
  };
  const handleOpenNeoCorrecaoDetails = (neo: NeoCorrecao) => {
    setSelectedNeoCorrecao(neo);
    setNeoCorrecaoDetailsOpen(true);
  };

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden relative">
      <AnimatedBreadcrumb 
        items={[
          { label: "Home", path: "/home" },
          { label: "Calendário Expedição" }
        ]} 
        mounted={mounted} 
      />

      <div className="relative z-10 min-h-screen flex flex-col pt-14">
        <header className="sticky top-0 z-20 px-4 py-3 bg-black/80 backdrop-blur-md border-b border-primary/10">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/home')} className="p-2 rounded-lg hover:bg-primary/10 transition-colors">
                <ArrowLeft className="w-5 h-5 text-white/80" />
              </button>
              <div>
                <h1 className="text-lg font-semibold text-white">Calendário Expedição</h1>
                <p className="text-xs text-white/60">
                  {viewType === 'week' 
                    ? `${format(weekStart, "dd/MM", { locale: ptBR })} - ${format(weekEnd, "dd/MM/yyyy", { locale: ptBR })}`
                    : format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })
                  }
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
              <Button variant="ghost" size="sm" onClick={() => setViewType(viewType === 'week' ? 'month' : 'week')} className="text-white/80 hover:text-white hover:bg-primary/10">
                {viewType === 'week' ? <CalendarDays className="h-4 w-4" /> : <Calendar className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="sm" onClick={handleToday} className="text-white/80 hover:text-white hover:bg-primary/10 text-xs">
                Hoje
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="max-w-7xl mx-auto">
              <Card className="bg-primary/5 border-primary/10 backdrop-blur-xl">
                <CardContent className="p-4">
                  {isMobile ? (
                    <CalendarioSemanalExpedicaoMobile
                      startDate={weekStart}
                      ordens={ordensFiltradas}
                      neoInstalacoes={neoInstalacoesFiltradas}
                      neoCorrecoes={neoCorrecoesFiltradas}
                      readOnly
                      activeLegend={legendaFiltro}
                      onLegendToggle={handleLegendToggle}
                      onPreviousWeek={handlePreviousWeek}
                      onNextWeek={handleNextWeek}
                      onToday={handleToday}
                      onDayClick={() => {}}
                      onEdit={noop}
                      onRemoverDoCalendario={noop}
                      onUpdateOrdem={noop}
                      onOrdemAdded={noop}
                      onOpenNeoInstalacaoDetails={handleOpenNeoInstalacaoDetails}
                      onOpenNeoCorrecaoDetails={handleOpenNeoCorrecaoDetails}
                      onExcluirNeoInstalacao={noop}
                      onExcluirNeoCorrecao={noop}
                    />
                  ) : viewType === 'week' ? (
                    <CalendarioSemanalExpedicaoDesktop
                      startDate={weekStart}
                      ordens={ordensFiltradas}
                      neoInstalacoes={neoInstalacoesFiltradas}
                      neoCorrecoes={neoCorrecoesFiltradas}
                      readOnly
                      activeLegend={legendaFiltro}
                      onLegendToggle={handleLegendToggle}
                      onPreviousWeek={handlePreviousWeek}
                      onNextWeek={handleNextWeek}
                      onToday={handleToday}
                      onUpdateOrdem={noop}
                      onUpdateNeoInstalacao={noop}
                      onUpdateNeoCorrecao={noop}
                      onEdit={noop}
                      onRemoverDoCalendario={noop}
                      onRemoverNeoInstalacaoDoCalendario={noop}
                      onRemoverNeoCorrecaoDoCalendario={noop}
                      onOrdemCriada={noop}
                      onOrdemDropped={noop}
                      onOrdemClick={handleOrdemClick}
                      onOpenNeoInstalacaoDetails={handleOpenNeoInstalacaoDetails}
                      onOpenNeoCorrecaoDetails={handleOpenNeoCorrecaoDetails}
                      onExcluirNeoInstalacao={noop}
                      onExcluirNeoCorrecao={noop}
                      onEditarNeoInstalacao={noop}
                      onEditarNeoCorrecao={noop}
                    />
                  ) : (
                    <CalendarioMensalExpedicaoDesktop
                      currentMonth={currentDate}
                      ordens={ordensFiltradas}
                      neoInstalacoes={neoInstalacoesFiltradas}
                      neoCorrecoes={neoCorrecoesFiltradas}
                      readOnly
                      activeLegend={legendaFiltro}
                      onLegendToggle={handleLegendToggle}
                      onMonthChange={handleMonthChange}
                      onUpdateOrdem={noop}
                      onUpdateNeoInstalacao={noop}
                      onUpdateNeoCorrecao={noop}
                      onEdit={noop}
                      onRemoverDoCalendario={noop}
                      onRemoverNeoInstalacaoDoCalendario={noop}
                      onRemoverNeoCorrecaoDoCalendario={noop}
                      onOrdemCriada={noop}
                      onOrdemDropped={noop}
                      onOrdemClick={handleOrdemClick}
                      onOpenNeoInstalacaoDetails={handleOpenNeoInstalacaoDetails}
                      onOpenNeoCorrecaoDetails={handleOpenNeoCorrecaoDetails}
                      onExcluirNeoInstalacao={noop}
                      onExcluirNeoCorrecao={noop}
                      onEditarNeoInstalacao={noop}
                      onEditarNeoCorrecao={noop}
                    />
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>

      {/* Details sidebars - view only */}
      {selectedOrdem && (
        <OrdemCarregamentoDetails
          ordem={selectedOrdem}
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
        />
      )}
      {selectedNeoInstalacao && (
        <NeoInstalacaoDetails
          neoInstalacao={selectedNeoInstalacao}
          open={neoInstalacaoDetailsOpen}
          onOpenChange={setNeoInstalacaoDetailsOpen}
        />
      )}
      {selectedNeoCorrecao && (
        <NeoCorrecaoDetails
          neoCorrecao={selectedNeoCorrecao}
          open={neoCorrecaoDetailsOpen}
          onOpenChange={setNeoCorrecaoDetailsOpen}
        />
      )}
    </div>
  );
}
