import { useState, useMemo, useEffect } from "react";
import { ChevronLeft, ChevronRight, RefreshCw, Search, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MinimalistLayout } from "@/components/MinimalistLayout";
import { InstalacoesHeaderActions } from "@/components/instalacoes/InstalacoesHeaderActions";
import { PedidoDetalhesSheet } from "@/components/pedidos/PedidoDetalhesSheet";
import { useInstalacoesFinalizadas, InstalacaoFinalizada } from "@/hooks/useInstalacoesFinalizadas";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useResponsaveisInstalacao } from "@/hooks/useResponsaveisInstalacao";
import { toast } from "sonner";
import { Users, Building2, Truck } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const MESES_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function mesAtualKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function labelMes(key: string): string {
  if (key === "todos") return "Todos os meses";
  const [y, m] = key.split("-").map(Number);
  return `${MESES_PT[m - 1]} / ${y}`;
}

function shiftMes(key: string, delta: number): string {
  if (key === "todos") return mesAtualKey();
  const [y, m] = key.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default function OrdensInstalacoesLogistica() {
  const [mounted, setMounted] = useState(false);
  const [mes, setMes] = useState<string>(mesAtualKey());
  const [search, setSearch] = useState("");
  const [selectedPedido, setSelectedPedido] = useState<any | null>(null);
  const [showDetalhes, setShowDetalhes] = useState(false);

  const { data: registros = [], isLoading, refetch } = useInstalacoesFinalizadas(mes);
  const { responsaveis } = useResponsaveisInstalacao();
  const equipesInternas = responsaveis.filter((r) => r.tipo === "equipe_interna");
  const autorizados = responsaveis.filter((r) => r.tipo === "autorizado");
  const queryClient = useQueryClient();

  const { data: veiculos = [] } = useQuery({
    queryKey: ["veiculos-ativos-logistica"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("veiculos")
        .select("id, nome, placa")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  const filtrados = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return registros;
    return registros.filter((r) =>
      (r.cliente_nome ?? "").toLowerCase().includes(q) ||
      (r.numero_pedido ?? "").toLowerCase().includes(q) ||
      (r.cidade ?? "").toLowerCase().includes(q) ||
      (r.estado ?? "").toLowerCase().includes(q),
    );
  }, [registros, search]);

  const { total, valorTotal, ticketMedio, tempoMedioEntrega } = useMemo(() => {
    const t = filtrados.length;
    const v = filtrados.reduce((acc, r) => acc + Number(r.valor_instalacao || 0), 0);
    const MS_DIA = 1000 * 60 * 60 * 24;
    const dias: number[] = [];
    filtrados.forEach((r) => {
      if (!r.data_cadastro || !r.finalizado_em) return;
      const ini = new Date(r.data_cadastro).getTime();
      const fim = new Date(r.finalizado_em).getTime();
      if (!isFinite(ini) || !isFinite(fim) || fim < ini) return;
      dias.push((fim - ini) / MS_DIA);
    });
    const tempo = dias.length > 0 ? dias.reduce((a, b) => a + b, 0) / dias.length : 0;
    return {
      total: t,
      valorTotal: v,
      ticketMedio: t > 0 ? v / t : 0,
      tempoMedioEntrega: tempo,
    };
  }, [filtrados]);

  const handleRowClick = async (r: InstalacaoFinalizada) => {
    const { data: pedido } = await supabase
      .from("pedidos_producao")
      .select("id, numero_pedido, numero_mes, mes_vigencia, etapa_atual, vendas:venda_id(*, produtos_vendas(*))")
      .eq("id", r.pedido_id)
      .maybeSingle();
    if (pedido) {
      setSelectedPedido(pedido);
      setShowDetalhes(true);
    }
  };

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["instalacoes-finalizadas"] });
    refetch();
  };

  const setEquipeInstalacao = async (
    r: InstalacaoFinalizada,
    equipe: { id: string; nome: string },
  ) => {
    const { data: inst } = await supabase
      .from("instalacoes")
      .select("id")
      .eq("pedido_id", r.pedido_id)
      .maybeSingle();
    if (!inst) {
      toast.error("Pedido sem registro em instalações");
      return;
    }
    const { error } = await supabase
      .from("instalacoes")
      .update({
        tipo_instalacao: "elisa",
        responsavel_instalacao_id: equipe.id,
        responsavel_instalacao_nome: equipe.nome,
      })
      .eq("id", inst.id);
    if (error) {
      toast.error("Erro ao definir equipe");
      return;
    }
    toast.success(`Equipe definida: ${equipe.nome}`);
    refresh();
  };

  const setAutorizadoCorrecao = async (
    r: InstalacaoFinalizada,
    autorizado: { id: string; nome: string },
  ) => {
    const { data: cor } = await supabase
      .from("correcoes")
      .select("id")
      .eq("pedido_id", r.pedido_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!cor) {
      toast.error("Pedido sem registro de correção");
      return;
    }
    const { error } = await supabase
      .from("correcoes")
      .update({
        responsavel_correcao_id: autorizado.id,
        responsavel_correcao_nome: autorizado.nome,
      })
      .eq("id", cor.id);
    if (error) {
      toast.error("Erro ao definir autorizado");
      return;
    }
    toast.success(`Autorizado definido: ${autorizado.nome}`);
    refresh();
  };

  const setVeiculoCarregamento = async (
    r: InstalacaoFinalizada,
    veiculo: { id: string; nome: string },
  ) => {
    const { data: oc } = await supabase
      .from("ordens_carregamento")
      .select("id")
      .eq("pedido_id", r.pedido_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!oc) {
      toast.error("Pedido sem ordem de carregamento");
      return;
    }
    const { error } = await supabase
      .from("ordens_carregamento")
      .update({
        responsavel_carregamento_id: veiculo.id,
        responsavel_carregamento_nome: veiculo.nome,
      })
      .eq("id", oc.id);
    if (error) {
      toast.error("Erro ao definir veículo");
      return;
    }
    toast.success(`Veículo definido: ${veiculo.nome}`);
    refresh();
  };

  const tipoServicoChip = (tipo?: string | null) => {
    const map: Record<string, { label: string; cls: string }> = {
      instalacao: { label: "Instalação", cls: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
      entrega: { label: "Entrega", cls: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
      manutencao: { label: "Manutenção", cls: "bg-purple-500/15 text-purple-400 border-purple-500/30" },
      correcao: { label: "Correção", cls: "bg-red-500/15 text-red-400 border-red-500/30" },
      servico: { label: "Serviço", cls: "bg-white/10 text-white/70 border-white/20" },
    };
    if (!tipo || !map[tipo]) return <span className="text-white/30">—</span>;
    const it = map[tipo];
    return (
      <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-medium", it.cls)}>
        {it.label}
      </span>
    );
  };

  const cellEditable = "cursor-pointer hover:bg-white/10 rounded px-1 -mx-1 transition-colors";

  return (
    <MinimalistLayout
      title="Instalações Finalizadas"
      subtitle="Acompanhe as instalações concluídas e seus indicadores"
      backPath="/logistica"
      fullWidth
      breadcrumbItems={[
        { label: "Home", path: "/home" },
        { label: "Logística", path: "/logistica" },
        { label: "Instalações" },
      ]}
      headerActions={
        <div className="flex flex-wrap items-center gap-2">
          <InstalacoesHeaderActions />
          <Button
            size="sm"
            onClick={() => refetch()}
            className="h-10 px-5 rounded-lg bg-gradient-to-r from-blue-500/20 to-blue-600/20 border border-blue-400/20 text-white shadow-lg shadow-blue-500/10 hover:from-blue-500/30 hover:to-blue-600/30 hover:scale-[1.02] transition-all duration-300 text-xs gap-1.5"
          >
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">Atualizar</span>
          </Button>
        </div>
      }
    >
      <div className="min-h-screen py-6">
        <div className="w-full space-y-4">
          {/* Filtro de mês + busca */}
          <div
            className={cn(
              "flex flex-col md:flex-row md:items-center gap-3 transition-all duration-500",
              mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
            )}
          >
            <div className="flex items-center gap-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg p-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMes(shiftMes(mes, -1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-[180px] text-center text-sm font-medium">
                {labelMes(mes)}
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMes(shiftMes(mes, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant={mes === "todos" ? "default" : "ghost"}
                size="sm"
                className="h-8"
                onClick={() => setMes(mes === "todos" ? mesAtualKey() : "todos")}
              >
                Todos
              </Button>
            </div>

            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente, pedido ou cidade..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Indicadores */}
          <div
            className={cn(
              "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 transition-all duration-500 delay-100",
              mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
            )}
          >
            <Card className="bg-white/5 backdrop-blur-xl border-white/10">
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Instalações finalizadas</div>
                <div className="text-2xl font-bold mt-1">{total}</div>
              </CardContent>
            </Card>
            <Card className="bg-white/5 backdrop-blur-xl border-white/10">
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Valor total</div>
                <div className="text-2xl font-bold mt-1 text-emerald-500">{formatCurrency(valorTotal)}</div>
              </CardContent>
            </Card>
            <Card className="bg-white/5 backdrop-blur-xl border-white/10">
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Ticket médio</div>
                <div className="text-2xl font-bold mt-1 text-blue-500">{formatCurrency(ticketMedio)}</div>
              </CardContent>
            </Card>
            <Card className="bg-white/5 backdrop-blur-xl border-white/10">
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Tempo médio de entrega</div>
                <div className="text-2xl font-bold mt-1 text-purple-400">
                  {tempoMedioEntrega > 0
                    ? `${tempoMedioEntrega.toFixed(1)} dias`
                    : "—"}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  Do cadastro até a finalização
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Listagem */}
          <Card
            className={cn(
              "bg-white/5 backdrop-blur-xl border-white/10 transition-all duration-500 delay-200",
              mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
            )}
          >
            <CardContent className="p-0">
              {isLoading ? (
                <div className="py-12 text-center text-muted-foreground text-sm">Carregando...</div>
              ) : filtrados.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-sm">
                  Nenhuma instalação finalizada {mes === "todos" ? "" : `em ${labelMes(mes)}`}.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="text-left font-medium px-4 py-3">Pedido</th>
                        <th className="text-left font-medium px-4 py-3">Cliente</th>
                        <th className="text-left font-medium px-4 py-3">Cidade / UF</th>
                        <th className="text-left font-medium px-4 py-3">Tipo</th>
                        <th className="text-left font-medium px-4 py-3">Equipe Instalação</th>
                        <th className="text-left font-medium px-4 py-3">Autorizado</th>
                        <th className="text-left font-medium px-4 py-3">Carregamento</th>
                        <th className="text-right font-medium px-4 py-3">Valor</th>
                        <th className="text-right font-medium px-4 py-3">Frete</th>
                        <th className="text-right font-medium px-4 py-3">Cadastro</th>
                        <th className="text-right font-medium px-4 py-3">Finalizado em</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filtrados.map((r) => (
                        <tr
                          key={r.id}
                          onClick={() => handleRowClick(r)}
                          className="hover:bg-white/5 transition-colors cursor-pointer"
                        >
                          <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">
                            #{r.numero_pedido ?? "—"}
                            {r.numero_mes != null && (
                              <span className="text-muted-foreground"> ({r.numero_mes})</span>
                            )}
                          </td>
                          <td className="px-4 py-3">{r.cliente_nome ?? "—"}</td>
                          <td className="px-4 py-3 text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3 w-3 shrink-0" />
                              {r.cidade ?? "—"}
                              {r.estado ? ` / ${r.estado}` : ""}
                            </span>
                          </td>
                          <td className="px-4 py-3">{tipoServicoChip(r.tipo_entrega)}</td>
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <span className={cellEditable}>
                                  {r.equipe_instalacao_nome ?? <span className="text-white/30">—</span>}
                                </span>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start" className="w-56 max-h-80 overflow-y-auto">
                                <DropdownMenuLabel className="text-xs text-muted-foreground">
                                  <Users className="inline h-3 w-3 mr-1" /> Equipes Internas
                                </DropdownMenuLabel>
                                {equipesInternas.length === 0 && (
                                  <div className="px-2 py-1.5 text-xs text-muted-foreground">Nenhuma equipe</div>
                                )}
                                {equipesInternas.map((eq) => (
                                  <DropdownMenuItem key={eq.id} onClick={() => setEquipeInstalacao(r, eq)}>
                                    <div className="w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: (eq as any).cor }} />
                                    {eq.nome}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <span className={cellEditable}>
                                  {r.autorizado_correcao_nome ?? <span className="text-white/30">—</span>}
                                </span>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start" className="w-64 max-h-80 overflow-y-auto">
                                <DropdownMenuLabel className="text-xs text-muted-foreground">
                                  <Building2 className="inline h-3 w-3 mr-1" /> Autorizados
                                </DropdownMenuLabel>
                                {autorizados.length === 0 && (
                                  <div className="px-2 py-1.5 text-xs text-muted-foreground">Nenhum autorizado</div>
                                )}
                                {autorizados.map((au) => (
                                  <DropdownMenuItem key={au.id} onClick={() => setAutorizadoCorrecao(r, au)}>
                                    <Building2 className="mr-2 h-3 w-3" />
                                    <div className="flex flex-col">
                                      <span>{au.nome}</span>
                                      {((au as any).cidade || (au as any).estado) && (
                                        <span className="text-[10px] text-muted-foreground">
                                          {(au as any).cidade}
                                          {(au as any).cidade && (au as any).estado && " - "}
                                          {(au as any).estado}
                                        </span>
                                      )}
                                    </div>
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <span className={cellEditable}>
                                  {r.responsavel_carregamento_nome ?? <span className="text-white/30">—</span>}
                                </span>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start" className="w-56 max-h-80 overflow-y-auto">
                                <DropdownMenuLabel className="text-xs text-muted-foreground">
                                  <Truck className="inline h-3 w-3 mr-1" /> Veículos
                                </DropdownMenuLabel>
                                {veiculos.length === 0 && (
                                  <div className="px-2 py-1.5 text-xs text-muted-foreground">Nenhum veículo</div>
                                )}
                                {veiculos.map((v: any) => (
                                  <DropdownMenuItem key={v.id} onClick={() => setVeiculoCarregamento(r, v)}>
                                    <Truck className="mr-2 h-3 w-3" />
                                    <div className="flex flex-col">
                                      <span>{v.nome}</span>
                                      {v.placa && (
                                        <span className="text-[10px] text-muted-foreground">{v.placa}</span>
                                      )}
                                    </div>
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-emerald-500 whitespace-nowrap">
                            {formatCurrency(Number(r.valor_instalacao || 0))}
                          </td>
                          <td className="px-4 py-3 text-right text-xs whitespace-nowrap">
                            {r.valor_frete != null && Number(r.valor_frete) > 0 ? (
                              <span className="text-amber-400">{formatCurrency(Number(r.valor_frete))}</span>
                            ) : (
                              <span className="text-white/30">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-xs text-muted-foreground whitespace-nowrap">
                            {r.data_cadastro
                              ? new Date(r.data_cadastro).toLocaleDateString("pt-BR")
                              : <span className="text-white/30">—</span>}
                          </td>
                          <td className="px-4 py-3 text-right text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(r.finalizado_em).toLocaleDateString("pt-BR")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {selectedPedido && (
        <PedidoDetalhesSheet
          pedido={selectedPedido}
          open={showDetalhes}
          onOpenChange={setShowDetalhes}
        />
      )}
    </MinimalistLayout>
  );
}