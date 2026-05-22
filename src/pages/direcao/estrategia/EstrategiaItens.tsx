import { useEffect, useMemo, useState, CSSProperties } from "react";
import { Plus, Trash2, Percent, ArrowUpDown, ArrowUp, ArrowDown, Pencil, Check, X, GripVertical, FolderInput, Palette } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis, restrictToParentElement } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
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
import { toast } from "sonner";
import { useCustosItens, CustoItem, useCustosItensPadroes, useCustosItensCategoriasOrdem, useRenomearCategoriaItens } from "@/hooks/useCustosItens";
import { cn } from "@/lib/utils";

const UNIDADES = ["Un", "M", "Kg", "L", "M²", "M³", "Cx", "Pç"];

// ============== Cores configuráveis das colunas ==============
const COLUMN_COLOR_OPTIONS: Record<string, { label: string; bg: string; swatch: string }> = {
  rose:    { label: "Rosa",      bg: "bg-rose-500/30",    swatch: "bg-rose-500" },
  red:     { label: "Vermelho",  bg: "bg-red-500/30",     swatch: "bg-red-500" },
  orange:  { label: "Laranja",   bg: "bg-orange-500/30",  swatch: "bg-orange-500" },
  amber:   { label: "Âmbar",     bg: "bg-amber-500/30",   swatch: "bg-amber-500" },
  yellow:  { label: "Amarelo",   bg: "bg-yellow-500/30",  swatch: "bg-yellow-500" },
  lime:    { label: "Lima",      bg: "bg-lime-500/30",    swatch: "bg-lime-500" },
  green:   { label: "Verde",     bg: "bg-green-500/30",   swatch: "bg-green-500" },
  emerald: { label: "Esmeralda", bg: "bg-emerald-500/30", swatch: "bg-emerald-500" },
  teal:    { label: "Teal",      bg: "bg-teal-500/30",    swatch: "bg-teal-500" },
  cyan:    { label: "Ciano",     bg: "bg-cyan-500/30",    swatch: "bg-cyan-500" },
  sky:     { label: "Céu",       bg: "bg-sky-500/30",     swatch: "bg-sky-500" },
  blue:    { label: "Azul",      bg: "bg-blue-500/30",    swatch: "bg-blue-500" },
  indigo:  { label: "Índigo",    bg: "bg-indigo-500/30",  swatch: "bg-indigo-500" },
  violet:  { label: "Violeta",   bg: "bg-violet-500/30",  swatch: "bg-violet-500" },
  purple:  { label: "Roxo",      bg: "bg-purple-500/30",  swatch: "bg-purple-500" },
  fuchsia: { label: "Fúcsia",    bg: "bg-fuchsia-500/30", swatch: "bg-fuchsia-500" },
  pink:    { label: "Pink",      bg: "bg-pink-500/30",    swatch: "bg-pink-500" },
  slate:   { label: "Cinza",     bg: "bg-slate-500/30",   swatch: "bg-slate-500" },
};

type ColumnKey = "custo" | "lucro" | "imposto" | "desconto" | "cartao" | "venda";
const COLUMN_LABELS: Record<ColumnKey, string> = {
  custo: "Custo",
  lucro: "Lucro",
  imposto: "Imposto",
  desconto: "Desc. Gerente",
  cartao: "Cartão",
  venda: "Valor de Venda",
};
const DEFAULT_COLUMN_COLORS: Record<ColumnKey, string> = {
  custo: "rose",
  lucro: "blue",
  imposto: "orange",
  desconto: "yellow",
  cartao: "teal",
  venda: "green",
};
const COLUMN_COLORS_STORAGE_KEY = "estrategia-itens-column-colors-v1";

function getColumnBg(colors: Record<ColumnKey, string>, key: ColumnKey) {
  const c = colors[key] || DEFAULT_COLUMN_COLORS[key];
  return (COLUMN_COLOR_OPTIONS[c] || COLUMN_COLOR_OPTIONS[DEFAULT_COLUMN_COLORS[key]]).bg;
}

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
        className="h-7 px-2 text-sm bg-muted border-border text-foreground"
      />
    );
  }

  const alignCls = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return (
    <div
      className={`${alignCls} cursor-text rounded px-1 py-0.5 hover:bg-muted/60 min-h-[1.5rem]`}
      onClick={() => setEditing(true)}
    >
      {display ?? (value === null || value === undefined || value === "" ? <span className="text-muted-foreground/60">—</span> : value)}
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
        <SelectTrigger className="h-7 px-2 text-sm bg-muted border-border text-foreground">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="bg-popover text-popover-foreground border-border text-foreground">
          {options.map((o) => (
            <SelectItem key={o} value={o}>{o}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <div
      className="cursor-pointer rounded px-1 py-0.5 hover:bg-muted/60 min-h-[1.5rem]"
      onClick={() => setEditing(true)}
    >
      {value || <span className="text-muted-foreground/60">—</span>}
    </div>
  );
}

function calcularMarkup(custo: number, preco: number) {
  if (!custo) return null;
  return ((preco - custo) / custo) * 100;
}

function CategoriaTitulo({
  categoria,
  onRename,
}: {
  categoria: string;
  onRename: (novo: string) => Promise<unknown> | unknown;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(categoria);

  useEffect(() => {
    if (!editing) setDraft(categoria);
  }, [categoria, editing]);

  const commit = async () => {
    setEditing(false);
    const novo = draft.trim();
    if (!novo || novo === categoria) {
      setDraft(categoria);
      return;
    }
    await onRename(novo);
  };

  if (editing) {
    return (
      <Input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); commit(); }
          if (e.key === "Escape") { setEditing(false); setDraft(categoria); }
        }}
        className="h-6 px-2 py-0 text-[11px] uppercase tracking-wider bg-muted border-border text-foreground w-56"
      />
    );
  }

  return (
    <span
      onClick={() => setEditing(true)}
      className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground cursor-text rounded px-1 py-0.5 hover:bg-muted/60 hover:text-foreground"
      title="Clique para renomear"
    >
      {categoria}
    </span>
  );
}

function CategoriaOrdemRow({
  categoria,
  index,
  total,
  onMove,
  onRename,
}: {
  categoria: string;
  index: number;
  total: number;
  onMove: (dir: -1 | 1) => void;
  onRename: (novo: string) => Promise<void> | void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(categoria);

  useEffect(() => {
    if (!editing) setDraft(categoria);
  }, [categoria, editing]);

  const commit = async () => {
    setEditing(false);
    await onRename(draft);
  };

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card/60 border border-border">
      <span className="text-[11px] text-muted-foreground/70 w-6">{index + 1}.</span>
      {editing ? (
        <>
          <Input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); commit(); }
              if (e.key === "Escape") { setEditing(false); setDraft(categoria); }
            }}
            className="flex-1 h-7 px-2 text-sm bg-muted border-border text-foreground"
          />
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-emerald-400 hover:text-emerald-300 hover:bg-muted"
            onMouseDown={(e) => e.preventDefault()}
            onClick={commit}
          >
            <Check className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => { setEditing(false); setDraft(categoria); }}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </>
      ) : (
        <>
          <span className="flex-1 text-sm text-foreground truncate">{categoria}</span>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted"
            onClick={() => setEditing(true)}
            title="Renomear"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted"
            onClick={() => onMove(-1)}
            disabled={index === 0}
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted"
            onClick={() => onMove(1)}
            disabled={index === total - 1}
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </Button>
        </>
      )}
    </div>
  );
}

type SortableItemRowProps = {
  item: CustoItem;
  disabled: boolean;
  categorias: string[];
  colors: Record<ColumnKey, string>;
  onUpdate: (patch: Partial<CustoItem>) => Promise<void> | void;
  onDelete: () => void;
};

function SortableItemRow({ item, disabled, categorias, colors, onUpdate, onDelete }: SortableItemRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled,
  });
  const [moverOpen, setMoverOpen] = useState(false);
  const [novaCategoria, setNovaCategoria] = useState(item.categoria ?? "");
  useEffect(() => {
    if (!moverOpen) setNovaCategoria(item.categoria ?? "");
  }, [moverOpen, item.categoria]);
  const handleMover = async () => {
    const valor = novaCategoria.trim();
    const atual = (item.categoria ?? "").trim();
    if (valor === atual) { setMoverOpen(false); return; }
    await onUpdate({ categoria: (valor || null) as any });
    toast.success(valor ? `Movido para "${valor}"` : "Item sem categoria");
    setMoverOpen(false);
  };
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    position: "relative",
    zIndex: isDragging ? 10 : "auto",
  };
  const custo = Number(item.custo_unitario || 0);
  const preco = Number(item.preco_venda || 0);
  const tImp = Number(item.taxa_impostos || 0);
  const tDesc = Number(item.taxa_descontos || 0);
  const tCard = Number(item.taxa_cartao || 0);
  const deducoes = tImp + tDesc + tCard;
  const lucro = preco - deducoes - custo;
  const corLucro = lucro > 0 ? "text-emerald-400" : lucro < 0 ? "text-red-400" : "text-muted-foreground";
  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={cn("border-border/60 hover:bg-muted/60", isDragging && "shadow-lg bg-muted/40")}
    >
      <TableCell className="w-8 p-0 text-center align-middle">
        {!disabled && (
          <button
            type="button"
            className="inline-flex h-7 w-7 items-center justify-center text-muted-foreground/50 hover:text-foreground cursor-grab active:cursor-grabbing touch-none"
            aria-label="Arrastar para reordenar"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        )}
      </TableCell>
      <TableCell className="text-foreground">
        <EditableCell
          value={item.descricao}
          onSave={(v) => onUpdate({ descricao: String(v) })}
        />
      </TableCell>
      <TableCell className={`text-right text-foreground ${getColumnBg(colors, "custo")}`}>
        <EditableCell
          value={custo}
          type="currency"
          align="right"
          display={formatCurrency(custo)}
          onSave={(v) => onUpdate({ custo_unitario: Number(v) })}
        />
      </TableCell>
      <TableCell className={`text-right font-medium ${getColumnBg(colors, "lucro")} ${corLucro}`}>
        {formatCurrency(lucro)}
      </TableCell>
      <TableCell className={`text-right text-foreground ${getColumnBg(colors, "imposto")}`}>
        <EditableCell
          value={tImp}
          type="currency"
          align="right"
          display={formatCurrency(tImp)}
          onSave={(v) => onUpdate({ taxa_impostos: Number(v) })}
        />
      </TableCell>
      <TableCell className={`text-right text-foreground ${getColumnBg(colors, "desconto")}`}>
        <EditableCell
          value={tDesc}
          type="currency"
          align="right"
          display={formatCurrency(tDesc)}
          onSave={(v) => onUpdate({ taxa_descontos: Number(v) })}
        />
      </TableCell>
      <TableCell className={`text-right text-foreground ${getColumnBg(colors, "cartao")}`}>
        <EditableCell
          value={tCard}
          type="currency"
          align="right"
          display={formatCurrency(tCard)}
          onSave={(v) => onUpdate({ taxa_cartao: Number(v) })}
        />
      </TableCell>
      <TableCell className={`text-right font-medium text-foreground ${getColumnBg(colors, "venda")}`}>
        <EditableCell
          value={preco}
          type="currency"
          align="right"
          display={formatCurrency(preco)}
          onSave={(v) => onUpdate({ preco_venda: Number(v) })}
        />
      </TableCell>
      <TableCell className="text-center">
        <div className="flex items-center justify-center gap-1">
          <Dialog open={moverOpen} onOpenChange={setMoverOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground/70 hover:text-blue-400 hover:bg-blue-500/10"
                title="Mover de categoria"
              >
                <FolderInput className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-popover text-popover-foreground border-border text-foreground max-w-sm">
              <DialogHeader>
                <DialogTitle>Mover de categoria</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground/80 truncate">{item.descricao}</p>
                <div>
                  <Label>Categoria</Label>
                  <Input
                    list={`mover-categorias-${item.id}`}
                    value={novaCategoria}
                    onChange={(e) => setNovaCategoria(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleMover(); } }}
                    placeholder="Selecione ou digite uma nova"
                    className="bg-card/60 border-border text-foreground"
                  />
                  <datalist id={`mover-categorias-${item.id}`}>
                    {categorias.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setMoverOpen(false)}>Cancelar</Button>
                <Button onClick={handleMover}>Mover</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground/70 hover:text-red-400 hover:bg-red-500/10"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export default function EstrategiaItens() {
  const { items, isLoading, createItem, updateItem, deleteItem, reordenarItens } = useCustosItens();
  const { padroes, aplicarEmTodos } = useCustosItensPadroes();
  const { categoriasOrdem, salvarOrdem } = useCustosItensCategoriasOrdem();
  const renomearCategoria = useRenomearCategoriaItens();
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [padroesOpen, setPadroesOpen] = useState(false);
  const [padroesForm, setPadroesForm] = useState({ taxa_impostos: "0", taxa_descontos: "0", taxa_cartao: "0" });
  const [ordemOpen, setOrdemOpen] = useState(false);
  const [ordemDraft, setOrdemDraft] = useState<string[]>([]);
  const [coresOpen, setCoresOpen] = useState(false);
  const [columnColors, setColumnColors] = useState<Record<ColumnKey, string>>(() => {
    if (typeof window === "undefined") return { ...DEFAULT_COLUMN_COLORS };
    try {
      const raw = window.localStorage.getItem(COLUMN_COLORS_STORAGE_KEY);
      if (!raw) return { ...DEFAULT_COLUMN_COLORS };
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_COLUMN_COLORS, ...parsed };
    } catch {
      return { ...DEFAULT_COLUMN_COLORS };
    }
  });
  useEffect(() => {
    try {
      window.localStorage.setItem(COLUMN_COLORS_STORAGE_KEY, JSON.stringify(columnColors));
    } catch { /* ignore */ }
  }, [columnColors]);

  useEffect(() => {
    if (padroes) {
      setPadroesForm({
        taxa_impostos: String(padroes.taxa_impostos ?? 0),
        taxa_descontos: String(padroes.taxa_descontos ?? 0),
        taxa_cartao: String(padroes.taxa_cartao ?? 0),
      });
    }
  }, [padroes]);

  const handleAplicarPadroes = async () => {
    await aplicarEmTodos.mutateAsync({
      taxa_impostos: Number(padroesForm.taxa_impostos.replace(",", ".")) || 0,
      taxa_descontos: Number(padroesForm.taxa_descontos.replace(",", ".")) || 0,
      taxa_cartao: Number(padroesForm.taxa_cartao.replace(",", ".")) || 0,
    });
    setPadroesOpen(false);
  };
  const [newItem, setNewItem] = useState({
    descricao: "",
    categoria: "",
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
      [it.descricao, it.categoria, it.unidade, it.fornecedor]
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
    const ordemMap = new Map(categoriasOrdem.map((c) => [c.categoria, c.ordem]));
    return Array.from(groups.entries()).sort(([a], [b]) => {
      const oa = ordemMap.has(a) ? ordemMap.get(a)! : Number.MAX_SAFE_INTEGER;
      const ob = ordemMap.has(b) ? ordemMap.get(b)! : Number.MAX_SAFE_INTEGER;
      if (oa !== ob) return oa - ob;
      return a.localeCompare(b);
    });
  }, [filteredItems, categoriasOrdem]);

  const todasCategorias = useMemo(() => {
    const set = new Set<string>();
    for (const it of items) set.add(it.categoria?.trim() || "Sem categoria");
    return Array.from(set);
  }, [items]);

  const openOrdemDialog = () => {
    const ordemMap = new Map(categoriasOrdem.map((c) => [c.categoria, c.ordem]));
    const sorted = [...todasCategorias].sort((a, b) => {
      const oa = ordemMap.has(a) ? ordemMap.get(a)! : Number.MAX_SAFE_INTEGER;
      const ob = ordemMap.has(b) ? ordemMap.get(b)! : Number.MAX_SAFE_INTEGER;
      if (oa !== ob) return oa - ob;
      return a.localeCompare(b);
    });
    setOrdemDraft(sorted);
    setOrdemOpen(true);
  };

  const moveOrdem = (idx: number, dir: -1 | 1) => {
    const next = [...ordemDraft];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setOrdemDraft(next);
  };

  const handleSalvarOrdem = async () => {
    await salvarOrdem.mutateAsync(ordemDraft.map((categoria, i) => ({ categoria, ordem: i })));
    setOrdemOpen(false);
  };

  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );
  const isDndDisabled = Boolean(searchTerm.trim());

  const handleDragEndCategoria = (rows: CustoItem[]) => (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = rows.findIndex((r) => r.id === active.id);
    const newIndex = rows.findIndex((r) => r.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(rows, oldIndex, newIndex);
    reordenarItens.mutate(reordered.map((r, i) => ({ id: r.id, ordem: i })));
  };

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
      unidade: newItem.unidade || null,
      custo_unitario: Number(newItem.custo_unitario.replace(",", ".")) || 0,
      preco_venda: Number(newItem.preco_venda.replace(",", ".")) || 0,
      fornecedor: newItem.fornecedor.trim() || null,
      quantidade: Number(newItem.quantidade.replace(",", ".")) || 0,
      quantidade_ideal: Number(newItem.quantidade_ideal.replace(",", ".")) || 0,
      quantidade_maxima: Number(newItem.quantidade_maxima.replace(",", ".")) || 0,
    });
    setNewItem({ descricao: "", categoria: "", unidade: "Un", custo_unitario: "0", preco_venda: "0", fornecedor: "", quantidade: "0", quantidade_ideal: "0", quantidade_maxima: "0" });
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
      <DialogContent className="bg-popover text-popover-foreground border-border text-foreground">
        <DialogHeader>
          <DialogTitle>Novo item</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Descrição</Label>
            <Input
              value={newItem.descricao}
              onChange={(e) => setNewItem({ ...newItem, descricao: e.target.value })}
              className="bg-card/60 border-border text-foreground"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Categoria</Label>
              <Input
                list="categorias-list"
                value={newItem.categoria}
                onChange={(e) => setNewItem({ ...newItem, categoria: e.target.value })}
                className="bg-card/60 border-border text-foreground"
              />
              <datalist id="categorias-list">
                {categoriasExistentes.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div>
              <Label>Fornecedor</Label>
              <Input
                value={newItem.fornecedor}
                onChange={(e) => setNewItem({ ...newItem, fornecedor: e.target.value })}
                className="bg-card/60 border-border text-foreground"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Qtd Ideal</Label>
              <Input
                type="number"
                step="0.01"
                value={newItem.quantidade_ideal}
                onChange={(e) => setNewItem({ ...newItem, quantidade_ideal: e.target.value })}
                className="bg-card/60 border-border text-foreground"
              />
            </div>
            <div>
              <Label>Qtd Máxima</Label>
              <Input
                type="number"
                step="0.01"
                value={newItem.quantidade_maxima}
                onChange={(e) => setNewItem({ ...newItem, quantidade_maxima: e.target.value })}
                className="bg-card/60 border-border text-foreground"
              />
            </div>
            <div>
              <Label>Qtd</Label>
              <Input
                type="number"
                step="0.01"
                value={newItem.quantidade}
                onChange={(e) => setNewItem({ ...newItem, quantidade: e.target.value })}
                className="bg-card/60 border-border text-foreground"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Unidade</Label>
              <Select value={newItem.unidade} onValueChange={(v) => setNewItem({ ...newItem, unidade: v })}>
                <SelectTrigger className="bg-card/60 border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover text-popover-foreground border-border text-foreground">
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
                className="bg-card/60 border-border text-foreground"
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
        <div className="p-1.5 rounded-xl bg-card/60 backdrop-blur-xl border border-border">
          <div className="p-4 rounded-lg flex items-center gap-3">
            <Input
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="!h-[50px] !w-[150px] min-w-[150px] max-w-[150px] shrink-0 bg-card/60 border-border text-foreground placeholder:text-muted-foreground/70"
            />
            <Dialog open={padroesOpen} onOpenChange={setPadroesOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="!h-[50px] gap-2 bg-card/60 border-border text-foreground hover:bg-muted hover:text-foreground"
                >
                  <Percent className="h-4 w-4" />
                  Definir valores padrões
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-popover text-popover-foreground border-border text-foreground">
                <DialogHeader>
                  <DialogTitle>Valores padrões dos itens</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label className="text-orange-300">Imposto (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={padroesForm.taxa_impostos}
                      onChange={(e) => setPadroesForm({ ...padroesForm, taxa_impostos: e.target.value })}
                      className="bg-orange-500/10 border-orange-500/20 text-foreground"
                    />
                  </div>
                  <div>
                    <Label className="text-yellow-300">Desconto Gerente (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={padroesForm.taxa_descontos}
                      onChange={(e) => setPadroesForm({ ...padroesForm, taxa_descontos: e.target.value })}
                      className="bg-yellow-500/10 border-yellow-500/20 text-foreground"
                    />
                  </div>
                  <div>
                    <Label className="text-teal-300">Cartão (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={padroesForm.taxa_cartao}
                      onChange={(e) => setPadroesForm({ ...padroesForm, taxa_cartao: e.target.value })}
                      className="bg-teal-500/10 border-teal-500/20 text-foreground"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground/80">
                    Isso vai sobrescrever os valores de todos os {items.length} itens cadastrados.
                  </p>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setPadroesOpen(false)}>Cancelar</Button>
                  <Button onClick={handleAplicarPadroes} disabled={aplicarEmTodos.isPending}>
                    Aplicar a todos os itens
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog open={ordemOpen} onOpenChange={setOrdemOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="!h-[50px] gap-2 bg-card/60 border-border text-foreground hover:bg-muted hover:text-foreground"
                  onClick={openOrdemDialog}
                >
                  <ArrowUpDown className="h-4 w-4" />
                  Ordenar categorias
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-popover text-popover-foreground border-border text-foreground max-w-md">
                <DialogHeader>
                  <DialogTitle>Ordenar categorias</DialogTitle>
                </DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto space-y-1.5">
                  {ordemDraft.length === 0 && (
                    <p className="text-sm text-muted-foreground/80">Nenhuma categoria cadastrada.</p>
                  )}
                  {ordemDraft.map((cat, idx) => (
                    <CategoriaOrdemRow
                      key={cat}
                      categoria={cat}
                      index={idx}
                      total={ordemDraft.length}
                      onMove={(dir) => moveOrdem(idx, dir)}
                      onRename={async (novo) => {
                        const novoTrim = novo.trim();
                        if (!novoTrim || novoTrim === cat) return;
                        if (ordemDraft.includes(novoTrim)) {
                          toast.error("Já existe uma categoria com esse nome");
                          return;
                        }
                        await renomearCategoria.mutateAsync({ from: cat, to: novoTrim });
                        setOrdemDraft((prev) => prev.map((c) => (c === cat ? novoTrim : c)));
                      }}
                    />
                  ))}
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setOrdemOpen(false)}>Cancelar</Button>
                  <Button onClick={handleSalvarOrdem} disabled={salvarOrdem.isPending || ordemDraft.length === 0}>
                    Salvar ordem
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {isLoading && (
          <div className="rounded-xl bg-card/60 backdrop-blur-xl border border-border p-6 text-center text-muted-foreground">
            Carregando...
          </div>
        )}

        {!isLoading && groupedByCategoria.length === 0 && (
          <div className="rounded-xl bg-card/60 backdrop-blur-xl border border-border p-6 text-center text-muted-foreground">
            Nenhum item encontrado.
          </div>
        )}

        <div className="flex flex-col gap-6">
          {groupedByCategoria.map(([categoria, rows]) => (
            <div key={categoria} className="flex flex-col gap-2">
              <div className="flex items-center gap-2 px-1">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                <CategoriaTitulo
                  categoria={categoria}
                  onRename={(novo) => renomearCategoria.mutateAsync({ from: categoria, to: novo })}
                />
                <span className="text-[11px] text-muted-foreground/60">· {rows.length}</span>
              </div>
              <div className="rounded-xl overflow-hidden bg-card/60 backdrop-blur-xl border border-border">
              <DndContext
                sensors={dndSensors}
                collisionDetection={closestCenter}
                modifiers={[restrictToVerticalAxis, restrictToParentElement]}
                onDragEnd={handleDragEndCategoria(rows)}
              >
              <Table>
                <TableHeader>
                   <TableRow className="border-border hover:bg-transparent">
                     <TableHead className="w-8 p-0" />
                     <TableHead className="text-xs font-medium text-muted-foreground">Descrição</TableHead>
                    <TableHead className={`text-xs font-medium text-foreground text-right w-36 ${getColumnBg(columnColors, "custo")}`}>Custo</TableHead>
                    <TableHead className={`text-xs font-medium text-foreground text-right w-36 ${getColumnBg(columnColors, "lucro")}`}>Lucro</TableHead>
                    <TableHead className={`text-xs font-medium text-foreground text-right w-28 ${getColumnBg(columnColors, "imposto")}`}>Imposto</TableHead>
                    <TableHead className={`text-xs font-medium text-foreground text-right w-32 ${getColumnBg(columnColors, "desconto")}`}>Desc. Gerente</TableHead>
                    <TableHead className={`text-xs font-medium text-foreground text-right w-28 ${getColumnBg(columnColors, "cartao")}`}>Cartão</TableHead>
                    <TableHead className={`text-xs font-medium text-foreground text-right w-40 ${getColumnBg(columnColors, "venda")}`}>Valor de Venda</TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground text-center w-16">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <SortableContext items={rows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
                  {rows.map((item) => (
                    <SortableItemRow
                      key={item.id}
                      item={item}
                      disabled={isDndDisabled}
                      categorias={todasCategorias}
                      colors={columnColors}
                      onUpdate={(patch) => updateItem.mutateAsync({ id: item.id, patch })}
                      onDelete={() => {
                        if (confirm(`Excluir "${item.descricao}"?`)) {
                          deleteItem.mutate(item.id);
                        }
                      }}
                    />
                  ))}
                  </SortableContext>
                </TableBody>
              </Table>
              </DndContext>
              </div>
            </div>
          ))}
        </div>

        {/* Total geral */}
        {filteredItems.length > 0 && (
          <div className="rounded-xl bg-card/60 backdrop-blur-xl border border-border p-4 flex items-center justify-end gap-8 text-sm">
            <div className="flex flex-col items-end">
              <span className="text-muted-foreground/80 text-xs uppercase">Total custo</span>
              <span className="text-foreground font-semibold">{formatCurrency(totals.custo)}</span>
            </div>
          </div>
        )}
      </div>
    </MinimalistLayout>
  );
}