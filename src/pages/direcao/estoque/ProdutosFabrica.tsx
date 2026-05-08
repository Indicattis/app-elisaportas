import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Plus, Tags, FileDown, Printer, GripVertical, DollarSign, Package, AlertTriangle, TrendingUp, Trash2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEstoque } from "@/hooks/useEstoque";
import { useCategorias } from "@/hooks/useCategorias";
import { useSubcategorias } from "@/hooks/useSubcategorias";
import { useFornecedores } from "@/hooks/useFornecedores";
import type { Categoria } from "@/hooks/useCategorias";
import { MinimalistLayout } from "@/components/MinimalistLayout";
import { toast } from "sonner";
import { baixarEstoquePDF, imprimirEstoquePDF } from "@/utils/estoquePDFGenerator";
import { formatCurrency } from "@/lib/utils";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { restrictToWindowEdges } from "@dnd-kit/modifiers";
import { ProdutoEstoque } from "@/hooks/useEstoque";

// --- EditableCell: clique único para editar in-place ---
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
        onClick={(e) => e.stopPropagation()}
        className="h-7 px-2 text-sm bg-white/10 border-white/20 text-white"
      />
    );
  }

  const alignCls = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return (
    <div
      className={`${alignCls} cursor-text rounded px-1 py-0.5 hover:bg-white/5 min-h-[1.5rem]`}
      onClick={(e) => { e.stopPropagation(); setEditing(true); }}
    >
      {display ?? (value === null || value === undefined || value === "" ? <span className="text-white/30">—</span> : value)}
    </div>
  );
}

// --- EditableSelectCell ---
type EditableSelectCellProps = {
  value: string | null | undefined;
  options: { value: string; label: string; color?: string }[];
  display: React.ReactNode;
  placeholder?: string;
  onSave: (newValue: string) => Promise<void> | void;
};

function EditableSelectCell({ value, options, display, placeholder, onSave }: EditableSelectCellProps) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <div onClick={(e) => e.stopPropagation()}>
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
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <div
      className="cursor-pointer rounded px-1 py-0.5 hover:bg-white/5 min-h-[1.5rem]"
      onClick={(e) => { e.stopPropagation(); setEditing(true); }}
    >
      {display}
    </div>
  );
}

// Componente SortableProductRow definido FORA do componente principal para estabilidade
interface SortableProductRowProps {
  produto: ProdutoEstoque;
  onDoubleClick: (id: string) => void;
  isDragDisabled: boolean;
  pedidosCount: number;
  onToggleConferir: (id: string, currentStatus: boolean) => void;
  onExcluir: (id: string) => void;
  onUpdateField: (id: string, patch: Record<string, any>) => Promise<void>;
  categorias: Categoria[];
  fornecedores: { id: string; nome: string }[];
}

function SortableProductRow({ produto, onDoubleClick, isDragDisabled, pedidosCount, onToggleConferir, onExcluir, onUpdateField, categorias, fornecedores }: SortableProductRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: produto.id, disabled: isDragDisabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const categoriaAtual = categorias.find(c => c.id === produto.categoria || c.nome.toLowerCase() === (produto.categoria || "").toLowerCase());
  const categoriaBadgeClass = categoriaAtual ? `bg-${categoriaAtual.cor}-500/20 text-${categoriaAtual.cor}-300 border-${categoriaAtual.cor}-500/30` : "";

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className="border-white/10 hover:bg-white/5 cursor-pointer"
      onDoubleClick={() => onDoubleClick(produto.id)}
    >
      <TableCell className="w-10 px-1">
        {!isDragDisabled && (
          <div
            className="cursor-grab active:cursor-grabbing text-white/30 hover:text-white/60 p-1"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </div>
        )}
      </TableCell>
      <TableCell>
        <div className="space-y-1">
          <EditableCell
            value={produto.nome_produto}
            display={<span className="text-sm font-medium text-white">{produto.nome_produto}</span>}
            onSave={(v) => onUpdateField(produto.id, { nome_produto: String(v) })}
          />
          <EditableCell
            value={produto.descricao_produto ?? ""}
            placeholder="Descrição"
            display={
              produto.descricao_produto
                ? <span className="text-xs text-white/50">{produto.descricao_produto}</span>
                : <span className="text-xs text-white/30">Adicionar descrição</span>
            }
            onSave={(v) => onUpdateField(produto.id, { descricao_produto: String(v) || null })}
          />
        </div>
      </TableCell>
      <TableCell className="text-white/60 text-sm">
        <EditableSelectCell
          value={produto.fornecedor?.id ?? null}
          options={fornecedores.map(f => ({ value: f.id, label: f.nome }))}
          display={produto.fornecedor?.nome || <span className="text-white/30">—</span>}
          placeholder="Fornecedor"
          onSave={(v) => onUpdateField(produto.id, { fornecedor_id: v || null })}
        />
      </TableCell>
      <TableCell>
        <EditableSelectCell
          value={categoriaAtual?.id ?? null}
          options={categorias.map(c => ({ value: c.id, label: c.nome, color: c.cor }))}
          display={
            categoriaAtual ? (
              <Badge className={categoriaBadgeClass}>{categoriaAtual.nome}</Badge>
            ) : (
              <span className="text-white/30">—</span>
            )
          }
          placeholder="Categoria"
          onSave={(v) => onUpdateField(produto.id, { categoria: v || null })}
        />
      </TableCell>
      <TableCell className="text-center text-white/80">
        {produto.conferir_estoque ? (
          <EditableCell
            value={produto.quantidade_ideal || 0}
            type="number"
            align="center"
            onSave={(v) => onUpdateField(produto.id, { quantidade_ideal: Number(v) })}
          />
        ) : "---"}
      </TableCell>
      <TableCell className="text-center text-white/80">
        {produto.conferir_estoque ? (
          <EditableCell
            value={produto.quantidade_maxima || 0}
            type="number"
            align="center"
            onSave={(v) => onUpdateField(produto.id, { quantidade_maxima: Number(v) })}
          />
        ) : "---"}
      </TableCell>
      <TableCell className="text-center">
        {produto.conferir_estoque ? (
          <EditableCell
            value={produto.quantidade}
            type="number"
            align="center"
            display={
              <Badge className={
                produto.quantidade < (produto.quantidade_ideal || 0)
                  ? "bg-red-500/20 text-red-400 border-red-500/30"
                  : produto.quantidade > (produto.quantidade_maxima || Infinity)
                    ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                    : "bg-green-500/20 text-green-400 border-green-500/30"
              }>
                {produto.quantidade}
              </Badge>
            }
            onSave={(v) => onUpdateField(produto.id, { quantidade: Number(v) })}
          />
        ) : (
          <span className="text-white/30">---</span>
        )}
      </TableCell>
      <TableCell className="text-center text-white/60 text-sm">
        {pedidosCount || 0}
      </TableCell>
      <TableCell className="text-center">
        <Checkbox
          checked={produto.conferir_estoque}
          onCheckedChange={() => onToggleConferir(produto.id, !!produto.conferir_estoque)}
        />
      </TableCell>
      <TableCell className="text-right text-white/80">
        <EditableCell
          value={produto.custo_unitario}
          type="currency"
          align="right"
          display={<span>{formatCurrency(produto.custo_unitario)}</span>}
          onSave={(v) => onUpdateField(produto.id, { custo_unitario: Number(v) })}
        />
      </TableCell>
      <TableCell className="text-right font-medium text-white">
        {produto.conferir_estoque ? formatCurrency(produto.quantidade * produto.custo_unitario) : "---"}
      </TableCell>
      <TableCell className="text-center">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/10"
          onClick={(e) => { e.stopPropagation(); onExcluir(produto.id); }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

// Overlay component for drag
function DragOverlayRow({ produto }: { produto: ProdutoEstoque | null }) {
  if (!produto) return null;
  return (
    <div className="bg-zinc-800 rounded-lg px-4 py-2 shadow-xl ring-2 ring-blue-500 text-white text-sm font-medium">
      {produto.nome_produto}
    </div>
  );
}

export default function ProdutosFabrica() {
  const navigate = useNavigate();
  const { produtos, loading, adicionarProduto, reordenarProdutos, excluirProduto } = useEstoque();
  const { categorias } = useCategorias();
  const { subcategorias } = useSubcategorias();
  const { fornecedores } = useFornecedores();
  
  const queryClient = useQueryClient();

  // Fetch pedidos count per estoque item
  const { data: pedidosCountMap = {} } = useQuery({
    queryKey: ["pedidos-count-by-estoque"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pedido_linhas")
        .select("estoque_id, pedido_id");
      if (error) throw error;
      const countMap: Record<string, number> = {};
      const seen: Record<string, Set<string>> = {};
      for (const row of data || []) {
        if (!row.estoque_id) continue;
        if (!seen[row.estoque_id]) seen[row.estoque_id] = new Set();
        seen[row.estoque_id].add(row.pedido_id);
      }
      for (const [estoqueId, pedidoSet] of Object.entries(seen)) {
        countMap[estoqueId] = pedidoSet.size;
      }
      return countMap;
    },
  });

  const handleToggleConferir = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("estoque")
      .update({ conferir_estoque: !currentStatus })
      .eq("id", id);
    if (!error) {
      queryClient.invalidateQueries({ queryKey: ["estoque"] });
    }
  };

  const handleExcluir = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este produto?")) return;
    try {
      await excluirProduto(id);
      toast.success("Produto excluído com sucesso");
    } catch {
      toast.error("Erro ao excluir produto");
    }
  };

  const handleUpdateField = async (id: string, patch: Record<string, any>) => {
    const { error } = await supabase.from("estoque").update(patch).eq("id", id);
    if (error) {
      toast.error("Erro ao atualizar");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["estoque"] });
    toast.success("Atualizado");
  };

  const [localProdutos, setLocalProdutos] = useState<ProdutoEstoque[]>([]);
  const [novoModal, setNovoModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);

  // Sync local state with React Query data
  useEffect(() => {
    setLocalProdutos(produtos);
  }, [produtos]);
  const [formData, setFormData] = useState({
    nome_produto: "",
    descricao_produto: "",
    categoria: "",
    subcategoria_id: "",
    quantidade: 0,
    quantidade_ideal: 0,
    quantidade_maxima: 0,
    custo_unitario: 0,
    unidade: "UN",
    setor_responsavel_producao: "",
    fornecedor_id: "",
    requer_pintura: false,
    conferir_estoque: false,
    modulo_calculo: "",
    valor_calculo: 0,
    eixo_calculo: "",
    item_padrao_porta_enrolar: false,
  });

  const isDragDisabled = searchTerm.length > 0;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const filteredProdutos = localProdutos.filter(p =>
    !searchTerm ||
    p.nome_produto.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.descricao_produto?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeProduto = activeId ? localProdutos.find(p => p.id === activeId) ?? null : null;

  const totals = useMemo(() => {
    const produtosConferidos = filteredProdutos.filter(p => p.conferir_estoque);
    const base = produtosConferidos.reduce(
      (acc, p) => ({
        ideal: acc.ideal + (p.quantidade_ideal || 0),
        maxima: acc.maxima + (p.quantidade_maxima || 0),
        atual: acc.atual + (p.quantidade || 0),
        valor: acc.valor + (p.quantidade || 0) * (p.custo_unitario || 0),
      }),
      { ideal: 0, maxima: 0, atual: 0, valor: 0 }
    );
    const estoqueBaixo = produtosConferidos.filter(p => p.quantidade < (p.quantidade_ideal || 0)).length;
    const estoqueExcesso = produtosConferidos.filter(p => p.quantidade > (p.quantidade_maxima || Infinity)).length;
    return { ...base, estoqueBaixo, estoqueExcesso };
  }, [filteredProdutos]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = localProdutos.findIndex(p => p.id === active.id);
      const newIndex = localProdutos.findIndex(p => p.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(localProdutos, oldIndex, newIndex);
      const updatedWithOrder = reordered.map((p, i) => ({ ...p, ordem: i + 1 }));
      
      // Optimistic update
      setLocalProdutos(updatedWithOrder);

      const updates = updatedWithOrder.map(p => ({ id: p.id, ordem: p.ordem }));
      try {
        await reordenarProdutos(updates);
      } catch {
        // Rollback on error
        setLocalProdutos(produtos);
      }
    }
  };

  const getCategoriaColor = (categoriaId: string) => {
    const cat = categorias.find(c => c.id === categoriaId);
    return cat?.cor || "#6b7280";
  };

  const getCategoriaLabel = (categoriaId: string) => {
    const cat = categorias.find(c => c.id === categoriaId);
    return cat?.nome || categoriaId;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await adicionarProduto({
        nome_produto: formData.nome_produto,
        descricao_produto: formData.descricao_produto || null,
        quantidade: formData.quantidade,
        quantidade_ideal: formData.quantidade_ideal,
        quantidade_maxima: formData.quantidade_maxima,
        custo_unitario: formData.custo_unitario,
        unidade: formData.unidade,
        categoria: formData.categoria || null,
        subcategoria_id: formData.subcategoria_id || null,
        setor_responsavel_producao: formData.setor_responsavel_producao ? formData.setor_responsavel_producao as any : null,
        fornecedor_id: formData.fornecedor_id || null,
        requer_pintura: formData.requer_pintura,
        conferir_estoque: formData.conferir_estoque,
        modulo_calculo: formData.modulo_calculo ? formData.modulo_calculo as any : null,
        valor_calculo: formData.valor_calculo || null,
        eixo_calculo: formData.eixo_calculo ? formData.eixo_calculo as any : null,
        item_padrao_porta_enrolar: formData.item_padrao_porta_enrolar,
      });

      setFormData({
        nome_produto: "",
        descricao_produto: "",
        categoria: "",
        subcategoria_id: "",
        quantidade: 0,
        quantidade_ideal: 0,
        quantidade_maxima: 0,
        custo_unitario: 0,
        unidade: "UN",
        setor_responsavel_producao: "",
        fornecedor_id: "",
        requer_pintura: false,
        conferir_estoque: false,
        modulo_calculo: "",
        valor_calculo: 0,
        eixo_calculo: "",
        item_padrao_porta_enrolar: false,
      });
      setNovoModal(false);
      toast.success("Produto adicionado com sucesso");
    } catch (error) {
      toast.error("Erro ao adicionar produto");
    }
  };

  const handleDoubleClick = (produtoId: string) => {
    const basePath = window.location.pathname.startsWith("/fabrica/produtos")
      ? "/fabrica/produtos"
      : "/direcao/estoque/configuracoes/produtos/fabrica";
    navigate(`${basePath}/editar/${produtoId}`);
  };

  const handleDownloadPDF = () => {
    const categoriasMap: Record<string, string> = {};
    categorias.forEach(cat => {
      categoriasMap[cat.id] = cat.nome;
    });
    
    baixarEstoquePDF({
      produtos: filteredProdutos,
      categoriasMap,
    });
    
    toast.success("PDF gerado com sucesso!");
  };

  const handlePrint = () => {
    const categoriasMap: Record<string, string> = {};
    categorias.forEach(cat => {
      categoriasMap[cat.id] = cat.nome;
    });
    
    imprimirEstoquePDF({
      produtos: filteredProdutos,
      categoriasMap,
    });
  };

  const headerActions = (
    <div className="flex gap-2 flex-wrap">
      <Button 
        variant="outline"
        size="sm"
        onClick={handleDownloadPDF}
        className="bg-white/5 border-white/10 text-white hover:bg-white/10"
      >
        <FileDown className="mr-2 h-4 w-4" />
        PDF
      </Button>
      <Button 
        variant="outline"
        size="sm"
        onClick={handlePrint}
        className="bg-white/5 border-white/10 text-white hover:bg-white/10"
      >
        <Printer className="mr-2 h-4 w-4" />
        Imprimir
      </Button>
      <Dialog open={novoModal} onOpenChange={setNovoModal}>
        <DialogTrigger asChild>
          <Button size="sm" className="bg-gradient-to-r from-blue-500 to-blue-700 text-white border-0">
            <Plus className="mr-2 h-4 w-4" />
            Novo
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-zinc-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Adicionar Novo Produto</DialogTitle>
            <DialogDescription className="text-white/60">
              Preencha os dados do novo produto
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome_produto">Nome do Produto</Label>
                <Input
                  id="nome_produto"
                  value={formData.nome_produto}
                  onChange={(e) => setFormData({ ...formData, nome_produto: e.target.value })}
                  required
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="categoria">Categoria</Label>
                <Select
                  value={formData.categoria}
                  onValueChange={(value) => {
                    setFormData({ ...formData, categoria: value, subcategoria_id: "" });
                  }}
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10">
                    {categorias.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.categoria && (
              <div className="space-y-2">
                <Label htmlFor="subcategoria_id">Subcategoria</Label>
                <Select
                  value={formData.subcategoria_id}
                  onValueChange={(value) => setFormData({ ...formData, subcategoria_id: value })}
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="Selecione uma subcategoria" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10">
                    {subcategorias
                      .filter((sub) => sub.categoria_id === formData.categoria)
                      .map((sub) => (
                        <SelectItem key={sub.id} value={sub.id}>
                          {sub.nome}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="descricao_produto">Descrição</Label>
              <Input
                id="descricao_produto"
                value={formData.descricao_produto}
                onChange={(e) => setFormData({ ...formData, descricao_produto: e.target.value })}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantidade">Quantidade</Label>
                <Input
                  id="quantidade"
                  type="number"
                  value={formData.quantidade}
                  onChange={(e) => setFormData({ ...formData, quantidade: Number(e.target.value) })}
                  required
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantidade_ideal">Qtd. Ideal</Label>
                <Input
                  id="quantidade_ideal"
                  type="number"
                  value={formData.quantidade_ideal}
                  onChange={(e) => setFormData({ ...formData, quantidade_ideal: Number(e.target.value) })}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantidade_maxima">Qtd. Máxima</Label>
                <Input
                  id="quantidade_maxima"
                  type="number"
                  value={formData.quantidade_maxima}
                  onChange={(e) => setFormData({ ...formData, quantidade_maxima: Number(e.target.value) })}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unidade">Unidade</Label>
                <Select
                  value={formData.unidade}
                  onValueChange={(value) => setFormData({ ...formData, unidade: value })}
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10">
                    <SelectItem value="UN">UN</SelectItem>
                    <SelectItem value="KG">KG</SelectItem>
                    <SelectItem value="L">L</SelectItem>
                    <SelectItem value="M">M</SelectItem>
                    <SelectItem value="M²">M²</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="custo_unitario">Custo Unitário</Label>
              <Input
                id="custo_unitario"
                type="number"
                step="0.01"
                value={formData.custo_unitario}
                onChange={(e) => setFormData({ ...formData, custo_unitario: Number(e.target.value) })}
                required
                className="bg-white/5 border-white/10 text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="setor_responsavel_producao">Setor Responsável</Label>
                <Select
                  value={formData.setor_responsavel_producao}
                  onValueChange={(value) => setFormData({ ...formData, setor_responsavel_producao: value })}
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10">
                    <SelectItem value="perfiladeira">Perfiladeira</SelectItem>
                    <SelectItem value="soldagem">Soldagem</SelectItem>
                    <SelectItem value="separacao">Separação</SelectItem>
                    <SelectItem value="pintura">Pintura</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="fornecedor_id">Fornecedor</Label>
                <Select
                  value={formData.fornecedor_id}
                  onValueChange={(value) => setFormData({ ...formData, fornecedor_id: value })}
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="Selecione um fornecedor" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10">
                    {fornecedores.map((forn) => (
                      <SelectItem key={forn.id} value={forn.id}>
                        {forn.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="requer_pintura"
                checked={formData.requer_pintura}
                onChange={(e) => setFormData({ ...formData, requer_pintura: e.target.checked })}
                className="h-4 w-4 rounded border-white/20 bg-white/5"
              />
              <Label htmlFor="requer_pintura" className="cursor-pointer">
                Este item requer pintura
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="conferir_estoque"
                checked={formData.conferir_estoque}
                onChange={(e) => setFormData({ ...formData, conferir_estoque: e.target.checked })}
                className="h-4 w-4 rounded border-white/20 bg-white/5"
              />
              <Label htmlFor="conferir_estoque" className="cursor-pointer">
                Conferir estoque deste item
              </Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setNovoModal(false)} className="border-white/10 text-white hover:bg-white/10">
                Cancelar
              </Button>
              <Button type="submit" className="bg-gradient-to-r from-blue-500 to-blue-700 text-white border-0">
                Adicionar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );

  const breadcrumbItems = [
    { label: 'Home', path: '/home' },
    { label: 'Direção', path: '/direcao' },
    { label: 'Estoque', path: '/direcao/estoque' },
    { label: 'Configurações', path: '/direcao/estoque/configuracoes' },
    { label: 'Produtos', path: '/direcao/estoque/configuracoes/produtos' },
    { label: 'Fábrica' }
  ];

  return (
    <MinimalistLayout
      title="Produtos da Fábrica"
      subtitle="Gerencie os produtos do estoque"
      backPath="/direcao/estoque/configuracoes/produtos"
      headerActions={headerActions}
      breadcrumbItems={breadcrumbItems}
      fullWidth
    >
      <div className="space-y-4 px-[84px]">
        {/* Barra de busca + indicadores */}
        <div className="p-1.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10">
          <div className="p-4 rounded-lg space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <Input
                placeholder="Buscar produtos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm bg-white/5 border-white/10 text-white placeholder:text-white/40"
              />
              <div className="flex flex-wrap gap-3 flex-1">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <DollarSign className="h-4 w-4 text-emerald-400" />
                  <div className="flex flex-col">
                    <span className="text-[10px] text-emerald-400/70 uppercase font-medium leading-none">Valor Estoque</span>
                    <span className="text-sm font-bold text-emerald-400">{formatCurrency(totals.valor)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <Package className="h-4 w-4 text-blue-400" />
                  <div className="flex flex-col">
                    <span className="text-[10px] text-blue-400/70 uppercase font-medium leading-none">Itens</span>
                    <span className="text-sm font-bold text-blue-400">{filteredProdutos.length}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20">
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                  <div className="flex flex-col">
                    <span className="text-[10px] text-red-400/70 uppercase font-medium leading-none">Estoque Baixo</span>
                    <span className="text-sm font-bold text-red-400">{totals.estoqueBaixo}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <TrendingUp className="h-4 w-4 text-amber-400" />
                  <div className="flex flex-col">
                    <span className="text-[10px] text-amber-400/70 uppercase font-medium leading-none">Em Excesso</span>
                    <span className="text-sm font-bold text-amber-400">{totals.estoqueExcesso}</span>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-xs text-white/40">
              Dica: Clique duas vezes em um item para editá-lo. {!isDragDisabled && "Arraste para reordenar."}
            </p>
          </div>
        </div>

        {/* Tabela */}
        <div className="p-1.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10">
          <div className="rounded-lg overflow-hidden">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="w-10 px-1" />
                    <TableHead className="text-xs font-medium text-white/60">Produto</TableHead>
                    <TableHead className="text-xs font-medium text-white/60">Fornecedor</TableHead>
                    <TableHead className="text-center text-xs font-medium text-white/60">Est. Mín</TableHead>
                    <TableHead className="text-center text-xs font-medium text-white/60">Est. Máx</TableHead>
                    <TableHead className="text-center text-xs font-medium text-white/60">Atual</TableHead>
                    <TableHead className="text-center text-xs font-medium text-white/60">Pedidos</TableHead>
                    <TableHead className="text-center text-xs font-medium text-white/60">Conferir</TableHead>
                    <TableHead className="text-right text-xs font-medium text-white/60">Preço/Un</TableHead>
                    <TableHead className="text-right text-xs font-medium text-white/60">Valor Total</TableHead>
                    <TableHead className="text-center text-xs font-medium text-white/60">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <SortableContext items={filteredProdutos.map(p => p.id)} strategy={verticalListSortingStrategy}>
                  <TableBody>
                    {loading ? (
                      <TableRow className="border-white/10">
                        <TableCell colSpan={11} className="text-center py-8 text-sm text-white/40">
                          Carregando...
                        </TableCell>
                      </TableRow>
                    ) : filteredProdutos.length === 0 ? (
                      <TableRow className="border-white/10">
                        <TableCell colSpan={11} className="text-center py-8 text-sm text-white/40">
                          {searchTerm ? "Nenhum produto encontrado" : "Nenhum produto cadastrado"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredProdutos.map((produto) => (
                        <SortableProductRow
                          key={produto.id}
                          produto={produto}
                          onDoubleClick={handleDoubleClick}
                          isDragDisabled={isDragDisabled}
                          pedidosCount={pedidosCountMap[produto.id] || 0}
                          onToggleConferir={handleToggleConferir}
                          onExcluir={handleExcluir}
                        />
                      ))
                    )}
                  </TableBody>
              </SortableContext>
              {filteredProdutos.length > 0 && (
                <TableFooter className="bg-white/5 border-t border-white/20">
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableCell className="w-10 px-1" />
                    <TableCell className="font-bold text-white">
                      TOTAL ({filteredProdutos.length} itens)
                    </TableCell>
                    <TableCell />
                    <TableCell className="text-center font-bold text-white">
                      {totals.ideal}
                    </TableCell>
                    <TableCell className="text-center font-bold text-white">
                      {totals.maxima}
                    </TableCell>
                    <TableCell className="text-center font-bold text-white">
                      {totals.atual}
                    </TableCell>
                    <TableCell />
                    <TableCell />
                    <TableCell className="text-right font-bold text-white/50">
                      ---
                    </TableCell>
                    <TableCell className="text-right font-bold text-white">
                      {formatCurrency(totals.valor)}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                </TableFooter>
              )}
              </Table>
              {createPortal(
                <DragOverlay
                  modifiers={[restrictToWindowEdges]}
                  dropAnimation={{
                    duration: 200,
                    easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
                  }}
                >
                  {activeProduto ? <DragOverlayRow produto={activeProduto} /> : null}
                </DragOverlay>,
                document.body
              )}
            </DndContext>
          </div>
        </div>
      </div>
    </MinimalistLayout>
  );
}
