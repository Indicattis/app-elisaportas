import { useState } from "react";
import { DndContext } from "@dnd-kit/core";
import { useNavigate } from "react-router-dom";
import { Calendar, CalendarDays } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useInstalacoesMinhaEquipeCalendario } from "@/hooks/useInstalacoesMinhaEquipeCalendario";
import { useNeoInstalacoesMinhaEquipe } from "@/hooks/useNeoInstalacoesMinhaEquipe";
import { useNeoCorrecoesMinhaEquipe } from "@/hooks/useNeoCorrecoesMinhaEquipe";
import { OrdemCarregamentoDetails } from "@/components/expedicao/OrdemCarregamentoDetails";
import { NeoInstalacaoDetails } from "@/components/expedicao/NeoInstalacaoDetails";
import { NeoCorrecaoDetails } from "@/components/expedicao/NeoCorrecaoDetails";
import { CalendarioSemanalExpedicaoMobile } from "@/components/expedicao/CalendarioSemanalExpedicaoMobile";
import { CalendarioSemanalExpedicaoDesktop } from "@/components/expedicao/CalendarioSemanalExpedicaoDesktop";
import { CalendarioMensalExpedicaoDesktop } from "@/components/expedicao/CalendarioMensalExpedicaoDesktop";
import { useIsMobile } from "@/hooks/use-mobile";
import { format, addDays, startOfWeek, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { OrdemCarregamento } from "@/types/ordemCarregamento";
import { NeoInstalacao } from "@/types/neoInstalacao";
import { NeoCorrecao } from "@/types/neoCorrecao";
import { useProducaoAuth } from "@/hooks/useProducaoAuth";

export default function ProducaoInstalacoes() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { user } = useProducaoAuth();

  const ROLES_GERENTE = ['administrador', 'gerente_fabril', 'gerente_instalacoes', 'diretor'];
  const isGerente = ROLES_GERENTE.includes(user?.role || '');

  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<'week' | 'month'>('week');
  const [selectedItem, setSelectedItem] = useState<OrdemCarregamento | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedNeoInstalacao, setSelectedNeoInstalacao] = useState<NeoInstalacao | null>(null);
  const [neoInstalacaoOpen, setNeoInstalacaoOpen] = useState(false);
  const [selectedNeoCorrecao, setSelectedNeoCorrecao] = useState<NeoCorrecao | null>(null);
  const [neoCorrecaoOpen, setNeoCorrecaoOpen] = useState(false);

  const {
    ordens,
    isLoading: isLoadingOrdens,
    equipeNome,
    equipeCor,
    temEquipe,
  } = useInstalacoesMinhaEquipeCalendario(currentDate, viewType, isGerente, null, null);

  const {
    neoInstalacoes,
    isLoading: isLoadingNeo,
  } = useNeoInstalacoesMinhaEquipe(currentDate, viewType, isGerente, null, null);

  const {
    neoCorrecoes,
    isLoading: isLoadingCorrecoes,
  } = useNeoCorrecoesMinhaEquipe(currentDate, viewType, isGerente, null, null);

  const isLoading = isLoadingOrdens || isLoadingNeo || isLoadingCorrecoes;

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

  const handleOrdemClick = (ordem: OrdemCarregamento) => {
    setSelectedItem(ordem);
    setDetailsOpen(true);
  };

  const handleOpenNeoInstalacaoDetails = (neo: NeoInstalacao) => {
    setSelectedNeoInstalacao(neo);
    setNeoInstalacaoOpen(true);
  };

  const handleOpenNeoCorrecaoDetails = (neo: NeoCorrecao) => {
    setSelectedNeoCorrecao(neo);
    setNeoCorrecaoOpen(true);
  };

  const handleMonthChange = (date: Date) => {
    setCurrentDate(date);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold">Instalações</h1>
          {equipeNome && (
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: equipeCor ? `${equipeCor}20` : 'rgba(59, 130, 246, 0.2)',
                color: equipeCor || '#3B82F6',
                border: `1px solid ${equipeCor || '#3B82F6'}40`,
              }}
            >
              {equipeNome}
            </span>
          )}
          <span className="text-xs text-muted-foreground">
            {viewType === 'week'
              ? `${format(weekStart, "dd/MM", { locale: ptBR })} - ${format(weekEnd, "dd/MM/yyyy", { locale: ptBR })}`
              : format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })
            }
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setViewType(viewType === 'week' ? 'month' : 'week')}>
            {viewType === 'week' ? <CalendarDays className="h-4 w-4" /> : <Calendar className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="sm" onClick={handleToday} className="text-xs">
            Hoje
          </Button>
        </div>
      </div>

      {/* Conteúdo */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : (
        <DndContext onDragEnd={() => {}}>
          <Card>
            <CardContent className="p-4">
              {isMobile ? (
                <CalendarioSemanalExpedicaoMobile
                  startDate={weekStart}
                  ordens={ordens}
                  neoInstalacoes={neoInstalacoes}
                  neoCorrecoes={neoCorrecoes}
                  onPreviousWeek={handlePreviousWeek}
                  onNextWeek={handleNextWeek}
                  onToday={handleToday}
                  onDayClick={() => {}}
                  onOrdemClick={handleOrdemClick}
                  onOpenNeoInstalacaoDetails={handleOpenNeoInstalacaoDetails}
                  onOpenNeoCorrecaoDetails={handleOpenNeoCorrecaoDetails}
                  hideLegendas
                />
              ) : viewType === 'week' ? (
                <CalendarioSemanalExpedicaoDesktop
                  startDate={weekStart}
                  ordens={ordens}
                  neoInstalacoes={neoInstalacoes}
                  neoCorrecoes={neoCorrecoes}
                  onPreviousWeek={handlePreviousWeek}
                  onNextWeek={handleNextWeek}
                  onToday={handleToday}
                  onOrdemClick={handleOrdemClick}
                  onOpenNeoInstalacaoDetails={handleOpenNeoInstalacaoDetails}
                  onOpenNeoCorrecaoDetails={handleOpenNeoCorrecaoDetails}
                  readOnly
                  hideLegendas
                />
              ) : (
                <CalendarioMensalExpedicaoDesktop
                  currentMonth={currentDate}
                  ordens={ordens}
                  neoInstalacoes={neoInstalacoes}
                  neoCorrecoes={neoCorrecoes}
                  onMonthChange={handleMonthChange}
                  onOrdemClick={handleOrdemClick}
                  onOpenNeoInstalacaoDetails={handleOpenNeoInstalacaoDetails}
                  onOpenNeoCorrecaoDetails={handleOpenNeoCorrecaoDetails}
                  readOnly
                  hideLegendas
                />
              )}
            </CardContent>
          </Card>
        </DndContext>
      )}

      <OrdemCarregamentoDetails
        ordem={selectedItem}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />

      <NeoInstalacaoDetails
        neoInstalacao={selectedNeoInstalacao}
        open={neoInstalacaoOpen}
        onOpenChange={setNeoInstalacaoOpen}
      />

      <NeoCorrecaoDetails
        neoCorrecao={selectedNeoCorrecao}
        open={neoCorrecaoOpen}
        onOpenChange={setNeoCorrecaoOpen}
      />
    </div>
  );
}
