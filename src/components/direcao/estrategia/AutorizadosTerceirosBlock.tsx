import { useMemo, useState } from 'react';
import { Plus, Trash2, Truck, Check, X } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useAutorizadosTerceiros, usePagamentosAutorizadosMes, type AutorizadoTerceiro } from '@/hooks/useAutorizadosTerceiros';
import { useFretesCidades, type FreteCidade } from '@/hooks/useFretesCidades';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface Props {
  mode: 'config' | 'mes';
  mesReferencia?: string | null;
}

export function AutorizadosTerceirosBlock({ mode, mesReferencia }: Props) {
  const readOnly = mode === 'mes';
  const { autorizados, isLoading, create, update, remove } = useAutorizadosTerceiros();
  const { fretes = [] } = useFretesCidades();
  const { byAutorizado, upsert } = usePagamentosAutorizadosMes(mode === 'mes' ? (mesReferencia ?? null) : null);

  const [addOpen, setAddOpen] = useState(false);
  const [nome, setNome] = useState('');
  const [cidadeQuery, setCidadeQuery] = useState('');
  const [cidadeSel, setCidadeSel] = useState<FreteCidade | null>(null);

  const reset = () => { setNome(''); setCidadeQuery(''); setCidadeSel(null); };

  const handleCreate = async () => {
    if (!nome.trim() || !cidadeSel) return;
    await create.mutateAsync({
      nome: nome.trim(),
      cidade: cidadeSel.cidade,
      estado: cidadeSel.estado,
      quilometragem: cidadeSel.quilometragem,
      valor_estipulado: Number(cidadeSel.valor_frete) || 0,
    });
    reset();
    setAddOpen(false);
  };

  const totalEstipulado = autorizados.reduce((s, a) => s + Number(a.valor_estipulado || 0), 0);
  const totalPago = autorizados.reduce(
    (s, a) => s + Number(byAutorizado[a.id]?.valor_pago || 0),
    0,
  );

  // Grid: Nome(28%) Cidade/UF(22%) KM(12%) Estipulado(15%) Pago(15%) Ações(8%)
  const gridCols = 'grid-cols-[28%_22%_12%_15%_15%_8%]';

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-5">
      <div className="flex items-center gap-2 text-white mb-3">
        <Truck className="w-4 h-4" />
        <h3 className="font-semibold">Pagamentos de Autorizados Terceiros</h3>
        <span className="text-white/40 text-sm">({autorizados.length})</span>
        {!readOnly && (
          <button
            onClick={() => setAddOpen(true)}
            className="ml-auto inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/30 text-xs text-emerald-200 hover:text-emerald-100 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Novo autorizado
          </button>
        )}
      </div>

      {/* Header */}
      <div className={`grid ${gridCols} gap-2 px-2 py-1.5 text-[11px] uppercase tracking-wide text-white/40`}>
        <div>Nome</div>
        <div>Cidade / UF</div>
        <div className="text-right">KM</div>
        <div className="text-right">Valor estipulado</div>
        <div className="text-right">Valor pago</div>
        <div></div>
      </div>

      <div className="space-y-1">
        {isLoading ? (
          <div className="text-center py-6 text-sm text-white/50">Carregando...</div>
        ) : autorizados.length === 0 ? (
          <div className="text-center py-6 text-sm text-white/40">
            Nenhum autorizado cadastrado
          </div>
        ) : (
          autorizados.map((a) => (
            <Row
              key={a.id}
              autorizado={a}
              gridCols={gridCols}
              readOnly={readOnly}
              fretes={fretes}
              valorPago={Number(byAutorizado[a.id]?.valor_pago || 0)}
              onUpdateNome={(nome) => update.mutate({ id: a.id, nome })}
              onUpdateCidade={(c) =>
                update.mutate({
                  id: a.id,
                  cidade: c.cidade,
                  estado: c.estado,
                  quilometragem: c.quilometragem,
                  valor_estipulado: Number(c.valor_frete) || 0,
                })
              }
              onUpdatePago={(v) => upsert.mutate({ autorizadoId: a.id, valorPago: v })}
              onRemove={() => {
                if (confirm(`Remover ${a.nome}?`)) remove.mutate(a.id);
              }}
            />
          ))
        )}
      </div>

      {autorizados.length > 0 && (
        <div className={`grid ${gridCols} gap-2 px-2 py-2 mt-1 border-t border-white/10 text-xs text-white/70`}>
          <div className="font-medium">Total</div>
          <div></div>
          <div></div>
          <div className="text-right font-semibold text-white">{formatCurrency(totalEstipulado)}</div>
          <div className="text-right font-semibold text-emerald-300">
            {mode === 'mes' ? formatCurrency(totalPago) : '—'}
          </div>
          <div></div>
        </div>
      )}

      {/* Add dialog (inline popover style) */}
      {addOpen && (
        <div className="mt-3 p-3 rounded-lg bg-white/5 border border-white/10 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input
              autoFocus
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome do autorizado"
              className="h-9 bg-white/5 border border-white/10 rounded px-3 text-white text-sm outline-none focus:border-blue-400/50"
            />
            <CidadeAutocomplete
              fretes={fretes}
              query={cidadeQuery}
              setQuery={setCidadeQuery}
              selected={cidadeSel}
              setSelected={(c) => { setCidadeSel(c); setCidadeQuery(`${c.cidade} / ${c.estado}`); }}
            />
          </div>
          {cidadeSel && (
            <div className="text-xs text-white/60">
              KM: <span className="text-white/80">{cidadeSel.quilometragem ?? '—'}</span>
              {' · '}
              Valor estipulado: <span className="text-white/80">{formatCurrency(Number(cidadeSel.valor_frete) || 0)}</span>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button
              onClick={() => { reset(); setAddOpen(false); }}
              className="h-8 px-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white/70"
            >
              Cancelar
            </button>
            <button
              onClick={handleCreate}
              disabled={!nome.trim() || !cidadeSel || create.isPending}
              className="h-8 px-3 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/30 text-xs text-emerald-100 disabled:opacity-40"
            >
              Salvar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({
  autorizado, gridCols, readOnly, fretes, valorPago,
  onUpdateNome, onUpdateCidade, onUpdatePago, onRemove,
}: {
  autorizado: AutorizadoTerceiro;
  gridCols: string;
  readOnly: boolean;
  fretes: FreteCidade[];
  valorPago: number;
  onUpdateNome: (v: string) => void;
  onUpdateCidade: (c: FreteCidade) => void;
  onUpdatePago: (v: number) => void;
  onRemove: () => void;
}) {
  return (
    <div className={`grid ${gridCols} gap-2 px-2 py-1.5 items-center rounded hover:bg-white/[0.03] text-sm text-white/85`}>
      <div>
        {readOnly ? (
          <span>{autorizado.nome}</span>
        ) : (
          <InlineText value={autorizado.nome} onSave={onUpdateNome} />
        )}
      </div>
      <div className="text-white/70">
        {readOnly ? (
          <span>{autorizado.cidade} / {autorizado.estado}</span>
        ) : (
          <CidadeInlineEdit
            current={`${autorizado.cidade} / ${autorizado.estado}`}
            fretes={fretes}
            onSelect={onUpdateCidade}
          />
        )}
      </div>
      <div className="text-right text-white/70">{autorizado.quilometragem ?? '—'}</div>
      <div className="text-right">{formatCurrency(Number(autorizado.valor_estipulado) || 0)}</div>
      <div className="text-right">
        {readOnly ? (
          <InlineCurrency value={valorPago} onSave={onUpdatePago} />
        ) : (
          <span className="text-white/40">—</span>
        )}
      </div>
      <div className="flex justify-end">
        {!readOnly && (
          <button
            onClick={onRemove}
            className="h-7 w-7 inline-flex items-center justify-center rounded text-white/40 hover:text-red-300 hover:bg-red-500/10"
            title="Remover"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

function InlineText({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [v, setV] = useState(value);
  return (
    <input
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => { if (v !== value) onSave(v); }}
      className="w-full h-7 bg-transparent border border-transparent hover:border-white/10 focus:border-blue-400/50 rounded px-1.5 text-sm text-white outline-none"
    />
  );
}

function InlineCurrency({ value, onSave }: { value: number; onSave: (v: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(value);
  if (!editing) {
    return (
      <button
        onClick={() => { setV(value); setEditing(true); }}
        className={`tabular-nums px-2 py-0.5 rounded hover:bg-white/10 transition-colors ${value > 0 ? 'text-emerald-300' : 'text-white/40'}`}
      >
        {value > 0 ? formatCurrency(value) : 'Lançar'}
      </button>
    );
  }
  return (
    <input
      autoFocus
      type="number"
      step="0.01"
      value={v}
      onChange={(e) => setV(Number(e.target.value))}
      onBlur={() => { setEditing(false); if (v !== value) onSave(v); }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); }
        if (e.key === 'Escape') { setEditing(false); setV(value); }
      }}
      className="w-full h-7 bg-white/5 border border-blue-400/40 rounded px-2 text-sm text-white text-right outline-none tabular-nums"
    />
  );
}

function CidadeAutocomplete({
  fretes, query, setQuery, selected, setSelected,
}: {
  fretes: FreteCidade[];
  query: string;
  setQuery: (v: string) => void;
  selected: FreteCidade | null;
  setSelected: (c: FreteCidade) => void;
}) {
  const [open, setOpen] = useState(false);
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return fretes
      .filter((f) => f.ativo && (f.cidade.toLowerCase().includes(q) || f.estado.toLowerCase().includes(q)))
      .slice(0, 8);
  }, [fretes, query]);
  return (
    <Popover open={open && results.length > 0} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Cidade (digite para buscar)"
          className="h-9 bg-white/5 border border-white/10 rounded px-3 text-white text-sm outline-none focus:border-blue-400/50"
        />
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[320px] bg-slate-900 border-white/10" align="start">
        <div className="max-h-64 overflow-auto">
          {results.map((f) => (
            <button
              key={f.id}
              onClick={() => { setSelected(f); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm text-white/80 hover:bg-white/10 flex justify-between items-center"
            >
              <span>{f.cidade} <span className="text-white/40">/ {f.estado}</span></span>
              <span className="text-xs text-white/40">{f.quilometragem ?? '—'} km</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function CidadeInlineEdit({
  current, fretes, onSelect,
}: {
  current: string;
  fretes: FreteCidade[];
  onSelect: (c: FreteCidade) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="text-left text-white/70 hover:text-white px-1.5 py-0.5 rounded hover:bg-white/5">
          {current}
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-2 w-[320px] bg-slate-900 border-white/10" align="start">
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar cidade..."
          className="w-full h-8 bg-white/5 border border-white/10 rounded px-2 text-sm text-white outline-none focus:border-blue-400/50 mb-2"
        />
        <div className="max-h-56 overflow-auto">
          {fretes
            .filter((f) => f.ativo && (query.length < 2 || f.cidade.toLowerCase().includes(query.toLowerCase()) || f.estado.toLowerCase().includes(query.toLowerCase())))
            .slice(0, 10)
            .map((f) => (
              <button
                key={f.id}
                onClick={() => { onSelect(f); setOpen(false); setQuery(''); }}
                className="w-full text-left px-2 py-1.5 text-sm text-white/80 hover:bg-white/10 rounded flex justify-between"
              >
                <span>{f.cidade} <span className="text-white/40">/ {f.estado}</span></span>
                <span className="text-xs text-white/40">{f.quilometragem ?? '—'} km</span>
              </button>
            ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}