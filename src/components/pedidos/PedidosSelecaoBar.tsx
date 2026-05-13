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
  if (selecionadosCount === 0) return null;
  const todosSelecionados = selecionadosCount >= totalFiltrados && totalFiltrados > 0;

  return (
    <div className="flex flex-wrap items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/30 backdrop-blur-xl">
      <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30">
        {selecionadosCount} selecionado{selecionadosCount === 1 ? "" : "s"}
      </Badge>

      {!todosSelecionados && (
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

      <div className="h-4 w-px bg-white/20" />

      <Button
        variant="ghost"
        size="sm"
        onClick={onGerarLista}
        disabled={isGerandoLista}
        className="h-7 px-2 text-xs text-white/90 hover:text-white hover:bg-white/10 gap-1"
      >
        <ShoppingCart className="h-3.5 w-3.5" />
        {isGerandoLista ? "Gerando..." : "Lista de material"}
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={onImprimir}
        disabled={isImprimindo}
        className="h-7 px-2 text-xs text-white/90 hover:text-white hover:bg-white/10 gap-1"
      >
        <Printer className="h-3.5 w-3.5" />
        {isImprimindo ? "Preparando..." : "Imprimir pedidos"}
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={onLimpar}
        className="h-7 px-2 text-xs text-white/60 hover:text-white hover:bg-white/10 gap-1 ml-auto"
      >
        <X className="h-3.5 w-3.5" />
        Limpar
      </Button>
    </div>
  );
}