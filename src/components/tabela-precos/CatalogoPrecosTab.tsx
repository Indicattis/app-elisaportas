import { useState, useRef, useEffect, useMemo, CSSProperties } from "react";
import { Search, Check, X, Package, GripVertical } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useVendasCatalogo, ProdutoCatalogo } from "@/hooks/useVendasCatalogo";
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

const UNIDADES = ["Unitário", "Metro", "Kg", "Litro"] as const;

const formatCurrency = (value: number) =>
  (value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface CatalogoPrecosTabProps {
  compact?: boolean;
}

export function CatalogoPrecosTab({ compact = false }: CatalogoPrecosTabProps = {}) {
  const [busca, setBusca] = useState("");
  const { produtos, isLoading, editarProduto, reordenarProdutos } = useVendasCatalogo({ busca });

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
                        {!compact && <TableHead className="w-14" />}
                        <TableHead className="text-xs font-medium text-muted-foreground">Produto</TableHead>
                        {!compact && <TableHead className="text-xs font-medium text-muted-foreground text-center w-24">Unidade</TableHead>}
                        {!compact && <TableHead className="text-xs font-medium text-muted-foreground text-right w-32">Custo</TableHead>}
                        <TableHead className="text-xs font-medium text-muted-foreground text-right w-32">Preço Venda</TableHead>
                        {!compact && <TableHead className="text-xs font-medium text-muted-foreground text-right w-24">Margem</TableHead>}
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
                            margem={calcMargem(produto.preco_venda, produto.custo_produto || 0)}
                            renderUnidadeCell={renderUnidadeCell}
                            renderEditableCell={renderEditableCell}
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
  margem,
  renderUnidadeCell,
  renderEditableCell,
}: {
  produto: ProdutoCatalogo;
  disabled: boolean;
  compact: boolean;
  margem: number | null;
  renderUnidadeCell: (p: ProdutoCatalogo) => React.ReactNode;
  renderEditableCell: (p: ProdutoCatalogo, f: "preco_venda" | "custo_produto") => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: produto.id,
    disabled,
  });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    position: "relative",
    zIndex: isDragging ? 10 : "auto",
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
      {!compact && (
        <TableCell>
          <div className="w-10 h-10 rounded bg-muted/40 overflow-hidden flex items-center justify-center">
            {produto.imagem_url ? (
              <img src={produto.imagem_url} alt={produto.nome_produto} className="w-full h-full object-cover" />
            ) : (
              <Package className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </TableCell>
      )}
      <TableCell className="font-medium text-foreground">{produto.nome_produto}</TableCell>
      {!compact && <TableCell className="text-center text-foreground">{renderUnidadeCell(produto)}</TableCell>}
      {!compact && <TableCell className="text-right text-foreground">{renderEditableCell(produto, "custo_produto")}</TableCell>}
      <TableCell className="text-right text-foreground font-medium">{renderEditableCell(produto, "preco_venda")}</TableCell>
      {!compact && (
        <TableCell className="text-right">
          {margem !== null ? (
            <Badge
              className={
                margem >= 30
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                  : margem >= 10
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                  : "bg-red-500/20 text-red-300 border-red-500/30"
              }
            >
              {margem.toFixed(1)}%
            </Badge>
          ) : (
            <span className="text-muted-foreground/60">—</span>
          )}
        </TableCell>
      )}
    </TableRow>
  );
}
