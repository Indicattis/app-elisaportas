import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Plus, Trash2, Check, ChevronsUpDown } from "lucide-react";
import { useCustosItens } from "@/hooks/useCustosItens";
import { useKitMontagem, computeLucroUnit } from "@/hooks/useKitMontagem";
import type { ItemTabelaPreco } from "@/hooks/useTabelaPrecos";
import { cn } from "@/lib/utils";

interface Props {
  kit: ItemTabelaPreco | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function KitMontagemDialog({ kit, open, onOpenChange }: Props) {
  const kitId = kit?.id ?? null;
  const { items, isLoading, addItem, updateQuantidade, removeItem } = useKitMontagem(kitId);
  const { items: allCustosItens } = useCustosItens();
  const [pickerOpen, setPickerOpen] = useState(false);

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
    return { lucro, custo, venda };
  }, [items]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900/95 backdrop-blur-xl border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">Montagem do kit</DialogTitle>
          {kit && (
            <DialogDescription className="text-white/60">
              {kit.descricao} — {kit.largura}m × {kit.altura}m
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="text-sm text-white/60">
            {items.length} {items.length === 1 ? "item" : "itens"} na montagem
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
                            <div className="text-xs text-white/40">
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

        <div className="rounded-lg border border-white/10 bg-white/5 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="text-white/60">Item</TableHead>
                <TableHead className="text-white/60">Categoria</TableHead>
                <TableHead className="text-right text-white/60 w-28">Lucro un.</TableHead>
                <TableHead className="text-right text-white/60 w-28">Qtd</TableHead>
                <TableHead className="text-right text-white/60 w-32">Subtotal lucro</TableHead>
                <TableHead className="text-center text-white/60 w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center text-white/50 py-6">Carregando...</TableCell></TableRow>
              ) : items.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-white/50 py-6">Nenhum item na montagem</TableCell></TableRow>
              ) : (
                items.map((it) => {
                  const lucroUnit = it.custo_item ? computeLucroUnit(it.custo_item) : 0;
                  const subtotal = lucroUnit * Number(it.quantidade || 0);
                  return (
                    <TableRow key={it.id} className="border-white/10 hover:bg-white/5">
                      <TableCell className="text-white">{it.custo_item?.descricao ?? "—"}</TableCell>
                      <TableCell className="text-white/60">{it.custo_item?.categoria ?? "—"}</TableCell>
                      <TableCell className={cn("text-right", lucroUnit >= 0 ? "text-white/80" : "text-red-400")}>{fmt(lucroUnit)}</TableCell>
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
                      <TableCell className={cn("text-right font-medium", subtotal >= 0 ? "text-white" : "text-red-400")}>{fmt(subtotal)}</TableCell>
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

        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className="rounded-lg border border-white/10 bg-white/5 p-3">
            <div className="text-xs text-white/50">Custo total</div>
            <div className="text-sm font-medium text-white">{fmt(totais.custo)}</div>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-3">
            <div className="text-xs text-white/50">Venda total</div>
            <div className="text-sm font-medium text-white">{fmt(totais.venda)}</div>
          </div>
          <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3">
            <div className="text-xs text-white/60">Lucro total</div>
            <div className={cn("text-sm font-semibold", totais.lucro >= 0 ? "text-emerald-400" : "text-red-400")}>{fmt(totais.lucro)}</div>
          </div>
        </div>

        {items.length === 0 && (
          <Badge className="self-start mt-2 bg-amber-500/20 text-amber-300 border border-amber-500/30">
            Sem montagem — o lucro do kit segue editável manualmente
          </Badge>
        )}
      </DialogContent>
    </Dialog>
  );
}