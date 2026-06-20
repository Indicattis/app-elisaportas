import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { MapaEstadosBrasil } from './MapaEstadosBrasil';
import type { FreteRegiao } from '@/hooks/useFreteRegioes';
import { MapPinned } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: FreteRegiao | null;
  outrasRegioes: FreteRegiao[]; // outras regiões da mesma transportadora (para bloquear estados)
  onSave: (data: { id?: string; nome: string; estados: string[] }) => Promise<unknown>;
  saving?: boolean;
}

export function RegiaoFormDialog({ open, onOpenChange, editing, outrasRegioes, onSave, saving }: Props) {
  const [nome, setNome] = useState('');
  const [estados, setEstados] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setNome(editing?.nome ?? '');
      setEstados(editing?.estados ?? []);
    }
  }, [open, editing]);

  const disabled: Record<string, string> = {};
  outrasRegioes.filter(r => r.id !== editing?.id).forEach(r => {
    r.estados.forEach(e => { disabled[e] = r.nome; });
  });

  const handleSave = async () => {
    if (!nome.trim() || estados.length === 0) return;
    await onSave({ id: editing?.id, nome: nome.trim(), estados });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 bg-black/90 border-white/10 backdrop-blur-xl text-white">
        <DialogHeader className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 border-b border-white/10 flex flex-row items-center gap-3 space-y-0">
          <div className="p-2.5 bg-primary/10 rounded-xl"><MapPinned className="h-5 w-5 text-primary" /></div>
          <div>
            <DialogTitle className="text-white">{editing ? 'Editar região' : 'Nova região'}</DialogTitle>
            <p className="text-xs text-white/50 mt-0.5">Defina o nome e clique nos estados do mapa para incluí-los na região.</p>
          </div>
        </DialogHeader>

        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <Label className="text-xs uppercase tracking-wider text-white/60">Nome da região *</Label>
            <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex.: Sudeste, Sul, Norte expandido"
              className="mt-1.5 bg-white/5 border-white/10 text-white placeholder:text-white/30" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs uppercase tracking-wider text-white/60">Estados</Label>
              <span className="text-xs text-white/50">{estados.length} selecionado{estados.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-2">
              <MapaEstadosBrasil value={estados} onChange={setEstados} disabledStates={disabled} height={460} />
            </div>
            {estados.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {estados.sort().map(uf => (
                  <span key={uf} className="px-2 py-0.5 rounded-md text-xs bg-blue-500/15 border border-blue-400/30 text-blue-200">{uf}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="bg-gradient-to-r from-muted/30 via-muted/10 to-transparent border-t border-white/10 p-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}
            className="border-dashed bg-background/80 border-white/20 text-white hover:bg-white/10">Cancelar</Button>
          <Button onClick={handleSave} disabled={!nome.trim() || estados.length === 0 || saving}
            className="bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            {saving ? 'Salvando...' : 'Salvar região'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}