import { Wrench, Info } from "lucide-react";
import { MinimalistLayout } from "@/components/MinimalistLayout";

export default function EstrategiaLucroInstalacoes() {
  return (
    <MinimalistLayout
      title="Cálculo do lucro de instalações"
      subtitle="Regra utilizada hoje para apurar o lucro das instalações nas vendas"
      backPath="/direcao/estrategia/kits"
      breadcrumbItems={[
        { label: "Home", path: "/home" },
        { label: "Direção", path: "/direcao" },
        { label: "Estratégia", path: "/direcao/estrategia" },
        { label: "Tabela de Kits", path: "/direcao/estrategia/kits" },
        { label: "Lucro de Instalações" },
      ]}
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-4 flex flex-wrap items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
            <Wrench className="h-5 w-5 text-blue-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-white font-medium truncate">Lucro de Instalações</div>
            <div className="text-xs text-white/60">
              Configuração aplicada no faturamento das vendas com produto do tipo instalação
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-5 space-y-3">
          <div className="text-sm text-white/80 font-medium">Regra atual</div>
          <ul className="text-sm text-white/70 space-y-2 list-disc pl-5">
            <li>
              <span className="text-white">Lucro</span> = 40% do valor total da instalação
            </li>
            <li>
              <span className="text-white">Custo</span> = 60% do valor total da instalação
            </li>
            <li>
              O faturamento da instalação é gerado automaticamente quando a venda é processada.
            </li>
          </ul>
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