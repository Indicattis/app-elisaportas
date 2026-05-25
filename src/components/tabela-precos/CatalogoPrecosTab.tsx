import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  Search,
  Check,
  X,
  Package,
  Trash2,
  FolderInput,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Pencil,
  Plus,
  GripVertical,
} from "lucide-react";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useVendasCatalogo, ProdutoCatalogo } from "@/hooks/useVendasCatalogo";
import { useCustosItensPadroes } from "@/hooks/useCustosItens";
import {
  useVendasCatalogoCategoriasOrdem,
  useCriarCategoriaCatalogo,
  useExcluirCategoriaCatalogo,
  useRenomearCategoriaCatalogo,
} from "@/hooks/useVendasCatalogoCategorias";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type EditField = "preco_venda" | "custo_produto" | "unidade";

const UNIDADES = ["Un", "M", "Kg", "L", "M²", "M³", "Cx", "Pç"] as const;

const formatCurrency = (value: number) =>
  (value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

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
const COLUMN_BG: Record<ColumnKey, string> = {
  custo: "bg-rose-100 dark:bg-rose-500/30",
  lucro: "bg-blue-100 dark:bg-blue-500/30",
  imposto: "bg-orange-100 dark:bg-orange-500/30",
  desconto: "bg-yellow-100 dark:bg-yellow-500/30",
  cartao: "bg-teal-100 dark:bg-teal-500/30",
  venda: "",
  objetivo: "bg-violet-100 dark:bg-violet-500/30",
};
const COLUMN_WIDTHS: Record<ColumnKey, string> = {
  custo: "w-36",
  lucro: "w-36",
  imposto: "w-28",
  desconto: "w-32",
  cartao: "w-28",
  venda: "w-40",
  objetivo: "w-40",
};
const DEFAULT_COLUMN_ORDER: ColumnKey[] = ["custo", "lucro", "imposto", "desconto", "cartao", "venda", "objetivo"];
const COLUMN_ORDER_STORAGE_KEY = "catalogo-precos-column-order-v1";

function SortableHeadCell({
  colKey,
  children,
}: {
  colKey: ColumnKey;
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
        COLUMN_BG[colKey],
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

interface CatalogoPrecosTabProps {
  compact?: boolean;
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
          <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted" onClick={() => setEditing(true)} title="Renomear">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted" onClick={() => onMove(-1)} disabled={index === 0}>
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted" onClick={() => onMove(1)} disabled={index === total - 1}>
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

export function CatalogoPrecosTab({ compact = false }: CatalogoPrecosTabProps = {}) {
  const [busca, setBusca] = useState("");
  const { produtos, isLoading, editarProduto, inativarProduto, reordenarProdutos } = useVendasCatalogo({ busca });
  const { padroes } = useCustosItensPadroes();
  const { categoriasOrdem, salvarOrdem } = useVendasCatalogoCategoriasOrdem();
  const renomearCategoria = useRenomearCategoriaCatalogo();
  const criarCategoria = useCriarCategoriaCatalogo();
  const excluirCategoria = useExcluirCategoriaCatalogo();

  const [editing, setEditing] = useState<{ id: string; field: EditField } | null>(null);
  const [editValue, setEditValue] = useState("");

  const [ordemOpen, setOrdemOpen] = useState(false);
  const [ordemDraft, setOrdemDraft] = useState<string[]>([]);
  const [novaCategoriaNome, setNovaCategoriaNome] = useState("");

  const startEdit = (produto: ProdutoCatalogo, field: EditField) => {
    setEditing({ id: produto.id, field });
    setEditValue(String(produto[field] ?? (field === "unidade" ? "Un" : 0)));
  };
  const cancelEdit = () => setEditing(null);
  const saveEdit = async () => {
    if (!editing) return;
    if (editing.field === "unidade") {
      if (editValue) {
        await editarProduto.mutateAsync({ id: editing.id, unidade: editValue } as any);
      }
    } else {
      const valor = parseFloat(editValue);
      if (!isNaN(valor) && valor >= 0) {
        await editarProduto.mutateAsync({ id: editing.id, [editing.field]: valor } as any);
      }
    }
    setEditing(null);
  };

  const produtosOrdenados = useMemo(() => [...(produtos || [])], [produtos]);

  const groupedByCategoria = useMemo(() => {
    const groups = new Map<string, ProdutoCatalogo[]>();
    for (const p of produtosOrdenados) {
      const key = (p.categoria || "").trim() || "Sem categoria";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(p);
    }
    const ordemMap = new Map(categoriasOrdem.map((c) => [c.categoria, c.ordem]));
    return Array.from(groups.entries()).sort(([a], [b]) => {
      const oa = ordemMap.has(a) ? ordemMap.get(a)! : Number.MAX_SAFE_INTEGER;
      const ob = ordemMap.has(b) ? ordemMap.get(b)! : Number.MAX_SAFE_INTEGER;
      if (oa !== ob) return oa - ob;
      return a.localeCompare(b);
    });
  }, [produtosOrdenados, categoriasOrdem]);

  const todasCategorias = useMemo(() => {
    const set = new Set<string>();
    for (const p of produtosOrdenados) {
      const k = (p.categoria || "").trim();
      if (k) set.add(k);
    }
    for (const c of categoriasOrdem) set.add(c.categoria);
    return Array.from(set).sort();
  }, [produtosOrdenados, categoriasOrdem]);

  const openOrdemDialog = () => {
    const todas = new Set<string>();
    for (const p of produtosOrdenados) todas.add((p.categoria || "").trim() || "Sem categoria");
    for (const c of categoriasOrdem) todas.add(c.categoria);
    const ordemMap = new Map(categoriasOrdem.map((c) => [c.categoria, c.ordem]));
    const sorted = Array.from(todas).sort((a, b) => {
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

  const dndSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const isDndDisabled = Boolean(busca.trim());

  const handleDragEndCategoria = (rows: ProdutoCatalogo[]) => (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = rows.findIndex((r) => r.id === active.id);
    const newIndex = rows.findIndex((r) => r.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(rows, oldIndex, newIndex);
    reordenarProdutos.mutate(reordered.map((r) => r.id));
  };

  const renderEditableCell = (produto: ProdutoCatalogo, field: "preco_venda" | "custo_produto") => {
    const isEditing = editing?.id === produto.id && editing.field === field;
    const value = produto[field] ?? 0;
    if (isEditing) {
      return (
        <div className="flex items-center justify-end gap-1">
          <Input
            autoFocus
            type="number"
            step="0.01"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveEdit();
              if (e.key === "Escape") cancelEdit();
            }}
            className="w-28 h-7 text-right text-sm bg-muted border-border text-foreground"
          />
          <Button variant="ghost" size="icon" className="h-6 w-6 text-green-400 hover:text-green-300" onClick={saveEdit}>
            <Check className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400 hover:text-red-300" onClick={cancelEdit}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      );
    }
    return (
      <span
        className="cursor-pointer text-foreground/80 hover:text-foreground hover:underline decoration-dashed underline-offset-4 transition-colors"
        onClick={() => startEdit(produto, field)}
        title="Clique para editar"
      >
        {formatCurrency(value as number)}
      </span>
    );
  };

  const renderUnidadeCell = (produto: ProdutoCatalogo) => {
    const isEditing = editing?.id === produto.id && editing.field === "unidade";
    const value = produto.unidade || "Un";
    if (isEditing) {
      return (
        <div className="flex items-center justify-center gap-1">
          <Select
            value={editValue}
            onValueChange={async (val) => {
              setEditValue(val);
              await editarProduto.mutateAsync({ id: produto.id, unidade: val } as any);
              setEditing(null);
            }}
            open
            onOpenChange={(o) => { if (!o) setEditing(null); }}
          >
            <SelectTrigger className="w-32 h-7 bg-muted border-border text-foreground text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {UNIDADES.map((u) => (
                <SelectItem key={u} value={u}>{u}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }
    return (
      <span
        className="cursor-pointer text-foreground/80 hover:text-foreground hover:underline decoration-dashed underline-offset-4 transition-colors text-xs"
        onClick={() => startEdit(produto, "unidade")}
        title="Clique para editar"
      >
        {value}
      </span>
    );
  };

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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-base font-medium text-foreground">Itens do Catálogo</h2>
          <p className="text-xs text-muted-foreground">
            {produtosOrdenados.length} {produtosOrdenados.length === 1 ? "produto" : "produtos"} — clique no preço, custo ou unidade para editar
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {!compact && (
            <Dialog open={ordemOpen} onOpenChange={setOrdemOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 bg-card/60 border-border text-foreground hover:bg-muted hover:text-foreground"
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
                      canDelete={cat !== "Sem categoria" && !produtosOrdenados.some((p) => ((p.categoria || "").trim() || "Sem categoria") === cat)}
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
          )}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou descrição..."
              className="pl-8 bg-card/60 border-border text-foreground placeholder:text-muted-foreground"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      ) : groupedByCategoria.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">{busca ? "Nenhum produto encontrado" : "Catálogo vazio"}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {groupedByCategoria.map(([categoria, rows]) => (
            <div key={categoria} className="flex flex-col gap-2">
              <div className="flex items-center gap-2 px-1">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                {compact ? (
                  <span className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground">
                    {categoria}
                  </span>
                ) : (
                  <CategoriaTitulo
                    categoria={categoria}
                    onRename={(novo) => renomearCategoria.mutateAsync({ from: categoria, to: String(novo) })}
                  />
                )}
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
                        {!compact && <TableHead className="w-8 p-0" />}
                        <TableHead className="text-xs font-medium text-muted-foreground">Produto</TableHead>
                        {!compact && <TableHead className="text-xs font-medium text-muted-foreground text-center w-16">UN</TableHead>}
                        {!compact && <TableHead className="text-xs font-medium text-muted-foreground text-center w-20">Ações</TableHead>}
                        {!compact ? (
                          columnOrder.map((col) => (
                            <TableHead
                              key={col}
                              className={cn(
                                "text-xs font-medium text-foreground text-center",
                                COLUMN_WIDTHS[col],
                                COLUMN_BG[col],
                              )}
                            >
                              {COLUMN_LABELS[col]}
                            </TableHead>
                          ))
                        ) : (
                          <TableHead className={cn("text-xs font-medium text-foreground text-center", COLUMN_WIDTHS.venda, COLUMN_BG.venda)}>
                            {COLUMN_LABELS.venda}
                          </TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <SortableContext items={rows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
                        {rows.map((produto, idx) => (
                          <ProdutoRow
                            key={produto.id}
                            produto={produto}
                            compact={compact}
                            dndDisabled={isDndDisabled}
                            order={columnOrder}
                            renderUnidadeCell={renderUnidadeCell}
                            renderEditableCell={renderEditableCell}
                            padroes={padroes}
                            categorias={todasCategorias}
                            index={idx}
                            onUpdate={(patch) => editarProduto.mutateAsync({ id: produto.id, ...patch } as any)}
                            onDelete={() => {
                              if (confirm(`Remover "${produto.nome_produto}" do catálogo?`)) {
                                inativarProduto.mutate(produto.id);
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
      )}
    </div>
  );
}

function ProdutoRow({
  produto,
  compact,
  dndDisabled,
  order,
  renderUnidadeCell,
  renderEditableCell,
  padroes,
  categorias,
  index,
  onUpdate,
  onDelete,
}: {
  produto: ProdutoCatalogo;
  compact: boolean;
  dndDisabled: boolean;
  order: ColumnKey[];
  renderUnidadeCell: (p: ProdutoCatalogo) => React.ReactNode;
  renderEditableCell: (p: ProdutoCatalogo, f: "preco_venda" | "custo_produto") => React.ReactNode;
  padroes: { taxa_impostos: number; taxa_descontos: number; taxa_cartao: number } | null | undefined;
  categorias: string[];
  index?: number;
  onUpdate: (patch: Partial<ProdutoCatalogo>) => Promise<unknown> | unknown;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: produto.id,
    disabled: dndDisabled || compact,
  });
  const [moverOpen, setMoverOpen] = useState(false);
  const [novaCategoria, setNovaCategoria] = useState(produto.categoria ?? "");
  const [objetivoEditing, setObjetivoEditing] = useState(false);
  const [objetivoDraft, setObjetivoDraft] = useState<string>(
    produto.preco_objetivo == null ? "" : String(produto.preco_objetivo)
  );
  useEffect(() => {
    if (!moverOpen) setNovaCategoria(produto.categoria ?? "");
  }, [moverOpen, produto.categoria]);
  useEffect(() => {
    if (!objetivoEditing) {
      setObjetivoDraft(produto.preco_objetivo == null ? "" : String(produto.preco_objetivo));
    }
  }, [produto.preco_objetivo, objetivoEditing]);

  const handleMover = async () => {
    const valor = novaCategoria.trim();
    const atual = (produto.categoria ?? "").trim();
    if (valor === atual) { setMoverOpen(false); return; }
    await onUpdate({ categoria: valor } as Partial<ProdutoCatalogo>);
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

  const custo = Number(produto.custo_produto || 0);
  const preco = Number(produto.preco_venda || 0);
  const tImp = Number(padroes?.taxa_impostos ?? 0);
  const tDesc = Number(padroes?.taxa_descontos ?? 0);
  const tCard = Number(padroes?.taxa_cartao ?? 0);
  const vImp = preco * (tImp / 100);
  const vDesc = preco * (tDesc / 100);
  const vCard = preco * (tCard / 100);
  const lucro = preco - vImp - vDesc - vCard - custo;

  const commitObjetivo = async () => {
    setObjetivoEditing(false);
    const original = produto.preco_objetivo == null ? "" : String(produto.preco_objetivo);
    if (objetivoDraft === original) return;
    const num = objetivoDraft === "" ? null : Number(objetivoDraft.replace(",", "."));
    if (num !== null && Number.isNaN(num)) return;
    await onUpdate({ preco_objetivo: num } as Partial<ProdutoCatalogo>);
  };

  const cellRenderers: Record<ColumnKey, React.ReactNode> = {
    custo: renderEditableCell(produto, "custo_produto"),
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
    venda: <span>{formatCurrency(preco)}</span>,
    objetivo: produto.custo_ok ? (
      <div className="flex items-center justify-end gap-1 group">
        <Check className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground/70 hover:text-foreground"
          title="Desfazer OK"
          onClick={() => onUpdate({ custo_ok: false } as Partial<ProdutoCatalogo>)}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    ) : (
      <div className="flex items-center justify-end gap-1 group">
        <div className="flex-1">
          {objetivoEditing ? (
            <Input
              autoFocus
              type="number"
              step="0.01"
              value={objetivoDraft}
              onChange={(e) => setObjetivoDraft(e.target.value)}
              onBlur={commitObjetivo}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); commitObjetivo(); }
                if (e.key === "Escape") {
                  setObjetivoEditing(false);
                  setObjetivoDraft(produto.preco_objetivo == null ? "" : String(produto.preco_objetivo));
                }
              }}
              className="h-7 px-2 text-sm bg-muted border-border text-foreground text-right"
            />
          ) : (
            <div
              className="text-right cursor-text rounded px-1 py-0.5 hover:bg-muted/60 min-h-[1.5rem]"
              onClick={() => setObjetivoEditing(true)}
            >
              {produto.preco_objetivo == null
                ? <span className="text-muted-foreground/60">—</span>
                : formatCurrency(Number(produto.preco_objetivo))}
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground/70 hover:text-emerald-500"
          title="Marcar custo como OK"
          onClick={() => onUpdate({ custo_ok: true, preco_objetivo: null } as Partial<ProdutoCatalogo>)}
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

  const renderedColumns = compact ? (["venda"] as ColumnKey[]) : order;

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={cn(
        "border-border/60 hover:bg-muted/60",
        typeof index === "number" && index % 2 === 1 && "bg-muted/20",
        isDragging && "shadow-lg bg-muted/40",
      )}
    >
      {!compact && (
        <TableCell className="w-8 p-0 text-center align-middle">
          {!dndDisabled && (
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
      )}
      <TableCell className="font-bold text-foreground">
        <div className="flex items-center gap-2">
          {!compact && (
            <div className="w-8 h-8 rounded bg-muted/40 overflow-hidden flex items-center justify-center shrink-0">
              {produto.imagem_url ? (
                <img src={produto.imagem_url} alt={produto.nome_produto} className="w-full h-full object-cover" />
              ) : (
                <Package className="w-3.5 h-3.5 text-muted-foreground" />
              )}
            </div>
          )}
          <span>{produto.nome_produto}</span>
        </div>
      </TableCell>
      {!compact && <TableCell className="text-center text-foreground">{renderUnidadeCell(produto)}</TableCell>}
      {!compact && (
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
                  <p className="text-xs text-muted-foreground/80 truncate">{produto.nome_produto}</p>
                  <div>
                    <Label>Categoria</Label>
                    <Select
                      value={novaCategoria || "__none__"}
                      onValueChange={(v) => setNovaCategoria(v === "__none__" ? "" : v)}
                    >
                      <SelectTrigger className="bg-card/60 border-border text-foreground">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover text-popover-foreground border-border text-foreground">
                        <SelectItem value="__none__">Sem categoria</SelectItem>
                        {categorias.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
      )}
      {renderedColumns.map((col) => (
        <TableCell
          key={col}
          className={cn("text-right text-foreground", cellExtraCls[col], COLUMN_BG[col])}
        >
          {cellRenderers[col]}
        </TableCell>
      ))}
    </TableRow>
  );
}