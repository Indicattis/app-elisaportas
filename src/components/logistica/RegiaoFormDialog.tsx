import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { MapaEstadosBrasil } from './MapaEstadosBrasil';
import { MapaMunicipiosEstado } from './MapaMunicipiosEstado';
import { useFreteCidadesPorEstado } from '@/hooks/useFreteCidadesPorEstado';
import type { FreteRegiao, FreteRegiaoCidade } from '@/hooks/useFreteRegioes';
import { MapPinned, ArrowLeft, X } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: FreteRegiao | null;
  outrasRegioes: FreteRegiao[];
  onSave: (data: { id?: string; nome: string; cidadeIds: string[] }) => Promise<unknown>;
  saving?: boolean;
}

export function RegiaoFormDialog({ open, onOpenChange, editing, outrasRegioes, onSave, saving }: Props) {
  const [nome, setNome] = useState('');
  // Mapa de cidades selecionadas: id -> { nome, estado }
  const [cidades, setCidades] = useState<Map<string, FreteRegiaoCidade>>(new Map());
  const [ufAberto, setUfAberto] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setNome(editing?.nome ?? '');
      const m = new Map<string, FreteRegiaoCidade>();
      (editing?.cidades ?? []).forEach(c => m.set(c.id, c));
      setCidades(m);
      setUfAberto(null);
    }
  }, [open, editing]);

  // Cidades já alocadas em OUTRAS regiões da mesma transportadora
  const disabledCidades = useMemo(() => {
    const map = new Map<string, string>();
    outrasRegioes.filter(r => r.id !== editing?.id).forEach(r => {
      r.cidades.forEach(c => map.set(c.id, r.nome));
    });
    return map;
  }, [outrasRegioes, editing?.id]);

  // Estados que já têm pelo menos uma cidade na região em edição
  const estadosDestacados = useMemo(() => {
    const s = new Set<string>();
    cidades.forEach(c => s.add(c.estado));
    return s;
  }, [cidades]);

  const cidadesPorEstado = useMemo(() => {
    const g: Record<string, FreteRegiaoCidade[]> = {};
    cidades.forEach(c => { (g[c.estado] ||= []).push(c); });
    Object.values(g).forEach(arr => arr.sort((a, b) => a.nome.localeCompare(b.nome)));
    return g;
  }, [cidades]);

  const cidadesValidasQuery = useFreteCidadesPorEstado(ufAberto ?? undefined);

  const handleSave = async () => {
    if (!nome.trim() || cidades.size === 0) return;
    await onSave({ id: editing?.id, nome: nome.trim(), cidadeIds: Array.from(cidades.keys()) });
    onOpenChange(false);
  };

  const toggleCidade = (c: FreteRegiaoCidade) => {
    setCidades(prev => {
      const next = new Map(prev);
      if (next.has(c.id)) next.delete(c.id); else next.set(c.id, c);
      return next;
    });
  };

  const removeCidade = (id: string) => {
    setCidades(prev => { const next = new Map(prev); next.delete(id); return next; });
  };

  const totalCidades = cidades.size;
  const ufsCount = Object.keys(cidadesPorEstado).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 bg-black/90 border-white/10 backdrop-blur-xl text-white">
        <DialogHeader className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 border-b border-white/10 flex flex-row items-center gap-3 space-y-0">
          <div className="p-2.5 bg-primary/10 rounded-xl"><MapPinned className="h-5 w-5 text-primary" /></div>
          <div className="flex-1">
            <DialogTitle className="text-white">{editing ? 'Editar região' : 'Nova região'}</DialogTitle>
            <p className="text-xs text-white/50 mt-0.5">
              {ufAberto
                ? `Clique nos municípios de ${ufAberto} para incluir na região.`
                : 'Defina o nome e clique em um estado para escolher as cidades.'}
            </p>
          </div>
        </DialogHeader>

        <div className="px-6 py-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {!ufAberto && (
            <div>
              <Label className="text-xs uppercase tracking-wider text-white/60">Nome da região *</Label>
              <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex.: Grande SP, Litoral PR, Triângulo MG"
                className="mt-1.5 bg-white/5 border-white/10 text-white placeholder:text-white/30" />
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs uppercase tracking-wider text-white/60">
                {ufAberto ? `Municípios de ${ufAberto}` : 'Estados — clique para escolher cidades'}
              </Label>
              <div className="flex items-center gap-2">
                {ufAberto && (
                  <Button size="sm" variant="ghost" onClick={() => setUfAberto(null)}
                    className="h-7 px-2 text-xs text-white/70 hover:text-white hover:bg-white/10">
                    <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Voltar ao Brasil
                  </Button>
                )}
                <span className="text-xs text-white/50">
                  {totalCidades} cidade{totalCidades !== 1 ? 's' : ''} · {ufsCount} UF{ufsCount !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-2">
              {ufAberto ? (
                <MapaMunicipiosEstado
                  estado={ufAberto}
                  cidadesValidas={cidadesValidasQuery.data ?? []}
                  selectedIds={new Set(Array.from(cidades.keys()))}
                  disabledIds={disabledCidades}
                  onToggle={(c) => toggleCidade({ id: c.id, nome: c.nome, estado: ufAberto })}
                  height={460}
                />
              ) : (
                <MapaEstadosBrasil
                  value={[]}
                  onStateClick={(uf) => setUfAberto(uf)}
                  highlightedStates={estadosDestacados}
                  height={460}
                />
              )}
            </div>

            {!ufAberto && totalCidades > 0 && (
              <div className="mt-3 space-y-2">
                {Object.entries(cidadesPorEstado)
                  .sort(([a],[b]) => a.localeCompare(b))
                  .map(([uf, lista]) => (
                  <div key={uf} className="rounded-lg border border-white/10 bg-white/[0.02] p-2">
                    <div className="flex items-center justify-between mb-1.5 px-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-blue-500/15 border border-blue-400/30 text-blue-200">{uf}</span>
                        <span className="text-[11px] text-white/50">{lista.length} cidade{lista.length !== 1 ? 's' : ''}</span>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => setUfAberto(uf)}
                        className="h-6 px-2 text-[11px] text-white/60 hover:text-white hover:bg-white/10">
                        editar
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {lista.map(c => (
                        <span key={c.id} className="group inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-white/5 border border-white/10 text-white/80">
                          {c.nome}
                          <button onClick={() => removeCidade(c.id)} className="opacity-50 hover:opacity-100">
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="bg-gradient-to-r from-muted/30 via-muted/10 to-transparent border-t border-white/10 p-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}
            className="border-dashed bg-background/80 border-white/20 text-white hover:bg-white/10">Cancelar</Button>
          <Button onClick={handleSave} disabled={!nome.trim() || totalCidades === 0 || saving}
            className="bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            {saving ? 'Salvando...' : 'Salvar região'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}