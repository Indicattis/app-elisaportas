import { useState } from 'react';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { useSetores, getSetorPalette, type Setor } from '@/hooks/useSetores';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function GerenciarSetoresDialog({ open, onOpenChange }: Props) {
  const { setores, createSetor, renameSetor, removeSetor, creating } = useSetores();
  const [novoNome, setNovoNome] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');

  const handleCreate = async () => {
    if (!novoNome.trim()) return;
    try {
      await createSetor(novoNome);
      setNovoNome('');
    } catch { /* toast handled */ }
  };

  const startEdit = (s: Setor) => { setEditingId(s.id); setEditingValue(s.label); };
  const cancelEdit = () => { setEditingId(null); setEditingValue(''); };
  const saveEdit = async (id: string) => {
    try {
      await renameSetor({ id, label: editingValue });
      cancelEdit();
    } catch { /* toast handled */ }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-slate-950/95 border-white/10 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-white">Gerenciar setores</DialogTitle>
          <DialogDescription className="text-white/50">
            Crie, renomeie ou exclua setores. A exclusão é bloqueada se houver cargos vinculados.
          </DialogDescription>
        </DialogHeader>

        {/* Criar novo */}
        <div className="flex gap-2">
          <input
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
            placeholder="Nome do novo setor"
            className="flex-1 h-9 bg-white/5 border border-white/10 rounded-lg px-3 text-sm text-white outline-none focus:border-blue-400/50"
          />
          <button
            onClick={handleCreate}
            disabled={!novoNome.trim() || creating}
            className="h-9 px-3 inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/30 text-emerald-200 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            Adicionar
          </button>
        </div>

        {/* Lista */}
        <div className="space-y-1.5 max-h-[50vh] overflow-y-auto">
          {setores.length === 0 && (
            <p className="text-sm text-white/40 text-center py-4">Nenhum setor cadastrado.</p>
          )}
          {setores.map((s, idx) => {
            const palette = getSetorPalette(idx);
            const isEditing = editingId === s.id;
            return (
              <div key={s.id} className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                <span className={`w-2 h-2 rounded-full ${palette.dot}`} />
                {isEditing ? (
                  <>
                    <input
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEdit(s.id);
                        if (e.key === 'Escape') cancelEdit();
                      }}
                      autoFocus
                      className="flex-1 h-7 bg-white/5 border border-white/10 rounded px-2 text-sm text-white outline-none focus:border-blue-400/50"
                    />
                    <button onClick={() => saveEdit(s.id)} className="p-1 rounded hover:bg-emerald-500/20 text-emerald-300">
                      <Check className="w-4 h-4" />
                    </button>
                    <button onClick={cancelEdit} className="p-1 rounded hover:bg-white/10 text-white/60">
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm text-white">{s.label}</span>
                    <span className="text-[10px] text-white/30 font-mono">{s.key}</span>
                    <button onClick={() => startEdit(s)} className="p-1 rounded hover:bg-white/10 text-white/60 hover:text-white">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => removeSetor({ id: s.id, key: s.key })}
                      className="p-1 rounded hover:bg-red-500/20 text-red-300/70 hover:text-red-300"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}