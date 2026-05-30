import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Plus, Check, X, Pencil, Trash2, GripVertical, FolderPlus } from 'lucide-react';
import { useDespesasCategorias, getCategoriaPalette, type CategoriaDespesa } from '@/hooks/useDespesasCategorias';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, arrayMove, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GerenciarCategoriasDialog({ open, onOpenChange }: Props) {
  const { categorias, createCategoria, renameCategoria, removeCategoria, reorderCategorias } = useDespesasCategorias();
  const [novoNome, setNovoNome] = useState('');
  const [criando, setCriando] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const ids = categorias.map(c => c.id);

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = ids.indexOf(String(active.id));
    const newIdx = ids.indexOf(String(over.id));
    if (oldIdx < 0 || newIdx < 0) return;
    reorderCategorias(arrayMove(ids, oldIdx, newIdx));
  };

  const handleCreate = async () => {
    if (!novoNome.trim()) return;
    try {
      await createCategoria(novoNome);
      setNovoNome('');
      setCriando(false);
    } catch {}
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="w-4 h-4" />
            Gerenciar categorias
          </DialogTitle>
          <DialogDescription>
            Crie, renomeie, reordene ou exclua categorias de despesas. Arraste pelo handle à esquerda para reordenar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Lista */}
          <div className="rounded-lg border border-white/10 bg-white/5 max-h-[50vh] overflow-y-auto">
            {categorias.length === 0 ? (
              <div className="px-3 py-6 text-center text-xs text-white/40">
                Nenhuma categoria cadastrada.
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                modifiers={[restrictToVerticalAxis, restrictToParentElement]}
                onDragEnd={onDragEnd}
              >
                <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                  <ul className="divide-y divide-white/5">
                    {categorias.map((c, idx) => (
                      <SortableCategoriaRow
                        key={c.id}
                        cat={c}
                        palette={getCategoriaPalette(idx)}
                        onRename={(nome) => renameCategoria({ id: c.id, nome })}
                        onRemove={() => removeCategoria(c.id)}
                      />
                    ))}
                  </ul>
                </SortableContext>
              </DndContext>
            )}
          </div>

          {/* Criar nova */}
          {criando ? (
            <div className="flex items-center gap-1.5">
              <input
                autoFocus
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreate();
                  if (e.key === 'Escape') { setNovoNome(''); setCriando(false); }
                }}
                placeholder="Nome da categoria"
                className="flex-1 h-9 bg-white/5 border border-white/10 rounded px-3 text-white text-sm outline-none focus:border-blue-400/50"
              />
              <button
                onClick={handleCreate}
                className="p-2 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
              ><Check className="w-4 h-4" /></button>
              <button
                onClick={() => { setNovoNome(''); setCriando(false); }}
                className="p-2 rounded hover:bg-white/10 text-white/60"
              ><X className="w-4 h-4" /></button>
            </div>
          ) : (
            <button
              onClick={() => setCriando(true)}
              className="w-full inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/30 text-sm text-emerald-200 hover:text-emerald-100 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nova categoria
            </button>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SortableCategoriaRow({
  cat, palette, onRename, onRemove,
}: {
  cat: CategoriaDespesa;
  palette: { color: string; dot: string };
  onRename: (nome: string) => Promise<any> | any;
  onRemove: () => Promise<any> | any;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: cat.id });
  const [editing, setEditing] = useState(false);
  const [nome, setNome] = useState(cat.nome);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  } as React.CSSProperties;

  const save = async () => {
    const v = nome.trim();
    if (!v || v === cat.nome) { setEditing(false); setNome(cat.nome); return; }
    try {
      await onRename(v);
      setEditing(false);
    } catch {
      setNome(cat.nome);
      setEditing(false);
    }
  };

  return (
    <li ref={setNodeRef} style={style} className="flex items-center gap-2 px-2 py-2 group hover:bg-white/[0.03]">
      <button
        {...attributes}
        {...listeners}
        type="button"
        className="p-1 rounded hover:bg-white/10 text-white/30 hover:text-white/70 cursor-grab active:cursor-grabbing"
        title="Arrastar para reordenar"
      >
        <GripVertical className="w-4 h-4" />
      </button>
      <span className={`w-2 h-2 rounded-full ${palette.dot}`} />
      {editing ? (
        <input
          autoFocus
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save();
            if (e.key === 'Escape') { setNome(cat.nome); setEditing(false); }
          }}
          className="flex-1 h-8 bg-white/5 border border-white/10 rounded px-2 text-white text-sm outline-none focus:border-blue-400/50"
        />
      ) : (
        <span className="flex-1 text-sm text-white/90 truncate">{cat.nome}</span>
      )}
      <button
        onClick={() => { setNome(cat.nome); setEditing(true); }}
        className="p-1.5 rounded hover:bg-white/10 text-white/50 hover:text-white/80 opacity-0 group-hover:opacity-100 transition-opacity"
        title="Renomear"
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => {
          if (confirm(`Excluir a categoria "${cat.nome}"?`)) onRemove();
        }}
        className="p-1.5 rounded hover:bg-red-500/20 text-red-300/70 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity"
        title="Excluir"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </li>
  );
}