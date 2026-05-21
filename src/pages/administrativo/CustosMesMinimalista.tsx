import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedBreadcrumb } from "@/components/AnimatedBreadcrumb";
import { useCustosMensais } from "@/hooks/useCustosMensais";
import { useTiposCustos } from "@/hooks/useTiposCustos";
import { formatCurrency } from "@/lib/utils";

const MESES_NOMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export default function CustosMesMinimalista() {
  const navigate = useNavigate();
  const { mes } = useParams<{ mes: string }>();
  const [mounted, setMounted] = useState(false);

  const mesDate = mes ? `${mes}-01` : "";
  const mesIndex = mes ? parseInt(mes.split("-")[1]) - 1 : 0;
  const anoMes = mes ? parseInt(mes.split("-")[0]) : new Date().getFullYear();
  const nomeMes = MESES_NOMES[mesIndex] || "";

  const { custosMes, loading: loadingCustos } = useCustosMensais(mesDate);
  const { tiposCustos, loading: loadingTipos } = useTiposCustos();

  const [formValues, setFormValues] = useState<Record<string, { valor_real: number }>>({});

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const values: Record<string, { valor_real: number }> = {};
    tiposCustos.filter(t => t.ativo).forEach(t => {
      values[t.id] = { valor_real: 0 };
    });
    // Mapeia custosMes (agregados da tabela gastos) ao tipo_custo correspondente
    custosMes.forEach(c => {
      if (c.tipo_custo_id) {
        values[c.tipo_custo_id] = { valor_real: Number(c.valor_real) || 0 };
      }
    });
    setFormValues(values);
  }, [custosMes, tiposCustos]);

  const tiposAtivos = useMemo(() => tiposCustos.filter(t => t.ativo), [tiposCustos]);

  const totalReal = Object.values(formValues).reduce((acc, v) => acc + (v.valor_real || 0), 0);
  const totalLimite = tiposAtivos.reduce((acc, t) => acc + t.valor_maximo_mensal, 0);
  const percentual = totalLimite > 0 ? (totalReal / totalLimite) * 100 : 0;

  const loading = loadingCustos || loadingTipos;

  if (loading) {
    return (
      <div className="min-h-screen bg-black p-6 space-y-6">
        <Skeleton className="h-12 w-64 bg-white/10" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-24 bg-white/10" />
          <Skeleton className="h-24 bg-white/10" />
          <Skeleton className="h-24 bg-white/10" />
        </div>
        <Skeleton className="h-96 bg-white/10" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <AnimatedBreadcrumb
        items={[
          { label: "Home", path: "/home" },
          { label: "Administrativo", path: "/administrativo" },
          { label: "Financeiro", path: "/administrativo/financeiro" },
          { label: "Custos", path: "/administrativo/financeiro/custos" },
          { label: `${nomeMes} ${anoMes}` },
        ]}
        mounted={mounted}
      />
      <button
        onClick={() => navigate("/administrativo/financeiro/custos")}
        className="fixed top-4 left-4 z-50 p-1.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/10 transition-all duration-300"
        style={{ opacity: mounted ? 1 : 0, transform: mounted ? "translateX(0)" : "translateX(-20px)", transition: "all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 100ms" }}
      >
        <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-500/20">
          <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
        </div>
      </button>

      <div className="container mx-auto p-6 pt-20 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Custos - {nomeMes} {anoMes}</h1>
            <p className="text-white/60">Valores agregados automaticamente dos lançamentos em Gastos</p>
          </div>
          <Button
            onClick={() => navigate(`/administrativo/financeiro/gastos?mes=${mes}`)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <ExternalLink className="h-4 w-4 mr-2" />Ver gastos do mês
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-white/5 border-white/10">
            <CardContent className="pt-6">
              <p className="text-sm text-white/60 mb-1">Total Lançado</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(totalReal)}</p>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="pt-6">
              <p className="text-sm text-white/60 mb-1">Limite Total</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(totalLimite)}</p>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="pt-6">
              <p className="text-sm text-white/60 mb-1">% Utilizado</p>
              <p className={`text-2xl font-bold ${percentual > 100 ? "text-red-400" : percentual > 80 ? "text-amber-400" : "text-green-400"}`}>
                {percentual.toFixed(1)}%
              </p>
              <div className="mt-2 h-2 rounded-full overflow-hidden bg-white/10">
                <div className={`h-full rounded-full transition-all ${percentual > 100 ? "bg-red-400" : percentual > 80 ? "bg-amber-400" : "bg-green-400"}`} style={{ width: `${Math.min(percentual, 100)}%` }} />
              </div>
            </CardContent>
          </Card>
        </div>

        {tiposAtivos.length === 0 ? (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="py-12 text-center text-white/50">
              Nenhum tipo de custo configurado. Configure os tipos de custos primeiro.
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="pt-6 space-y-3">
              {tiposAtivos.map((tipo) => {
                const vals = formValues[tipo.id] || { valor_real: 0 };
                const tipoPercentual = tipo.valor_maximo_mensal > 0 ? (vals.valor_real / tipo.valor_maximo_mensal) * 100 : 0;
                return (
                  <div key={tipo.id} className="flex flex-col md:flex-row md:items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">{tipo.nome}</p>
                      <p className="text-xs text-white/40">
                        Limite: {formatCurrency(tipo.valor_maximo_mensal)}
                        {tipo.tipo === "fixa" ? " • Fixa" : " • Variável"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-40 text-right font-medium text-white tabular-nums">
                        {formatCurrency(vals.valor_real)}
                      </div>
                      {tipo.valor_maximo_mensal > 0 && (
                        <span className={`text-xs font-medium w-12 text-right ${tipoPercentual > 100 ? "text-red-400" : tipoPercentual > 80 ? "text-amber-400" : "text-green-400"}`}>
                          {tipoPercentual.toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
