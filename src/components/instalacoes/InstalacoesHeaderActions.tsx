import { useNavigate, useLocation } from "react-router-dom";
import { HardHat, Users, CalendarDays, Trophy, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const items = [
  { label: "Ordens", icon: HardHat, path: "/logistica/instalacoes" },
  { label: "Equipes", icon: Users, path: "/logistica/instalacoes/equipes" },
  { label: "Cronograma", icon: CalendarDays, path: "/logistica/instalacoes/cronograma" },
  { label: "Ranking Equipes", icon: Trophy, path: "/logistica/instalacoes/ranking" },
  { label: "Ranking Autorizados", icon: Award, path: "/logistica/instalacoes/ranking-autorizados" },
];

interface Props {
  className?: string;
}

export function InstalacoesHeaderActions({ className }: Props) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path
          || (item.path === "/logistica/instalacoes" && location.pathname === "/logistica/instalacoes/ordens-instalacoes");
        return (
          <Button
            key={item.path}
            size="sm"
            onClick={() => navigate(item.path)}
            className={cn(
              "h-10 px-5 rounded-lg border text-white transition-all duration-300 text-xs gap-1.5",
              isActive
                ? "bg-gradient-to-r from-blue-500 to-blue-700 border-blue-400/30 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-[1.02]"
                : "bg-gradient-to-r from-blue-500/20 to-blue-600/20 border-blue-400/20 shadow-lg shadow-blue-500/10 hover:from-blue-500/30 hover:to-blue-600/30 hover:scale-[1.02]",
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{item.label}</span>
          </Button>
        );
      })}
    </div>
  );
}
