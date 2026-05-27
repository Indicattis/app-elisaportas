import { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, BookOpen, Star, Package, Plus, Palette, LayoutGrid, List, GripVertical } from 'lucide-react';
import { useVendasCatalogo, ProdutoCatalogo } from '@/hooks/useVendasCatalogo';
import { MinimalistLayout } from '@/components/MinimalistLayout';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const VIEW_MODE_KEY = 'catalogo-view-mode';

export default function Catalogo() {
  const navigate = useNavigate();
  const [busca, setBusca] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    if (typeof window === 'undefined') return 'grid';
    return (localStorage.getItem(VIEW_MODE_KEY) as 'grid' | 'list') || 'grid';
  });
  const [orderedIds, setOrderedIds] = useState<string[]>([]);

  const { produtos, isLoading, reordenarProdutos, editarProduto } = useVendasCatalogo({
    busca,
    categoria: categoriaFiltro || undefined
  });

  // Sincronizar IDs locais quando produtos do servidor mudam
  useEffect(() => {
    if (produtos) {
      setOrderedIds(produtos.map((p) => p.id));
    }
  }, [produtos]);

  useEffect(() => {
    localStorage.setItem(VIEW_MODE_KEY, viewMode);
  }, [viewMode]);

  // Extrair categorias únicas
  const categorias = [...new Set(produtos?.map(p => p.categoria).filter(Boolean))] as string[];

  const filtroAtivo = !!busca || !!categoriaFiltro;

  // Lista ordenada para renderização
  const produtosOrdenados: ProdutoCatalogo[] = orderedIds
    .map((id) => produtos?.find((p) => p.id === id))
    .filter((p): p is ProdutoCatalogo => !!p);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = orderedIds.indexOf(active.id as string);
    const newIndex = orderedIds.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;
    const newOrder = arrayMove(orderedIds, oldIndex, newIndex);
    setOrderedIds(newOrder);
    reordenarProdutos.mutate(newOrder);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <MinimalistLayout 
      title="Catálogo" 
      subtitle={`${produtos?.length || 0} produto${(produtos?.length || 0) !== 1 ? 's' : ''}`}
      backPath="/marketing"
      breadcrumbItems={[
        { label: "Home", path: "/home" },
        { label: "Marketing", path: "/marketing" },
        { label: "Catálogo" }
      ]}
      headerActions={
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-white/20 bg-white/5 p-0.5">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'grid' ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white'
              }`}
              title="Visualização em grade"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'list' ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white'
              }`}
              title="Visualização em lista"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate('/marketing/catalogo/cores')}
            className="border-white/20 text-white hover:bg-white/10"
          >
            <Palette className="w-4 h-4 mr-2" />
            Cores
          </Button>
          <Button
            onClick={() => navigate('/marketing/catalogo/new')}
            className="bg-gradient-to-r from-green-500 to-green-700 hover:from-green-400 hover:to-green-600 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Produto
          </Button>
        </div>
      }
    >
      {/* Filtros */}
      <div className="space-y-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <Input 
            placeholder="Buscar produtos..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-10 bg-primary/5 border-primary/10 text-white placeholder:text-white/40"
          />
        </div>

        {/* Filtro por categoria */}
        {categorias.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setCategoriaFiltro('')}
              className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                categoriaFiltro === '' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-primary/5 text-white/70 hover:bg-primary/10'
              }`}
            >
              Todos
            </button>
            {categorias.map(cat => (
              <button
                key={cat}
                onClick={() => setCategoriaFiltro(cat)}
                className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                  categoriaFiltro === cat 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-primary/5 text-white/70 hover:bg-primary/10'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {filtroAtivo && (
          <p className="text-xs text-white/50">
            Reordenação por arraste desativada enquanto houver filtro ativo.
          </p>
        )}
      </div>

      {isLoading ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square bg-white/5" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-16 bg-white/5" />
            ))}
          </div>
        )
      ) : produtosOrdenados.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={orderedIds}
            strategy={viewMode === 'grid' ? rectSortingStrategy : verticalListSortingStrategy}
          >
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {produtosOrdenados.map((produto) => (
                  <SortableGridCard
                    key={produto.id}
                    produto={produto}
                    disabled={filtroAtivo}
                    onClick={() => navigate(`/marketing/catalogo/editar/${produto.id}`)}
                    formatCurrency={formatCurrency}
                    onRename={(nome) => editarProduto.mutate({ id: produto.id, nome_produto: nome })}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {produtosOrdenados.map((produto) => (
                  <SortableListRow
                    key={produto.id}
                    produto={produto}
                    disabled={filtroAtivo}
                    onClick={() => navigate(`/marketing/catalogo/editar/${produto.id}`)}
                    formatCurrency={formatCurrency}
                    onRename={(nome) => editarProduto.mutate({ id: produto.id, nome_produto: nome })}
                  />
                ))}
              </div>
            )}
          </SortableContext>
        </DndContext>
      ) : (
        <div className="text-center py-12">
          <BookOpen className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/60">
            {busca ? 'Nenhum produto encontrado' : 'Catálogo vazio'}
          </p>
        </div>
      )}
    </MinimalistLayout>
  );
}

interface SortableItemProps {
  produto: ProdutoCatalogo;
  disabled: boolean;
  onClick: () => void;
  formatCurrency: (v: number) => string;
  onRename: (novoNome: string) => void;
}

function SortableGridCard({ produto, disabled, onClick, formatCurrency, onRename }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: produto.id,
    disabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 'auto' as const,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      className="bg-primary/5 border border-primary/10 rounded-xl overflow-hidden backdrop-blur-xl
                 hover:bg-primary/10 hover:border-blue-500/30 transition-all group cursor-pointer relative"
    >
      {!disabled && (
        <button
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="absolute top-2 left-2 z-10 p-1.5 rounded-md bg-black/40 backdrop-blur-sm text-white/60
                     hover:text-white hover:bg-black/60 cursor-grab active:cursor-grabbing
                     opacity-0 group-hover:opacity-100 transition-opacity"
          title="Arraste para reordenar"
        >
          <GripVertical className="w-4 h-4" />
        </button>
      )}

      <div className="aspect-square bg-white/5 relative overflow-hidden">
        {produto.imagem_url ? (
          <img
            src={produto.imagem_url}
            alt={produto.nome_produto}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-12 h-12 text-white/20" />
          </div>
        )}

        {produto.destaque && (
          <div className="absolute top-2 right-2">
            <Badge className="bg-yellow-500/90 text-black">
              <Star className="w-3 h-3 mr-1" />
              Destaque
            </Badge>
          </div>
        )}
      </div>

      <div className="p-3">
        <InlineNameEditor
          value={produto.nome_produto}
          onSave={onRename}
          className="text-sm font-medium text-white truncate"
        />
        {produto.categoria && (
          <p className="text-xs text-white/50 mt-0.5">{produto.categoria}</p>
        )}
        <div className="mt-2 flex items-center justify-between">
          <p className="text-lg font-bold text-blue-400">
            {formatCurrency(produto.preco_venda)}
          </p>
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            produto.quantidade > 0
              ? 'bg-green-500/20 text-green-400'
              : 'bg-red-500/20 text-red-400'
          }`}>
            {produto.quantidade > 0 ? `${produto.quantidade} un.` : 'Sem estoque'}
          </span>
        </div>
      </div>
    </div>
  );
}

function SortableListRow({ produto, disabled, onClick, formatCurrency, onRename }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: produto.id,
    disabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 'auto' as const,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      className="flex items-center gap-3 bg-primary/5 border border-primary/10 rounded-xl p-2 backdrop-blur-xl
                 hover:bg-primary/10 hover:border-blue-500/30 transition-all cursor-pointer"
    >
      <button
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        disabled={disabled}
        className="p-1 text-white/40 hover:text-white/80 cursor-grab active:cursor-grabbing
                   disabled:cursor-not-allowed disabled:opacity-30"
        title={disabled ? 'Limpe os filtros para reordenar' : 'Arraste para reordenar'}
      >
        <GripVertical className="w-4 h-4" />
      </button>

      <div className="w-12 h-12 rounded-lg bg-white/5 overflow-hidden flex-shrink-0">
        {produto.imagem_url ? (
          <img src={produto.imagem_url} alt={produto.nome_produto} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-5 h-5 text-white/20" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <InlineNameEditor
            value={produto.nome_produto}
            onSave={onRename}
            className="text-sm font-medium text-white truncate"
          />
          {produto.destaque && (
            <Badge className="bg-yellow-500/90 text-black text-[10px] py-0 px-1.5 h-4">
              <Star className="w-2.5 h-2.5 mr-0.5" />
              Destaque
            </Badge>
          )}
        </div>
        {produto.categoria && (
          <p className="text-xs text-white/50 truncate">{produto.categoria}</p>
        )}
      </div>

      <div className="hidden sm:block text-right">
        <span className={`text-xs px-2 py-0.5 rounded-full ${
          produto.quantidade > 0
            ? 'bg-green-500/20 text-green-400'
            : 'bg-red-500/20 text-red-400'
        }`}>
          {produto.quantidade > 0 ? `${produto.quantidade} un.` : 'Sem estoque'}
        </span>
      </div>

      <div className="text-right min-w-[90px]">
        <p className="text-sm sm:text-base font-bold text-blue-400">
          {formatCurrency(produto.preco_venda)}
        </p>
      </div>
    </div>
  );
}

interface InlineNameEditorProps {
  value: string;
  onSave: (nome: string) => void;
  className?: string;
}

function InlineNameEditor({ value, onSave, className }: InlineNameEditorProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) {
      onSave(trimmed);
    } else {
      setDraft(value);
    }
    setEditing(false);
  };

  const cancel = () => {
    setDraft(value);
    setEditing(false);
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancel();
    }
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKey}
        onClick={(e) => e.stopPropagation()}
        className="w-full bg-white/10 border border-blue-500/40 rounded px-1.5 py-0.5 text-sm text-white outline-none focus:border-blue-400"
      />
    );
  }

  return (
    <h3
      onClick={(e) => {
        e.stopPropagation();
        setEditing(true);
      }}
      title="Clique para editar"
      className={`${className ?? ''} cursor-text hover:bg-white/10 rounded px-1 -mx-1`}
    >
      {value}
    </h3>
  );
}
