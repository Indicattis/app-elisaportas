import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, TouchSensor, MouseSensor, useSensor, useSensors } from "@dnd-kit/core";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { OrdemCarregamento } from "@/types/ordemCarregamento";
import { NeoInstalacao } from "@/types/neoInstalacao";
import { NeoCorrecao } from "@/types/neoCorrecao";
import { DroppableDayExpedicao } from "./DroppableDayExpedicao";
import { OrdemCarregamentoCard } from "./OrdemCarregamentoCard";
import { NeoInstalacaoCard } from "./NeoInstalacaoCard";
import { NeoCorrecaoCard } from "./NeoCorrecaoCard";
import { CalendarioLegendas } from "./CalendarioLegendas";
import { toast } from "sonner";

interface CalendarioMensalExpedicaoDesktopProps {
  currentMonth: Date;
  ordens: OrdemCarregamento[];
  neoInstalacoes?: NeoInstalacao[];
  neoCorrecoes?: NeoCorrecao[];
  onMonthChange: (date: Date) => void;
  onUpdateOrdem?: (params: { id: string; data: Partial<OrdemCarregamento>; fonte?: 'ordens_carregamento' | 'instalacoes' | 'correcoes' }) => Promise<void>;
  onUpdateNeoInstalacao?: (params: { id: string; data: Partial<NeoInstalacao> }) => Promise<void>;
  onUpdateNeoCorrecao?: (params: { id: string; data: Partial<NeoCorrecao> }) => Promise<void>;
  onEdit?: (ordem: OrdemCarregamento) => void;
  onRemoverDoCalendario?: (id: string) => void;
  onRemoverNeoInstalacaoDoCalendario?: (id: string) => void;
  onRemoverNeoCorrecaoDoCalendario?: (id: string) => void;
  onOrdemCriada?: () => void;
  onOrdemDropped?: () => void;
  onOrdemClick?: (ordem: OrdemCarregamento) => void;
  onOpenNeoInstalacaoDetails?: (neoInstalacao: NeoInstalacao) => void;
  onOpenNeoCorrecaoDetails?: (neoCorrecao: NeoCorrecao) => void;
  onExcluirNeoInstalacao?: (id: string) => void;
  onExcluirNeoCorrecao?: (id: string) => void;
  onEditarNeoInstalacao?: (neo: NeoInstalacao) => void;
  onEditarNeoCorrecao?: (neo: NeoCorrecao) => void;
  activeLegend?: string | null;
  onLegendToggle?: (legend: string) => void;
  readOnly?: boolean;
  hideLegendas?: boolean;
}

export const CalendarioMensalExpedicaoDesktop = ({
  currentMonth,
  ordens,
  neoInstalacoes = [],
  neoCorrecoes = [],
  onMonthChange,
  onUpdateOrdem,
  onUpdateNeoInstalacao,
  onUpdateNeoCorrecao,
  onEdit,
  onRemoverDoCalendario,
  onRemoverNeoInstalacaoDoCalendario,
  onRemoverNeoCorrecaoDoCalendario,
  onOrdemCriada,
  onOrdemDropped,
  onOrdemClick,
  onOpenNeoInstalacaoDetails,
  onOpenNeoCorrecaoDetails,
  onExcluirNeoInstalacao,
  onExcluirNeoCorrecao,
  onEditarNeoInstalacao,
  onEditarNeoCorrecao,
  activeLegend,
  onLegendToggle,
  readOnly = false,
  hideLegendas = false,
}: CalendarioMensalExpedicaoDesktopProps) => {
  const [activeOrdem, setActiveOrdem] = useState<OrdemCarregamento | null>(null);
  const [activeNeo, setActiveNeo] = useState<NeoInstalacao | null>(null);
  const [activeNeoCorrecao, setActiveNeoCorrecao] = useState<NeoCorrecao | null>(null);

  // Configurar sensores para mobile e desktop
  const mouseSensor = useSensor(MouseSensor);
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 250,
      tolerance: 5,
    },
  });
  const sensors = useSensors(mouseSensor, touchSensor);

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current;
    if (data?.type === 'neo_instalacao' && data?.neoInstalacao) {
      setActiveNeo(data.neoInstalacao as NeoInstalacao);
      setActiveOrdem(null);
      setActiveNeoCorrecao(null);
    } else if (data?.type === 'neo_correcao' && data?.neoCorrecao) {
      setActiveNeoCorrecao(data.neoCorrecao as NeoCorrecao);
      setActiveOrdem(null);
      setActiveNeo(null);
    } else if (data?.ordem) {
      setActiveOrdem(data.ordem);
      setActiveNeo(null);
      setActiveNeoCorrecao(null);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveOrdem(null);
    setActiveNeo(null);
    setActiveNeoCorrecao(null);

    if (!over || active.id === over.id) return;

    const novaData = over.data.current?.date as Date;
    if (!novaData) return;

    const dataFormatada = format(novaData, "yyyy-MM-dd");

    try {
      const activeData = active.data.current;
      
      // Verifica se é uma neo instalação
      if (activeData?.type === 'neo_instalacao' && activeData?.neoInstalacao) {
        const neo = activeData.neoInstalacao as NeoInstalacao;
        
        if (neo.data_instalacao) {
          const dataAtual = new Date(neo.data_instalacao);
          if (isSameDay(dataAtual, novaData)) return;
        }

        if (onUpdateNeoInstalacao) {
          await onUpdateNeoInstalacao({
            id: neo.id,
            data: {
              data_instalacao: dataFormatada,
            },
          });
          toast.success("Data da instalação atualizada");
        }
        return;
      }

      // Verifica se é uma neo correção
      if (activeData?.type === 'neo_correcao' && activeData?.neoCorrecao) {
        const neo = activeData.neoCorrecao as NeoCorrecao;
        
        if (neo.data_correcao) {
          const dataAtual = new Date(neo.data_correcao);
          if (isSameDay(dataAtual, novaData)) return;
        }

        if (onUpdateNeoCorrecao) {
          await onUpdateNeoCorrecao({
            id: neo.id,
            data: {
              data_correcao: dataFormatada,
            },
          });
          toast.success("Data da correção atualizada");
        }
        return;
      }

      // Se não for neo instalação/correção, trata como ordem de carregamento
      const ordemId = active.id as string;
      const ordem = ordens.find((o) => o.id === ordemId);
      if (!ordem) return;

      if (ordem.data_carregamento) {
        const dataAtual = new Date(ordem.data_carregamento);
        if (isSameDay(dataAtual, novaData)) return;
      }
      
      if (onUpdateOrdem) {
        await onUpdateOrdem({
          id: ordemId,
          data: ordem.carregamento_concluido
            ? { data_carregamento: dataFormatada }
            : {
                data_carregamento: dataFormatada,
                status: ordem.fonte === 'instalacoes' ? 'pronta_fabrica' : 'agendada',
              },
          fonte: ordem.fonte,
        });
        toast.success("Data de carregamento atualizada");
      }
    } catch (error) {
      console.error("Erro:", error);
      toast.error("Erro ao atualizar data");
    }
  };

  // Calcular dias do mês
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days: Date[] = [];
  let day = calendarStart;
  while (day <= calendarEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  const handleDayClick = (date: Date) => {
    // Implementar modal de criação se necessário
  };

  const calendarContent = (
    <div className="space-y-4">
      {/* Navegação do mês */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => onMonthChange(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <h2 className="text-lg font-semibold text-foreground min-w-[200px] text-center">
            {format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })}
          </h2>

          <Button
            variant="outline"
            size="icon"
            onClick={() => onMonthChange(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onMonthChange(new Date())}
        >
          Ir para hoje
        </Button>
      </div>

      {/* Legendas */}
      {!hideLegendas && <CalendarioLegendas activeLegend={activeLegend} onToggle={onLegendToggle} />}

      {/* Grid do calendário */}
      <div className="rounded-lg overflow-hidden bg-muted/20 border border-border">
        {/* Cabeçalho dos dias da semana */}
        <div className="grid grid-cols-7 border-b border-border bg-muted/40">
          {weekDays.map((day) => (
            <div
              key={day}
              className="p-3 text-center text-sm font-semibold text-foreground"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Grid de dias */}
        <div className="grid grid-cols-7">
          {days.map((day) => (
            <DroppableDayExpedicao
              key={day.toISOString()}
              date={day}
              currentMonth={currentMonth}
              ordens={ordens}
              neoInstalacoes={neoInstalacoes}
              neoCorrecoes={neoCorrecoes}
              onDayClick={handleDayClick}
              onEdit={readOnly ? undefined : onEdit}
              onRemoverDoCalendario={readOnly ? undefined : onRemoverDoCalendario}
              onRemoverNeoInstalacaoDoCalendario={readOnly ? undefined : onRemoverNeoInstalacaoDoCalendario}
              onRemoverNeoCorrecaoDoCalendario={readOnly ? undefined : onRemoverNeoCorrecaoDoCalendario}
              onOrdemDropped={readOnly ? undefined : onOrdemDropped}
              onUpdateOrdem={readOnly ? undefined : onUpdateOrdem}
              onOrdemClick={onOrdemClick}
              onOpenNeoInstalacaoDetails={onOpenNeoInstalacaoDetails}
              onOpenNeoCorrecaoDetails={onOpenNeoCorrecaoDetails}
              onExcluirNeoInstalacao={readOnly ? undefined : onExcluirNeoInstalacao}
              onExcluirNeoCorrecao={readOnly ? undefined : onExcluirNeoCorrecao}
              onEditarNeoInstalacao={readOnly ? undefined : onEditarNeoInstalacao}
              onEditarNeoCorrecao={readOnly ? undefined : onEditarNeoCorrecao}
              readOnly={readOnly}
            />
          ))}
        </div>
      </div>
    </div>
  );

  // Se readOnly, usar DndContext vazio (necessário para useDndMonitor em subcomponentes)
  if (readOnly) {
    return <DndContext>{calendarContent}</DndContext>;
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {calendarContent}

      {/* Overlay durante o arrasto */}
      <DragOverlay>
        {activeOrdem ? (
          <div className="opacity-80">
            <OrdemCarregamentoCard ordem={activeOrdem} />
          </div>
        ) : activeNeo ? (
          <div className="opacity-80">
            <NeoInstalacaoCard neoInstalacao={activeNeo} />
          </div>
        ) : activeNeoCorrecao ? (
          <div className="opacity-80">
            <NeoCorrecaoCard neoCorrecao={activeNeoCorrecao} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
