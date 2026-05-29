import { useQuery } from "@tanstack/react-query";
import { Package, Wrench, Paintbrush } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useConfigLucro } from "@/hooks/useConfigLucro";

type Tab = "portas" | "instalacoes" | "pinturas";

const fmtPct = (n: number) =>
  `${n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
const fmtBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function ShellCard({
  icon: Icon,
  iconClass,
  title,
  subtitle,
  children,
}: {
  icon: typeof Package;
  iconClass?: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center border ${iconClass ?? "bg-blue-500/10 border-blue-500/30"}`}>
          <Icon className="h-5 w-5 text-blue-300" />
        </div>
        <div className="min-w-0">
          <div className="text-white font-medium truncate">{title}</div>
          <div className="text-xs text-white/60">{subtitle}</div>
        </div>
      </div>
      {children}
    </div>
  );
}

function MetricBox({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "profit";
}) {
  const cls =
    tone === "profit"
      ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-200"
      : "border-white/10 bg-black/30 text-white";
  const labelCls =
    tone === "profit"
      ? "text-emerald-300/70"
      : "text-white/50";
  return (
    <div className={`rounded-lg border p-3 ${cls}`}>
      <div className={`text-[11px] uppercase tracking-wide ${labelCls}`}>{label}</div>
      <div className="font-mono text-base">{value}</div>
    </div>
  );
}

function PortasShowcase() {
  const { data, isLoading } = useQuery({
    queryKey: ["kits-showcase-medias-portas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tabela_precos_portas")
        .select("id, valor_porta, lucro, ativo")
        .eq("ativo", true);
      if (error) throw error;
      const rows = (data ?? []).filter(
        (r: any) => Number(r.valor_porta) > 0 && r.lucro != null,
      );
      if (rows.length === 0) {
        return { count: 0, custoPct: 0, lucroPct: 0 };
      }
      const lucroPcts = rows.map(
        (r: any) => (Number(r.lucro) / Number(r.valor_porta)) * 100,
      );
      const lucroPct =
        lucroPcts.reduce((a, b) => a + b, 0) / lucroPcts.length;
      return {
        count: rows.length,
        lucroPct,
        custoPct: 100 - lucroPct,
      };
    },
  });

  return (
    <ShellCard
      icon={Package}
      title="Média dos kits de portas"
      subtitle={
        isLoading
          ? "Calculando médias…"
          : `Baseado em ${data?.count ?? 0} kit${(data?.count ?? 0) === 1 ? "" : "s"} ativo${(data?.count ?? 0) === 1 ? "" : "s"}`
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <MetricBox
          label="Custo médio"
          value={isLoading || !data ? "—" : fmtPct(data.custoPct)}
        />
        <MetricBox
          label="Lucro médio"
          tone="profit"
          value={isLoading || !data ? "—" : fmtPct(data.lucroPct)}
        />
      </div>
    </ShellCard>
  );
}

function ConfigShowcase({ tab }: { tab: "instalacoes" | "pinturas" }) {
  const tipo = tab === "instalacoes" ? "instalacao" : "pintura_epoxi";
  const { data, isLoading } = useConfigLucro(tipo as any);
  const Icon = tab === "instalacoes" ? Wrench : Paintbrush;
  const title =
    tab === "instalacoes"
      ? "Configuração ativa — Instalação"
      : "Configuração ativa — Pintura epóxi";
  const subtitle = "Aplicado no faturamento das vendas vinculadas";

  const isFormula =
    tab === "pinturas" && data?.modo === "formula_dimensao";
  const valorM2 = Number(data?.parametros?.valor_m2);
  const valorM2Valido = Number.isFinite(valorM2) && valorM2 > 0;

  const custoPct = Number(data?.percentual_custo ?? 0);
  const lucroPct = Math.max(0, 100 - custoPct);
  const exemploValor = 1000;
  const exemploCusto = (exemploValor * custoPct) / 100;
  const exemploLucro = exemploValor - exemploCusto;

  const exemploAltura = 3;
  const exemploLargura = 2.5;
  const exemploLucroFormula = valorM2Valido
    ? exemploAltura * exemploLargura * valorM2
    : 0;

  return (
    <ShellCard icon={Icon} title={title} subtitle={subtitle}>
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-[58px] rounded-lg border border-white/10 bg-white/[0.03] animate-pulse"
            />
          ))}
        </div>
      ) : isFormula ? (
        <div className="space-y-3">
          <div className="rounded-lg border border-white/10 bg-black/30 p-3 space-y-1">
            <div className="text-[11px] uppercase tracking-wide text-white/50">
              Fórmula ativa
            </div>
            <div className="font-mono text-sm text-blue-300">
              lucro = altura × largura × R$ {valorM2Valido ? valorM2.toFixed(2) : "?"}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <MetricBox
              label="Exemplo 3,00 × 2,50 m (7,5 m²)"
              value=""
            />
            <MetricBox
              label="Lucro de exemplo"
              tone="profit"
              value={fmtBRL(exemploLucroFormula)}
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricBox label="Custo %" value={fmtPct(custoPct)} />
          <MetricBox label="Lucro %" tone="profit" value={fmtPct(lucroPct)} />
          <MetricBox label="Custo em R$ 1.000" value={fmtBRL(exemploCusto)} />
          <MetricBox
            label="Lucro em R$ 1.000"
            tone="profit"
            value={fmtBRL(exemploLucro)}
          />
        </div>
      )}
    </ShellCard>
  );
}

export function KitsShowcaseCard({ tab }: { tab: Tab }) {
  if (tab === "portas") return <PortasShowcase />;
  return <ConfigShowcase tab={tab} />;
}

export default KitsShowcaseCard;