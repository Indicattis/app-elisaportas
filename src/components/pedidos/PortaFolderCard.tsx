import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { FolderOpen, Folder, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CategoriaLinha } from "@/hooks/usePedidoLinhas";

interface PortaFolderCardProps {
  label: string;
  dimensoes?: string;
  linhasCount?: number;
  categorias?: CategoriaLinha[];
  statusBadge?: string;
  statusVariant?: 'default' | 'secondary' | 'outline' | 'destructive';
  observacao?: string | null;
  isOpen: boolean;
  onClick: () => void;
}

const CATEGORIA_LABELS: Record<CategoriaLinha, string> = {
  separacao: 'Sep',
  solda: 'Solda',
  perfiladeira: 'Perf',
};

const CATEGORIA_COLORS: Record<CategoriaLinha, string> = {
  separacao: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
  solda: 'bg-orange-500/10 text-orange-700 border-orange-500/20',
  perfiladeira: 'bg-purple-500/10 text-purple-700 border-purple-500/20',
};

export function PortaFolderCard({
  label,
  dimensoes,
  linhasCount,
  categorias = [],
  statusBadge,
  statusVariant = 'secondary',
  observacao,
  isOpen,
  onClick,
}: PortaFolderCardProps) {
  const uniqueCategorias = [...new Set(categorias)];

  return (
    <Card
      className={cn(
        "p-3 cursor-pointer transition-all hover:shadow-md border-2",
        isOpen
          ? "border-primary bg-primary/5 shadow-md"
          : "border-transparent hover:border-primary/30"
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-2">
        {isOpen ? (
          <FolderOpen className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        ) : (
          <Folder className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
        )}
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="text-sm font-semibold leading-tight truncate">{label}</p>
          {dimensoes && (
            <p className="text-xs text-muted-foreground">{dimensoes}</p>
          )}
          {observacao && observacao.trim().length > 0 && (
            <p className="text-xs text-primary/80 italic truncate" title={observacao}>
              “{observacao}”
            </p>
          )}
          <div className="flex items-center gap-1.5 flex-wrap">
            {statusBadge ? (
              <Badge variant={statusVariant} className="text-[10px] h-5">
                {statusBadge}
              </Badge>
            ) : linhasCount !== undefined ? (
              <Badge variant="secondary" className="text-[10px] h-5">
                {linhasCount} {linhasCount === 1 ? 'item' : 'itens'}
              </Badge>
            ) : null}
            {uniqueCategorias.map((cat) => (
              <Badge
                key={cat}
                variant="outline"
                className={cn("text-[10px] h-5", CATEGORIA_COLORS[cat])}
              >
                {CATEGORIA_LABELS[cat]}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

export function SemProdutoFolderCard({
  linhasCount,
  isOpen,
  onClick,
}: {
  linhasCount: number;
  isOpen: boolean;
  onClick: () => void;
}) {
  return (
    <Card
      className={cn(
        "p-3 cursor-pointer transition-all hover:shadow-md border-2 border-dashed",
        isOpen
          ? "border-primary bg-primary/5 shadow-md"
          : "border-muted-foreground/20 hover:border-primary/30"
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-2">
        <Package className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="text-sm font-semibold leading-tight">Sem produto</p>
          <Badge variant="secondary" className="text-[10px] h-5">
            {linhasCount} {linhasCount === 1 ? 'item' : 'itens'}
          </Badge>
        </div>
      </div>
    </Card>
  );
}
