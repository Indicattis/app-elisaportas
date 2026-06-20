import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { MapaEstadosBrasil } from './MapaEstadosBrasil';
import { MapaMunicipiosEstado, normalizeCity } from './MapaMunicipiosEstado';
import { useFreteCidadesPorEstado } from '@/hooks/useFreteCidadesPorEstado';
import { useMacroRegioesBrasil, type MacroRegiao } from '@/hooks/useMacroRegioesBrasil';
import { useMesorregioesEstado, type Mesorregiao } from '@/hooks/useMesorregioesEstado';
import { supabase } from '@/integrations/supabase/client';
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
  const macroRegioesQuery = useMacroRegioesBrasil();
  const mesoRegioesQuery = useMesorregioesEstado(ufAberto ?? undefined);

  // Para cada meso do estado aberto, computa cidades disponíveis (cadastradas em frete_cidades, não bloqueadas)
  const mesoDisponiveis = useMemo(() => {
    const out: Record<number, FreteRegiaoCidade[]> = {};
    if (!ufAberto || !mesoRegioesQuery.data) return out;
    const validas = cidadesValidasQuery.data ?? [];
    const byNorm = new Map<string, { id: string; nome: string }>();
    validas.forEach(c => byNorm.set(normalizeCity(c.nome), { id: c.id, nome: c.nome }));
    mesoRegioesQuery.data.forEach(m => {
      const lista: FreteRegiaoCidade[] = [];
      m.municipiosNorm.forEach(n => {
        const ref = byNorm.get(n);
        if (ref && !disabledCidades.has(ref.id)) {
          lista.push({ id: ref.id, nome: ref.nome, estado: ufAberto });
        }
      });
      out[m.id] = lista;
    });
    return out;
  }, [ufAberto, mesoRegioesQuery.data, cidadesValidasQuery.data, disabledCidades]);

  const mesoStatus = useMemo(() => {
    const out: Record<number, 'none' | 'partial' | 'all'> = {};
    Object.entries(mesoDisponiveis).forEach(([id, lista]) => {
      if (lista.length === 0) { out[+id] = 'none'; return; }
      const sel = lista.filter(c => cidades.has(c.id)).length;
      out[+id] = sel === 0 ? 'none' : sel === lista.length ? 'all' : 'partial';
    });
    return out;
  }, [mesoDisponiveis, cidades]);

  const handleMesoClick = (meso: Mesorregiao) => {
    const lista = mesoDisponiveis[meso.id] ?? [];
    if (lista.length === 0) return;
    const todasJaSelecionadas = lista.every(c => cidades.has(c.id));
    setCidades(prev => {
      const next = new Map(prev);
      if (todasJaSelecionadas) lista.forEach(c => next.delete(c.id));
      else lista.forEach(c => next.set(c.id, c));
      return next;
    });
  };

  // Cache de cidades por UF carregadas via botão de macrorregião
  const [ufCidadesCache, setUfCidadesCache] = useState<Record<string, FreteRegiaoCidade[]>>({});
  const [loadingMacro, setLoadingMacro] = useState<MacroRegiao['sigla'] | null>(null);

  const fetchCidadesParaUfs = async (ufs: string[]): Promise<Record<string, FreteRegiaoCidade[]>> => {
    const faltando = ufs.filter(u => !ufCidadesCache[u]);
    if (faltando.length === 0) return ufCidadesCache;
    const { data, error } = await supabase
      .from('frete_cidades')
      .select('id, cidade, estado')
      .in('estado', faltando)
      .eq('ativo', true);
    if (error) throw error;
    const novo: Record<string, FreteRegiaoCidade[]> = { ...ufCidadesCache };
    faltando.forEach(u => (novo[u] = []));
    (data ?? []).forEach(c => {
      novo[c.estado] = novo[c.estado] || [];
      novo[c.estado].push({ id: c.id, nome: c.cidade, estado: c.estado });
    });
    setUfCidadesCache(novo);
    return novo;
  };

  const handleMacroClick = async (regiao: MacroRegiao) => {
    setLoadingMacro(regiao.sigla);
    try {
      const cache = await fetchCidadesParaUfs(regiao.ufs);
      const disponiveis: FreteRegiaoCidade[] = [];
      regiao.ufs.forEach(u => (cache[u] ?? []).forEach(c => {
        if (!disabledCidades.has(c.id)) disponiveis.push(c);
      }));
      if (disponiveis.length === 0) return;
      const todasJaSelecionadas = disponiveis.every(c => cidades.has(c.id));
      setCidades(prev => {
        const next = new Map(prev);
        if (todasJaSelecionadas) {
          disponiveis.forEach(c => next.delete(c.id));
        } else {
          disponiveis.forEach(c => next.set(c.id, c));
        }
        return next;
      });
    } finally {
      setLoadingMacro(null);
    }
  };

  // Status de cada botão de macrorregião (none | partial | all)
  const macroStatus = useMemo(() => {
    const out: Record<string, { status: 'none' | 'partial' | 'all'; total: number }> = {};
    (macroRegioesQuery.data ?? []).forEach(r => {
      const todas: FreteRegiaoCidade[] = [];
      r.ufs.forEach(u => (ufCidadesCache[u] ?? []).forEach(c => {
        if (!disabledCidades.has(c.id)) todas.push(c);
      }));
      if (todas.length === 0) { out[r.sigla] = { status: 'none', total: 0 }; return; }
      const sel = todas.filter(c => cidades.has(c.id)).length;
      const status = sel === 0 ? 'none' : sel === todas.length ? 'all' : 'partial';
      out[r.sigla] = { status, total: todas.length };
    });
    return out;
  }, [macroRegioesQuery.data, ufCidadesCache, cidades, disabledCidades]);

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

            {!ufAberto && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {(macroRegioesQuery.data ?? []).map(r => {
                  const st = macroStatus[r.sigla] ?? { status: 'none' as const, total: 0 };
                  const base = 'h-7 px-3 text-[11px] rounded-full border transition-all';
                  const cls =
                    st.status === 'all'
                      ? 'bg-blue-500/30 border-blue-400/50 text-blue-100 hover:bg-blue-500/40'
                      : st.status === 'partial'
                      ? 'bg-blue-500/10 border-blue-400/40 text-blue-200 hover:bg-blue-500/20'
                      : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white';
                  return (
                    <button
                      key={r.sigla}
                      type="button"
                      onClick={() => handleMacroClick(r)}
                      disabled={loadingMacro !== null}
                      title={`${r.nome} — ${r.ufs.join(', ')}`}
                      className={`${base} ${cls} disabled:opacity-50`}
                    >
                      {loadingMacro === r.sigla ? '...' : r.nome}
                    </button>
                  );
                })}
                <span className="ml-1 text-[10px] text-white/40 self-center">
                  clique para incluir/remover todas as cidades cadastradas da região
                </span>
              </div>
            )}

            {ufAberto && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {mesoRegioesQuery.isLoading && (
                  <span className="text-[11px] text-white/40">Carregando mesorregiões…</span>
                )}
                {(mesoRegioesQuery.data ?? []).map(m => {
                  const total = (mesoDisponiveis[m.id] ?? []).length;
                  const status = mesoStatus[m.id] ?? 'none';
                  const base = 'h-7 px-3 text-[11px] rounded-full border transition-all';
                  const cls =
                    status === 'all'
                      ? 'bg-blue-500/30 border-blue-400/50 text-blue-100 hover:bg-blue-500/40'
                      : status === 'partial'
                      ? 'bg-blue-500/10 border-blue-400/40 text-blue-200 hover:bg-blue-500/20'
                      : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white';
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handleMesoClick(m)}
                      disabled={total === 0}
                      title={`${m.nome} — ${total} cidade${total !== 1 ? 's' : ''} cadastrada${total !== 1 ? 's' : ''}`}
                      className={`${base} ${cls} disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                      {m.nome}
                      {total > 0 && <span className="ml-1.5 opacity-60">({total})</span>}
                    </button>
                  );
                })}
                {mesoRegioesQuery.data && mesoRegioesQuery.data.length > 0 && (
                  <span className="ml-1 text-[10px] text-white/40 self-center">
                    clique para incluir/remover as cidades da mesorregião
                  </span>
                )}
              </div>
            )}

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