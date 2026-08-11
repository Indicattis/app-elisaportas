import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Pencil, Check, X, Lock } from 'lucide-react';
import { useCategoriaDreConfig, type TipoDespesa } from '@/hooks/useCategoriaDreConfig';
import { useTiposCustos } from '@/hooks/useTiposCustos';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function TiposDreDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { tipos, debita, toggle, criarTipo, renomearTipo, excluirTipo, refetch } = useCategoriaDreConfig();
  const { tiposCustos, refetch: fetchTiposCustos } = useTiposCustos();

  const [novoOpen, setNovoOpen] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [novoDebita, setNovoDebita] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [editando, setEditando] = useState<string | null>(null);
  const [editNome, setEditNome] = useState('');

  const [excluir, setExcluir] = useState<TipoDespesa | null>(null);
  const [destinos, setDestinos] = useState<Record<string, string>>({});
  const [excluindo, setExcluindo] = useState(false);

  const contagem = useMemo(() => {
    const m: Record<string, number> = {};
    (tiposCustos || []).forEach((t: any) => { m[t.tipo] = (m[t.tipo] || 0) + 1; });
    return m;
  }, [tiposCustos]);

  const debitam = tipos.filter((s) => debita(s.chave)).length;
  const naoDebitam = tipos.length - debitam;

  const handleOpenChange = (v: boolean) => {
    if (!v) void refetch();
    onOpenChange(v);
  };

  const handleCriar = async () => {
    setSalvando(true);
    const ok = await criarTipo(novoNome.trim(), novoDebita);
    setSalvando(false);
    if (ok) { setNovoNome(''); setNovoDebita(true); setNovoOpen(false); }
  };

  const custosDoTipo = useMemo(
    () => (excluir ? (tiposCustos || []).filter((t: any) => t.tipo === excluir.chave) : []),
    [tiposCustos, excluir],
  );
  const qtdExcluir = custosDoTipo.length;
  const todosDefinidos = custosDoTipo.every((c: any) => !!destinos[c.id]);

  const handleExcluir = async () => {
    if (!excluir) return;
    setExcluindo(true);
    try {
      // Move cada custo para o destino escolhido individualmente
      const porDestino = new Map<string, string[]>();
      custosDoTipo.forEach((c: any) => {
        const d = destinos[c.id];
        if (!d) return;
        porDestino.set(d, [...(porDestino.get(d) || []), c.id]);
      });
      for (const [d, ids] of porDestino) {
        const { error } = await supabase.from('tipos_custos' as any).update({ tipo: d }).in('id', ids);
        if (error) throw error;
      }
      const ok = await excluirTipo(excluir.chave, null);
      if (ok) { setExcluir(null); setDestinos({}); void fetchTiposCustos(); }
    } catch (e: any) {
      toast.error('Erro ao mover custos: ' + (e?.message || e));
    } finally {
      setExcluindo(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-2xl bg-slate-950/90 backdrop-blur-xl border border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Tipos de Despesas</DialogTitle>
            <DialogDescription className="text-white/50">
              Gerencie as seções de despesa e defina quais são subtraídas do lucro líquido no DRE. A configuração é global e vale para todos os meses.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full bg-emerald-500/10 border border-emerald-400/30 text-emerald-200 text-xs">
              ● {debitam} debitam
            </span>
            <span className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full bg-amber-500/10 border border-amber-400/30 text-amber-200 text-xs">
              ○ {naoDebitam} não debitam
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setNovoOpen(true)}
              className="ml-auto h-7 bg-white/5 border-white/10 text-white hover:bg-white/10"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Novo tipo de despesa
            </Button>
          </div>

          <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-1">
            {tipos.map((s) => {
              const on = debita(s.chave);
              const qtd = contagem[s.chave] || 0;
              return (
                <div
                  key={s.chave}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10"
                >
                  {editando === s.chave ? (
                    <>
                      <Input
                        value={editNome}
                        autoFocus
                        onChange={(e) => setEditNome(e.target.value)}
                        className="flex-1 h-8 bg-white/5 border-white/10 text-white"
                      />
                      <button
                        onClick={async () => { await renomearTipo(s.chave, editNome); setEditando(null); }}
                        className="text-emerald-300 hover:text-emerald-200"
                        title="Salvar"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditando(null)} className="text-white/50 hover:text-white" title="Cancelar">
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="text-sm text-white flex-1 flex items-center gap-2">
                        {s.nome}
                        {s.sistema && <Lock className="w-3 h-3 text-white/30" />}
                        {qtd > 0 && (
                          <span className="text-[11px] text-white/40">{qtd} {qtd === 1 ? 'custo' : 'custos'}</span>
                        )}
                      </span>
                      <span
                        className={`hidden sm:inline-flex items-center h-7 px-3 rounded-full border text-xs ${
                          on
                            ? 'bg-emerald-500/10 border-emerald-400/30 text-emerald-200'
                            : 'bg-amber-500/10 border-amber-400/30 text-amber-200'
                        }`}
                      >
                        {on ? '● Debita DRE' : '○ Não debita'}
                      </span>
                      <Switch
                        checked={on}
                        onCheckedChange={() => void toggle(s.chave)}
                        className="data-[state=checked]:bg-emerald-500"
                      />
                      {!s.sistema && (
                        <>
                          <button
                            onClick={() => { setEditando(s.chave); setEditNome(s.nome); }}
                            className="text-white/40 hover:text-white"
                            title="Renomear"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => { setExcluir(s); setDestinos({}); }}
                            className="text-red-400/70 hover:text-red-300"
                            title="Excluir tipo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Novo tipo */}
      <Dialog open={novoOpen} onOpenChange={setNovoOpen}>
        <DialogContent className="max-w-md bg-slate-950/90 backdrop-blur-xl border border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Novo tipo de despesa</DialogTitle>
            <DialogDescription className="text-white/50">
              O tipo passa a aparecer como uma seção própria nas telas de despesas e no DRE.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              placeholder="Nome do tipo (ex.: Marketing)"
              className="bg-white/5 border-white/10 text-white"
            />
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10">
              <span className="text-sm text-white flex-1">Debita do lucro no DRE</span>
              <Switch checked={novoDebita} onCheckedChange={setNovoDebita} className="data-[state=checked]:bg-emerald-500" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNovoOpen(false)} className="text-white/60 hover:text-white">Cancelar</Button>
            <Button onClick={handleCriar} disabled={!novoNome.trim() || salvando} className="bg-blue-600 hover:bg-blue-500">
              {salvando ? 'Criando...' : 'Criar tipo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Excluir tipo */}
      <Dialog open={!!excluir} onOpenChange={(v) => { if (!v) setExcluir(null); }}>
        <DialogContent className="max-w-md bg-slate-950/90 backdrop-blur-xl border border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Excluir "{excluir?.nome}"</DialogTitle>
            <DialogDescription className="text-white/50">
              {qtdExcluir > 0
                ? `Existem ${qtdExcluir} tipo(s) de custo nesta seção. Escolha o destino de cada um.`
                : 'Nenhum custo está cadastrado nesta seção. A exclusão é definitiva.'}
            </DialogDescription>
          </DialogHeader>

          {qtdExcluir > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <label className="text-xs text-white/50 uppercase tracking-wider flex-1">Destino de cada custo</label>
                <select
                  value=""
                  onChange={(e) => {
                    const v = e.target.value;
                    if (!v) return;
                    setDestinos(Object.fromEntries(custosDoTipo.map((c: any) => [c.id, v])));
                  }}
                  className="h-8 rounded-lg bg-white/5 border border-white/10 px-2 text-xs text-white outline-none"
                >
                  <option value="" className="bg-slate-900">Aplicar a todos…</option>
                  {tipos
                    .filter((t) => t.chave !== excluir?.chave && t.chave !== 'folha')
                    .map((t) => (
                      <option key={t.chave} value={t.chave} className="bg-slate-900">{t.nome}</option>
                    ))}
                </select>
              </div>

              <div className="max-h-[45vh] overflow-y-auto space-y-2 pr-1">
                {custosDoTipo.map((c: any) => (
                  <div key={c.id} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10">
                    <span className="text-sm text-white flex-1 truncate" title={c.nome}>{c.nome}</span>
                    <select
                      value={destinos[c.id] || ''}
                      onChange={(e) => setDestinos((prev) => ({ ...prev, [c.id]: e.target.value }))}
                      className="h-8 w-44 rounded-lg bg-white/5 border border-white/10 px-2 text-xs text-white outline-none"
                    >
                      <option value="" className="bg-slate-900">— Selecione</option>
                      {tipos
                        .filter((t) => t.chave !== excluir?.chave && t.chave !== 'folha')
                        .map((t) => (
                          <option key={t.chave} value={t.chave} className="bg-slate-900">{t.nome}</option>
                        ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setExcluir(null)} className="text-white/60 hover:text-white">Cancelar</Button>
            <Button
              onClick={handleExcluir}
              disabled={excluindo || (qtdExcluir > 0 && !todosDefinidos)}
              className="bg-red-600 hover:bg-red-500"
            >
              {excluindo ? 'Excluindo...' : 'Excluir tipo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default TiposDreDialog;
