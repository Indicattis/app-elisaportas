import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Printer, X, CheckSquare } from "lucide-react";

interface PedidosSelecaoBarProps {
  selecionadosCount: number;
  totalFiltrados: number;
  onSelecionarTodos: () => void;
  onLimpar: () => void;
  onGerarLista: () => void;
  onImprimir: () => void;
  isGerandoLista?: boolean;
  isImprimindo?: boolean;
}

export function PedidosSelecaoBar({
  selecionadosCount,
  totalFiltrados,
  onSelecionarTodos,
  onLimpar,
  onGerarLista,
  onImprimir,
  isGerandoLista,
  isImprimindo,
}: PedidosSelecaoBarProps) {
  const hasSelecao = selecionadosCount > 0;
  const todosSelecionados = hasSelecao && selecionadosCount >= totalFiltrados && totalFiltrados > 0;
  const escopoLabel = hasSelecao
    ? `${selecionadosCount} selecionado${selecionadosCount === 1 ? "" : "s"}`
    : `Todos (${totalFiltrados})`;

  return (
    <div className="flex flex-wrap items-center gap-2 px-3 h-10 rounded-lg bg-white/5 border border-white/10 backdrop-blur-xl">
      <Badge
        variant="secondary"
        className={
          hasSelecao
            ? "bg-blue-500/20 text-blue-200 border-blue-400/40"
            : "bg-white/10 text-white/70 border-white/15"
        }
      >
        {escopoLabel}
      </Badge>

      {hasSelecao && !todosSelecionados && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onSelecionarTodos}
          className="h-7 px-2 text-xs text-white/80 hover:text-white hover:bg-white/10 gap-1"
        >
          <CheckSquare className="h-3.5 w-3.5" />
          Selecionar todos ({totalFiltrados})
        </Button>
      )}

      <div className="h-4 w-px bg-white/15" />

      <Button
        variant="ghost"
        size="sm"
        onClick={onGerarLista}
        disabled={isGerandoLista || totalFiltrados === 0}
        className="h-7 px-2 text-xs text-white/90 hover:text-white hover:bg-white/10 gap-1"
      >
        <ShoppingCart className="h-3.5 w-3.5" />
        {isGerandoLista ? "Gerando..." : "Lista de material"}
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={onImprimir}
        disabled={isImprimindo || totalFiltrados === 0}
        className="h-7 px-2 text-xs text-white/90 hover:text-white hover:bg-white/10 gap-1"
      >
        <Printer className="h-3.5 w-3.5" />
        {isImprimindo ? "Preparando..." : "Imprimir pedidos"}
      </Button>

      {hasSelecao && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onLimpar}
          className="h-7 px-2 text-xs text-white/60 hover:text-white hover:bg-white/10 gap-1 ml-auto"
        >
          <X className="h-3.5 w-3.5" />
          Limpar
        </Button>
      )}
    </div>
  );
}