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

  const { total, valorTotal, ticketMedio } = useMemo(() => {
    const t = filtrados.length;
    const v = filtrados.reduce((acc, r) => acc + Number(r.valor_instalacao || 0), 0);
    return { total: t, valorTotal: v, ticketMedio: t > 0 ? v / t : 0 };
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

  return (
    <MinimalistLayout
      title="Instalações Finalizadas"
      backPath="/logistica"
      breadcrumbItems={[
        { label: "Home", path: "/home" },
        { label: "Logística", path: "/logistica" },
        { label: "Instalações" },
      ]}
      headerActions={
        <div className="flex flex-wrap items-center gap-2">
          <InstalacoesHeaderActions />
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
      }
    >
      <div className="min-h-screen p-4 md:p-4 lg:p-6">
        <div className="max-w-[1800px] mx-auto space-y-4">
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
              "grid grid-cols-1 md:grid-cols-3 gap-4 transition-all duration-500 delay-100",
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
                        <th className="text-left font-medium px-4 py-3">Equipe Instalação</th>
                        <th className="text-left font-medium px-4 py-3">Autorizado Correção</th>
                        <th className="text-left font-medium px-4 py-3">Carregamento</th>
                        <th className="text-right font-medium px-4 py-3">Valor</th>
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
                          <td className="px-4 py-3">{r.equipe_instalacao_nome ?? "—"}</td>
                          <td className="px-4 py-3">{r.autorizado_correcao_nome ?? "—"}</td>
                          <td className="px-4 py-3">{r.responsavel_carregamento_nome ?? "—"}</td>
                          <td className="px-4 py-3 text-right font-semibold text-emerald-500 whitespace-nowrap">
                            {formatCurrency(Number(r.valor_instalacao || 0))}
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