import { useState } from 'react';
import { Plus, Trash2, Users, Receipt, TrendingDown } from 'lucide-react';
import { MinimalistLayout } from '@/components/MinimalistLayout';
import { formatCurrency } from '@/lib/utils';
import { useDespesasPadrao, type DespesaPadrao, type DespesaPadraoTipo } from '@/hooks/useDespesasPadrao';

function calcTotalFolha(f: { salario: number; aux_combustivel: number; insalubridade_pct: number; fgts_pct: number; previsao_13_valor: number }) {
  const insalub = f.salario * (f.insalubridade_pct || 0) / 100;
  const fgts = f.salario * (f.fgts_pct || 0) / 100;
  const ferias = f.salario / 3 + fgts;
  return f.salario + f.aux_combustivel + insalub + fgts + f.previsao_13_valor + ferias;
}

export default function EstrategiaDespesasConfiguracoes() {
  const { items, loading, insert, update, remove } = useDespesasPadrao();

  const folha = items.filter(i => i.tipo === 'folha');
  const fixas = items.filter(i => i.tipo === 'fixa');
  const variaveis = items.filter(i => i.tipo === 'variavel');

  return (
    <MinimalistLayout
      title="Configurações padrão"
      subtitle="Valores que pré-preenchem as despesas de cada mês"
      backPath="/direcao/estrategia/despesas"
      fullWidth
      breadcrumbItems={[
        { label: 'Home', path: '/home' },
        { label: 'Direção', path: '/direcao' },
        { label: 'Estratégia', path: '/direcao/estrategia' },
        { label: 'Despesas', path: '/direcao/estrategia/despesas' },
        { label: 'Configurações padrão' },
      ]}
    >
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 animate-spin rounded-full border-2 border-white/20 border-t-white/60" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          <FolhaBlock items={folha} insert={insert} update={update} remove={remove} />
          <SimpleBlock
            titulo="Despesas Fixas padrão"
            icon={<Receipt className="w-4 h-4" />}
            tipo="fixa"
            items={fixas}
            insert={insert}
            update={update}
            remove={remove}
          />
          <SimpleBlock
            titulo="Despesas Variáveis padrão"
            icon={<TrendingDown className="w-4 h-4" />}
            tipo="variavel"
            items={variaveis}
            insert={insert}
            update={update}
            remove={remove}
          />
        </div>
      )}
    </MinimalistLayout>
  );
}

/* ---------------- Folha ---------------- */

function FolhaBlock({
  items, insert, update, remove,
}: {
  items: DespesaPadrao[];
  insert: ReturnType<typeof useDespesasPadrao>['insert'];
  update: ReturnType<typeof useDespesasPadrao>['update'];
  remove: ReturnType<typeof useDespesasPadrao>['remove'];
}) {
  const [nome, setNome] = useState('');
  const [salario, setSalario] = useState(0);
  const [aux, setAux] = useState(0);
  const [insalub, setInsalub] = useState(0);
  const [fgts, setFgts] = useState(8);
  const [prev13, setPrev13] = useState(0);

  const reset = () => { setNome(''); setSalario(0); setAux(0); setInsalub(0); setFgts(8); setPrev13(0); };

  const save = async () => {
    if (!nome.trim()) return;
    const ok = await insert({
      tipo: 'folha', nome: nome.trim(),
      salario, aux_combustivel: aux, insalubridade_pct: insalub, fgts_pct: fgts, previsao_13_valor: prev13,
    });
    if (ok) reset();
  };

  const total = items.reduce((s, i) => s + calcTotalFolha(i), 0);

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-5">
      <div className="flex items-center gap-2 text-white mb-3">
        <Users className="w-4 h-4" />
        <h3 className="font-semibold">Folha Salarial padrão</h3>
        <span className="text-white/40 text-sm">({items.length})</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-white/40 border-b border-white/10">
              <th className="text-left font-normal pb-2 pl-1">Colaborador</th>
              <th className="text-right font-normal pb-2 px-2">Salário</th>
              <th className="text-right font-normal pb-2 px-2">Combustível</th>
              <th className="text-right font-normal pb-2 px-2">Insalub %</th>
              <th className="text-right font-normal pb-2 px-2">FGTS %</th>
              <th className="text-right font-normal pb-2 px-2">Previsão 13°</th>
              <th className="text-right font-normal pb-2 px-2">Total</th>
              <th className="pb-2 pr-1 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {items.map(i => (
              <FolhaRow key={i.id} item={i} update={update} remove={remove} />
            ))}
            <tr className="border-b border-white/5">
              <td className="py-2 pl-1">
                <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do colaborador"
                  className="w-full h-8 bg-white/5 border border-white/10 rounded px-2 text-white text-xs outline-none focus:border-blue-400/50" />
              </td>
              <td className="px-2"><NumCell value={salario} onChange={setSalario} /></td>
              <td className="px-2"><NumCell value={aux} onChange={setAux} /></td>
              <td className="px-2"><NumCell value={insalub} onChange={setInsalub} /></td>
              <td className="px-2"><NumCell value={fgts} onChange={setFgts} /></td>
              <td className="px-2"><NumCell value={prev13} onChange={setPrev13} /></td>
              <td className="px-2 text-right text-white/60 text-xs">{formatCurrency(calcTotalFolha({ salario, aux_combustivel: aux, insalubridade_pct: insalub, fgts_pct: fgts, previsao_13_valor: prev13 }))}</td>
              <td className="pr-1 text-right">
                <button onClick={save} disabled={!nome.trim()}
                  className="p-1 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-30">
                  <Plus className="w-4 h-4" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between px-2">
        <span className="text-xs text-white/50 uppercase tracking-wider">Total mensal estimado</span>
        <span className="text-base font-bold text-white">{formatCurrency(total)}</span>
      </div>
    </div>
  );
}

function FolhaRow({
  item, update, remove,
}: {
  item: DespesaPadrao;
  update: ReturnType<typeof useDespesasPadrao>['update'];
  remove: ReturnType<typeof useDespesasPadrao>['remove'];
}) {
  const patch = (field: keyof DespesaPadrao, value: number) => update(item.id, { [field]: value } as any);
  const total = calcTotalFolha(item);
  return (
    <tr className="border-b border-white/5 hover:bg-white/[0.03]">
      <td className="py-2 pl-1 text-white/90">
        <InlineText value={item.nome} onSave={(v) => update(item.id, { nome: v })} />
      </td>
      <td className="px-2 text-right text-emerald-400 font-medium"><InlineNum value={item.salario} onSave={(v) => patch('salario', v)} format="currency" /></td>
      <td className="px-2 text-right text-white/60"><InlineNum value={item.aux_combustivel} onSave={(v) => patch('aux_combustivel', v)} format="currency" /></td>
      <td className="px-2 text-right text-white/60"><InlineNum value={item.insalubridade_pct} onSave={(v) => patch('insalubridade_pct', v)} format="percent" /></td>
      <td className="px-2 text-right text-white/60"><InlineNum value={item.fgts_pct} onSave={(v) => patch('fgts_pct', v)} format="percent" /></td>
      <td className="px-2 text-right text-white/60"><InlineNum value={item.previsao_13_valor} onSave={(v) => patch('previsao_13_valor', v)} format="currency" /></td>
      <td className="px-2 text-right text-white font-medium">{formatCurrency(total)}</td>
      <td className="pr-1 text-right">
        <button onClick={() => remove(item.id)} className="p-1 rounded hover:bg-red-500/20 text-red-300/70 hover:text-red-300">
          <Trash2 className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
}

/* ---------------- Simple (fixa/variavel) ---------------- */

function SimpleBlock({
  titulo, icon, tipo, items, insert, update, remove,
}: {
  titulo: string;
  icon: React.ReactNode;
  tipo: DespesaPadraoTipo;
  items: DespesaPadrao[];
  insert: ReturnType<typeof useDespesasPadrao>['insert'];
  update: ReturnType<typeof useDespesasPadrao>['update'];
  remove: ReturnType<typeof useDespesasPadrao>['remove'];
}) {
  const [nome, setNome] = useState('');
  const [valor, setValor] = useState(0);
  const total = items.reduce((s, i) => s + Number(i.valor || 0), 0);

  const save = async () => {
    if (!nome.trim()) return;
    const ok = await insert({ tipo, nome: nome.trim(), valor });
    if (ok) { setNome(''); setValor(0); }
  };

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-5">
      <div className="flex items-center gap-2 text-white mb-3">
        {icon}
        <h3 className="font-semibold">{titulo}</h3>
        <span className="text-white/40 text-sm">({items.length})</span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[10px] uppercase tracking-wider text-white/40 border-b border-white/10">
            <th className="text-left font-normal pb-2 pl-1">Despesa</th>
            <th className="text-right font-normal pb-2 px-2 w-[180px]">Valor padrão</th>
            <th className="pb-2 pr-1 w-10"></th>
          </tr>
        </thead>
        <tbody>
          {items.map(i => (
            <tr key={i.id} className="border-b border-white/5 hover:bg-white/[0.03]">
              <td className="py-2 pl-1 text-white/90">
                <InlineText value={i.nome} onSave={(v) => update(i.id, { nome: v })} />
              </td>
              <td className="px-2 text-right text-white font-medium">
                <InlineNum value={i.valor} onSave={(v) => update(i.id, { valor: v })} format="currency" />
              </td>
              <td className="pr-1 text-right">
                <button onClick={() => remove(i.id)} className="p-1 rounded hover:bg-red-500/20 text-red-300/70 hover:text-red-300">
                  <Trash2 className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
          <tr className="border-b border-white/5">
            <td className="py-2 pl-1">
              <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome da despesa"
                className="w-full h-8 bg-white/5 border border-white/10 rounded px-2 text-white text-xs outline-none focus:border-blue-400/50" />
            </td>
            <td className="px-2"><NumCell value={valor} onChange={setValor} /></td>
            <td className="pr-1 text-right">
              <button onClick={save} disabled={!nome.trim()}
                className="p-1 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-30">
                <Plus className="w-4 h-4" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between px-2">
        <span className="text-xs text-white/50 uppercase tracking-wider">Total mensal estimado</span>
        <span className="text-base font-bold text-white">{formatCurrency(total)}</span>
      </div>
    </div>
  );
}

/* ---------------- Inline editors ---------------- */

function NumCell({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <input type="number" step="0.01" value={value || ''}
      onChange={(e) => onChange(Number(e.target.value) || 0)}
      onFocus={(e) => e.currentTarget.select()}
      placeholder="0"
      className="w-full h-8 bg-white/5 border border-white/10 rounded px-2 text-white text-xs text-right outline-none focus:border-blue-400/50" />
  );
}

function InlineText({ value, onSave }: { value: string; onSave: (v: string) => void | Promise<any> }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  if (editing) {
    return (
      <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)}
        onBlur={() => { setEditing(false); if (draft !== value && draft.trim()) onSave(draft.trim()); }}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') { setDraft(value); setEditing(false); } }}
        className="w-full bg-white/10 border border-blue-400/50 rounded px-1 py-0.5 text-white text-sm outline-none" />
    );
  }
  return (
    <button onClick={() => { setDraft(value); setEditing(true); }} className="w-full text-left px-1 py-0.5 rounded hover:bg-white/10">
      {value}
    </button>
  );
}

function InlineNum({ value, onSave, format }: { value: number; onSave: (v: number) => void | Promise<any>; format: 'currency' | 'percent' }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value ?? 0));
  const display = format === 'currency' ? formatCurrency(Number(value) || 0) : `${(Number(value) || 0).toFixed(2)}%`;
  if (editing) {
    return (
      <input autoFocus type="number" step="0.01" value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={(e) => e.currentTarget.select()}
        onBlur={() => {
          setEditing(false);
          const parsed = Number(String(draft).replace(',', '.'));
          if (!Number.isNaN(parsed) && parsed !== Number(value)) onSave(parsed);
        }}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') { setDraft(String(value)); setEditing(false); } }}
        className="w-full bg-white/10 border border-blue-400/50 rounded px-1 py-0.5 text-right text-white text-sm outline-none" />
    );
  }
  return (
    <button onClick={() => { setDraft(String(value)); setEditing(true); }} className="w-full text-right px-1 py-0.5 rounded hover:bg-white/10">
      {display}
    </button>
  );
}