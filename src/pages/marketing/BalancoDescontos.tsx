import { useMemo, useState } from "react";
import { Scale, RefreshCw, TrendingUp, TrendingDown, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { format, addMonths, subMonths, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useBalancoDescontos } from "@/hooks/useBalancoDescontos";
import { MinimalistLayout } from "@/components/MinimalistLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useConfiguracoesVendas } from "@/hooks/useConfiguracoesVendas";
import { calcDescontoTiersAplicados } from "@/utils/descontoTiers";

const formatMoeda = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const etapaLabels: Record<string, string> = {
  aberto: "Aberto",
  aprovacao_diretor: "Aprovação CEO",
  em_producao: "Em Produção",
  aguardando_pintura: "Aguardando Pintura",
  embalagem: "Embalagem",
  inspecao_qualidade: "Inspeção de Qualidade",
  aguardando_cliente: "Aguardando Cliente",
  correções: "Correções",
  correcoes: "Correções",
  instalacoes: "Instalações",
  finalizado: "Finalizado",
  reprovado: "Reprovado",
  aguardando_contrato: "Aguardando Assinatura",
  pendente_faturamento: "Pend. Faturamento",
  pendente_pedido: "Pendente Pedido",
};

const etapaColors: Record<string, string> = {
  aberto: "text-blue-400",
  aprovacao_diretor: "text-amber-400",
  em_producao: "text-sky-400",
  aguardando_pintura: "text-violet-400",
  embalagem: "text-teal-400",
  inspecao_qualidade: "text-cyan-400",
  aguardando_cliente: "text-amber-300",
  correções: "text-rose-400",
  correcoes: "text-rose-400",
  instalacoes: "text-emerald-400",
  finalizado: "text-green-400",
  reprovado: "text-red-500",
  aguardando_contrato: "text-yellow-400",
  pendente_faturamento: "text-orange-400",
  pendente_pedido: "text-slate-400",
};

const formatEtapa = (etapa: string | null | undefined) =>
  etapa && etapaLabels[etapa] ? etapaLabels[etapa] : etapa || "-";

const statusColor = (etapa: string | null | undefined) =>
  etapa && etapaColors[etapa] ? etapaColors[etapa] : "text-white/60";

export default function BalancoDescontos() {
  const hoje = new Date();
  const mesPadrao = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
  const [mes, setMes] = useState(mesPadrao);
  const [busca, setBusca] = useState("");

  const { rows: rawRows, isLoading, recalcular, isRecalculando } = useBalancoDescontos(mes);
  const { limites: limitesVendas } = useConfiguracoesVendas();
  const limAvista = limitesVendas?.avista ?? 3;
  const limPresencial = limitesVendas?.presencial ?? 5;
  const limResponsavel = limitesVendas?.adicionalResponsavel ?? 7;

  const dataMes = parseISO(`${mes}-01`);
  const mesAnterior = () => setMes(format(subMonths(dataMes, 1), "yyyy-MM"));
  const mesProximo = () => setMes(format(addMonths(dataMes, 1), "yyyy-MM"));

  const termoBusca = busca.trim().toLowerCase();
  const rows = useMemo(() => {
    if (!termoBusca) return rawRows;
    return rawRows.filter((r) => {
      const cliente = (r.vendas?.cliente_nome || "").toLowerCase();
      const vendedor = (r.vendedor?.nome || "").toLowerCase();
      return cliente.includes(termoBusca) || vendedor.includes(termoBusca);
    });
  }, [rawRows, termoBusca]);

  // Balanço = lucro - excedido (débito do excesso de desconto no lucro)
  const computeRow = (r: typeof rows[number]) => {
    const pctDado = Number(r.pct_desconto_dado);
    const total = Number(r.total_venda);
    const descontoTotal = Number(r.desconto_dado) || 0;
    const formaPg = r.vendas?.forma_pagamento || "";
    const aptoAvista = formaPg !== "" && formaPg !== "cartao_credito";
    const aptoFrio = !!r.vendas?.venda_presencial;
    const limiteBase = (aptoAvista ? limAvista : 0) + (aptoFrio ? limPresencial : 0);
    const aptoGerente = !!r.tem_autorizacao_gerente || pctDado > limiteBase;
    const pctLimiteCalc = limiteBase + (aptoGerente ? limResponsavel : 0);
    const pctLimite =
      Number(r.pct_limite_permitido) > 0
        ? Number(r.pct_limite_permitido)
        : pctLimiteCalc;
    const excedidoPct = Math.max(0, pctDado - pctLimite);
    const excedidoValor = (excedidoPct / 100) * total;
    const lucro = Number(r.vendas?.lucro_total || 0);
    const balanco = lucro - excedidoValor;
    const tiers = calcDescontoTiersAplicados({
      totalVenda: total,
      descontoTotal: descontoTotal > 0 ? descontoTotal : 0,
      formaPagamento: formaPg,
      vendaPresencial: r.vendas?.venda_presencial ?? false,
      limAvista,
      limPresencial,
      limResponsavel,
    });
    return { pctDado, total, aptoAvista, aptoFrio, aptoGerente, pctLimite, excedidoPct, excedidoValor, lucro, balanco, tiers };
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
  const { totalPositivo, totalNegativo } = totals;

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
          <div className="flex items-center bg-white/5 border border-white/10 rounded-md overflow-hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={mesAnterior}
              className="h-9 px-2 text-white hover:bg-white/10 hover:text-white"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="px-3 text-sm font-medium text-white min-w-[110px] text-center">
              {format(dataMes, "MMM yyyy", { locale: ptBR })}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={mesProximo}
              className="h-9 px-2 text-white hover:bg-white/10 hover:text-white"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
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
        </div>

        <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-white">Vendas do mês</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative mb-4 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <Input
                placeholder="Buscar cliente ou vendedor..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/40"
              />
            </div>
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
                      <TableHead className="text-white/60">Temperatura</TableHead>
                      <TableHead className="text-white/60">Data</TableHead>
                      <TableHead className="text-white/60">Cliente</TableHead>
                      <TableHead className="text-white/60 text-right">Sem Desc.</TableHead>
                      <TableHead className="text-white/60 text-right">Desconto/Acréscimo</TableHead>
                      <TableHead className="text-white/60 text-right">Total</TableHead>
                       <TableHead className="text-white/60 text-right" title="Desconto real aplicado na faixa À Vista">À Vista ({limAvista}%)</TableHead>
                       <TableHead className="text-white/60 text-right" title="Desconto real aplicado na faixa Frio (presencial)">Frio ({limPresencial}%)</TableHead>
                       <TableHead className="text-white/60 text-right" title="Desconto real aplicado na faixa Gerente (com senha)">Gerente (+{limResponsavel}%)</TableHead>
                      <TableHead className="text-white/60 text-right">% Limite</TableHead>
                      <TableHead className="text-white/60 text-right">% Dado</TableHead>
                      <TableHead className="text-white/60 text-right">Excedido</TableHead>
                      <TableHead className="text-white/60 text-right">Lucro</TableHead>
                      <TableHead className="text-white/60 text-right">Balanço</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.length === 0 ? (
                      <TableRow className="border-white/10">
                      <TableCell colSpan={16} className="text-center text-white/50">
                          Nenhuma venda no período. Clique em Recalcular.
                        </TableCell>
                      </TableRow>
                    ) : (
                      rows.map((r) => {
                        const { pctDado, total, aptoAvista, aptoFrio, aptoGerente, pctLimite, excedidoPct, excedidoValor, lucro, balanco, tiers } = computeRow(r);
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
                          <TableCell className={`whitespace-nowrap font-medium ${statusColor(r.status_venda || r.etapa_atual)}`}>
                            {formatEtapa(r.status_venda || r.etapa_atual)}
                          </TableCell>
                          <TableCell className="text-white/90">
                            {r.data_venda
                              ? format(new Date(r.data_venda), "dd/MM/yyyy", { locale: ptBR })
                              : "-"}
                          </TableCell>
                          <TableCell className="text-white/90">{r.vendas?.cliente_nome || "-"}</TableCell>
                          <TableCell className="text-white/60 text-right">{formatMoeda(semDesc)}</TableCell>
                          <TableCell className={`text-right font-medium ${pctDado < 0 ? "text-emerald-400" : pctDado > 0 ? "text-red-400" : "text-white/60"}`}>
                            {pctDado !== 0 ? formatMoeda(total - semDesc) : "-"}
                          </TableCell>
                          <TableCell className="text-white/90 text-right">{formatMoeda(Number(r.total_venda))}</TableCell>
                          <TableCell className={`text-right ${aptoAvista ? "text-white/90" : "text-white/30"}`}>
                            {aptoAvista && tiers.valorAvista > 0 ? formatMoeda(tiers.valorAvista) : "-"}
                          </TableCell>
                          <TableCell className={`text-right ${aptoFrio ? "text-white/90" : "text-white/30"}`}>
                            {aptoFrio && tiers.valorFrio > 0 ? formatMoeda(tiers.valorFrio) : "-"}
                          </TableCell>
                          <TableCell className={`text-right ${tiers.valorGerente > 0 ? "text-amber-300" : "text-white/30"}`}>
                            {tiers.valorGerente > 0 ? formatMoeda(tiers.valorGerente) : "-"}
                          </TableCell>
                          <TableCell className="text-white/50 text-right">
                            {pctLimite > 0 ? `${pctLimite.toFixed(2)}%` : "-"}
                          </TableCell>
                          <TableCell className={`text-right font-medium ${pctDado < 0 ? "text-emerald-400" : pctDado > 0 ? "text-red-400" : "text-white/90"}`}>
                            {pctDado > 0 ? `${pctDado.toFixed(2)}%` : pctDado < 0 ? `${Math.abs(pctDado).toFixed(2)}%` : "0,00%"}
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
