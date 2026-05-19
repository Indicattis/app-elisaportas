import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToWindowEdges } from "@dnd-kit/modifiers";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { PedidoCard } from "./PedidoCard";
import { PedidosHeaderRow } from "./PedidosHeaderRow";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { EtapaPedido, DirecaoPrioridade, PrioridadeUpdate } from "@/types/pedidoEtapa";

interface PedidosDraggableListProps {
  pedidos: any[];
  pedidosParaTotais?: any[]; // Todos os pedidos filtrados para cálculo de totais
  etapa: EtapaPedido;
  isAberto: boolean;
  viewMode?: 'grid' | 'list';
  onMoverEtapa?: (pedidoId: string, skipCheckboxValidation?: boolean, onProgress?: (processoId: string, status: 'pending' | 'in_progress' | 'completed' | 'error') => void) => void;
  onRetrocederEtapa?: (pedidoId: string, etapaDestino: EtapaPedido, motivo: string) => void;
  onReorganizar: (pedidos: PrioridadeUpdate[]) => void;
  onMoverPrioridade: (pedidoId: string, direcao: DirecaoPrioridade) => void;
  onArquivar?: (pedidoId: string) => Promise<void>;
  onDeletar?: (pedidoId: string) => Promise<void>;
  onAvisoEspera?: (pedidoId: string, justificativa: string | null) => Promise<void>;
  onAgendar?: (pedidoId: string) => void;
  onCorrecaoDetalhesClick?: (pedidoId: string) => void;
  onFinalizarDireto?: (pedidoId: string) => Promise<void>;
  onCarregarOrdem?: (pedidoId: string) => Promise<void>;
  onEnviarAguardandoCliente?: (pedidoId: string) => Promise<void>;
  onDevolverParaFinalizado?: (pedidoId: string) => Promise<void>;
  onResetarCarregamento?: (pedidoId: string) => Promise<void>;
  enableDragAndDrop?: boolean;
  showPosicao?: boolean;
  disableClienteClick?: boolean;
  hideOrdensStatus?: boolean;
  hideCorrecaoButton?: boolean;
  hideValorAReceber?: boolean;
  selectionEnabled?: boolean;
  selecionados?: Set<string>;
  onToggleSelecionado?: (id: string) => void;
}

interface SortableItemProps {
  id: string;
  pedido: any;
  posicao: number;
  total: number;
  isAberto: boolean;
  viewMode?: 'grid' | 'list';
  onMoverEtapa?: (pedidoId: string, skipCheckboxValidation?: boolean, onProgress?: (processoId: string, status: 'pending' | 'in_progress' | 'completed' | 'error') => void) => void;
  onRetrocederEtapa?: (pedidoId: string, etapaDestino: EtapaPedido, motivo: string) => void;
  onMoverPrioridade: (pedidoId: string, direcao: DirecaoPrioridade) => void;
  onArquivar?: (pedidoId: string) => Promise<void>;
  onDeletar?: (pedidoId: string) => Promise<void>;
  onAvisoEspera?: (pedidoId: string, justificativa: string | null) => Promise<void>;
  onAgendar?: (pedidoId: string) => void;
  onCorrecaoDetalhesClick?: (pedidoId: string) => void;
  onFinalizarDireto?: (pedidoId: string) => Promise<void>;
  onCarregarOrdem?: (pedidoId: string) => Promise<void>;
  onEnviarAguardandoCliente?: (pedidoId: string) => Promise<void>;
  onDevolverParaFinalizado?: (pedidoId: string) => Promise<void>;
  onResetarCarregamento?: (pedidoId: string) => Promise<void>;
  disableClienteClick?: boolean;
  hideOrdensStatus?: boolean;
  hideCorrecaoButton?: boolean;
  hideValorAReceber?: boolean;
}

function SortableItem({
  id,
  pedido,
  posicao,
  total,
  isAberto,
  viewMode = 'grid',
  onMoverEtapa,
  onRetrocederEtapa,
  onMoverPrioridade,
  onArquivar,
  onDeletar,
  onAvisoEspera,
  onAgendar,
  onCorrecaoDetalhesClick,
  onFinalizarDireto,
  onCarregarOrdem,
  onEnviarAguardandoCliente,
  onDevolverParaFinalizado,
  onResetarCarregamento,
  disableClienteClick,
  hideOrdensStatus,
  hideCorrecaoButton,
  hideValorAReceber,
}: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 0 : 'auto' as const,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <PedidoCard
        pedido={pedido}
        isAberto={isAberto}
        viewMode={viewMode}
        onMoverEtapa={onMoverEtapa}
        onRetrocederEtapa={onRetrocederEtapa}
        onMoverPrioridade={onMoverPrioridade}
        onArquivar={onArquivar}
        onDeletar={onDeletar}
        onAvisoEspera={onAvisoEspera}
        onAgendar={onAgendar}
        onCorrecaoDetalhesClick={onCorrecaoDetalhesClick}
        onFinalizarDireto={onFinalizarDireto}
        onCarregarOrdem={onCarregarOrdem}
        onEnviarAguardandoCliente={onEnviarAguardandoCliente}
        onDevolverParaFinalizado={onDevolverParaFinalizado}
        onResetarCarregamento={onResetarCarregamento}
        isDragging={isDragging}
        dragHandleProps={{ ...attributes, ...listeners }}
        posicao={posicao}
        total={total}
        disableClienteClick={disableClienteClick}
        hideOrdensStatus={hideOrdensStatus}
        hideCorrecaoButton={hideCorrecaoButton}
        hideValorAReceber={hideValorAReceber}
      />
    </div>
  );
}

export function PedidosDraggableList({
  pedidos,
  pedidosParaTotais,
  etapa,
  isAberto,
  viewMode = 'grid',
  onMoverEtapa,
  onRetrocederEtapa,
  onReorganizar,
  onMoverPrioridade,
  onArquivar,
  onDeletar,
  onAvisoEspera,
  onAgendar,
  onCorrecaoDetalhesClick,
  onFinalizarDireto,
  onCarregarOrdem,
  onEnviarAguardandoCliente,
  onDevolverParaFinalizado,
  onResetarCarregamento,
  enableDragAndDrop = true,
  showPosicao = true,
  disableClienteClick = false,
  hideOrdensStatus = false,
  hideCorrecaoButton = false,
  selectionEnabled = false,
  selecionados,
  onToggleSelecionado,
}: PedidosDraggableListProps) {
  const renderSelectionCheckbox = (pedidoId: string) => {
    if (!selectionEnabled || !onToggleSelecionado) return null;
    const checked = selecionados?.has(pedidoId) ?? false;
    const positionClass = viewMode === 'list' ? 'top-2 left-8' : 'top-2 right-2';
    return (
      <div
        className={cn(
          "absolute z-20 rounded-md p-0.5 transition-colors cursor-pointer hover:bg-white/10",
          positionClass
        )}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onToggleSelecionado(pedidoId);
        }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <Checkbox
          checked={checked}
          className="h-3.5 w-3.5 pointer-events-none"
        />
      </div>
    );
  };

  const wrapperClass = (_pedidoId: string) => "relative";

  const [activeId, setActiveId] = useState<string | null>(null);
  const overlayContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const div = document.createElement('div');
    div.id = 'dnd-overlay-container';
    document.body.appendChild(div);
    overlayContainerRef.current = div;
    return () => {
      if (div.parentNode) {
        div.parentNode.removeChild(div);
      }
      overlayContainerRef.current = null;
    };
  }, []);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = pedidos.findIndex((p) => p.id === active.id);
    const newIndex = pedidos.findIndex((p) => p.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    // Criar novo array com a ordem atualizada
    const newOrder = [...pedidos];
    const [movedItem] = newOrder.splice(oldIndex, 1);
    newOrder.splice(newIndex, 0, movedItem);

    // Calcular novas prioridades (usar incrementos de 10)
    const updates = newOrder.map((pedido, index) => ({
      id: pedido.id,
      prioridade: (newOrder.length - index) * 10,
    }));

    onReorganizar(updates);
  };

  const activePedido = activeId
    ? pedidos.find((p) => p.id === activeId)
    : null;

  // Se drag-and-drop desabilitado, renderiza lista simples sem arrastar e sem botões de prioridade
  if (!enableDragAndDrop) {
    return (
      <>
        {viewMode === 'list' && <PedidosHeaderRow hideOrdensStatus={hideOrdensStatus} />}
        <div className={
          viewMode === 'list' 
            ? "space-y-1" 
            : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        }>
          {pedidos.map((pedido, index) => (
            <div key={pedido.id} className={wrapperClass(pedido.id)}>
              {renderSelectionCheckbox(pedido.id)}
              <PedidoCard
                pedido={pedido}
              isAberto={isAberto}
              viewMode={viewMode}
              onMoverEtapa={onMoverEtapa}
              onRetrocederEtapa={onRetrocederEtapa}
              onArquivar={onArquivar}
              onDeletar={onDeletar}
              onAvisoEspera={onAvisoEspera}
              onAgendar={onAgendar}
              onCorrecaoDetalhesClick={onCorrecaoDetalhesClick}
              onFinalizarDireto={onFinalizarDireto}
              onCarregarOrdem={onCarregarOrdem}
              onEnviarAguardandoCliente={onEnviarAguardandoCliente}
              onDevolverParaFinalizado={onDevolverParaFinalizado}
              onResetarCarregamento={onResetarCarregamento}
              posicao={showPosicao ? index + 1 : undefined}
              total={showPosicao ? pedidos.length : undefined}
              disableClienteClick={disableClienteClick}
              hideOrdensStatus={hideOrdensStatus}
              hideCorrecaoButton={hideCorrecaoButton}
              // Sem dragHandleProps - não há arrastar
              // Sem onMoverPrioridade - não há botões de prioridade
              />
            </div>
          ))}
        </div>
      </>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={pedidos.map((p) => p.id)}
        strategy={verticalListSortingStrategy}
      >
        {viewMode === 'list' && <PedidosHeaderRow hideOrdensStatus={hideOrdensStatus} />}
        <div className={
          viewMode === 'list' 
            ? "space-y-1" 
            : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        }>
          {pedidos.map((pedido, index) => (
            <div key={pedido.id} className={wrapperClass(pedido.id)}>
              {renderSelectionCheckbox(pedido.id)}
              <SortableItem
                id={pedido.id}
              pedido={pedido}
              posicao={showPosicao ? index + 1 : 0}
              total={showPosicao ? pedidos.length : 0}
              isAberto={isAberto}
              viewMode={viewMode}
              onMoverEtapa={onMoverEtapa}
              onRetrocederEtapa={onRetrocederEtapa}
              onMoverPrioridade={onMoverPrioridade}
              onArquivar={onArquivar}
              onDeletar={onDeletar}
              onAvisoEspera={onAvisoEspera}
              onAgendar={onAgendar}
              onCorrecaoDetalhesClick={onCorrecaoDetalhesClick}
              onFinalizarDireto={onFinalizarDireto}
              onCarregarOrdem={onCarregarOrdem}
              onEnviarAguardandoCliente={onEnviarAguardandoCliente}
              onDevolverParaFinalizado={onDevolverParaFinalizado}
              onResetarCarregamento={onResetarCarregamento}
              disableClienteClick={disableClienteClick}
              hideOrdensStatus={hideOrdensStatus}
              hideCorrecaoButton={hideCorrecaoButton}
              />
            </div>
          ))}
        </div>
        
      </SortableContext>

      {overlayContainerRef.current && createPortal(
        <DragOverlay
          modifiers={[restrictToWindowEdges]}
          dropAnimation={{
            duration: 200,
            easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
          }}
        >
          {activePedido ? (
            <div className="opacity-90 shadow-2xl pointer-events-none">
              <PedidoCard
                pedido={activePedido}
                isAberto={isAberto}
                onMoverEtapa={onMoverEtapa}
                isDragging
                viewMode={viewMode}
              />
            </div>
          ) : null}
        </DragOverlay>,
        overlayContainerRef.current
      )}
    </DndContext>
  );
}