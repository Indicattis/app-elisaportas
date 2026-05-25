import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Check, ChevronsUpDown, Boxes, LayoutTemplate } from "lucide-react";
import { MinimalistLayout } from "@/components/MinimalistLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { ItemTabelaPreco } from "@/hooks/useTabelaPrecos";
import { useKitMontagem, computeLucroUnit } from "@/hooks/useKitMontagem";
import { useCustosItens, useCustosItensPadroes } from "@/hooks/useCustosItens";
import { applyTemplateToKit } from "@/hooks/useMontagemTemplate";
import { cn } from "@/lib/utils";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function EstrategiaKitMontagem() {
  const { kitId } = useParams<{ kitId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [applying, setApplying] = useState(false);

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
  const { padroes } = useCustosItensPadroes();

  const usedIds = useMemo(() => new Set(items.map((i) => i.custo_item_id)), [items]);

  const { data: templateCount = 0 } = useQuery({
    queryKey: ["montagem-template-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("tabela_precos_montagem_template")
        .select("id", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    },
  });

  const handleApplyTemplate = async () => {
    if (!kitId) return;
    setApplying(true);
    try {
      const res = await applyTemplateToKit(kitId, usedIds);
      await queryClient.invalidateQueries({ queryKey: ["kit-montagem", kitId] });
      await queryClient.invalidateQueries({ queryKey: ["kits-montagem-resumo"] });
      if (res.added === 0) {
        toast.info("Todos os itens do template já estão no kit");
      } else if (res.skipped > 0) {
        toast.success(`${res.added} itens adicionados · ${res.skipped} já existiam`);
      } else {
        toast.success(`${res.added} itens adicionados`);
      }
      setConfirmOpen(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao aplicar template");
    } finally {
      setApplying(false);
    }
  };

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
        <div className="text-white/60 text-sm">Carregando kit...</div>
      ) : !kit ? (
        <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 text-white/80">
          Kit não encontrado.
          <Button variant="ghost" className="ml-3 text-white/80 hover:bg-white/10" onClick={() => navigate("/direcao/estrategia/kits")}>
            Voltar
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Cabeçalho */}
          <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-4 flex flex-wrap items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
              <Boxes className="h-5 w-5 text-blue-400" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-white font-medium truncate">{kit.descricao}</div>
              <div className="text-xs text-white/60">
                {kit.largura}m × {kit.altura}m
              </div>
            </div>
            <Badge className={kit.ativo ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30" : "bg-white/10 text-white/60 border border-white/10"}>
              {kit.ativo ? "Ativo" : "Inativo"}
            </Badge>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Tabela */}
            <div className="lg:col-span-3 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm text-white/60">
                  {items.length} {items.length === 1 ? "item" : "itens"} na montagem
                </div>
                <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white border border-white/10 bg-white/5 hover:bg-white/10"
                  onClick={() => setConfirmOpen(true)}
                  disabled={templateCount === 0}
                  title={templateCount === 0 ? "Template vazio" : "Aplicar template padrão"}
                >
                  <LayoutTemplate className="h-4 w-4 mr-2 text-blue-400" /> Aplicar template padrão
                </Button>
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
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 hover:bg-transparent bg-white/5">
                      <TableHead className="text-white/60 min-w-[260px]">Item</TableHead>
                      <TableHead className="text-white/60">Unid.</TableHead>
                      <TableHead className="text-right text-white/60 w-28">Custo un.</TableHead>
                      <TableHead className="text-right text-white/60 w-24">Imposto</TableHead>
                      <TableHead className="text-right text-white/60 w-28">Desc. Gerente</TableHead>
                      <TableHead className="text-right text-white/60 w-24">Cartão</TableHead>
                      <TableHead className="text-right text-white/60 w-24">Qtd</TableHead>
                      <TableHead className="text-right text-white/60 w-32">Subtotal custo</TableHead>
                      <TableHead className="text-right text-white/60 w-32">Soma preços</TableHead>
                      <TableHead className="text-right text-white/60 w-32">Subtotal lucro</TableHead>
                      <TableHead className="text-right text-white/60 w-28">Preço</TableHead>
                      <TableHead className="text-right text-white/60 w-32">Preço total</TableHead>
                      <TableHead className="text-center text-white/60 w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={13} className="text-center text-white/60 py-6">Carregando...</TableCell></TableRow>
                    ) : items.length === 0 ? (
                      <TableRow><TableCell colSpan={13} className="text-center text-white/60 py-6">Nenhum item na montagem</TableCell></TableRow>
                    ) : (
                      items.map((it) => {
                        const q = Number(it.quantidade || 0);
                        const custoUnit = Number(it.custo_item?.custo_unitario || 0);
                        const subtotalCusto = custoUnit * q;
                        const lucroUnit = it.custo_item ? computeLucroUnit(it.custo_item) : 0;
                        const subtotalLucro = lucroUnit * q;
                        const somaPrecos = Number(it.custo_item?.preco_venda || 0) * q;
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
                          <TableRow key={it.id} className="border-white/10 hover:bg-white/5">
                            <TableCell className="text-white min-w-[260px]">{it.custo_item?.descricao ?? "—"}</TableCell>
                            <TableCell className="text-white/70">{it.custo_item?.unidade ?? "un"}</TableCell>
                            <TableCell className="text-right text-white/80">{fmt(custoUnit)}</TableCell>
                            <TableCell className="text-right text-white/70"><span title={pctFmt(tImp)}>{fmt(vImp)}</span></TableCell>
                            <TableCell className="text-right text-white/70"><span title={pctFmt(tDesc)}>{fmt(vDesc)}</span></TableCell>
                            <TableCell className="text-right text-white/70"><span title={pctFmt(tCart)}>{fmt(vCart)}</span></TableCell>
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
                            <TableCell className="text-right text-white">{fmt(somaPrecos)}</TableCell>
                            <TableCell className={cn("text-right font-medium", subtotalLucro >= 0 ? "text-emerald-400" : "text-red-400")}>{fmt(subtotalLucro)}</TableCell>
                            <TableCell className="text-right text-white">{fmt(preco)}</TableCell>
                            <TableCell className="text-right text-white font-medium">{fmt(somaPrecos)}</TableCell>
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

            {/* Resumo lateral */}
            <aside className="lg:col-span-1">
              <div className="lg:sticky lg:top-4 space-y-3">
                <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-4">
                  <div className="text-xs uppercase tracking-wide text-white/50 mb-3">Resumo da montagem</div>
                  <div className="space-y-2">
                    <Row label="Itens" value={String(items.length)} />
                    <Row label="Custo total" value={fmt(totais.custo)} />
                    <Row label="Venda total" value={fmt(totais.venda)} />
                    <div className="h-px bg-white/10 my-2" />
                    <Row
                      label="Lucro total"
                      value={fmt(totais.lucro)}
                      valueClass={totais.lucro >= 0 ? "text-emerald-400 font-semibold" : "text-red-400 font-semibold"}
                    />
                    <Row
                      label="Margem"
                      value={`${totais.margem.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`}
                      valueClass={totais.margem >= 0 ? "text-emerald-400" : "text-red-400"}
                    />
                  </div>
                </div>

                {/* Lucro adicional */}
                <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-4">
                  <div className="text-xs uppercase tracking-wide text-white/50 mb-3">Lucro adicional</div>
                  {(() => {
                    const precoPorta = Number(kit.valor_porta || 0);
                    const tImp = Number(padroes?.taxa_impostos ?? 0);
                    const tDesc = Number(padroes?.taxa_descontos ?? 0);
                    const tCard = Number(padroes?.taxa_cartao ?? 0);
                    const vImp = precoPorta * (tImp / 100);
                    const vDesc = precoPorta * (tDesc / 100);
                    const vCard = precoPorta * (tCard / 100);
                    const lucroAdd = precoPorta - totais.custo - vImp - vDesc - vCard;
                    const margemAdd = precoPorta > 0 ? (lucroAdd / precoPorta) * 100 : 0;
                    return (
                      <div className="space-y-2">
                        <Row label="Custo total montagem" value={fmt(totais.custo)} />
                        <Row label="Preço da porta" value={fmt(precoPorta)} />
                        <Row label={`Imposto (${tImp}%)`} value={`- ${fmt(vImp)}`} valueClass="text-orange-300" />
                        <Row label={`Desconto Gerente (${tDesc}%)`} value={`- ${fmt(vDesc)}`} valueClass="text-yellow-300" />
                        <Row label={`Cartão (${tCard}%)`} value={`- ${fmt(vCard)}`} valueClass="text-teal-300" />
                        <div className="h-px bg-white/10 my-2" />
                        <Row
                          label="Lucro adicional"
                          value={fmt(lucroAdd)}
                          valueClass={lucroAdd >= 0 ? "text-emerald-400 font-semibold" : "text-red-400 font-semibold"}
                        />
                        <Row
                          label="Margem"
                          value={`${margemAdd.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`}
                          valueClass={margemAdd >= 0 ? "text-emerald-400" : "text-red-400"}
                        />
                      </div>
                    );
                  })()}
                </div>
              </div>
            </aside>
          </div>
        </div>
      )}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="bg-slate-900 border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Aplicar template padrão?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/70">
              Serão adicionados os {templateCount} itens do template padrão a este kit.
              Itens já presentes são preservados (não duplica, não sobrescreve quantidades).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleApplyTemplate(); }}
              disabled={applying}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {applying ? "Aplicando..." : "Aplicar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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