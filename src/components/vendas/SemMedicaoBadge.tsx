import { Ruler } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useVendaTemMedicao } from "@/hooks/useVendaTemMedicao";
import { cn } from "@/lib/utils";

interface Props {
  vendaId?: string | null;
  variant?: "full" | "compact";
  className?: string;
}

export function SemMedicaoBadge({ vendaId, variant = "full", className }: Props) {
  const { exigeMedicao, temMedicao, loading } = useVendaTemMedicao(vendaId);
  if (loading || !exigeMedicao || temMedicao) return null;

  const tooltipText =
    "Nenhuma visita técnica concluída foi encontrada para este cliente. As medidas foram digitadas manualmente no cadastro da venda.";

  if (variant === "compact") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "inline-flex items-center justify-center h-4 w-4 rounded border bg-amber-500/15 text-amber-300 border-amber-500/40 shrink-0",
              className
            )}
            aria-label="Sem folha de medição"
          >
            <Ruler className="h-3 w-3" />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs">
          <div className="font-semibold mb-0.5">Sem folha de medição</div>
          {tooltipText}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border bg-amber-500/10 text-amber-300 border-amber-500/40 cursor-help",
            className
          )}
        >
          <Ruler className="h-3 w-3" />
          Sem folha de medição
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-xs">
        {tooltipText}
      </TooltipContent>
    </Tooltip>
  );
}