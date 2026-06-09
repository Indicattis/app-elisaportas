import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCw, Flame, Fuel, BarChart3, DoorOpen, DollarSign, Droplet, Trash2, CheckCircle2, TrendingUp, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { usePinturaInicios } from "@/hooks/usePinturaInicios";
import { usePinturaTrocasGas } from "@/hooks/usePinturaTrocasGas";
import { useFornadasResumo } from "@/hooks/useFornadasResumo";
import { formatCurrency } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function ControleFornadas() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { inicios, isLoading: isLoadingInicios, toggleRecarga, excluirInicio } = usePinturaInicios();
  const { trocas, isLoading: isLoadingTrocas, excluirTroca } = usePinturaTrocasGas();
  const { data: resumo = [], isLoading: isLoadingResumo } = useFornadasResumo();

  type TabKey = "resumo" | "fornadas" | "trocas";
  const [activeTab, setActiveTab] = useState<TabKey>("resumo");

  const totalFornadas = resumo.length;
  const totalPortas = resumo.reduce((s, r) => s + r.qtd_portas, 0);
  const fornadasConsolidadas = resumo.filter((r) => !r.em_apuracao && r.custo_fornada !== null);
  const custoConsolidado = fornadasConsolidadas.reduce((s, r) => s + (r.custo_fornada ?? 0), 0);
  const mediaPortas = totalFornadas > 0 ? totalPortas / totalFornadas : 0;
  const mediaCusto = fornadasConsolidadas.length > 0 ? custoConsolidado / fornadasConsolidadas.length : 0;
  const totalTrocasValor = trocas.reduce((s, t) => s + (Number(t.valor) || 0), 0);
  const fornadasEmApuracao = resumo.filter((r) => r.em_apuracao).length;

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["pintura-inicios"] });
    queryClient.invalidateQueries({ queryKey: ["pintura-trocas-gas"] });
    queryClient.invalidateQueries({ queryKey: ["fornadas-resumo"] });
  };

  const TABS: Array<{ key: TabKey; label: string; icon: typeof BarChart3; count: number }> = [
    { key: "resumo", label: "Resumo", icon: BarChart3, count: totalFornadas },
    { key: "fornadas", label: "Fornadas", icon: Flame, count: inicios.length },
    { key: "trocas", label: "Trocas de Gás", icon: Fuel, count: trocas.length },
  ];
  const activeIndex = Math.max(0, TABS.findIndex(t => t.key === activeTab));
  const cols = TABS.length;

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

        <div className="mb-6 flex justify-center">
          <div
            className="relative inline-grid rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-1"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(180px, 1fr))` }}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-1 left-1 rounded-xl bg-blue-600 shadow-lg shadow-blue-600/20 transition-transform duration-300 ease-out"
              style={{
                width: `calc((100% - 0.5rem) / ${cols})`,
                transform: `translateX(${activeIndex * 100}%)`,
              }}
            />
            {TABS.map((t) => {
              const Icon = t.icon;
              const isActive = activeTab === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setActiveTab(t.key)}
                  className={
                    "relative z-10 inline-flex items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-sm font-medium transition-colors duration-200 " +
                    (isActive ? "text-white" : "text-white/70 hover:text-white")
                  }
                >
                  <Icon className="h-4 w-4" />
                  {t.label}
                  <span
                    className={
                      "ml-1 text-[11px] px-1.5 py-0.5 rounded-full border " +
                      (isActive
                        ? "bg-white/15 border-white/20 text-white"
                        : "bg-white/5 border-white/10 text-white/60")
                    }
                  >
                    {t.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div key={activeTab} className="animate-fade-in">
          {activeTab === "resumo" && (
            <div className="space-y-4">
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
              <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs uppercase tracking-wide text-white/50">Média de portas / fornada</span>
                  <TrendingUp className="h-4 w-4 text-blue-400" />
                </div>
                <div className="text-2xl font-semibold">{mediaPortas.toFixed(1)}</div>
                <div className="text-xs text-white/50 mt-1">portas pintadas em média</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs uppercase tracking-wide text-white/50">Média de custo / fornada</span>
                  <TrendingUp className="h-4 w-4 text-blue-400" />
                </div>
                <div className="text-2xl font-semibold">{formatCurrency(mediaCusto)}</div>
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
            </div>
          )}

          {activeTab === "fornadas" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs uppercase tracking-wide text-white/50">Total de fornadas</span>
                    <Flame className="h-4 w-4 text-orange-400" />
                  </div>
                  <div className="text-2xl font-semibold">{inicios.length}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs uppercase tracking-wide text-white/50">Recargas realizadas</span>
                    <CheckCircle2 className="h-4 w-4 text-green-400" />
                  </div>
                  <div className="text-2xl font-semibold">{inicios.filter((i: any) => i.recarga_realizada).length}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs uppercase tracking-wide text-white/50">Recargas pendentes</span>
                    <Droplet className="h-4 w-4 text-amber-400" />
                  </div>
                  <div className="text-2xl font-semibold">{inicios.filter((i: any) => !i.recarga_realizada).length}</div>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden">
                {isLoadingInicios ? (
                  <div className="p-4 space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-12 w-full bg-white/5" />
                    ))}
                  </div>
                ) : inicios.length === 0 ? (
                  <div className="p-8 text-center text-white/50">Nenhuma fornada registrada.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10 hover:bg-transparent">
                        <TableHead className="text-white/60">Início</TableHead>
                        <TableHead className="text-white/60">Responsável</TableHead>
                        <TableHead className="text-white/60">Recarga</TableHead>
                        <TableHead className="text-white/60 text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inicios.map((inicio: any) => (
                        <TableRow key={inicio.id} className="border-white/10 hover:bg-white/5">
                          <TableCell className="text-white">
                            {format(new Date(inicio.iniciado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-7 w-7">
                                <AvatarImage src={inicio.admin_users?.foto_perfil_url ?? undefined} />
                                <AvatarFallback className="bg-white/10 text-white text-xs">
                                  {inicio.admin_users?.nome?.[0] ?? "?"}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-white/90 text-sm">{inicio.admin_users?.nome ?? "—"}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {inicio.recarga_realizada ? (
                              <div className="flex flex-col gap-0.5">
                                <Badge className="w-fit bg-green-500/15 text-green-300 border border-green-500/30">Realizada</Badge>
                                {inicio.recarga_realizada_em && (
                                  <span className="text-[11px] text-white/50">
                                    {format(new Date(inicio.recarga_realizada_em), "dd/MM HH:mm", { locale: ptBR })}
                                    {inicio.recarga_admin_users?.nome ? ` · ${inicio.recarga_admin_users.nome}` : ""}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <Badge variant="outline" className="border-white/20 text-white/50">Pendente</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="inline-flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => toggleRecarga.mutate(inicio.id)}
                                disabled={toggleRecarga.isPending || inicio.recarga_realizada}
                                className="text-blue-300 hover:text-blue-200 hover:bg-blue-500/10 disabled:opacity-40"
                                title={inicio.recarga_realizada ? "Recarga já realizada" : "Marcar recarga"}
                              >
                                <Droplet className="h-4 w-4 mr-1" />
                                {inicio.recarga_realizada ? "Recarregado" : "Recarregar"}
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    disabled={excluirInicio.isPending}
                                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                    title="Excluir fornada"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Excluir fornada?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Esta ação não pode ser desfeita. O registro será removido permanentemente.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => excluirInicio.mutate(inicio.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Excluir
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          )}

          {activeTab === "trocas" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs uppercase tracking-wide text-white/50">Total de trocas</span>
                    <Fuel className="h-4 w-4 text-blue-400" />
                  </div>
                  <div className="text-2xl font-semibold">{trocas.length}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs uppercase tracking-wide text-white/50">Valor total gasto</span>
                    <DollarSign className="h-4 w-4 text-blue-400" />
                  </div>
                  <div className="text-2xl font-semibold">{formatCurrency(totalTrocasValor)}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs uppercase tracking-wide text-white/50">Valor médio / troca</span>
                    <TrendingUp className="h-4 w-4 text-blue-400" />
                  </div>
                  <div className="text-2xl font-semibold">
                    {formatCurrency(trocas.length > 0 ? totalTrocasValor / trocas.length : 0)}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden">
                {isLoadingTrocas ? (
                  <div className="p-4 space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-12 w-full bg-white/5" />
                    ))}
                  </div>
                ) : trocas.length === 0 ? (
                  <div className="p-8 text-center text-white/50">Nenhuma troca de gás registrada.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10 hover:bg-transparent">
                        <TableHead className="text-white/60">Data</TableHead>
                        <TableHead className="text-white/60">Registrado por</TableHead>
                        <TableHead className="text-white/60">Observações</TableHead>
                        <TableHead className="text-white/60 text-right">Valor</TableHead>
                        <TableHead className="text-white/60 text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {trocas.map((t: any) => (
                        <TableRow key={t.id} className="border-white/10 hover:bg-white/5">
                          <TableCell className="text-white">
                            {format(new Date(t.registrado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-7 w-7">
                                <AvatarImage src={t.admin_users?.foto_perfil_url ?? undefined} />
                                <AvatarFallback className="bg-white/10 text-white text-xs">
                                  {t.admin_users?.nome?.[0] ?? "?"}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-white/90 text-sm">{t.admin_users?.nome ?? "—"}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-white/70 text-sm max-w-[280px] truncate">
                            {t.observacoes || "—"}
                          </TableCell>
                          <TableCell className="text-right text-white font-medium">
                            {formatCurrency(Number(t.valor) || 0)}
                          </TableCell>
                          <TableCell className="text-right">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  disabled={excluirTroca.isPending}
                                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                  title="Excluir troca"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir troca de gás?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta ação não pode ser desfeita.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => excluirTroca.mutate(t.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Excluir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}