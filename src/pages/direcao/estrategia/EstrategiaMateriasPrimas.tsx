import { useMemo, useState } from "react";
import { Boxes, Plus, Trash2 } from "lucide-react";
import { MinimalistLayout } from "@/components/MinimalistLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useCustosItens } from "@/hooks/useCustosItens";
import { useEstrategiaMateriasPrimas } from "@/hooks/useEstrategiaMateriasPrimas";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function EstrategiaMateriasPrimas() {
  const { items: custosItens, isLoading: loadingItens } = useCustosItens();
  const [selectedId, setSelectedId] = useState<string>("");

  const item = useMemo(
    () => custosItens.find((i) => i.id === selectedId) || null,
    [custosItens, selectedId],
  );

  const { materiasPrimas, criar, editar, excluir } =
    useEstrategiaMateriasPrimas(selectedId || undefined);

  const unidade = item?.unidade || "un";

  const totais = useMemo(() => {
    const qtd = materiasPrimas.reduce(
      (acc, m) => acc + Number(m.quantidade_item || 0),
      0,
    );
    const custo = materiasPrimas.reduce(
      (acc, m) => acc + Number(m.custo_total || 0),
      0,
    );
    const custoCalc = qtd > 0 ? custo / qtd : 0;
    return { qtd, custo, custoCalc };
  }, [materiasPrimas]);

  // Agrupa itens por categoria para o select
  const grupos = useMemo(() => {
    const map = new Map<string, typeof custosItens>();
    for (const it of custosItens) {
      const cat = it.categoria || "Sem categoria";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(it);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [custosItens]);

  return (
    <MinimalistLayout
      title="Matérias-Primas"
      subtitle="Interface de compra dos itens do catálogo da estratégia"
      backPath="/direcao/estrategia/itens"
      breadcrumbItems={[
        { label: "Home", path: "/home" },
        { label: "Direção", path: "/direcao" },
        { label: "Estratégia", path: "/direcao/estrategia" },
        { label: "Tabela de Custos", path: "/direcao/estrategia/itens" },
        { label: "Matérias-Primas" },
      ]}
      fullWidth
    >
      <div className="space-y-4">
        {/* Header card */}
        <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-4 flex flex-wrap items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
            <Boxes className="h-5 w-5 text-cyan-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-white font-medium truncate">
              Selecione um item do catálogo
            </div>
            <div className="text-xs text-white/60">
              Cada matéria-prima representa uma quantidade do item na sua
              unidade ({unidade})
            </div>
          </div>
          <div className="w-full sm:w-[360px]">
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue
                  placeholder={loadingItens ? "Carregando..." : "Escolher item"}
                />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10 text-white max-h-[400px]">
                {grupos.map(([cat, its]) => (
                  <div key={cat}>
                    <div className="px-2 py-1 text-[11px] uppercase tracking-wide text-white/40">
                      {cat}
                    </div>
                    {its.map((it) => (
                      <SelectItem
                        key={it.id}
                        value={it.id}
                        className="text-white"
                      >
                        {it.descricao}{" "}
                        <span className="text-white/40">
                          · {it.unidade || "un"}
                        </span>
                      </SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {!item ? (
          <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-10 text-center text-white/60">
            Selecione um item acima para gerenciar suas matérias-primas.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-3 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm text-white/60">
                  {materiasPrimas.length}{" "}
                  {materiasPrimas.length === 1
                    ? "matéria-prima"
                    : "matérias-primas"}{" "}
                  cadastradas
                </div>
                <Button
                  size="sm"
                  className="bg-cyan-600 hover:bg-cyan-700 text-white"
                  onClick={() =>
                    criar({
                      custo_item_id: item.id,
                      nome: "Nova matéria-prima",
                      quantidade_item: 0,
                      custo_total: 0,
                      ordem: materiasPrimas.length,
                    })
                  }
                >
                  <Plus className="h-4 w-4 mr-2" /> Adicionar
                </Button>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 hover:bg-transparent bg-white/5">
                      <TableHead className="text-white/60 min-w-[220px]">
                        Nome
                      </TableHead>
                      <TableHead className="text-right text-white/60 w-32">
                        Qtd ({unidade})
                      </TableHead>
                      <TableHead className="text-right text-white/60 w-36">
                        Custo total
                      </TableHead>
                      <TableHead className="text-right text-white/60 w-32">
                        Custo/{unidade}
                      </TableHead>
                      <TableHead className="text-white/60 min-w-[160px]">
                        Fornecedor
                      </TableHead>
                      <TableHead className="text-white/60 min-w-[200px]">
                        Observações
                      </TableHead>
                      <TableHead className="text-center text-white/60 w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {materiasPrimas.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="text-center text-white/60 py-8"
                        >
                          Nenhuma matéria-prima cadastrada para este item
                        </TableCell>
                      </TableRow>
                    ) : (
                      materiasPrimas.map((m) => {
                        const qtd = Number(m.quantidade_item || 0);
                        const total = Number(m.custo_total || 0);
                        const custoUn = qtd > 0 ? total / qtd : 0;
                        return (
                          <TableRow
                            key={m.id}
                            className="border-white/10 hover:bg-white/5"
                          >
                            <TableCell>
                              <Input
                                defaultValue={m.nome}
                                key={`${m.id}-nome-${m.nome}`}
                                onBlur={(e) => {
                                  const v = e.target.value.trim();
                                  if (v && v !== m.nome) {
                                    editar({ id: m.id, patch: { nome: v } });
                                  }
                                }}
                                className="h-8 bg-white/5 border-white/10 text-white"
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <Input
                                type="number"
                                step="0.001"
                                min="0"
                                defaultValue={String(qtd)}
                                key={`${m.id}-qtd-${qtd}`}
                                onBlur={(e) => {
                                  const v = parseFloat(e.target.value);
                                  if (!isNaN(v) && v >= 0 && v !== qtd) {
                                    editar({
                                      id: m.id,
                                      patch: { quantidade_item: v },
                                    });
                                  }
                                }}
                                className="h-8 w-28 ml-auto text-right bg-white/5 border-white/10 text-white"
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                defaultValue={String(total)}
                                key={`${m.id}-custo-${total}`}
                                onBlur={(e) => {
                                  const v = parseFloat(e.target.value);
                                  if (!isNaN(v) && v >= 0 && v !== total) {
                                    editar({
                                      id: m.id,
                                      patch: { custo_total: v },
                                    });
                                  }
                                }}
                                className="h-8 w-32 ml-auto text-right bg-white/5 border-white/10 text-white"
                              />
                            </TableCell>
                            <TableCell
                              className={cn(
                                "text-right font-medium",
                                custoUn > 0 ? "text-emerald-300" : "text-white/40",
                              )}
                            >
                              {fmt(custoUn)}
                            </TableCell>
                            <TableCell>
                              <Input
                                defaultValue={m.fornecedor || ""}
                                key={`${m.id}-forn-${m.fornecedor}`}
                                onBlur={(e) => {
                                  const v = e.target.value.trim();
                                  if (v !== (m.fornecedor || "")) {
                                    editar({
                                      id: m.id,
                                      patch: { fornecedor: v || null },
                                    });
                                  }
                                }}
                                className="h-8 bg-white/5 border-white/10 text-white"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                defaultValue={m.observacoes || ""}
                                key={`${m.id}-obs-${m.observacoes}`}
                                onBlur={(e) => {
                                  const v = e.target.value.trim();
                                  if (v !== (m.observacoes || "")) {
                                    editar({
                                      id: m.id,
                                      patch: { observacoes: v || null },
                                    });
                                  }
                                }}
                                className="h-8 bg-white/5 border-white/10 text-white"
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-white/10"
                                onClick={() => excluir(m.id)}
                                title="Remover"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            <aside className="lg:col-span-1">
              <div className="lg:sticky lg:top-4 space-y-3">
                <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-4">
                  <div className="text-xs uppercase tracking-wide text-white/50 mb-3">
                    Item de referência
                  </div>
                  <div className="text-white font-medium">
                    {item.descricao}
                  </div>
                  <div className="text-xs text-white/60 mt-1">
                    {item.categoria || "Sem categoria"} · unidade: {unidade}
                  </div>
                  <div className="mt-4 space-y-2">
                    <Row
                      label="Custo unitário atual"
                      value={fmt(Number(item.custo_unitario || 0))}
                    />
                    <Row
                      label="Qtd total comprada"
                      value={`${totais.qtd.toLocaleString("pt-BR")} ${unidade}`}
                    />
                    <Row
                      label="Custo total"
                      value={fmt(totais.custo)}
                    />
                    <Row
                      label={`Custo/${unidade} calculado`}
                      value={fmt(totais.custoCalc)}
                      valueClass="text-emerald-300 font-semibold"
                    />
                  </div>
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>
    </MinimalistLayout>
  );
}

function Row({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-white/60">{label}</span>
      <span className={cn("text-white", valueClass)}>{value}</span>
    </div>
  );
}