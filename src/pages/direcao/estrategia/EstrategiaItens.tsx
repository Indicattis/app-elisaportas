import { useEffect, useMemo, useState, CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, Percent, ArrowUpDown, ArrowUp, ArrowDown, Pencil, Check, X, GripVertical, FolderInput, Palette, FileText, FileSpreadsheet, BadgePercent, Calculator, Boxes } from "lucide-react";
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
  horizontalListSortingStrategy,
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
import { useCustosItens, CustoItem, useCustosItensPadroes, useCustosItensCategoriasOrdem, useRenomearCategoriaItens, useCriarCategoriaItens, useExcluirCategoriaItens } from "@/hooks/useCustosItens";
import { cn } from "@/lib/utils";
import { exportEstrategiaItensPDF, exportEstrategiaItensExcel } from "@/utils/estrategiaItensExport";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useConfiguracoesVendas } from "@/hooks/useConfiguracoesVendas";
import { CatalogoPrecosTab } from "@/components/tabela-precos/CatalogoPrecosTab";

const UNIDADES = ["Un", "M", "Kg", "L", "M²", "M³", "Cx", "Pç"];

// ============== Cores configuráveis das colunas ==============
const COLUMN_COLOR_OPTIONS: Record<string, { label: string; bg: string; swatch: string }> = {
  rose:    { label: "Rosa",      bg: "bg-rose-100 dark:bg-rose-500/30",    swatch: "bg-rose-500" },
  red:     { label: "Vermelho",  bg: "bg-red-100 dark:bg-red-500/30",     swatch: "bg-red-500" },
  orange:  { label: "Laranja",   bg: "bg-orange-100 dark:bg-orange-500/30",  swatch: "bg-orange-500" },
  amber:   { label: "Âmbar",     bg: "bg-amber-100 dark:bg-amber-500/30",   swatch: "bg-amber-500" },
  yellow:  { label: "Amarelo",   bg: "bg-yellow-100 dark:bg-yellow-500/30",  swatch: "bg-yellow-500" },
  lime:    { label: "Lima",      bg: "bg-lime-100 dark:bg-lime-500/30",    swatch: "bg-lime-500" },
  green:   { label: "Verde",     bg: "bg-green-100 dark:bg-green-500/30",   swatch: "bg-green-500" },
  emerald: { label: "Esmeralda", bg: "bg-emerald-100 dark:bg-emerald-500/30", swatch: "bg-emerald-500" },
  teal:    { label: "Teal",      bg: "bg-teal-100 dark:bg-teal-500/30",    swatch: "bg-teal-500" },
  cyan:    { label: "Ciano",     bg: "bg-cyan-100 dark:bg-cyan-500/30",    swatch: "bg-cyan-500" },
  sky:     { label: "Céu",       bg: "bg-sky-100 dark:bg-sky-500/30",     swatch: "bg-sky-500" },
  blue:    { label: "Azul",      bg: "bg-blue-100 dark:bg-blue-500/30",    swatch: "bg-blue-500" },
  indigo:  { label: "Índigo",    bg: "bg-indigo-100 dark:bg-indigo-500/30",  swatch: "bg-indigo-500" },
  violet:  { label: "Violeta",   bg: "bg-violet-100 dark:bg-violet-500/30",  swatch: "bg-violet-500" },
  purple:  { label: "Roxo",      bg: "bg-purple-100 dark:bg-purple-500/30",  swatch: "bg-purple-500" },
  fuchsia: { label: "Fúcsia",    bg: "bg-fuchsia-100 dark:bg-fuchsia-500/30", swatch: "bg-fuchsia-500" },
  pink:    { label: "Pink",      bg: "bg-pink-100 dark:bg-pink-500/30",    swatch: "bg-pink-500" },
  slate:   { label: "Cinza",     bg: "bg-slate-100 dark:bg-slate-500/30",   swatch: "bg-slate-500" },
};

type ColumnKey = "custo" | "lucro" | "imposto" | "desconto" | "cartao" | "venda" | "objetivo";
const COLUMN_LABELS: Record<ColumnKey, string> = {
  custo: "Custo",
  lucro: "Lucro",
  imposto: "Imposto",
  desconto: "Desc. Gerente",
  cartao: "Cartão",
  venda: "Valor de Venda",
  objetivo: "Preço Objetivo",
};
const DEFAULT_COLUMN_COLORS: Record<ColumnKey, string> = {
  custo: "rose",
  lucro: "blue",
  imposto: "orange",
  desconto: "yellow",
  cartao: "teal",
  venda: "green",
  objetivo: "violet",
};
const COLUMN_COLORS_STORAGE_KEY = "estrategia-itens-column-colors-v1";
const COLUMN_ORDER_STORAGE_KEY = "estrategia-itens-column-order-v1";
const DEFAULT_COLUMN_ORDER: ColumnKey[] = ["custo", "lucro", "imposto", "desconto", "cartao", "venda", "objetivo"];
const COLUMN_WIDTHS: Record<ColumnKey, string> = {
  custo: "w-36",
  lucro: "w-36",
  imposto: "w-28",
  desconto: "w-32",
  cartao: "w-28",
  venda: "w-40",
  objetivo: "w-40",
};

function SortableHeadCell({
  colKey,
  colors,
  children,
}: {
  colKey: ColumnKey;
  colors: Record<ColumnKey, string>;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `col-${colKey}` });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    position: "relative",
    zIndex: isDragging ? 10 : "auto",
  };
  return (
    <TableHead
      ref={setNodeRef}
      style={style}
      className={cn(
        "text-xs font-medium text-foreground text-center group/col",
        COLUMN_WIDTHS[colKey],
        getColumnBg(colors, colKey),
      )}
    >
      <div className="flex items-center justify-center gap-1">
        <button
          type="button"
          className="inline-flex h-5 w-5 items-center justify-center text-muted-foreground/40 hover:text-foreground cursor-grab active:cursor-grabbing touch-none opacity-0 group-hover/col:opacity-100"
          aria-label="Arrastar coluna"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        <span>{children}</span>
      </div>
    </TableHead>
  );
}

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
  onDelete,
  canDelete,
}: {
  categoria: string;
  index: number;
  total: number;
  onMove: (dir: -1 | 1) => void;
  onRename: (novo: string) => Promise<void> | void;
  onDelete?: () => void;
  canDelete?: boolean;
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
          {onDelete && (
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-muted-foreground/70 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-30"
              onClick={onDelete}
              disabled={!canDelete}
              title={canDelete ? "Excluir categoria" : "Não é possível excluir (possui itens ou é reservada)"}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
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
  order: ColumnKey[];
  padroes: { taxa_impostos: number; taxa_descontos: number; taxa_cartao: number } | null | undefined;
  onUpdate: (patch: Partial<CustoItem>) => Promise<void> | void;
  onDelete: () => void;
};

function CalculoBobinaDialog({
  open,
  onOpenChange,
  itemDescricao,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemDescricao: string;
}) {
  const [precoStr, setPrecoStr] = useState("");
  useEffect(() => {
    if (!open) setPrecoStr("");
  }, [open]);
  const preco = Number(precoStr.replace(",", ".")) || 0;
  const x = 230 * preco;
  const y = x * 1.0325;
  const resultado = y + 175;
  const precoMetro = resultado / 300;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-popover text-popover-foreground border-border max-w-md">
        <DialogHeader>
          <DialogTitle>Cálculo da bobina</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground/80 truncate">{itemDescricao}</p>
          <div className="space-y-1.5">
            <Label htmlFor={`calc-preco-kg`}>Preço por kg (R$)</Label>
            <Input
              id="calc-preco-kg"
              type="number"
              step="0.01"
              min="0"
              autoFocus
              value={precoStr}
              onChange={(e) => setPrecoStr(e.target.value)}
              placeholder="0,00"
              className="bg-card/60 border-border text-foreground"
            />
          </div>
          <div className="rounded-md border border-border/60 bg-card/40 p-3 space-y-2 text-sm font-mono">
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">230 kg × {formatCurrency(preco)}</span>
              <span className="text-foreground">{formatCurrency(x)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">+ 3,25% (IPI)</span>
              <span className="text-foreground">{formatCurrency(y)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">+ R$ 175,00</span>
              <span className="text-foreground font-semibold">{formatCurrency(resultado)}</span>
            </div>
          </div>
          <div className="rounded-md border border-blue-500/30 bg-blue-500/10 p-3 space-y-1.5">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Resumo</div>
            <div className="text-xs text-muted-foreground">230 kg ≡ 300 m</div>
            <div className="flex justify-between gap-3 text-sm">
              <span className="text-foreground">Preço por metro</span>
              <span className="text-blue-400 font-semibold">{formatCurrency(precoMetro)}</span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SortableItemRow({ item, disabled, categorias, colors, order, padroes, onUpdate, onDelete }: SortableItemRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled,
  });
  const [moverOpen, setMoverOpen] = useState(false);
  const [novaCategoria, setNovaCategoria] = useState(item.categoria ?? "");
  const [calcOpen, setCalcOpen] = useState(false);
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
  const tImp = Number(padroes?.taxa_impostos ?? 0);
  const tDesc = Number(padroes?.taxa_descontos ?? 0);
  const tCard = Number(padroes?.taxa_cartao ?? 0);
  const taxas = tImp + tDesc + tCard;
  const deducoes = preco * (taxas / 100);
  const vImp = preco * (tImp / 100);
  const vDesc = preco * (tDesc / 100);
  const vCard = preco * (tCard / 100);
  const lucro = preco - deducoes - custo;

  const cellRenderers: Record<ColumnKey, React.ReactNode> = {
    custo: (
      <EditableCell
        value={custo}
        type="currency"
        align="right"
        display={formatCurrency(custo)}
        onSave={(v) => onUpdate({ custo_unitario: Number(v) })}
      />
    ),
    lucro: <>{formatCurrency(lucro)}</>,
    imposto: (
      <span title={`${tImp.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`}>
        {formatCurrency(vImp)}
      </span>
    ),
    desconto: (
      <span title={`${tDesc.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`}>
        {formatCurrency(vDesc)}
      </span>
    ),
    cartao: (
      <span title={`${tCard.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`}>
        {formatCurrency(vCard)}
      </span>
    ),
    venda: (
      <EditableCell
        value={preco}
        type="currency"
        align="right"
        display={formatCurrency(preco)}
        onSave={(v) => onUpdate({ preco_venda: Number(v) })}
      />
    ),
    objetivo: item.custo_ok ? (
      <div className="flex items-center justify-end gap-1 group">
        <Check className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground/70 hover:text-foreground"
          title="Desfazer OK"
          onClick={() => onUpdate({ custo_ok: false } as Partial<CustoItem>)}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    ) : (
      <div className="flex items-center justify-end gap-1 group">
        <div className="flex-1">
          <EditableCell
            value={item.preco_objetivo ?? ""}
            type="currency"
            align="right"
            display={item.preco_objetivo == null ? <span className="text-muted-foreground/60">—</span> : formatCurrency(Number(item.preco_objetivo))}
            onSave={(v) => onUpdate({ preco_objetivo: v === "" || v === null ? null : Number(v) } as Partial<CustoItem>)}
          />
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground/70 hover:text-emerald-500"
          title="Marcar custo como OK"
          onClick={() => onUpdate({ custo_ok: true, preco_objetivo: null } as Partial<CustoItem>)}
        >
          <Check className="h-3.5 w-3.5" />
        </Button>
      </div>
    ),
  };

  const cellExtraCls: Partial<Record<ColumnKey, string>> = {
    lucro: "font-medium",
    venda: "font-medium",
  };

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={cn("group border-border/60 hover:bg-muted/60", isDragging && "shadow-lg bg-muted/40")}
    >
      <TableCell className="w-8 p-0 text-center align-middle">
        <div className="pointer-events-none absolute top-1/2 right-0 -translate-y-1/2 translate-x-[calc(100%+0.5rem)] opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity z-10">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="pointer-events-auto h-7 w-7 bg-card/80 backdrop-blur-md border-border/60 text-muted-foreground hover:text-blue-400 hover:border-blue-500/40 shadow-sm"
            onClick={() => setCalcOpen(true)}
            aria-label="Calcular preço da bobina"
            title="Calcular preço da bobina"
          >
            <Calculator className="h-3.5 w-3.5" />
          </Button>
        </div>
        <CalculoBobinaDialog
          open={calcOpen}
          onOpenChange={setCalcOpen}
          itemDescricao={item.descricao}
        />
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
      <TableCell className="text-foreground font-bold">
        <EditableCell
          value={item.descricao}
          onSave={(v) => onUpdate({ descricao: String(v) })}
        />
      </TableCell>
      <TableCell className="text-center text-foreground">
        <EditableSelectCell
          value={item.unidade}
          options={UNIDADES}
          onSave={(v) => onUpdate({ unidade: v })}
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
      {order.map((col) => (
        <TableCell
          key={col}
          className={cn("text-right text-foreground", cellExtraCls[col], getColumnBg(colors, col))}
        >
          {cellRenderers[col]}
        </TableCell>
      ))}
    </TableRow>
  );
}

export default function EstrategiaItens() {
  const { items, isLoading, createItem, updateItem, deleteItem, reordenarItens } = useCustosItens();
  const { padroes, aplicarEmTodos } = useCustosItensPadroes();
  const { categoriasOrdem, salvarOrdem } = useCustosItensCategoriasOrdem();
  const renomearCategoria = useRenomearCategoriaItens();
  const criarCategoria = useCriarCategoriaItens();
  const excluirCategoria = useExcluirCategoriaItens();
  const { limites: limitesDesconto } = useConfiguracoesVendas();
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [padroesOpen, setPadroesOpen] = useState(false);
  const [padroesForm, setPadroesForm] = useState({ taxa_impostos: "0", taxa_descontos: "0", taxa_cartao: "0" });
  const [ordemOpen, setOrdemOpen] = useState(false);
  const [ordemDraft, setOrdemDraft] = useState<string[]>([]);
  const [novaCategoriaNome, setNovaCategoriaNome] = useState("");
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

  const [columnOrder, setColumnOrder] = useState<ColumnKey[]>(() => {
    if (typeof window === "undefined") return [...DEFAULT_COLUMN_ORDER];
    try {
      const raw = window.localStorage.getItem(COLUMN_ORDER_STORAGE_KEY);
      if (!raw) return [...DEFAULT_COLUMN_ORDER];
      const parsed = JSON.parse(raw) as ColumnKey[];
      const valid = parsed.filter((k): k is ColumnKey => k in COLUMN_LABELS);
      const missing = DEFAULT_COLUMN_ORDER.filter((k) => !valid.includes(k));
      return [...valid, ...missing];
    } catch {
      return [...DEFAULT_COLUMN_ORDER];
    }
  });
  useEffect(() => {
    try {
      window.localStorage.setItem(COLUMN_ORDER_STORAGE_KEY, JSON.stringify(columnOrder));
    } catch { /* ignore */ }
  }, [columnOrder]);

  const handleDragEndColumn = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = columnOrder.findIndex((c) => `col-${c}` === active.id);
    const newIndex = columnOrder.findIndex((c) => `col-${c}` === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    setColumnOrder(arrayMove(columnOrder, oldIndex, newIndex));
  };

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
      taxa_impostos: Number(padroes?.taxa_impostos ?? 0),
      taxa_descontos: Number(padroes?.taxa_descontos ?? 0),
      taxa_cartao: Number(padroes?.taxa_cartao ?? 0),
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
      title="Custo Objetivo"
      subtitle="Gerenciamento de custos"
      backPath="/direcao/estrategia"
      headerActions={headerActions}
      breadcrumbItems={[
        { label: "Home", path: "/home" },
        { label: "Direção", path: "/direcao" },
        { label: "Estratégia", path: "/direcao/estrategia" },
        { label: "Custo Objetivo" },
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
                  Gerenciar categorias
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-popover text-popover-foreground border-border text-foreground max-w-md">
                <DialogHeader>
                  <DialogTitle>Gerenciar categorias</DialogTitle>
                </DialogHeader>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Nova categoria..."
                    value={novaCategoriaNome}
                    onChange={(e) => setNovaCategoriaNome(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const nome = novaCategoriaNome.trim();
                        if (!nome) return;
                        if (ordemDraft.includes(nome)) { toast.error("Já existe uma categoria com esse nome"); return; }
                        criarCategoria.mutate(nome, {
                          onSuccess: () => {
                            setOrdemDraft((prev) => [...prev, nome]);
                            setNovaCategoriaNome("");
                          },
                        });
                      }
                    }}
                    className="flex-1 h-9 bg-card/60 border-border text-foreground"
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      const nome = novaCategoriaNome.trim();
                      if (!nome) return;
                      if (ordemDraft.includes(nome)) { toast.error("Já existe uma categoria com esse nome"); return; }
                      criarCategoria.mutate(nome, {
                        onSuccess: () => {
                          setOrdemDraft((prev) => [...prev, nome]);
                          setNovaCategoriaNome("");
                        },
                      });
                    }}
                    disabled={!novaCategoriaNome.trim() || criarCategoria.isPending}
                    className="gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    Adicionar
                  </Button>
                </div>
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
                      canDelete={cat !== "Sem categoria" && !items.some((it) => (it.categoria?.trim() || "Sem categoria") === cat)}
                      onDelete={() => {
                        if (cat === "Sem categoria") return;
                        if (!confirm(`Excluir a categoria "${cat}"?`)) return;
                        excluirCategoria.mutate(cat, {
                          onSuccess: () => {
                            setOrdemDraft((prev) => prev.filter((c) => c !== cat));
                          },
                        });
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
            <Dialog open={coresOpen} onOpenChange={setCoresOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="!h-[50px] gap-2 bg-card/60 border-border text-foreground hover:bg-muted hover:text-foreground"
                >
                  <Palette className="h-4 w-4" />
                  Cores das colunas
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-popover text-popover-foreground border-border text-foreground max-w-md">
                <DialogHeader>
                  <DialogTitle>Cores das colunas</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  {(Object.keys(COLUMN_LABELS) as ColumnKey[]).map((col) => (
                    <div key={col} className="flex items-center gap-3">
                      <span className={cn("inline-block h-4 w-4 rounded-full ring-1 ring-border", COLUMN_COLOR_OPTIONS[columnColors[col]]?.swatch ?? COLUMN_COLOR_OPTIONS[DEFAULT_COLUMN_COLORS[col]].swatch)} />
                      <Label className="flex-1 text-foreground">{COLUMN_LABELS[col]}</Label>
                      <Select
                        value={columnColors[col]}
                        onValueChange={(v) => setColumnColors((prev) => ({ ...prev, [col]: v }))}
                      >
                        <SelectTrigger className="h-9 w-40 bg-card/60 border-border text-foreground">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-popover text-popover-foreground border-border text-foreground">
                          {Object.entries(COLUMN_COLOR_OPTIONS).map(([key, opt]) => (
                            <SelectItem key={key} value={key}>
                              <span className="flex items-center gap-2">
                                <span className={cn("inline-block h-3 w-3 rounded-full", opt.swatch)} />
                                {opt.label}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground/80">
                    As cores ficam salvas no seu navegador.
                  </p>
                </div>
                <DialogFooter>
                  <Button
                    variant="ghost"
                    onClick={() => setColumnColors({ ...DEFAULT_COLUMN_COLORS })}
                  >
                    Restaurar padrão
                  </Button>
                  <Button onClick={() => setCoresOpen(false)}>Concluir</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button
              variant="outline"
              className="!h-[50px] gap-2 bg-card/60 border-border text-foreground hover:bg-red-500/10 hover:text-red-300 hover:border-red-500/40"
              onClick={() => {
                try {
                  if (groupedByCategoria.length === 0) {
                    toast.error("Nenhum item para exportar");
                    return;
                  }
                  exportEstrategiaItensPDF(groupedByCategoria);
                  toast.success("PDF gerado");
                } catch (e: any) {
                  toast.error(`Falha ao gerar PDF: ${e?.message ?? e}`);
                }
              }}
            >
              <FileText className="h-4 w-4" />
              Exportar PDF
            </Button>
            <Button
              variant="outline"
              className="!h-[50px] gap-2 bg-card/60 border-border text-foreground hover:bg-emerald-500/10 hover:text-emerald-300 hover:border-emerald-500/40"
              onClick={() => {
                try {
                  if (groupedByCategoria.length === 0) {
                    toast.error("Nenhum item para exportar");
                    return;
                  }
                  exportEstrategiaItensExcel(groupedByCategoria);
                  toast.success("Excel gerado");
                } catch (e: any) {
                  toast.error(`Falha ao gerar Excel: ${e?.message ?? e}`);
                }
              }}
            >
              <FileSpreadsheet className="h-4 w-4" />
              Exportar Excel
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="!h-[50px] gap-2 bg-card/60 border-border text-foreground hover:bg-yellow-500/10 hover:text-yellow-300 hover:border-yellow-500/40"
                >
                  <BadgePercent className="h-4 w-4" />
                  Descontos de venda
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 bg-card/95 backdrop-blur-xl border-border">
                <div className="flex flex-col gap-3 text-sm">
                  <div className="flex items-center gap-2 text-foreground font-semibold">
                    <BadgePercent className="h-4 w-4 text-yellow-400" />
                    Limites de desconto em vendas
                  </div>
                  <div className="flex flex-col gap-2 text-foreground/90">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">À vista (não cartão)</span>
                      <span className="font-medium">{limitesDesconto.avista.toFixed(2)}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Adicional venda presencial</span>
                      <span className="font-medium">+{limitesDesconto.presencial.toFixed(2)}%</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-border/60 pt-2">
                      <span className="text-muted-foreground">Máximo sem senha</span>
                      <span className="font-medium text-emerald-300">{limitesDesconto.totalSemSenha.toFixed(2)}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Adicional com senha responsável</span>
                      <span className="font-medium">+{limitesDesconto.adicionalResponsavel.toFixed(2)}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Máximo com senha responsável</span>
                      <span className="font-medium text-yellow-300">{limitesDesconto.totalComResponsavel.toFixed(2)}%</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-border/60 pt-2">
                      <span className="text-muted-foreground">Acima disso</span>
                      <span className="font-medium text-red-300">Senha master</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Cartão de crédito não tem desconto à vista. Vendas com crédito do cliente não permitem desconto.
                  </p>
                </div>
              </PopoverContent>
            </Popover>
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
              <div className="rounded-xl bg-card/60 backdrop-blur-xl border border-border [&>div]:rounded-xl [&>div]:overflow-visible">
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
                    <TableHead className="text-xs font-medium text-muted-foreground text-center">Descrição</TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground text-center w-16">Unidade</TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground text-center w-16">Ações</TableHead>
                   <DndContext
                     sensors={dndSensors}
                     collisionDetection={closestCenter}
                     onDragEnd={handleDragEndColumn}
                   >
                     <SortableContext items={columnOrder.map((c) => `col-${c}`)} strategy={horizontalListSortingStrategy}>
                       {columnOrder.map((col) => (
                         <SortableHeadCell key={col} colKey={col} colors={columnColors}>
                           {COLUMN_LABELS[col]}
                         </SortableHeadCell>
                       ))}
                     </SortableContext>
                   </DndContext>
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
                      order={columnOrder}
                      padroes={padroes}
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

        {/* Catálogo de Produtos */}
        <div className="pt-8">
          <CatalogoPrecosTab />
        </div>
      </div>
    </MinimalistLayout>
  );
}