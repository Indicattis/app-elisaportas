import { useState } from "react";
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
import { NeoInstalacaoCardGestao } from "./NeoInstalacaoCardGestao";
import { NeoCorrecaoCardGestao } from "./NeoCorrecaoCardGestao";
import type { NeoInstalacao } from "@/types/neoInstalacao";
import type { NeoCorrecao } from "@/types/neoCorrecao";

interface SortableNeoItemProps {
  id: string;
  children: (dragHandleProps: Record<string, any>, isDragging: boolean) => React.ReactNode;
}

function SortableNeoItem({ id, children }: SortableNeoItemProps) {
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
    zIndex: isDragging ? 0 : ('auto' as const),
  };

  return (
    <div ref={setNodeRef} style={style}>
      {children({ ...attributes, ...listeners }, isDragging)}
    </div>
  );
}

interface NeoInstalacoesDraggableListProps {
  neos: NeoInstalacao[];
  viewMode?: 'grid' | 'list';
  onConcluir?: (id: string) => void;
  isConcluindo?: boolean;
  onAgendar?: (id: string) => void;
  onEditar?: (neo: NeoInstalacao) => void;
  onUpdateValor?: (id: string, data: { valor_a_receber: number | null; valor_a_receber_texto: string }) => Promise<void>;
  onReorganizar: (updates: { id: string; prioridade_gestao: number }[]) => void;
  hideValorAReceber?: boolean;
}

export function NeoInstalacoesDraggableList({
  neos,
  viewMode = 'list',
  onConcluir,
  isConcluindo,
  onAgendar,
  onEditar,
  onUpdateValor,
  onReorganizar,
  hideValorAReceber = false,
}: NeoInstalacoesDraggableListProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragStart = (event: DragStartEvent) => setActiveId(event.active.id as string);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;

    const oldIndex = neos.findIndex((n) => n.id === active.id);
    const newIndex = neos.findIndex((n) => n.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = [...neos];
    const [moved] = newOrder.splice(oldIndex, 1);
    newOrder.splice(newIndex, 0, moved);

    const updates = newOrder.map((neo, index) => ({
      id: neo.id,
      prioridade_gestao: (newOrder.length - index) * 10,
    }));
    onReorganizar(updates);
  };

  const activeNeo = activeId ? neos.find((n) => n.id === activeId) : null;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <SortableContext items={neos.map((n) => n.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-1">
          {neos.map((neo) => (
            <SortableNeoItem key={neo.id} id={neo.id}>
              {(dragHandleProps, isDragging) => (
                <NeoInstalacaoCardGestao
                  neoInstalacao={neo}
                  viewMode={viewMode}
                  onConcluir={onConcluir}
                  isConcluindo={isConcluindo}
                  onAgendar={onAgendar}
                  onEditar={onEditar}
                  onUpdateValor={onUpdateValor}
                  dragHandleProps={dragHandleProps}
                  isDragging={isDragging}
                />
              )}
            </SortableNeoItem>
          ))}
        </div>
      </SortableContext>
      {createPortal(
        <DragOverlay modifiers={[restrictToWindowEdges]} dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
          {activeNeo ? (
            <div className="opacity-90 shadow-2xl pointer-events-none">
              <NeoInstalacaoCardGestao neoInstalacao={activeNeo} viewMode={viewMode} isDragging />
            </div>
          ) : null}
        </DragOverlay>,
        document.body
      )}
    </DndContext>
  );
}

interface NeoCorrecoesDraggableListProps {
  neos: NeoCorrecao[];
  viewMode?: 'grid' | 'list';
  onConcluir?: (id: string) => void;
  isConcluindo?: boolean;
  onAgendar?: (id: string) => void;
  onEditar?: (neo: NeoCorrecao) => void;
  onUpdateValor?: (id: string, data: { valor_a_receber: number | null; valor_a_receber_texto: string }) => Promise<void>;
  onReorganizar: (updates: { id: string; prioridade_gestao: number }[]) => void;
}

export function NeoCorrecoesDraggableList({
  neos,
  viewMode = 'list',
  onConcluir,
  isConcluindo,
  onAgendar,
  onEditar,
  onUpdateValor,
  onReorganizar,
}: NeoCorrecoesDraggableListProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragStart = (event: DragStartEvent) => setActiveId(event.active.id as string);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;

    const oldIndex = neos.findIndex((n) => n.id === active.id);
    const newIndex = neos.findIndex((n) => n.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = [...neos];
    const [moved] = newOrder.splice(oldIndex, 1);
    newOrder.splice(newIndex, 0, moved);

    const updates = newOrder.map((neo, index) => ({
      id: neo.id,
      prioridade_gestao: (newOrder.length - index) * 10,
    }));
    onReorganizar(updates);
  };

  const activeNeo = activeId ? neos.find((n) => n.id === activeId) : null;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <SortableContext items={neos.map((n) => n.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-1">
          {neos.map((neo) => (
            <SortableNeoItem key={neo.id} id={neo.id}>
              {(dragHandleProps, isDragging) => (
                <NeoCorrecaoCardGestao
                  neoCorrecao={neo}
                  viewMode={viewMode}
                  onConcluir={onConcluir}
                  isConcluindo={isConcluindo}
                  onAgendar={onAgendar}
                  onEditar={onEditar}
                  onUpdateValor={onUpdateValor}
                  dragHandleProps={dragHandleProps}
                  isDragging={isDragging}
                />
              )}
            </SortableNeoItem>
          ))}
        </div>
      </SortableContext>
      {createPortal(
        <DragOverlay modifiers={[restrictToWindowEdges]} dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
          {activeNeo ? (
            <div className="opacity-90 shadow-2xl pointer-events-none">
              <NeoCorrecaoCardGestao neoCorrecao={activeNeo} viewMode={viewMode} isDragging />
            </div>
          ) : null}
        </DragOverlay>,
        document.body
      )}
    </DndContext>
  );
}
