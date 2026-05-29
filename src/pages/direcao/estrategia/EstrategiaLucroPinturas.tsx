import { Paintbrush, Info } from "lucide-react";
import { MinimalistLayout } from "@/components/MinimalistLayout";

export default function EstrategiaLucroPinturas() {
  return (
    <MinimalistLayout
      title="Cálculo do lucro de pinturas"
      subtitle="Regra utilizada hoje para apurar o lucro das pinturas nas vendas"
      backPath="/direcao/estrategia/kits"
      breadcrumbItems={[
        { label: "Home", path: "/home" },
        { label: "Direção", path: "/direcao" },
        { label: "Estratégia", path: "/direcao/estrategia" },
        { label: "Tabela de Kits", path: "/direcao/estrategia/kits" },
        { label: "Lucro de Pinturas" },
      ]}
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-4 flex flex-wrap items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
            <Paintbrush className="h-5 w-5 text-blue-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-white font-medium truncate">Lucro de Pinturas</div>
            <div className="text-xs text-white/60">
              Configuração aplicada no faturamento das vendas com pintura
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-5 space-y-3">
          <div className="text-sm text-white/80 font-medium">Regra atual</div>
          <ul className="text-sm text-white/70 space-y-2 list-disc pl-5">
            <li>
              O lucro da pintura é apurado conforme o cálculo já realizado hoje pelo sistema no
              faturamento da venda.
            </li>
            <li>
              Pinturas Epóxi têm lucro travado por fórmula definida no módulo financeiro.
            </li>
          </ul>

          <div className="mt-2 rounded-lg border border-white/10 bg-black/30 p-4 space-y-2">
            <div className="text-xs uppercase tracking-wide text-white/50">Fórmula — Pintura Epóxi</div>
            <div className="font-mono text-sm text-blue-300">
              lucro = (altura × largura) × 25
            </div>
            <div className="font-mono text-sm text-white/70">
              custo = valor_total − lucro
            </div>
            <div className="text-xs text-white/50">
              Altura e largura em metros. O valor é aplicado automaticamente no faturamento
              para itens do tipo <span className="text-white/70">pintura_epoxi</span>.
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 backdrop-blur-xl p-4 flex items-start gap-3">
          <Info className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-white/70">
            A configuração editável dessa fórmula será disponibilizada em breve. Por enquanto a
            regra acima é aplicada conforme o cálculo atual do sistema.
          </div>
        </div>
      </div>
    </MinimalistLayout>
  );
}