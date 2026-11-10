import { useState } from "react";
import { format, addDays, startOfWeek, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay, closestCenter, TouchSensor, MouseSensor, useSensor, useSensors } from "@dnd-kit/core";
import { OrdemCarregamento } from "@/types/ordemCarregamento";
import { NeoInstalacao } from "@/types/neoInstalacao";
import { NeoCorrecao } from "@/types/neoCorrecao";
import { Button } from "@/components/ui/button";
import { DroppableDaySimpleExpedicao } from "./DroppableDaySimpleExpedicao";
import { DraggableOrdemCarregamento } from "./DraggableOrdemCarregamento";
import { DraggableNeoInstalacao } from "./DraggableNeoInstalacao";
import { DraggableNeoCorrecao } from "./DraggableNeoCorrecao";
import { CalendarioLegendas } from "./CalendarioLegendas";
import { toast } from "sonner";

interface CalendarioSemanalExpedicaoDesktopProps {
  startDate: Date;
  ordens: OrdemCarregamento[];
  neoInstalacoes?: NeoInstalacao[];
  neoCorrecoes?: NeoCorrecao[];
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
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

export const CalendarioSemanalExpedicaoDesktop = ({
  startDate,
  ordens,
  neoInstalacoes = [],
  neoCorrecoes = [],
  onPreviousWeek,
  onNextWeek,
  onToday,
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
}: CalendarioSemanalExpedicaoDesktopProps) => {
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

  const weekStart = startOfWeek(startDate, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const weekDayNames = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

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
      setActiveOrdem(data.ordem as OrdemCarregamento);
      setActiveNeo(null);
      setActiveNeoCorrecao(null);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveOrdem(null);
    setActiveNeo(null);
    setActiveNeoCorrecao(null);

    if (!over) return;

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

  const handleDayClick = (date: Date) => {
    // Implementar modal de criação se necessário
  };

  const calendarContent = (
    <div className="space-y-4 w-full">
      {/* Navegação da semana */}
      <div className="flex items-center justify-between gap-4">
        <Button variant="outline" size="icon" onClick={onPreviousWeek}>
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="text-center">
          <p className="text-sm font-medium">
            {format(weekStart, "dd 'de' MMMM", { locale: ptBR })} -{" "}
            {format(addDays(weekStart, 6), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
          <Button variant="link" size="sm" onClick={onToday} className="h-auto p-0 text-xs">
            Ir para hoje
          </Button>
        </div>

        <Button variant="outline" size="icon" onClick={onNextWeek}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Legendas */}
      {!hideLegendas && <CalendarioLegendas activeLegend={activeLegend} onToggle={onLegendToggle} />}

      {/* Grid de dias */}
      <div className="grid grid-cols-7 gap-4">
        {/* Headers dos dias */}
        {weekDays.map((day, index) => (
          <div key={`header-${index}`} className="text-center pb-2 border-b">
            <p className="text-sm font-semibold">{weekDayNames[index]}</p>
            <p className="text-xs text-muted-foreground">
              {format(day, "dd/MM")}
            </p>
          </div>
        ))}

        {/* Dias com ordens */}
        {weekDays.map((day) => (
          <DroppableDaySimpleExpedicao
            key={day.toISOString()}
            date={day}
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
  );

  // Se readOnly, usar DndContext vazio (necessário para useDndMonitor em subcomponentes)
  if (readOnly) {
    return <DndContext>{calendarContent}</DndContext>;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {calendarContent}
      
      {/* Overlay de drag */}
      <DragOverlay>
        {activeOrdem ? (
          <div className="opacity-80">
            <DraggableOrdemCarregamento ordem={activeOrdem} />
          </div>
        ) : activeNeo ? (
          <div className="opacity-80">
            <DraggableNeoInstalacao neoInstalacao={activeNeo} />
          </div>
        ) : activeNeoCorrecao ? (
          <div className="opacity-80">
            <DraggableNeoCorrecao neoCorrecao={activeNeoCorrecao} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
