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
import { VendaPendentePedidoCard } from "./VendaPendentePedidoCard";
import { VendasHeaderRow } from "./VendasHeaderRow";
import type { VendaPendentePedido } from "@/hooks/useVendasPendentePedido";

interface VendasPendenteDraggableListProps {
  vendas: VendaPendentePedido[];
  onReorganizar: (vendas: VendaPendentePedido[]) => void;
  mode?: 'pedido' | 'faturamento' | 'contrato';
}

function SortableVendaItem({ venda, mode }: { venda: VendaPendentePedido; mode?: 'pedido' | 'faturamento' | 'contrato' }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: venda.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <VendaPendentePedidoCard
        venda={venda}
        isDragging={isDragging}
        dragHandleProps={{ ...attributes, ...listeners }}
        mode={mode}
      />
    </div>
  );
}

export function VendasPendenteDraggableList({
  vendas,
  onReorganizar,
  mode = 'pedido',
}: VendasPendenteDraggableListProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const overlayContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const div = document.createElement("div");
    div.id = "dnd-vendas-overlay";
    document.body.appendChild(div);
    overlayContainerRef.current = div;
    return () => {
      if (div.parentNode) div.parentNode.removeChild(div);
      overlayContainerRef.current = null;
    };
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;

    const oldIndex = vendas.findIndex((v) => v.id === active.id);
    const newIndex = vendas.findIndex((v) => v.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = [...vendas];
    const [moved] = newOrder.splice(oldIndex, 1);
    newOrder.splice(newIndex, 0, moved);
    onReorganizar(newOrder);
  };

  const activeVenda = activeId ? vendas.find((v) => v.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={vendas.map((v) => v.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-1">
          <VendasHeaderRow mode={mode} />
          {vendas.map((venda) => (
            <SortableVendaItem key={venda.id} venda={venda} mode={mode} />
          ))}
        </div>
      </SortableContext>

      {overlayContainerRef.current &&
        createPortal(
          <DragOverlay
            modifiers={[restrictToWindowEdges]}
            dropAnimation={{ duration: 200, easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)" }}
          >
            {activeVenda ? (
              <div className="opacity-90 shadow-2xl pointer-events-none">
                <VendaPendentePedidoCard venda={activeVenda} isDragging mode={mode} />
              </div>
            ) : null}
          </DragOverlay>,
          overlayContainerRef.current
        )}
    </DndContext>
  );
}
