import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { MinimalistLayout } from "@/components/MinimalistLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { formatCurrency } from "@/lib/utils";
import { useCustosItens, CustoItem } from "@/hooks/useCustosItens";

const UNIDADES = ["Un", "M", "Kg", "L", "M²", "M³", "Cx", "Pç"];

type EditableCellProps = {
  value: string | number | null | undefined;
  type?: "text" | "number" | "currency";
  align?: "left" | "right" | "center";
  display?: React.ReactNode;
  placeholder?: string;
  onSave: (newValue: string | number) => Promise<void> | void;
};

function EditableCell({ value, type = "text", align = "left", display, placeholder, onSave }: EditableCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>(value == null ? "" : String(value));

  useEffect(() => {
    if (!editing) setDraft(value == null ? "" : String(value));
  }, [value, editing]);

  const commit = async () => {
    setEditing(false);
    const original = value == null ? "" : String(value);
    if (draft === original) return;
    if (type === "number" || type === "currency") {
      const num = Number(draft.replace(",", "."));
      if (Number.isNaN(num)) return;
      await onSave(num);
    } else {
      await onSave(draft);
    }
  };

  if (editing) {
    return (
      <Input
        autoFocus
        type={type === "text" ? "text" : "number"}
        step={type === "currency" ? "0.01" : undefined}
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); commit(); }
          if (e.key === "Escape") { setEditing(false); setDraft(value == null ? "" : String(value)); }
        }}
        className="h-7 px-2 text-sm bg-white/10 border-white/20 text-white"
      />
    );
  }

  const alignCls = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return (
    <div
      className={`${alignCls} cursor-text rounded px-1 py-0.5 hover:bg-white/5 min-h-[1.5rem]`}
      onClick={() => setEditing(true)}
    >
      {display ?? (value === null || value === undefined || value === "" ? <span className="text-white/30">—</span> : value)}
    </div>
  );
}

function EditableSelectCell({
  value,
  options,
  placeholder,
  onSave,
}: {
  value: string | null | undefined;
  options: string[];
  placeholder?: string;
  onSave: (newValue: string) => Promise<void> | void;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <Select
        defaultOpen
        value={value ?? undefined}
        onValueChange={async (v) => {
          setEditing(false);
          if (v !== value) await onSave(v);
        }}
      >
        <SelectTrigger className="h-7 px-2 text-sm bg-white/10 border-white/20 text-white">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="bg-zinc-900 border-white/10 text-white">
          {options.map((o) => (
            <SelectItem key={o} value={o}>{o}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <div
      className="cursor-pointer rounded px-1 py-0.5 hover:bg-white/5 min-h-[1.5rem]"
      onClick={() => setEditing(true)}
    >
      {value || <span className="text-white/30">—</span>}
    </div>
  );
}

function calcularMarkup(custo: number, preco: number) {
  if (!custo) return null;
  return ((preco - custo) / custo) * 100;
}

export default function EstrategiaItens() {
  const { items, isLoading, createItem, updateItem, deleteItem } = useCustosItens();
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newItem, setNewItem] = useState({
    descricao: "",
    categoria: "",
    subcategoria: "",
    unidade: "Un",
    custo_unitario: "0",
    preco_venda: "0",
    fornecedor: "",
    quantidade: "0",
    quantidade_ideal: "0",
    quantidade_maxima: "0",
  });

  const filteredItems = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return items;
    return items.filter((it) =>
      [it.descricao, it.categoria, it.subcategoria, it.unidade, it.fornecedor]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term))
    );
  }, [items, searchTerm]);

  const groupedByCategoria = useMemo(() => {
    const groups = new Map<string, CustoItem[]>();
    for (const it of filteredItems) {
      const key = it.categoria?.trim() || "Sem categoria";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(it);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredItems]);

  const categoriasExistentes = useMemo(() => {
    const set = new Set<string>();
    for (const it of items) if (it.categoria) set.add(it.categoria.trim());
    return Array.from(set).sort();
  }, [items]);

  const totals = useMemo(() => {
    let custo = 0;
    for (const it of filteredItems) {
      custo += Number(it.custo_unitario || 0);
    }
    return { custo };
  }, [filteredItems]);

  const handleCreate = async () => {
    if (!newItem.descricao.trim()) return;
    await createItem.mutateAsync({
      descricao: newItem.descricao.trim(),
      categoria: newItem.categoria.trim() || null,
      subcategoria: newItem.subcategoria.trim() || null,
      unidade: newItem.unidade || null,
      custo_unitario: Number(newItem.custo_unitario.replace(",", ".")) || 0,
      preco_venda: Number(newItem.preco_venda.replace(",", ".")) || 0,
      fornecedor: newItem.fornecedor.trim() || null,
      quantidade: Number(newItem.quantidade.replace(",", ".")) || 0,
      quantidade_ideal: Number(newItem.quantidade_ideal.replace(",", ".")) || 0,
      quantidade_maxima: Number(newItem.quantidade_maxima.replace(",", ".")) || 0,
    });
    setNewItem({ descricao: "", categoria: "", subcategoria: "", unidade: "Un", custo_unitario: "0", preco_venda: "0", fornecedor: "", quantidade: "0", quantidade_ideal: "0", quantidade_maxima: "0" });
    setDialogOpen(false);
  };

  const headerActions = (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Adicionar item
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-900 border-white/10 text-white">
        <DialogHeader>
          <DialogTitle>Novo item</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Descrição</Label>
            <Input
              value={newItem.descricao}
              onChange={(e) => setNewItem({ ...newItem, descricao: e.target.value })}
              className="bg-white/5 border-white/10 text-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Categoria</Label>
              <Input
                list="categorias-list"
                value={newItem.categoria}
                onChange={(e) => setNewItem({ ...newItem, categoria: e.target.value })}
                className="bg-white/5 border-white/10 text-white"
              />
              <datalist id="categorias-list">
                {categoriasExistentes.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div>
              <Label>Subcategoria</Label>
              <Input
                value={newItem.subcategoria}
                onChange={(e) => setNewItem({ ...newItem, subcategoria: e.target.value })}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Unidade</Label>
              <Select value={newItem.unidade} onValueChange={(v) => setNewItem({ ...newItem, unidade: v })}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-white/10 text-white">
                  {UNIDADES.map((u) => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Custo unit. (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={newItem.custo_unitario}
                onChange={(e) => setNewItem({ ...newItem, custo_unitario: e.target.value })}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
            <div>
              <Label>Preço venda (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={newItem.preco_venda}
                onChange={(e) => setNewItem({ ...newItem, preco_venda: e.target.value })}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleCreate} disabled={!newItem.descricao.trim() || createItem.isPending}>
            Criar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <MinimalistLayout
      title="Itens"
      subtitle="Catálogo de itens"
      backPath="/direcao/estrategia"
      headerActions={headerActions}
      breadcrumbItems={[
        { label: "Home", path: "/home" },
        { label: "Direção", path: "/direcao" },
        { label: "Estratégia", path: "/direcao/estrategia" },
        { label: "Itens" },
      ]}
      fullWidth
    >
      <div className="space-y-4 px-[84px]">
        {/* Barra de busca */}
        <div className="p-1.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10">
          <div className="p-4 rounded-lg">
            <Input
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="!h-[50px] !w-[150px] min-w-[150px] max-w-[150px] shrink-0 bg-white/5 border-white/10 text-white placeholder:text-white/40"
            />
          </div>
        </div>

        {isLoading && (
          <div className="rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 p-6 text-center text-white/60">
            Carregando...
          </div>
        )}

        {!isLoading && groupedByCategoria.length === 0 && (
          <div className="rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 p-6 text-center text-white/60">
            Nenhum item encontrado.
          </div>
        )}

        <div className="flex flex-col gap-6">
          {groupedByCategoria.map(([categoria, rows]) => (
            <div key={categoria} className="flex flex-col gap-2">
              <div className="flex items-center gap-2 px-1">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-white/40" />
                <span className="text-[11px] uppercase tracking-wider font-medium text-white/60">{categoria}</span>
                <span className="text-[11px] text-white/30">· {rows.length}</span>
              </div>
              <div className="rounded-xl overflow-hidden bg-white/5 backdrop-blur-xl border border-white/10">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="text-xs font-medium text-white/60">Descrição</TableHead>
                    <TableHead className="text-xs font-medium text-white/60">Subcategoria</TableHead>
                    <TableHead className="text-xs font-medium text-white/60 text-center w-28">Unidade</TableHead>
                    <TableHead className="text-xs font-medium text-white/60 text-right w-40">Custo</TableHead>
                    <TableHead className="text-xs font-medium text-white/80 text-right w-40 bg-green-500/10">Preço Final</TableHead>
                    <TableHead className="text-xs font-medium text-white/60 text-right w-32">% Markup</TableHead>
                    <TableHead className="text-xs font-medium text-white/60 text-center w-16">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((item) => {
                    const markup = calcularMarkup(Number(item.custo_unitario || 0), Number(item.preco_venda || 0));
                    return (
                      <TableRow key={item.id} className="border-white/5 hover:bg-white/5">
                        <TableCell className="text-white">
                          <EditableCell
                            value={item.descricao}
                            onSave={(v) => updateItem.mutateAsync({ id: item.id, patch: { descricao: String(v) } })}
                          />
                        </TableCell>
                        <TableCell className="text-white">
                          <EditableCell
                            value={item.subcategoria ?? ""}
                            onSave={(v) => updateItem.mutateAsync({ id: item.id, patch: { subcategoria: String(v) || null } })}
                          />
                        </TableCell>
                        <TableCell className="text-center text-white/80">
                          <EditableSelectCell
                            value={item.unidade}
                            options={UNIDADES}
                            placeholder="Un"
                            onSave={(v) => updateItem.mutateAsync({ id: item.id, patch: { unidade: v } })}
                          />
                        </TableCell>
                        <TableCell className="text-right text-white/80">
                          <EditableCell
                            value={Number(item.custo_unitario || 0)}
                            type="currency"
                            align="right"
                            display={formatCurrency(Number(item.custo_unitario || 0))}
                            onSave={(v) => updateItem.mutateAsync({ id: item.id, patch: { custo_unitario: Number(v) } })}
                          />
                        </TableCell>
                        <TableCell className="text-right font-medium text-white bg-green-500/10">
                          <EditableCell
                            value={Number(item.preco_venda || 0)}
                            type="currency"
                            align="right"
                            display={formatCurrency(Number(item.preco_venda || 0))}
                            onSave={(v) => updateItem.mutateAsync({ id: item.id, patch: { preco_venda: Number(v) } })}
                          />
                        </TableCell>
                        <TableCell className="text-right text-white/80">
                          {markup === null ? <span className="text-white/30">—</span> : `${markup.toFixed(1)}%`}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-white/40 hover:text-red-400 hover:bg-red-500/10"
                            onClick={() => {
                              if (confirm(`Excluir "${item.descricao}"?`)) {
                                deleteItem.mutate(item.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              </div>
            </div>
          ))}
        </div>

        {/* Total geral */}
        {filteredItems.length > 0 && (
          <div className="rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 p-4 flex items-center justify-end gap-8 text-sm">
            <div className="flex flex-col items-end">
              <span className="text-white/50 text-xs uppercase">Total custo</span>
              <span className="text-white font-semibold">{formatCurrency(totals.custo)}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-white/50 text-xs uppercase">Total preço</span>
              <span className="text-emerald-400 font-semibold">{formatCurrency(totals.preco)}</span>
            </div>
          </div>
        )}
      </div>
    </MinimalistLayout>
  );
}