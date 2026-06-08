import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Scale, RefreshCw, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useBalancoDescontos } from "@/hooks/useBalancoDescontos";

const formatMoeda = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export default function BalancoDescontos() {
  const navigate = useNavigate();
  const hoje = new Date();
  const mesPadrao = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
  const [mes, setMes] = useState(mesPadrao);

  const { rows, isLoading, totalPositivo, totalNegativo, saldo, recalcular, isRecalculando } =
    useBalancoDescontos(mes);

  return (
    <div className="space-y-4 sm:space-y-6 w-full p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/marketing")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="p-2 rounded-lg bg-primary/10">
            <Scale className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Balanço de Descontos</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Positivo: desconto permitido não dado. Negativo: desconto acima do limite.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="month"
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            className="w-[160px]"
          />
          <Button onClick={() => recalcular()} disabled={isRecalculando} variant="outline">
            <RefreshCw className={`w-4 h-4 mr-2 ${isRecalculando ? "animate-spin" : ""}`} />
            Recalcular
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-emerald-600">
              <TrendingUp className="w-4 h-4" /> Balanço Positivo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-emerald-600">{formatMoeda(totalPositivo)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-red-600">
              <TrendingDown className="w-4 h-4" /> Balanço Negativo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-red-600">{formatMoeda(totalNegativo)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Saldo Líquido</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-xl font-bold ${
                saldo >= 0 ? "text-emerald-600" : "text-red-600"
              }`}
            >
              {formatMoeda(saldo)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vendas do mês</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">% Dado</TableHead>
                    <TableHead className="text-right">% Limite</TableHead>
                    <TableHead className="text-right">Balanço</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        Nenhuma venda no período. Clique em Recalcular.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          {r.data_venda
                            ? format(new Date(r.data_venda), "dd/MM/yyyy", { locale: ptBR })
                            : "-"}
                        </TableCell>
                        <TableCell>{r.vendas?.cliente_nome || "-"}</TableCell>
                        <TableCell className="text-right">{formatMoeda(Number(r.total_venda))}</TableCell>
                        <TableCell className="text-right">
                          {Number(r.pct_desconto_dado).toFixed(2)}%
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {Number(r.pct_limite_permitido).toFixed(2)}%
                        </TableCell>
                        <TableCell
                          className={`text-right font-semibold ${
                            Number(r.valor_balanco) >= 0 ? "text-emerald-600" : "text-red-600"
                          }`}
                        >
                          {formatMoeda(Number(r.valor_balanco))}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}