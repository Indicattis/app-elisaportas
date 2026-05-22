import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Plus, Trash2, Check, ChevronsUpDown, Boxes } from "lucide-react";
import { MinimalistLayout } from "@/components/MinimalistLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import type { ItemTabelaPreco } from "@/hooks/useTabelaPrecos";
import { useKitMontagem, computeLucroUnit } from "@/hooks/useKitMontagem";
import { useCustosItens } from "@/hooks/useCustosItens";
import { cn } from "@/lib/utils";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function EstrategiaKitMontagem() {
  const { kitId } = useParams<{ kitId: string }>();
  const navigate = useNavigate();
  const [pickerOpen, setPickerOpen] = useState(false);

  const { data: kit, isLoading: isLoadingKit } = useQuery({
    queryKey: ["tabela-precos-kit", kitId],
    enabled: !!kitId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tabela_precos_portas")
        .select("*")
        .eq("id", kitId as string)
        .maybeSingle();
      if (error) throw error;
      return data as ItemTabelaPreco | null;
    },
  });

  const { items, isLoading, addItem, updateQuantidade, removeItem } = useKitMontagem(kitId ?? null);
  const { items: allCustosItens } = useCustosItens();

  const usedIds = useMemo(() => new Set(items.map((i) => i.custo_item_id)), [items]);

  const totais = useMemo(() => {
    let lucro = 0;
    let custo = 0;
    let venda = 0;
    for (const it of items) {
      const q = Number(it.quantidade || 0);
      if (it.custo_item) {
        lucro += q * computeLucroUnit(it.custo_item);
        custo += q * Number(it.custo_item.custo_unitario || 0);
        venda += q * Number(it.custo_item.preco_venda || 0);
      }
    }
    const margem = venda > 0 ? (lucro / venda) * 100 : 0;
    return { lucro, custo, venda, margem };
  }, [items]);

  const titulo = kit?.descricao ? `Montagem — ${kit.descricao}` : "Montagem do kit";

  return (
    <MinimalistLayout
      title={titulo}
      subtitle={kit ? `${kit.largura}m × ${kit.altura}m` : "Carregando..."}
      backPath="/direcao/estrategia/kits"
      breadcrumbItems={[
        { label: "Home", path: "/home" },
        { label: "Direção", path: "/direcao" },
        { label: "Estratégia", path: "/direcao/estrategia" },
        { label: "Tabela de Kits", path: "/direcao/estrategia/kits" },
        { label: "Montagem" },
      ]}
      fullWidth
    >
      {isLoadingKit ? (
        <div className="text-slate-500 text-sm">Carregando kit...</div>
      ) : !kit ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-slate-700 shadow-sm">
          Kit não encontrado.
          <Button variant="ghost" className="ml-3 text-slate-700 hover:bg-slate-100" onClick={() => navigate("/direcao/estrategia/kits")}>
            Voltar
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Cabeçalho */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 flex flex-wrap items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center">
              <Boxes className="h-5 w-5 text-blue-600" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-slate-900 font-medium truncate">{kit.descricao}</div>
              <div className="text-xs text-slate-500">
                {kit.largura}m × {kit.altura}m
              </div>
            </div>
            <Badge className={kit.ativo ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-600 border border-slate-200"}>
              {kit.ativo ? "Ativo" : "Inativo"}
            </Badge>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Tabela */}
            <div className="lg:col-span-3 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm text-slate-500">
                  {items.length} {items.length === 1 ? "item" : "itens"} na montagem
                </div>
                <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                  <PopoverTrigger asChild>
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                      <Plus className="h-4 w-4 mr-2" /> Adicionar item
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[420px] p-0 bg-white border-slate-200" align="end">
                    <Command className="bg-transparent">
                      <CommandInput placeholder="Buscar item por descrição/categoria..." />
                      <CommandList>
                        <CommandEmpty>Nenhum item encontrado.</CommandEmpty>
                        <CommandGroup>
                          {allCustosItens.map((ci) => {
                            const inUse = usedIds.has(ci.id);
                            return (
                              <CommandItem
                                key={ci.id}
                                value={`${ci.descricao} ${ci.categoria ?? ""}`}
                                disabled={inUse}
                                onSelect={() => {
                                  if (inUse) return;
                                  addItem.mutate({ custo_item_id: ci.id, quantidade: 1 });
                                  setPickerOpen(false);
                                }}
                                className="text-slate-900 data-[selected=true]:bg-slate-100"
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="truncate">{ci.descricao}</div>
                                  <div className="text-xs text-slate-500">
                                    {ci.categoria ?? "Sem categoria"} · {ci.unidade ?? "un"}
                                  </div>
                                </div>
                                {inUse ? (
                                  <Check className="h-4 w-4 text-emerald-600" />
                                ) : (
                                  <ChevronsUpDown className="h-4 w-4 text-slate-400" />
                                )}
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-200 hover:bg-transparent bg-slate-50">
                      <TableHead className="text-slate-600 min-w-[260px]">Item</TableHead>
                      <TableHead className="text-slate-600">Unid.</TableHead>
                      <TableHead className="text-right text-slate-600 w-28">Custo un.</TableHead>
                      <TableHead className="text-right text-slate-600 w-24">Imposto</TableHead>
                      <TableHead className="text-right text-slate-600 w-28">Desc. Gerente</TableHead>
                      <TableHead className="text-right text-slate-600 w-24">Cartão</TableHead>
                      <TableHead className="text-right text-slate-600 w-24">Qtd</TableHead>
                      <TableHead className="text-right text-slate-600 w-32">Subtotal custo</TableHead>
                      <TableHead className="text-right text-slate-600 w-28">Lucro un.</TableHead>
                      <TableHead className="text-right text-slate-600 w-32">Subtotal lucro</TableHead>
                      <TableHead className="text-right text-slate-600 w-28">Preço</TableHead>
                      <TableHead className="text-center text-slate-600 w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={12} className="text-center text-slate-500 py-6">Carregando...</TableCell></TableRow>
                    ) : items.length === 0 ? (
                      <TableRow><TableCell colSpan={12} className="text-center text-slate-500 py-6">Nenhum item na montagem</TableCell></TableRow>
                    ) : (
                      items.map((it) => {
                        const q = Number(it.quantidade || 0);
                        const custoUnit = Number(it.custo_item?.custo_unitario || 0);
                        const subtotalCusto = custoUnit * q;
                        const lucroUnit = it.custo_item ? computeLucroUnit(it.custo_item) : 0;
                        const subtotalLucro = lucroUnit * q;
                        const tImp = Number(it.custo_item?.taxa_impostos || 0);
                        const tDesc = Number(it.custo_item?.taxa_descontos || 0);
                        const tCart = Number(it.custo_item?.taxa_cartao || 0);
                        const preco = Number(it.custo_item?.preco_venda || 0);
                        const vImp = preco * (tImp / 100);
                        const vDesc = preco * (tDesc / 100);
                        const vCart = preco * (tCart / 100);
                        const pctFmt = (n: number) =>
                          `${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
                        return (
                          <TableRow key={it.id} className="border-slate-200 hover:bg-slate-50">
                            <TableCell className="text-slate-900 min-w-[260px]">{it.custo_item?.descricao ?? "—"}</TableCell>
                            <TableCell className="text-slate-600">{it.custo_item?.unidade ?? "un"}</TableCell>
                            <TableCell className="text-right text-slate-800">{fmt(custoUnit)}</TableCell>
                            <TableCell className="text-right text-slate-700"><span title={pctFmt(tImp)}>{fmt(vImp)}</span></TableCell>
                            <TableCell className="text-right text-slate-700"><span title={pctFmt(tDesc)}>{fmt(vDesc)}</span></TableCell>
                            <TableCell className="text-right text-slate-700"><span title={pctFmt(tCart)}>{fmt(vCart)}</span></TableCell>
                            <TableCell className="text-right">
                              <Input
                                type="number"
                                step="0.001"
                                min="0"
                                defaultValue={String(it.quantidade)}
                                key={it.id + "-" + it.quantidade}
                                onBlur={(e) => {
                                  const v = parseFloat(e.target.value);
                                  if (!isNaN(v) && v >= 0 && v !== Number(it.quantidade)) {
                                    updateQuantidade.mutate({ id: it.id, quantidade: v });
                                  }
                                }}
                                className="h-8 w-24 ml-auto text-right bg-white border-slate-200 text-slate-900"
                              />
                            </TableCell>
                            <TableCell className="text-right text-slate-900">{fmt(subtotalCusto)}</TableCell>
                            <TableCell className={cn("text-right", lucroUnit >= 0 ? "text-emerald-600" : "text-red-600")}>{fmt(lucroUnit)}</TableCell>
                            <TableCell className={cn("text-right font-medium", subtotalLucro >= 0 ? "text-emerald-600" : "text-red-600")}>{fmt(subtotalLucro)}</TableCell>
                            <TableCell className="text-right text-slate-900">{fmt(preco)}</TableCell>
                            <TableCell className="text-center">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-slate-100"
                                onClick={() => removeItem.mutate(it.id)}
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

              {items.length === 0 && (
                <Badge className="bg-amber-50 text-amber-700 border border-amber-200">
                  Sem montagem — o lucro do kit segue editável manualmente
                </Badge>
              )}
            </div>

            {/* Resumo lateral */}
            <aside className="lg:col-span-1">
              <div className="lg:sticky lg:top-4 space-y-3">
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
                  <div className="text-xs uppercase tracking-wide text-slate-500 mb-3">Resumo da montagem</div>
                  <div className="space-y-2">
                    <Row label="Itens" value={String(items.length)} />
                    <Row label="Custo total" value={fmt(totais.custo)} />
                    <Row label="Venda total" value={fmt(totais.venda)} />
                    <div className="h-px bg-slate-200 my-2" />
                    <Row
                      label="Lucro total"
                      value={fmt(totais.lucro)}
                      valueClass={totais.lucro >= 0 ? "text-emerald-600 font-semibold" : "text-red-600 font-semibold"}
                    />
                    <Row
                      label="Margem"
                      value={`${totais.margem.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`}
                      valueClass={totais.margem >= 0 ? "text-emerald-600" : "text-red-600"}
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
                  <div className="text-xs uppercase tracking-wide text-slate-500 mb-3">Preços do kit</div>
                  <div className="space-y-2">
                    <Row label="Valor porta" value={fmt(Number(kit.valor_porta || 0))} />
                    <Row label="Valor instalação" value={fmt(Number(kit.valor_instalacao || 0))} />
                    <Row label="Valor pintura" value={fmt(Number(kit.valor_pintura || 0))} />
                    <Row label="Lucro manual" value={fmt(Number(kit.lucro || 0))} />
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      )}
    </MinimalistLayout>
  );
}

function Row({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className={cn("text-slate-900", valueClass)}>{value}</span>
    </div>
  );
}