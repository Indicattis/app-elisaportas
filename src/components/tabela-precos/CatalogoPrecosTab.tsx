import { useState, useRef, useEffect, useMemo, CSSProperties } from "react";
import { Search, Check, X, Package, GripVertical, Trash2, FolderInput } from "lucide-react";
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
import { cn } from "@/lib/utils";

type EditField = "preco_venda" | "custo_produto" | "unidade";

const UNIDADES = ["Un", "M", "Kg", "L", "M²", "M³", "Cx", "Pç"] as const;

const formatCurrency = (value: number) =>
  (value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface CatalogoPrecosTabProps {
  compact?: boolean;
}

export function CatalogoPrecosTab({ compact = false }: CatalogoPrecosTabProps = {}) {
  const [busca, setBusca] = useState("");
  const { produtos, isLoading, editarProduto, reordenarProdutos, inativarProduto } = useVendasCatalogo({ busca });
  const { padroes } = useCustosItensPadroes();

  const [editing, setEditing] = useState<{ id: string; field: EditField } | null>(null);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const startEdit = (produto: ProdutoCatalogo, field: EditField) => {
    setEditing({ id: produto.id, field });
    setEditValue(String(produto[field] ?? (field === "unidade" ? "Unitário" : 0)));
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

  const calcMargem = (preco: number, custo: number) => {
    if (!preco || preco <= 0) return null;
    return ((preco - (custo || 0)) / preco) * 100;
  };

  // Mantém a ordem natural do hook (ordem asc, nome asc) para suportar drag-and-drop
  const produtosOrdenados = useMemo(() => [...(produtos || [])], [produtos]);

  const groupedByCategoria = useMemo(() => {
    const groups = new Map<string, ProdutoCatalogo[]>();
    for (const p of produtosOrdenados) {
      const key = (p.categoria || "").trim() || "Sem categoria";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(p);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [produtosOrdenados]);

  const todasCategorias = useMemo(() => {
    const set = new Set<string>();
    for (const p of produtosOrdenados) {
      const k = (p.categoria || "").trim();
      if (k) set.add(k);
    }
    return Array.from(set).sort();
  }, [produtosOrdenados]);

  const dndSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const isDndDisabled = Boolean(busca.trim());

  const handleDragEndCategoria = (categoria: string, rows: ProdutoCatalogo[]) => (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = rows.findIndex((r) => r.id === active.id);
    const newIndex = rows.findIndex((r) => r.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(rows, oldIndex, newIndex);
    // Reconstrói a lista global preservando a ordem das outras categorias
    const novaListaGlobal: string[] = [];
    for (const [cat, catRows] of groupedByCategoria) {
      if (cat === categoria) {
        novaListaGlobal.push(...reordered.map((r) => r.id));
      } else {
        novaListaGlobal.push(...catRows.map((r) => r.id));
      }
    }
    reordenarProdutos.mutate(novaListaGlobal);
  };

  const renderEditableCell = (produto: ProdutoCatalogo, field: "preco_venda" | "custo_produto") => {
    const isEditing = editing?.id === produto.id && editing.field === field;
    const value = produto[field] ?? 0;
    if (isEditing) {
      return (
        <div className="flex items-center justify-end gap-1">
          <Input
            ref={inputRef}
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
    const value = produto.unidade || "Unitário";
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-base font-medium text-foreground">Itens do Catálogo</h2>
          <p className="text-xs text-muted-foreground">
            {produtosOrdenados.length} {produtosOrdenados.length === 1 ? "produto" : "produtos"} — clique no preço, custo ou unidade para editar
          </p>
        </div>
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
                <span className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground">
                  {categoria}
                </span>
                <span className="text-[11px] text-muted-foreground/60">· {rows.length}</span>
              </div>
              <div className="rounded-xl overflow-hidden bg-card/60 backdrop-blur-xl border border-border">
                <DndContext
                  sensors={dndSensors}
                  collisionDetection={closestCenter}
                  modifiers={[restrictToVerticalAxis, restrictToParentElement]}
                  onDragEnd={handleDragEndCategoria(categoria, rows)}
                >
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="w-8 p-0" />
                        <TableHead className="text-xs font-medium text-muted-foreground">Produto</TableHead>
                        {!compact && <TableHead className="text-xs font-medium text-muted-foreground text-center w-16">UN</TableHead>}
                        {!compact && <TableHead className="text-xs font-medium text-muted-foreground text-center w-20">Ações</TableHead>}
                        {!compact && <TableHead className="text-xs font-medium text-foreground text-center w-36 bg-rose-100 dark:bg-rose-500/30">Custo</TableHead>}
                        {!compact && <TableHead className="text-xs font-medium text-foreground text-center w-36 bg-blue-100 dark:bg-blue-500/30">Lucro</TableHead>}
                        {!compact && <TableHead className="text-xs font-medium text-foreground text-center w-28 bg-orange-100 dark:bg-orange-500/30">Imposto</TableHead>}
                        {!compact && <TableHead className="text-xs font-medium text-foreground text-center w-32 bg-yellow-100 dark:bg-yellow-500/30">Desc. Gerente</TableHead>}
                        {!compact && <TableHead className="text-xs font-medium text-foreground text-center w-28 bg-teal-100 dark:bg-teal-500/30">Cartão</TableHead>}
                        <TableHead className="text-xs font-medium text-foreground text-center w-40 bg-green-100 dark:bg-green-500/30">Valor de Venda</TableHead>
                        {!compact && <TableHead className="text-xs font-medium text-foreground text-center w-40 bg-violet-100 dark:bg-violet-500/30">Preço Objetivo</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <SortableContext items={rows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
                        {rows.map((produto) => (
                          <SortableProdutoRow
                            key={produto.id}
                            produto={produto}
                            disabled={isDndDisabled}
                            compact={compact}
                            renderUnidadeCell={renderUnidadeCell}
                            renderEditableCell={renderEditableCell}
                            padroes={padroes}
                            categorias={todasCategorias}
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

function SortableProdutoRow({
  produto,
  disabled,
  compact,
  renderUnidadeCell,
  renderEditableCell,
  padroes,
  categorias,
  onUpdate,
  onDelete,
}: {
  produto: ProdutoCatalogo;
  disabled: boolean;
  compact: boolean;
  renderUnidadeCell: (p: ProdutoCatalogo) => React.ReactNode;
  renderEditableCell: (p: ProdutoCatalogo, f: "preco_venda" | "custo_produto") => React.ReactNode;
  padroes: { taxa_impostos: number; taxa_descontos: number; taxa_cartao: number } | null | undefined;
  categorias: string[];
  onUpdate: (patch: Partial<ProdutoCatalogo>) => Promise<unknown> | unknown;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: produto.id,
    disabled,
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
                    <Input
                      list={`mover-cat-cat-${produto.id}`}
                      value={novaCategoria}
                      onChange={(e) => setNovaCategoria(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleMover(); } }}
                      placeholder="Selecione ou digite uma nova"
                      className="bg-card/60 border-border text-foreground"
                    />
                    <datalist id={`mover-cat-cat-${produto.id}`}>
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
      )}
      {!compact && (
        <TableCell className="text-right text-foreground bg-rose-100 dark:bg-rose-500/30">
          {renderEditableCell(produto, "custo_produto")}
        </TableCell>
      )}
      {!compact && (
        <TableCell className="text-right text-foreground font-medium bg-blue-100 dark:bg-blue-500/30">
          {formatCurrency(lucro)}
        </TableCell>
      )}
      {!compact && (
        <TableCell
          className="text-right text-foreground bg-orange-100 dark:bg-orange-500/30"
          title={`${tImp.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`}
        >
          {formatCurrency(vImp)}
        </TableCell>
      )}
      {!compact && (
        <TableCell
          className="text-right text-foreground bg-yellow-100 dark:bg-yellow-500/30"
          title={`${tDesc.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`}
        >
          {formatCurrency(vDesc)}
        </TableCell>
      )}
      {!compact && (
        <TableCell
          className="text-right text-foreground bg-teal-100 dark:bg-teal-500/30"
          title={`${tCard.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`}
        >
          {formatCurrency(vCard)}
        </TableCell>
      )}
      <TableCell className="text-right text-foreground font-medium bg-green-100 dark:bg-green-500/30">
        {renderEditableCell(produto, "preco_venda")}
      </TableCell>
      {!compact && (
        <TableCell className="text-right text-foreground bg-violet-100 dark:bg-violet-500/30">
          {produto.custo_ok ? (
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
          )}
        </TableCell>
      )}
    </TableRow>
  );
}
