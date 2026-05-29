import { Paintbrush } from "lucide-react";
import { MinimalistLayout } from "@/components/MinimalistLayout";
import { ConfigLucroEstatico } from "@/components/direcao/ConfigLucroEstatico";

export default function EstrategiaLucroPinturas() {
  return (
    <MinimalistLayout
      title="Cálculo do lucro de pinturas"
      subtitle="Configure como o lucro das pinturas é apurado no faturamento das vendas"
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

        <ConfigLucroEstatico tipo="pintura_epoxi" contextoLabel="pintura epóxi" />
      </div>
    </MinimalistLayout>
  );
}