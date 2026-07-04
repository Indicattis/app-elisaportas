import { MapPin, Users, Building2, GripVertical } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Estado } from '@/hooks/useEstadosCidades';

interface EstadoCardProps {
  estado: Estado;
  onClick: () => void;
  isSelected: boolean;
}

function CoberturaBadge({ estado }: { estado: Estado }) {
  const pct = Number(estado.percentualCobertura ?? 0);
  const color =
    pct >= 80
      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30'
      : pct >= 50
      ? 'bg-amber-500/15 text-amber-300 border-amber-400/30'
      : 'bg-rose-500/15 text-rose-300 border-rose-400/30';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-semibold tabular-nums',
        color,
      )}
      title={`${estado.cidadesCobertas ?? 0} de ${estado.totalCidades} cidades atingem a meta`}
    >
      {pct.toFixed(1)}%
    </span>
  );
}

export function EstadoCard({ estado, onClick, isSelected }: EstadoCardProps) {
  return (
    <Card
      className={cn(
        "cursor-pointer transition-all duration-300 bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/10 hover:border-blue-400/30 hover:shadow-lg hover:shadow-blue-500/10",
        isSelected && "ring-2 ring-blue-400/40 border-blue-400/40"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">{estado.sigla}</h3>
            <p className="text-sm text-white/60">{estado.nome}</p>
          </div>
          <div className="flex items-center gap-2">
            <CoberturaBadge estado={estado} />
            <MapPin className="h-6 w-6 text-blue-400/70" />
          </div>
        </div>
        <div className="mt-3 flex gap-4 text-xs text-white/70">
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            <span>{estado.totalAutorizados} autorizados</span>
          </div>
          <div className="flex items-center gap-1">
            <Building2 className="h-3 w-3" />
            <span>{estado.totalCidades} cidades</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface SortableEstadoCardProps {
  estado: Estado;
  onClick: () => void;
  isSelected: boolean;
}

export function SortableEstadoCard({ estado, onClick, isSelected }: SortableEstadoCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: estado.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card
        className={cn(
          "cursor-pointer transition-all duration-300 bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/10 hover:border-blue-400/30 hover:shadow-lg hover:shadow-blue-500/10",
          isSelected && "ring-2 ring-blue-400/40 border-blue-400/40",
          isDragging && "shadow-xl shadow-blue-500/20"
        )}
        onClick={onClick}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-white/10 touch-none"
                {...attributes}
                {...listeners}
                onClick={(e) => e.stopPropagation()}
              >
                <GripVertical className="h-4 w-4 text-white/40" />
              </button>
              <div>
                <h3 className="text-lg font-bold text-white">{estado.sigla}</h3>
                <p className="text-sm text-white/60">{estado.nome}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CoberturaBadge estado={estado} />
              <MapPin className="h-6 w-6 text-blue-400/70" />
            </div>
          </div>
          <div className="mt-3 flex gap-4 text-xs text-white/70">
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              <span>{estado.totalAutorizados} autorizados</span>
            </div>
            <div className="flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              <span>{estado.totalCidades} cidades</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
