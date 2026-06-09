import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCw, Flame, Fuel, BarChart3, Check, Pencil, DoorOpen, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { usePinturaInicios } from "@/hooks/usePinturaInicios";
import { usePinturaTrocasGas } from "@/hooks/usePinturaTrocasGas";
import { PinturaIniciosList } from "@/components/production/PinturaIniciosList";
import { TrocasGasList } from "@/components/production/TrocasGasList";
import { usePinturaFornadaCusto } from "@/hooks/usePinturaFornadaCusto";
import { useFornadasResumo } from "@/hooks/useFornadasResumo";
import { formatCurrency } from "@/lib/utils";

export default function ControleFornadas() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { inicios, isLoading: isLoadingInicios, toggleRecarga, excluirInicio } = usePinturaInicios();
  const { trocas, isLoading: isLoadingTrocas, excluirTroca } = usePinturaTrocasGas();
  const { custoPorFornada, update: updateCusto } = usePinturaFornadaCusto();
  const { data: resumo = [], isLoading: isLoadingResumo } = useFornadasResumo(custoPorFornada);

  const [editandoCusto, setEditandoCusto] = useState(false);
  const [custoInput, setCustoInput] = useState<string>("");

  useEffect(() => {
    setCustoInput(String(custoPorFornada ?? 0));
  }, [custoPorFornada]);

  const totalFornadas = resumo.length;
  const totalPortas = resumo.reduce((s, r) => s + r.qtd_portas, 0);
  const custoTotal = totalFornadas * custoPorFornada;

  const salvarCusto = () => {
    const v = parseFloat(custoInput.replace(",", "."));
    if (Number.isFinite(v) && v >= 0) {
      updateCusto.mutate(v, { onSuccess: () => setEditandoCusto(false) });
    }
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["pintura-inicios"] });
    queryClient.invalidateQueries({ queryKey: ["pintura-trocas-gas"] });
    queryClient.invalidateQueries({ queryKey: ["fornadas-resumo"] });
    queryClient.invalidateQueries({ queryKey: ["pintura-fornada-config"] });
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/fabrica')}
              className="text-white/70 hover:text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Controle de Fornadas</h1>
              <p className="text-sm text-white/50">Fornadas e trocas de gás da pintura</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="bg-white/5 border-white/10 text-white hover:bg-white/10"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>

        <Tabs defaultValue="resumo" className="w-full">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="resumo" className="gap-2 data-[state=active]:bg-blue-700 data-[state=active]:text-white">
              <BarChart3 className="h-4 w-4" />
              Resumo
            </TabsTrigger>
            <TabsTrigger value="fornadas" className="gap-2 data-[state=active]:bg-orange-600 data-[state=active]:text-white">
              <Flame className="h-4 w-4" />
              Fornadas
            </TabsTrigger>
            <TabsTrigger value="trocas" className="gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <Fuel className="h-4 w-4" />
              Trocas de Gás
            </TabsTrigger>
          </TabsList>

          <TabsContent value="resumo" className="mt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs uppercase tracking-wide text-white/50">Custo por fornada</span>
                  <DollarSign className="h-4 w-4 text-blue-400" />
                </div>
                {editandoCusto ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={custoInput}
                      onChange={(e) => setCustoInput(e.target.value)}
                      className="bg-white/10 border-white/20 text-white"
                      autoFocus
                    />
                    <Button
                      size="icon"
                      onClick={salvarCusto}
                      disabled={updateCusto.isPending}
                      className="bg-blue-700 hover:bg-blue-800 text-white"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-semibold">{formatCurrency(custoPorFornada)}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setEditandoCusto(true)}
                      className="text-white/60 hover:text-white hover:bg-white/10"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs uppercase tracking-wide text-white/50">Total de fornadas</span>
                  <Flame className="h-4 w-4 text-orange-400" />
                </div>
                <div className="text-2xl font-semibold">{totalFornadas}</div>
                <div className="text-xs text-white/50 mt-1">{totalPortas} portas pintadas</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs uppercase tracking-wide text-white/50">Custo total acumulado</span>
                  <DollarSign className="h-4 w-4 text-blue-400" />
                </div>
                <div className="text-2xl font-semibold">{formatCurrency(custoTotal)}</div>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden">
              {isLoadingResumo ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full bg-white/5" />
                  ))}
                </div>
              ) : resumo.length === 0 ? (
                <div className="p-8 text-center text-white/50">Nenhuma fornada registrada.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 hover:bg-transparent">
                      <TableHead className="text-white/60">Início</TableHead>
                      <TableHead className="text-white/60">Responsável</TableHead>
                      <TableHead className="text-white/60 text-center">Portas pintadas</TableHead>
                      <TableHead className="text-white/60 text-right">Custo</TableHead>
                      <TableHead className="text-white/60 text-right">Recarga</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resumo.map((r) => (
                      <TableRow key={r.id} className="border-white/10 hover:bg-white/5">
                        <TableCell className="text-white">
                          {format(new Date(r.iniciado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7">
                              <AvatarImage src={r.responsavel_foto ?? undefined} />
                              <AvatarFallback className="bg-white/10 text-white text-xs">
                                {r.responsavel_nome?.[0] ?? "?"}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-white/90 text-sm">{r.responsavel_nome ?? "—"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-blue-500/10 border-blue-500/30 text-blue-300 gap-1">
                            <DoorOpen className="h-3 w-3" />
                            {r.qtd_portas}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-white">{formatCurrency(custoPorFornada)}</TableCell>
                        <TableCell className="text-right">
                          {r.recarga_realizada ? (
                            <Badge className="bg-green-500/15 text-green-300 border border-green-500/30">Realizada</Badge>
                          ) : (
                            <Badge variant="outline" className="border-white/20 text-white/50">Pendente</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </TabsContent>

          <TabsContent value="fornadas" className="mt-4">
            <PinturaIniciosList
              inicios={inicios}
              isLoading={isLoadingInicios}
              onToggleRecarga={toggleRecarga.mutate}
              isTogglingRecarga={toggleRecarga.isPending}
              onExcluir={excluirInicio.mutate}
              isExcluindo={excluirInicio.isPending}
            />
          </TabsContent>

          <TabsContent value="trocas" className="mt-4">
            <TrocasGasList
              trocas={trocas}
              isLoading={isLoadingTrocas}
              onExcluir={excluirTroca.mutate}
              isExcluindo={excluirTroca.isPending}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}