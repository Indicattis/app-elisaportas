import { useMemo, useState } from "react";
import { Plus, Trash2, Check, ChevronsUpDown, LayoutTemplate } from "lucide-react";
import { MinimalistLayout } from "@/components/MinimalistLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useMontagemTemplate } from "@/hooks/useMontagemTemplate";
import { useCustosItens } from "@/hooks/useCustosItens";
import { cn } from "@/lib/utils";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function EstrategiaKitsTemplate() {
  const [pickerOpen, setPickerOpen] = useState(false);
  const { items, isLoading, addItem, updateQuantidade, removeItem } = useMontagemTemplate();
  const { items: allCustosItens } = useCustosItens();

  const usedIds = useMemo(() => new Set(items.map((i) => i.custo_item_id)), [items]);

  const totais = useMemo(() => {
    let custo = 0;
    let venda = 0;
    for (const it of items) {
      const q = Number(it.quantidade || 0);
      if (it.custo_item) {
        custo += q * Number(it.custo_item.custo_unitario || 0);
        venda += q * Number(it.custo_item.preco_venda || 0);
      }
    }
    return { custo, venda };
  }, [items]);

  return (
    <MinimalistLayout
      title="Template padrão de montagem"
      subtitle="Itens sugeridos para a montagem de novos kits"
      backPath="/direcao/estrategia/kits"
      breadcrumbItems={[
        { label: "Home", path: "/home" },
        { label: "Direção", path: "/direcao" },
        { label: "Estratégia", path: "/direcao/estrategia" },
        { label: "Tabela de Kits", path: "/direcao/estrategia/kits" },
        { label: "Template padrão" },
      ]}
      fullWidth
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-4 flex flex-wrap items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
            <LayoutTemplate className="h-5 w-5 text-blue-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-white font-medium truncate">Template padrão</div>
            <div className="text-xs text-white/60">
              Estes itens podem ser aplicados em qualquer kit com um clique
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-3 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm text-white/60">
                {items.length} {items.length === 1 ? "item" : "itens"} no template
              </div>
              <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                <PopoverTrigger asChild>
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                    <Plus className="h-4 w-4 mr-2" /> Adicionar item
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[420px] p-0 bg-slate-900 border-white/10" align="end">
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
                              className="text-white data-[selected=true]:bg-white/10"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="truncate">{ci.descricao}</div>
                                <div className="text-xs text-white/50">
                                  {ci.categoria ?? "Sem categoria"} · {ci.unidade ?? "un"}
                                </div>
                              </div>
                              {inUse ? (
                                <Check className="h-4 w-4 text-emerald-400" />
                              ) : (
                                <ChevronsUpDown className="h-4 w-4 text-white/40" />
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

            <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-transparent bg-white/5">
                    <TableHead className="text-white/60 min-w-[260px]">Item</TableHead>
                    <TableHead className="text-white/60">Unid.</TableHead>
                    <TableHead className="text-right text-white/60 w-28">Custo un.</TableHead>
                    <TableHead className="text-right text-white/60 w-24">Qtd</TableHead>
                    <TableHead className="text-right text-white/60 w-32">Subtotal custo</TableHead>
                    <TableHead className="text-right text-white/60 w-28">Preço</TableHead>
                    <TableHead className="text-right text-white/60 w-32">Preço total</TableHead>
                    <TableHead className="text-center text-white/60 w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={8} className="text-center text-white/60 py-6">Carregando...</TableCell></TableRow>
                  ) : items.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center text-white/60 py-6">Nenhum item no template</TableCell></TableRow>
                  ) : (
                    items.map((it) => {
                      const q = Number(it.quantidade || 0);
                      const custoUnit = Number(it.custo_item?.custo_unitario || 0);
                      const subtotalCusto = custoUnit * q;
                      const preco = Number(it.custo_item?.preco_venda || 0);
                      const precoTotal = preco * q;
                      return (
                        <TableRow key={it.id} className="border-white/10 hover:bg-white/5">
                          <TableCell className="text-white min-w-[260px]">{it.custo_item?.descricao ?? "—"}</TableCell>
                          <TableCell className="text-white/70">{it.custo_item?.unidade ?? "un"}</TableCell>
                          <TableCell className="text-right text-white/80">{fmt(custoUnit)}</TableCell>
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
                              className="h-8 w-24 ml-auto text-right bg-white/5 border-white/10 text-white"
                            />
                          </TableCell>
                          <TableCell className="text-right text-white">{fmt(subtotalCusto)}</TableCell>
                          <TableCell className="text-right text-white">{fmt(preco)}</TableCell>
                          <TableCell className="text-right text-white font-medium">{fmt(precoTotal)}</TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-white/10"
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
          </div>

          <aside className="lg:col-span-1">
            <div className="lg:sticky lg:top-4 space-y-3">
              <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-4">
                <div className="text-xs uppercase tracking-wide text-white/50 mb-3">Resumo do template</div>
                <div className="space-y-2">
                  <Row label="Itens" value={String(items.length)} />
                  <Row label="Custo total" value={fmt(totais.custo)} />
                  <Row label="Venda total" value={fmt(totais.venda)} />
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </MinimalistLayout>
  );
}

function Row({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-white/60">{label}</span>
      <span className={cn("text-white", valueClass)}>{value}</span>
    </div>
  );
}