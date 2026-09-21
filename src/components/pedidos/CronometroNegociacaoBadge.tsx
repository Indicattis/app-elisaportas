import { useEffect, useMemo, useState } from "react";
import { Handshake } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatCronometroExtended } from "@/utils/timeFormat";
import { cn } from "@/lib/utils";

interface CronometroNegociacaoBadgeProps {
  iniciadaEm?: string | null;
  tempoAcumuladoSegundos?: number | null;
}

export function CronometroNegociacaoBadge({
  iniciadaEm,
  tempoAcumuladoSegundos = 0,
}: CronometroNegociacaoBadgeProps) {
  const [agora, setAgora] = useState(() => Date.now());

  useEffect(() => {
    if (!iniciadaEm) return;
    const interval = window.setInterval(() => setAgora(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [iniciadaEm]);

  const segundosTotais = useMemo(() => {
    const acumulado = Math.max(0, Number(tempoAcumuladoSegundos) || 0);
    if (!iniciadaEm) return acumulado;
    const inicio = new Date(iniciadaEm).getTime();
    if (!Number.isFinite(inicio)) return acumulado;
    return acumulado + Math.max(0, Math.floor((agora - inicio) / 1000));
  }, [agora, iniciadaEm, tempoAcumuladoSegundos]);

  if (!iniciadaEm && segundosTotais === 0) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          className="border-yellow-500/50 bg-yellow-500/10 px-1 py-0 font-mono text-[10px] text-yellow-400"
        >
          <Handshake className={cn("mr-0.5 h-2.5 w-2.5", iniciadaEm && "animate-pulse")} />
          {formatCronometroExtended(segundosTotais)}
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="top">
        <p className="text-xs">
          {iniciadaEm ? "Tempo acumulado em negociação" : "Negociação encerrada — tempo acumulado"}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}