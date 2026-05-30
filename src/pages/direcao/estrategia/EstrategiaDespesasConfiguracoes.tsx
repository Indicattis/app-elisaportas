import { useState, useRef } from 'react';
import { Plus, Trash2, Users, Receipt, TrendingDown, Landmark, FileDown } from 'lucide-react';
import { MinimalistLayout } from '@/components/MinimalistLayout';
import { formatCurrency } from '@/lib/utils';
import { useDespesasPadrao, type DespesaPadrao, type DespesaPadraoTipo } from '@/hooks/useDespesasPadrao';
import { useTiposCustos, type TipoCusto } from '@/hooks/useTiposCustos';
import { Switch } from '@/components/ui/switch';
import { exportFolhaSalarialPDF } from '@/utils/folhaSalarialPDFGenerator';
import { useSetores, getSetorPalette } from '@/hooks/useSetores';

export default function EstrategiaDespesasConfiguracoes() {
  const { items, loading, insert, update, remove } = useDespesasPadrao();
  const {
    tiposCustos, loading: loadingTipos,
    saveTipoCusto, updateTipoCusto, deleteTipoCusto,
  } = useTiposCustos();

  // Only show full-page spinner on the very first load. Subsequent refetches
  // (triggered by insert/update/remove) must NOT unmount the grid, otherwise
  // the page scroll resets to the top after every change.
  const firstLoadedRef = useRef(false);
  if (!loading && !loadingTipos) firstLoadedRef.current = true;
  const showSpinner = !firstLoadedRef.current && (loading || loadingTipos);

  const folha = items.filter(i => i.tipo === 'folha');
  const impostos = items.filter(i => i.tipo === 'imposto');
  const tiposFixas = tiposCustos.filter(t => t.tipo === 'fixa');
  const tiposVariaveis = tiposCustos.filter(t => t.tipo === 'variavel');

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
      {showSpinner ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 animate-spin rounded-full border-2 border-white/20 border-t-white/60" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          <FolhaBlock items={folha} insert={insert} update={update} remove={remove} />
          <TiposCustoBlock
            titulo="Tipos de Custos — Fixas"
            icon={<Receipt className="w-4 h-4" />}
            tipo="fixa"
            items={tiposFixas}
            save={saveTipoCusto}
            update={updateTipoCusto}
            remove={deleteTipoCusto}
          />
          <TiposCustoBlock
            titulo="Tipos de Custos — Variáveis"
            icon={<TrendingDown className="w-4 h-4" />}
            tipo="variavel"
            items={tiposVariaveis}
            save={saveTipoCusto}
            update={updateTipoCusto}
            remove={deleteTipoCusto}
          />
          <SimpleBlock
            titulo="Despesas de Imposto padrão"
            icon={<Landmark className="w-4 h-4" />}
            tipo="imposto"
            items={impostos}
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

type SetorMeta = { value: string; label: string; color: string; dot: string };
const SETOR_SEM: SetorMeta = { value: '', label: 'Sem setor', color: 'bg-white/5 border-white/15 text-white/60', dot: 'bg-white/40' };

function useSetoresMeta(): SetorMeta[] {
  const { setores } = useSetores();
  return setores.map((s, idx) => {
    const p = getSetorPalette(idx);
    return { value: s.key, label: s.label, color: p.color, dot: p.dot };
  });
}

const getSetorMetaFrom = (list: SetorMeta[], v?: string | null) =>
  list.find(s => s.value === v) ?? SETOR_SEM;

const setorSelectClassFrom = (list: SetorMeta[], v?: string | null) => {
  const m = getSetorMetaFrom(list, v);
  return `w-full h-8 ${m.color} border rounded-full px-3 text-xs font-medium outline-none focus:ring-2 focus:ring-blue-400/40 appearance-none cursor-pointer transition-colors`;
};

function calcFeriasDefault(salario: number, _fgts_pct: number) {
  return salario / 3;
}
function calcTotalFolha(f: { salario: number; aux_combustivel: number; insalubridade_pct: number; fgts_pct: number; previsao_13_valor: number; em_folha?: boolean; ferias_valor?: number | null }) {
  if (f.em_folha === false) return f.salario;
  const insalub = f.salario * (f.insalubridade_pct || 0) / 100;
  const fgts = f.salario * (f.fgts_pct || 0) / 100;
  const ferias = f.ferias_valor == null ? calcFeriasDefault(f.salario, f.fgts_pct) : Number(f.ferias_valor) || 0;
  const prev13 = f.salario / 12;
  const fgts13 = fgts / 12;
  return f.salario + f.aux_combustivel + insalub + fgts + prev13 + fgts13 + ferias;
}

function FolhaBlock({
  items, insert, update, remove,
}: {
  items: DespesaPadrao[];
  insert: ReturnType<typeof useDespesasPadrao>['insert'];
  update: ReturnType<typeof useDespesasPadrao>['update'];
  remove: ReturnType<typeof useDespesasPadrao>['remove'];
}) {
  const [nome, setNome] = useState('');
  const [emFolha, setEmFolha] = useState(true);
  const [setor, setSetor] = useState<string>('');
  const [salario, setSalario] = useState(0);
  const [auxComb, setAuxComb] = useState(0);
  const [insalub, setInsalub] = useState(0);
  const [fgts, setFgts] = useState(8);
  const [prev13, setPrev13] = useState(0);

  const reset = () => { setNome(''); setEmFolha(true); setSetor(''); setSalario(0); setAuxComb(0); setInsalub(0); setFgts(8); setPrev13(0); };

  const save = async () => {
    if (!nome.trim()) return;
    const ok = await insert({
      tipo: 'folha',
      nome: nome.trim(),
      em_folha: emFolha,
      setor: setor || null,
      salario,
      aux_combustivel: auxComb,
      insalubridade_pct: insalub,
      fgts_pct: fgts,
      previsao_13_valor: prev13,
    });
    if (ok) reset();
  };

  const totalSalarios = items.reduce((s, i) => s + Number(i.salario || 0), 0);
  const totalFolha = items.reduce((s, i) => s + calcTotalFolha({
    salario: Number(i.salario) || 0,
    aux_combustivel: Number(i.aux_combustivel) || 0,
    insalubridade_pct: Number(i.insalubridade_pct) || 0,
    fgts_pct: Number(i.fgts_pct) || 0,
    previsao_13_valor: Number(i.previsao_13_valor) || 0,
    em_folha: i.em_folha,
    ferias_valor: i.ferias_valor,
  }), 0);
  const SETORES = useSetoresMeta();

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-5">
      <div className="flex items-center gap-2 text-white mb-3">
        <Users className="w-4 h-4" />
        <h3 className="font-semibold">Folha Salarial padrão</h3>
        <span className="text-white/40 text-sm">({items.length})</span>
        <button
          onClick={() => exportFolhaSalarialPDF(items)}
          disabled={items.length === 0}
          className="ml-auto inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white/80 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          title="Exportar folha salarial em PDF"
        >
          <FileDown className="w-3.5 h-3.5" />
          Exportar PDF
        </button>
      </div>
      <div className="space-y-3">
        {[...SETORES, SETOR_SEM]
          .map(s => ({ meta: s, rows: items.filter(i => (i.setor ?? '') === s.value) }))
          .filter(g => g.rows.length > 0)
          .map(g => (
            <FolhaSetorGroup key={g.meta.value || 'sem'} meta={g.meta} rows={g.rows} setores={SETORES} update={update} remove={remove} />
          ))}

        {/* Caixa de adicionar novo colaborador */}
        <div className="bg-white/[0.03] border border-dashed border-white/15 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Plus className="w-3.5 h-3.5 text-emerald-300" />
            <span className="text-[11px] uppercase tracking-wider text-white/60 font-semibold">Adicionar colaborador</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1200px]">
              <FolhaTableHeader />
              <tbody>
                <tr>
                  <td className="py-2 pl-1">
                    <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do colaborador"
                      className="w-full h-8 bg-white/5 border border-white/10 rounded px-2 text-white text-xs outline-none focus:border-blue-400/50" />
                  </td>
                  <td className="px-2 text-center">
                    <Switch checked={emFolha} onCheckedChange={setEmFolha} />
                  </td>
                  <td className="px-2">
                    <select value={setor} onChange={(e) => setSetor(e.target.value)}
                      className={setorSelectClassFrom(SETORES, setor)}>
                      <option value="" className="bg-slate-900 text-white">—</option>
                      {SETORES.map(s => <option key={s.value} value={s.value} className="bg-slate-900 text-white">{s.label}</option>)}
                    </select>
                  </td>
                  <td className="px-2"><NumCell value={salario} onChange={setSalario} /></td>
                  <td className="px-2"><NumCell value={auxComb} onChange={setAuxComb} /></td>
                  <td className="px-2"><NumCell value={insalub} onChange={setInsalub} /></td>
                  <td className="px-2 text-right text-orange-400 text-xs">{formatCurrency(salario * (insalub || 0) / 100)}</td>
                  <td className="px-2"><NumCell value={fgts} onChange={setFgts} /></td>
                  <td className="px-2 text-right text-orange-400 text-xs">{formatCurrency(salario * (fgts || 0) / 100)}</td>
                  <td className="px-2 text-right text-orange-400 text-xs">{formatCurrency(salario / 12)}</td>
                  <td className="px-2 text-right text-orange-400 text-xs">{formatCurrency((salario * (fgts || 0) / 100) / 12)}</td>
                  <td className="px-2 text-right text-white/40 text-xs">{formatCurrency(salario / 3)}</td>
                  <td className="px-2 text-right text-white/60 text-xs">{formatCurrency(calcTotalFolha({ salario, aux_combustivel: auxComb, insalubridade_pct: insalub, fgts_pct: fgts, previsao_13_valor: prev13, em_folha: emFolha }))}</td>
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
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between px-2 gap-6">
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/50 uppercase tracking-wider">Total de salários</span>
          <span className="text-sm font-medium text-white/80">{formatCurrency(totalSalarios)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/50 uppercase tracking-wider">Total da folha</span>
          <span className="text-base font-bold text-white">{formatCurrency(totalFolha)}</span>
        </div>
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
  const salario = Number(item.salario) || 0;
  const aux_combustivel = Number(item.aux_combustivel) || 0;
  const insalubridade_pct = Number(item.insalubridade_pct) || 0;
  const fgts_pct = Number(item.fgts_pct) || 0;
  const insalubVal = salario * insalubridade_pct / 100;
  const fgtsVal = salario * fgts_pct / 100;
  const feriasDefault = calcFeriasDefault(salario, fgts_pct);
  const feriasAtual = item.ferias_valor == null ? feriasDefault : Number(item.ferias_valor) || 0;
  const total = calcTotalFolha({ salario, aux_combustivel, insalubridade_pct, fgts_pct, previsao_13_valor: 0, em_folha: item.em_folha, ferias_valor: item.ferias_valor });
  const desativado = item.em_folha === false;
  const zeroCurr = <span className="text-white/30">{formatCurrency(0)}</span>;
  const zeroPct = <span className="text-white/30">0%</span>;
  return (
    <tr className="border-b border-white/5 hover:bg-white/[0.03]">
      <td className="py-2 pl-1 text-white/90">
        <InlineText value={item.nome} onSave={(v) => update(item.id, { nome: v })} />
      </td>
      <td className="px-2 text-center">
        <Switch checked={item.em_folha} onCheckedChange={(v) => update(item.id, { em_folha: v })} />
      </td>
      <td className="px-2">
        <select value={item.setor ?? ''} onChange={(e) => update(item.id, { setor: e.target.value || null })}
          className={setorSelectClass(item.setor)}>
          <option value="" className="bg-slate-900 text-white">—</option>
          {SETORES.map(s => <option key={s.value} value={s.value} className="bg-slate-900 text-white">{s.label}</option>)}
        </select>
      </td>
      <td className="px-2 text-right text-emerald-400 font-medium">
        <InlineNum value={item.salario} onSave={(v) => update(item.id, { salario: v })} format="currency" />
      </td>
      <td className="px-2 text-right text-white/60">
        {desativado ? zeroCurr : <InlineNum value={item.aux_combustivel} onSave={(v) => update(item.id, { aux_combustivel: v })} format="currency" />}
      </td>
      <td className="px-2 text-right text-white/60">
        {desativado ? zeroPct : <InlineNum value={item.insalubridade_pct} onSave={(v) => update(item.id, { insalubridade_pct: v })} format="percent" />}
      </td>
      <td className="px-2 text-right text-xs">{desativado ? zeroCurr : <span className="text-orange-400">{formatCurrency(insalubVal)}</span>}</td>
      <td className="px-2 text-right text-white/60">
        {desativado ? zeroPct : <InlineNum value={item.fgts_pct} onSave={(v) => update(item.id, { fgts_pct: v })} format="percent" />}
      </td>
      <td className="px-2 text-right text-xs">{desativado ? zeroCurr : <span className="text-orange-400">{formatCurrency(fgtsVal)}</span>}</td>
      <td className="px-2 text-right text-xs">{desativado ? zeroCurr : <span className="text-orange-400">{formatCurrency(salario / 12)}</span>}</td>
      <td className="px-2 text-right text-xs">{desativado ? zeroCurr : <span className="text-orange-400">{formatCurrency(fgtsVal / 12)}</span>}</td>
      <td className="px-2 text-right text-white/70">
        {desativado ? zeroCurr : (
          <>
            <InlineNum value={feriasAtual} onSave={(v) => update(item.id, { ferias_valor: v })} format="currency" />
            {item.ferias_valor != null && (
              <button
                onClick={() => update(item.id, { ferias_valor: null })}
                className="text-[10px] text-blue-300/70 hover:text-blue-300 underline"
                title="Voltar ao cálculo automático"
              >
                auto: {formatCurrency(feriasDefault)}
              </button>
            )}
          </>
        )}
      </td>
      <td className="px-2 text-right text-white font-semibold">{formatCurrency(total)}</td>
      <td className="pr-1 text-right">
        <button onClick={() => remove(item.id)} className="p-1 rounded hover:bg-red-500/20 text-red-300/70 hover:text-red-300">
          <Trash2 className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
}

function FolhaTableHeader() {
  return (
    <thead>
      <tr className="text-[10px] uppercase tracking-wider text-white/40 border-b border-white/10">
        <th className="text-left font-normal pb-2 pl-1">Colaborador</th>
        <th className="text-center font-normal pb-2 px-2 w-[90px]">Em folha</th>
        <th className="text-left font-normal pb-2 px-2 w-[140px]">Setor</th>
        <th className="text-right font-normal pb-2 px-2 text-emerald-400">Salário</th>
        <th className="text-right font-normal pb-2 px-2">Combustível</th>
        <th className="text-right font-normal pb-2 px-2">Insalub %</th>
        <th className="text-right font-normal pb-2 px-2">
          <div>Insalub valor</div>
          <div className="text-[9px] normal-case tracking-normal text-white/30">salário × insalub%</div>
        </th>
        <th className="text-right font-normal pb-2 px-2">FGTS %</th>
        <th className="text-right font-normal pb-2 px-2">
          <div>FGTS valor</div>
          <div className="text-[9px] normal-case tracking-normal text-white/30">salário × FGTS%</div>
        </th>
        <th className="text-right font-normal pb-2 px-2">
          <div>Previsão 13°</div>
          <div className="text-[9px] normal-case tracking-normal text-white/30">salário ÷ 12</div>
        </th>
        <th className="text-right font-normal pb-2 px-2">
          <div>FGTS 13°</div>
          <div className="text-[9px] normal-case tracking-normal text-white/30">FGTS valor ÷ 12</div>
        </th>
        <th className="text-right font-normal pb-2 px-2">
          <div>Férias + 1/3</div>
          <div className="text-[9px] normal-case tracking-normal text-white/30">salário ÷ 3</div>
        </th>
        <th className="text-right font-normal pb-2 px-2">Total</th>
        <th className="pb-2 pr-1 w-10"></th>
      </tr>
    </thead>
  );
}

function FolhaSetorGroup({
  meta, rows, setores, update, remove,
}: {
  meta: SetorMeta;
  rows: DespesaPadrao[];
  setores: SetorMeta[];
  update: ReturnType<typeof useDespesasPadrao>['update'];
  remove: ReturnType<typeof useDespesasPadrao>['remove'];
}) {
  const subtotal = rows.reduce((s, i) => s + calcTotalFolha({
    salario: Number(i.salario) || 0,
    aux_combustivel: Number(i.aux_combustivel) || 0,
    insalubridade_pct: Number(i.insalubridade_pct) || 0,
    fgts_pct: Number(i.fgts_pct) || 0,
    previsao_13_valor: Number(i.previsao_13_valor) || 0,
    em_folha: i.em_folha,
    ferias_valor: i.ferias_valor,
  }), 0);
  return (
    <div className="bg-white/[0.04] border border-white/10 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
        <span className="text-[11px] uppercase tracking-wider text-white/80 font-semibold">{meta.label}</span>
        <span className="text-[10px] text-white/40">({rows.length})</span>
        <div className="flex-1 h-px bg-white/10 ml-2" />
        <span className="text-[10px] text-white/50 uppercase tracking-wider">Subtotal</span>
        <span className="text-xs text-white/90 font-medium">{formatCurrency(subtotal)}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[1200px]">
          <FolhaTableHeader />
          <tbody>
            {rows.map(i => (
              <FolhaRow key={i.id} item={i} setores={setores} update={update} remove={remove} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
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

/* ---------------- Tipos de Custos block ---------------- */

function TiposCustoBlock({
  titulo, icon, tipo, items, save, update, remove,
}: {
  titulo: string;
  icon: React.ReactNode;
  tipo: 'fixa' | 'variavel';
  items: TipoCusto[];
  save: ReturnType<typeof useTiposCustos>['saveTipoCusto'];
  update: ReturnType<typeof useTiposCustos>['updateTipoCusto'];
  remove: ReturnType<typeof useTiposCustos>['deleteTipoCusto'];
}) {
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState(0);

  const totalAtivos = items.filter(i => i.ativo).reduce((s, i) => s + Number(i.valor_maximo_mensal || 0), 0);

  const onSave = async () => {
    if (!nome.trim()) return;
    const ok = await save({
      nome: nome.trim(),
      descricao: descricao.trim() || null,
      valor_maximo_mensal: valor,
      tipo,
      aparece_no_dre: true,
      ativo: true,
    });
    if (ok) { setNome(''); setDescricao(''); setValor(0); }
  };

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-5">
      <div className="flex items-center gap-2 text-white mb-3">
        {icon}
        <h3 className="font-semibold">{titulo}</h3>
        <span className="text-white/40 text-sm">({items.length})</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-white/40 border-b border-white/10">
              <th className="text-left font-normal pb-2 pl-1">Nome</th>
              <th className="text-left font-normal pb-2 px-2">Descrição</th>
              <th className="text-right font-normal pb-2 px-2 w-[180px]">Valor projetado</th>
              <th className="text-center font-normal pb-2 px-2 w-[110px]">Aparece no DRE</th>
              <th className="pb-2 pr-1 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {items.map(i => (
              <tr key={i.id} className={`border-b border-white/5 hover:bg-white/[0.03] ${!i.ativo ? 'opacity-50' : ''}`}>
                <td className="py-2 pl-1 text-white/90">
                  <InlineText value={i.nome} onSave={(v) => update(i.id, { nome: v })} />
                </td>
                <td className="px-2 text-white/70">
                  <InlineText value={i.descricao || ''} onSave={(v) => update(i.id, { descricao: v || null })} />
                </td>
                <td className="px-2 text-right text-white font-medium">
                  <InlineNum value={i.valor_maximo_mensal} onSave={(v) => update(i.id, { valor_maximo_mensal: v })} format="currency" />
                </td>
                <td className="px-2 text-center">
                  <Switch checked={i.aparece_no_dre} onCheckedChange={(v) => update(i.id, { aparece_no_dre: v })} />
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
                <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome"
                  className="w-full h-8 bg-white/5 border border-white/10 rounded px-2 text-white text-xs outline-none focus:border-blue-400/50" />
              </td>
              <td className="px-2">
                <input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descrição (opcional)"
                  className="w-full h-8 bg-white/5 border border-white/10 rounded px-2 text-white text-xs outline-none focus:border-blue-400/50" />
              </td>
              <td className="px-2"><NumCell value={valor} onChange={setValor} /></td>
              <td className="px-2" />
              <td className="pr-1 text-right">
                <button onClick={onSave} disabled={!nome.trim()}
                  className="p-1 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-30">
                  <Plus className="w-4 h-4" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between px-2">
        <span className="text-xs text-white/50 uppercase tracking-wider">Total mensal estimado (ativos)</span>
        <span className="text-base font-bold text-white">{formatCurrency(totalAtivos)}</span>
      </div>
    </div>
  );
}