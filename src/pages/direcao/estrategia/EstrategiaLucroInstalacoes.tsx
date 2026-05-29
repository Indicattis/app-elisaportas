import { Wrench } from "lucide-react";
import { MinimalistLayout } from "@/components/MinimalistLayout";
import { ConfigLucroEstatico } from "@/components/direcao/ConfigLucroEstatico";

export default function EstrategiaLucroInstalacoes() {
  return (
    <MinimalistLayout
      title="Cálculo do lucro de instalações"
      subtitle="Configure como o lucro das instalações é apurado no faturamento das vendas"
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

        <ConfigLucroEstatico tipo="instalacao" contextoLabel="instalação" />
      </div>
    </MinimalistLayout>
  );
}