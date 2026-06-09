import { useMemo, useState } from "react";
import { Scale, RefreshCw, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useBalancoDescontos } from "@/hooks/useBalancoDescontos";
import { MinimalistLayout } from "@/components/MinimalistLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const formatMoeda = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export default function BalancoDescontos() {
  const hoje = new Date();
  const mesPadrao = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
  const [mes, setMes] = useState(mesPadrao);

  const { rows, isLoading, recalcular, isRecalculando } = useBalancoDescontos(mes);

  // Balanço = lucro - excedido (débito do excesso de desconto no lucro)
  const computeRow = (r: typeof rows[number]) => {
    const pctDado = Number(r.pct_desconto_dado);
    const total = Number(r.total_venda);
    const formaPg = r.vendas?.forma_pagamento || "";
    const aptoAvista = formaPg !== "" && formaPg !== "cartao_credito";
    const aptoFrio = !!r.vendas?.venda_presencial;
    const limiteBase = (aptoAvista ? 3 : 0) + (aptoFrio ? 5 : 0);
    const aptoGerente = !!r.tem_autorizacao_gerente || pctDado > limiteBase;
    const pctLimiteCalc = limiteBase + (aptoGerente ? 7 : 0);
    const pctLimite =
      Number(r.pct_limite_permitido) > 0
        ? Number(r.pct_limite_permitido)
        : pctLimiteCalc;
    const excedidoPct = Math.max(0, pctDado - pctLimite);
    const excedidoValor = (excedidoPct / 100) * total;
    const lucro = Number(r.vendas?.lucro_total || 0);
    const balanco = lucro - excedidoValor;
    return { pctDado, total, aptoAvista, aptoFrio, aptoGerente, pctLimite, excedidoPct, excedidoValor, lucro, balanco };
  };

  const totals = useMemo(() => {
    let pos = 0, neg = 0;
    rows.forEach((r) => {
      const { balanco } = computeRow(r);
      if (balanco > 0) pos += balanco;
      else if (balanco < 0) neg += balanco;
    });
    return { totalPositivo: pos, totalNegativo: neg, saldo: pos + neg };
  }, [rows]);
  const { totalPositivo, totalNegativo, saldo } = totals;

  return (
    <MinimalistLayout
      title="Balanço de Descontos"
      subtitle="Positivo: desconto permitido não dado. Negativo: desconto acima do limite."
      backPath="/marketing"
      breadcrumbItems={[
        { label: "Home", path: "/home" },
        { label: "Marketing", path: "/marketing" },
        { label: "Balanço de Descontos" },
      ]}
      fullWidth
      contentClassName="px-[100px]"
      headerActions={
        <div className="flex items-center gap-2">
          <Input
            type="month"
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            className="w-[160px] bg-white/5 border-white/10 text-white"
          />
          <Button
            onClick={() => recalcular()}
            disabled={isRecalculando}
            className="bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-400 hover:to-blue-600 text-white border-0"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRecalculando ? "animate-spin" : ""}`} />
            Recalcular
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-emerald-400">
                <TrendingUp className="w-4 h-4" /> Balanço Positivo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-emerald-400">{formatMoeda(totalPositivo)}</div>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-red-400">
                <TrendingDown className="w-4 h-4" /> Balanço Negativo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-red-400">{formatMoeda(totalNegativo)}</div>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-white/80">Saldo Líquido</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={`text-xl font-bold ${
                  saldo >= 0 ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {formatMoeda(saldo)}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-white">Vendas do mês</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full bg-white/10" />
                <Skeleton className="h-10 w-full bg-white/10" />
                <Skeleton className="h-10 w-full bg-white/10" />
              </div>
            ) : (
              <div className="rounded-md border border-white/10 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 hover:bg-transparent">
                      <TableHead className="text-white/60">Vendedor</TableHead>
                      <TableHead className="text-white/60">Status</TableHead>
                      <TableHead className="text-white/60">Data</TableHead>
                      <TableHead className="text-white/60">Cliente</TableHead>
                      <TableHead className="text-white/60 text-right">Sem Desc.</TableHead>
                      <TableHead className="text-white/60 text-right">Total</TableHead>
                      <TableHead className="text-white/60 text-right">% Dado</TableHead>
                       <TableHead className="text-white/60 text-right">À Vista (3%)</TableHead>
                       <TableHead className="text-white/60 text-right">Frio (5%)</TableHead>
                       <TableHead className="text-white/60 text-right">Gerente (+7%)</TableHead>
                      <TableHead className="text-white/60 text-right">% Limite</TableHead>
                      <TableHead className="text-white/60 text-right">Excedido</TableHead>
                      <TableHead className="text-white/60 text-right">Lucro</TableHead>
                      <TableHead className="text-white/60 text-right">Balanço</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.length === 0 ? (
                      <TableRow className="border-white/10">
                        <TableCell colSpan={13} className="text-center text-white/50">
                          Nenhuma venda no período. Clique em Recalcular.
                        </TableCell>
                      </TableRow>
                    ) : (
                      rows.map((r) => {
                        const { pctDado, total, aptoAvista, aptoFrio, aptoGerente, pctLimite, excedidoPct, excedidoValor, lucro, balanco } = computeRow(r);
                        const check = (limite: number) =>
                          pctDado <= limite ? "text-emerald-400" : "text-red-400";
                        const semDesc = pctDado !== 100 ? total / (1 - pctDado / 100) : total;
                        return (
                        <TableRow key={r.id} className="border-white/10 hover:bg-white/5">
                          <TableCell>
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={r.vendedor?.foto_perfil_url || undefined} alt={r.vendedor?.nome || "Vendedor"} />
                              <AvatarFallback className="bg-white/10 text-white/70 text-xs">
                                {(r.vendedor?.nome || "?").slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          </TableCell>
                          <TableCell className="text-white/90">
                            {r.data_venda
                              ? format(new Date(r.data_venda), "dd/MM/yyyy", { locale: ptBR })
                              : "-"}
                          </TableCell>
                          <TableCell className="text-white/90">{r.vendas?.cliente_nome || "-"}</TableCell>
                          <TableCell className="text-white/60 text-right">{formatMoeda(semDesc)}</TableCell>
                          <TableCell className="text-white/90 text-right">{formatMoeda(Number(r.total_venda))}</TableCell>
                          <TableCell className="text-white/90 text-right">
                            {pctDado.toFixed(2)}%
                          </TableCell>
                          <TableCell className={`text-right ${aptoAvista ? check(3) : "text-white/30"}`}>
                            {aptoAvista ? formatMoeda(0.03 * total) : "-"}
                          </TableCell>
                          <TableCell className={`text-right ${aptoFrio ? check(5) : "text-white/30"}`}>
                            {aptoFrio ? formatMoeda(0.05 * total) : "-"}
                          </TableCell>
                          <TableCell className={`text-right ${aptoGerente ? check(pctLimite) : "text-white/30"}`}>
                            {aptoGerente ? formatMoeda(0.07 * total) : "-"}
                          </TableCell>
                          <TableCell className="text-white/50 text-right">
                            {pctLimite > 0 ? `${pctLimite.toFixed(2)}%` : "-"}
                          </TableCell>
                          <TableCell className={`text-right font-medium ${excedidoPct > 0 ? "text-red-400" : "text-white/40"}`}>
                            {excedidoPct > 0 ? `${excedidoPct.toFixed(2)}% (${formatMoeda(excedidoValor)})` : "-"}
                          </TableCell>
                          <TableCell className="text-right text-white/90">
                            {formatMoeda(lucro)}
                          </TableCell>
                          <TableCell
                            className={`text-right font-semibold ${
                              balanco >= 0 ? "text-emerald-400" : "text-red-400"
                            }`}
                          >
                            {formatMoeda(balanco)}
                          </TableCell>
                        </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MinimalistLayout>
  );
}
