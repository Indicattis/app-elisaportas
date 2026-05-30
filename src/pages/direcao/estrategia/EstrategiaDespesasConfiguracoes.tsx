import { useState, useRef, useMemo } from 'react';
import { Plus, Trash2, Users, Receipt, TrendingDown, Landmark, FileDown, GripVertical, X, Check, FolderPlus, ChevronRight, AlertTriangle, FileText } from 'lucide-react';
import { MinimalistLayout } from '@/components/MinimalistLayout';
import { formatCurrency } from '@/lib/utils';
import { useDespesasPadrao, type DespesaPadrao, type DespesaPadraoTipo } from '@/hooks/useDespesasPadrao';
import { useTiposCustos, type TipoCusto } from '@/hooks/useTiposCustos';
import { useEmpresasEmissoras } from '@/hooks/useEmpresasEmissoras';
import { useDespesasCategorias, getCategoriaPalette, type CategoriaDespesa } from '@/hooks/useDespesasCategorias';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { GerenciarCategoriasDialog } from '@/components/despesas/GerenciarCategoriasDialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { exportFolhaSalarialPDF } from '@/utils/folhaSalarialPDFGenerator';
import { useSetores, getSetorPalette } from '@/hooks/useSetores';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers';

export default function EstrategiaDespesasConfiguracoes() {
  const { items, loading, insert, update, remove, reorder } = useDespesasPadrao();
  const {
    tiposCustos, loading: loadingTipos,
    saveTipoCusto, updateTipoCusto, deleteTipoCusto,
    contarGastosVinculados, realocarEExcluirTipoCusto, reorderTiposCustos,
  } = useTiposCustos();

  // Only show full-page spinner on the very first load. Subsequent refetches
  // (triggered by insert/update/remove) must NOT unmount the grid, otherwise
  // the page scroll resets to the top after every change.
  const firstLoadedRef = useRef(false);
  if (!loading && !loadingTipos) firstLoadedRef.current = true;
  const showSpinner = !firstLoadedRef.current && (loading || loadingTipos);

  const folha = items.filter(i => i.tipo === 'folha');
  const tiposFixas = tiposCustos.filter(t => t.tipo === 'fixa');
  const tiposVariaveis = tiposCustos.filter(t => t.tipo === 'variavel');
  const tiposImpostos = tiposCustos.filter(t => t.tipo === 'imposto');

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
          <FolhaBlock items={folha} insert={insert} update={update} remove={remove} reorder={reorder} />
          <TiposCustoBlock
            titulo="Tipos de Custos — Fixas"
            icon={<Receipt className="w-4 h-4" />}
            tipo="fixa"
            items={tiposFixas}
            save={saveTipoCusto}
            update={updateTipoCusto}
            remove={deleteTipoCusto}
            allTipos={tiposCustos}
            contarGastosVinculados={contarGastosVinculados}
            realocarEExcluir={realocarEExcluirTipoCusto}
            reorderTipos={reorderTiposCustos}
          />
          <TiposCustoBlock
            titulo="Tipos de Custos — Variáveis"
            icon={<TrendingDown className="w-4 h-4" />}
            tipo="variavel"
            items={tiposVariaveis}
            save={saveTipoCusto}
            update={updateTipoCusto}
            remove={deleteTipoCusto}
            allTipos={tiposCustos}
            contarGastosVinculados={contarGastosVinculados}
            realocarEExcluir={realocarEExcluirTipoCusto}
            reorderTipos={reorderTiposCustos}
          />
          <TiposCustoBlock
            titulo="Tipos de Custos — Impostos"
            icon={<Landmark className="w-4 h-4" />}
            tipo="imposto"
            items={tiposImpostos}
            save={saveTipoCusto}
            update={updateTipoCusto}
            remove={deleteTipoCusto}
            allTipos={tiposCustos}
            contarGastosVinculados={contarGastosVinculados}
            realocarEExcluir={realocarEExcluirTipoCusto}
            reorderTipos={reorderTiposCustos}
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
  return salario / 3 / 12;
}
function calcTotalFolha(f: { salario: number; salario_minimo?: number; aux_combustivel: number; insalubridade_pct: number; fgts_pct: number; previsao_13_valor: number; em_folha?: boolean; ferias_valor?: number | null }) {
  if (f.em_folha === false) return f.salario;
  const baseInsalub = f.salario_minimo == null ? f.salario : f.salario_minimo;
  const insalub = baseInsalub * (f.insalubridade_pct || 0) / 100;
  const fgts = f.salario * (f.fgts_pct || 0) / 100;
  const ferias = f.ferias_valor == null ? calcFeriasDefault(f.salario, f.fgts_pct) : Number(f.ferias_valor) || 0;
  const prev13 = f.salario / 12;
  const fgts13 = fgts / 12;
  return f.salario + f.aux_combustivel + insalub + fgts + prev13 + fgts13 + ferias;
}

function FolhaBlock({
  items, insert, update, remove, reorder,
}: {
  items: DespesaPadrao[];
  insert: ReturnType<typeof useDespesasPadrao>['insert'];
  update: ReturnType<typeof useDespesasPadrao>['update'];
  remove: ReturnType<typeof useDespesasPadrao>['remove'];
  reorder: ReturnType<typeof useDespesasPadrao>['reorder'];
}) {
  const [nome, setNome] = useState('');
  const [emFolha, setEmFolha] = useState(true);
  const [setor, setSetor] = useState<string>('');
  const [salario, setSalario] = useState(0);
  const [salarioMin, setSalarioMin] = useState(1518);
  const [auxComb, setAuxComb] = useState(0);
  const [insalub, setInsalub] = useState(0);
  const [fgts, setFgts] = useState(8);
  const [prev13, setPrev13] = useState(0);

  const reset = () => { setNome(''); setEmFolha(true); setSetor(''); setSalario(0); setSalarioMin(1518); setAuxComb(0); setInsalub(0); setFgts(8); setPrev13(0); };

  const save = async () => {
    if (!nome.trim()) return;
    const ok = await insert({
      tipo: 'folha',
      nome: nome.trim(),
      em_folha: emFolha,
      setor: setor || null,
      salario,
      salario_minimo: salarioMin,
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
    salario_minimo: Number(i.salario_minimo) || 0,
    aux_combustivel: Number(i.aux_combustivel) || 0,
    insalubridade_pct: Number(i.insalubridade_pct) || 0,
    fgts_pct: Number(i.fgts_pct) || 0,
    previsao_13_valor: Number(i.previsao_13_valor) || 0,
    em_folha: i.em_folha,
    ferias_valor: i.ferias_valor,
  }), 0);
  const SETORES = useSetoresMeta();
  const { reorderSetores } = useSetores();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const { setores: setoresFull } = useSetores();
  const keyToId = useMemo(() => {
    const m: Record<string, string> = {};
    setoresFull.forEach(s => { m[s.key] = s.id; });
    return m;
  }, [setoresFull]);
  const setorIds = useMemo(() => SETORES.map(s => s.value), [SETORES]);

  const onSetorDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = setorIds.filter(id => id !== ''); // exclude "sem setor"
    const oldIdx = ids.indexOf(String(active.id));
    const newIdx = ids.indexOf(String(over.id));
    if (oldIdx < 0 || newIdx < 0) return;
    const next = arrayMove(ids, oldIdx, newIdx);
    reorderSetores(next.map(k => keyToId[k]).filter(Boolean));
  };

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-5">
      <div className="flex items-center gap-2 text-white mb-3">
        <Users className="w-4 h-4" />
        <h3 className="font-semibold">Folha Salarial padrão</h3>
        <span className="text-white/40 text-sm">({items.length})</span>
        <button
          onClick={() => exportFolhaSalarialPDF(items, SETORES.map(s => ({ value: s.value, label: s.label })))}
          disabled={items.length === 0}
          className="ml-auto inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white/80 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          title="Exportar folha salarial em PDF"
        >
          <FileDown className="w-3.5 h-3.5" />
          Exportar PDF
        </button>
      </div>
      <div className="space-y-3">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={onSetorDragEnd}
        >
          <SortableContext items={setorIds.filter(id => id !== '')} strategy={verticalListSortingStrategy}>
            {SETORES
              .map(meta => ({ meta, rows: items.filter(i => (i.setor ?? '') === meta.value) }))
              .filter(g => g.rows.length > 0)
              .map(g => (
                <SortableSetorGroup
                  key={g.meta.value}
                  id={g.meta.value}
                  meta={g.meta}
                  rows={g.rows}
                  setores={SETORES}
                  update={update}
                  remove={remove}
                  reorder={reorder}
                />
              ))}
          </SortableContext>
        </DndContext>
        {/* "Sem setor" sempre por último e não arrastável como grupo */}
        {items.some(i => !i.setor) && (
          <FolhaSetorGroup
            meta={SETOR_SEM}
            rows={items.filter(i => !i.setor)}
            setores={SETORES}
            update={update}
            remove={remove}
            reorder={reorder}
          />
        )}

        {/* Caixa de adicionar novo colaborador */}
        <div className="bg-white/[0.03] border border-dashed border-white/15 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Plus className="w-3.5 h-3.5 text-emerald-300" />
            <span className="text-[11px] uppercase tracking-wider text-white/60 font-semibold">Adicionar colaborador</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm table-fixed min-w-[1640px]">
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
                  <td className="px-2"><NumCell value={salarioMin} onChange={setSalarioMin} /></td>
                  <td className="px-2"><NumCell value={auxComb} onChange={setAuxComb} /></td>
                  <td className="px-2"><NumCell value={insalub} onChange={setInsalub} /></td>
                  <td className="px-2 text-right text-orange-400 text-xs">{formatCurrency(salarioMin * (insalub || 0) / 100)}</td>
                  <td className="px-2"><NumCell value={fgts} onChange={setFgts} /></td>
                  <td className="px-2 text-right text-orange-400 text-xs">{formatCurrency(salario * (fgts || 0) / 100)}</td>
                  <td className="px-2 text-right text-orange-400 text-xs">{formatCurrency(salario / 12)}</td>
                  <td className="px-2 text-right text-orange-400 text-xs">{formatCurrency((salario * (fgts || 0) / 100) / 12)}</td>
                  <td className="px-2 text-right text-white/40 text-xs">{formatCurrency(salario / 3)}</td>
                  <td className="px-2 text-right text-white/60 text-xs">{formatCurrency(calcTotalFolha({ salario, salario_minimo: salarioMin, aux_combustivel: auxComb, insalubridade_pct: insalub, fgts_pct: fgts, previsao_13_valor: prev13, em_folha: emFolha }))}</td>
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

function FolhaRowCells({
  item, setores, update, remove, dragHandle,
}: {
  item: DespesaPadrao;
  setores: SetorMeta[];
  update: ReturnType<typeof useDespesasPadrao>['update'];
  remove: ReturnType<typeof useDespesasPadrao>['remove'];
  dragHandle?: React.ReactNode;
}) {
  const salario = Number(item.salario) || 0;
  const salario_minimo = Number(item.salario_minimo) || 0;
  const aux_combustivel = Number(item.aux_combustivel) || 0;
  const insalubridade_pct = Number(item.insalubridade_pct) || 0;
  const fgts_pct = Number(item.fgts_pct) || 0;
  const insalubVal = salario_minimo * insalubridade_pct / 100;
  const fgtsVal = salario * fgts_pct / 100;
  const feriasDefault = calcFeriasDefault(salario, fgts_pct);
  const total = calcTotalFolha({ salario, salario_minimo, aux_combustivel, insalubridade_pct, fgts_pct, previsao_13_valor: 0, em_folha: item.em_folha, ferias_valor: null });
  const desativado = item.em_folha === false;
  const zeroCurr = <span className="text-white/30">{formatCurrency(0)}</span>;
  const zeroPct = <span className="text-white/30">0%</span>;
  return (
    <>
      <td className="py-2 pl-1 text-white/90">
        <div className="flex items-center gap-1">
          {dragHandle}
          <div className="flex-1"><InlineText value={item.nome} onSave={(v) => update(item.id, { nome: v })} /></div>
        </div>
      </td>
      <td className="px-2 text-center">
        <Switch checked={item.em_folha} onCheckedChange={(v) => update(item.id, { em_folha: v })} />
      </td>
      <td className="px-2">
        <select value={item.setor ?? ''} onChange={(e) => update(item.id, { setor: e.target.value || null })}
          className={setorSelectClassFrom(setores, item.setor)}>
          <option value="" className="bg-slate-900 text-white">—</option>
          {setores.map(s => <option key={s.value} value={s.value} className="bg-slate-900 text-white">{s.label}</option>)}
        </select>
      </td>
      <td className="px-2 text-right text-emerald-400 font-medium">
        <InlineNum value={item.salario} onSave={(v) => update(item.id, { salario: v })} format="currency" />
      </td>
      <td className="px-2 text-right text-white/60">
        <InlineNum value={item.salario_minimo} onSave={(v) => update(item.id, { salario_minimo: v })} format="currency" />
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
      <td className="px-2 text-right text-xs">
        {desativado ? zeroCurr : <span className="text-orange-400">{formatCurrency(feriasDefault)}</span>}
      </td>
      <td className="px-2 text-right text-white font-semibold">{formatCurrency(total)}</td>
      <td className="pr-1 text-right">
        <button onClick={() => remove(item.id)} className="p-1 rounded hover:bg-red-500/20 text-red-300/70 hover:text-red-300">
          <Trash2 className="w-4 h-4" />
        </button>
      </td>
    </>
  );
}

function FolhaTableHeader() {
  return (
    <>
    <FolhaColGroup />
    <thead>
      <tr className="text-[10px] uppercase tracking-wider text-white/40 border-b border-white/10">
        <th className="text-left font-normal pb-2 pl-1">Colaborador</th>
        <th className="text-center font-normal pb-2 px-2">Em folha</th>
        <th className="text-left font-normal pb-2 px-2">Setor</th>
        <th className="text-right font-normal pb-2 px-2 text-emerald-400">Salário</th>
        <th className="text-right font-normal pb-2 px-2">Salário Mínimo</th>
        <th className="text-right font-normal pb-2 px-2">Combustível</th>
        <th className="text-right font-normal pb-2 px-2">Insalub %</th>
        <th className="text-right font-normal pb-2 px-2">
          <div>Insalub valor</div>
          <div className="text-[9px] normal-case tracking-normal text-white/30">salário mín. × insalub%</div>
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
          <div className="text-[9px] normal-case tracking-normal text-white/30">(salário ÷ 3) ÷ 12</div>
        </th>
        <th className="text-right font-normal pb-2 px-2">Total</th>
        <th className="pb-2 pr-1"></th>
      </tr>
    </thead>
    </>
  );
}

function FolhaColGroup() {
  return (
    <colgroup>
      <col style={{ width: '220px' }} />
      <col style={{ width: '80px' }} />
      <col style={{ width: '140px' }} />
      <col style={{ width: '110px' }} />
      <col style={{ width: '110px' }} />
      <col style={{ width: '110px' }} />
      <col style={{ width: '80px' }} />
      <col style={{ width: '120px' }} />
      <col style={{ width: '80px' }} />
      <col style={{ width: '110px' }} />
      <col style={{ width: '110px' }} />
      <col style={{ width: '100px' }} />
      <col style={{ width: '110px' }} />
      <col style={{ width: '120px' }} />
      <col style={{ width: '40px' }} />
    </colgroup>
  );
}

function FolhaSetorGroup({
  meta, rows, setores, update, remove, reorder, dragHandle,
}: {
  meta: SetorMeta;
  rows: DespesaPadrao[];
  setores: SetorMeta[];
  update: ReturnType<typeof useDespesasPadrao>['update'];
  remove: ReturnType<typeof useDespesasPadrao>['remove'];
  reorder: ReturnType<typeof useDespesasPadrao>['reorder'];
  dragHandle?: React.ReactNode;
}) {
  const subtotal = rows.reduce((s, i) => s + calcTotalFolha({
    salario: Number(i.salario) || 0,
    salario_minimo: Number(i.salario_minimo) || 0,
    aux_combustivel: Number(i.aux_combustivel) || 0,
    insalubridade_pct: Number(i.insalubridade_pct) || 0,
    fgts_pct: Number(i.fgts_pct) || 0,
    previsao_13_valor: Number(i.previsao_13_valor) || 0,
    em_folha: i.em_folha,
    ferias_valor: i.ferias_valor,
  }), 0);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const sortedRows = [...rows].sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
  const rowIds = sortedRows.map(r => r.id);
  const onRowDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = rowIds.indexOf(String(active.id));
    const newIdx = rowIds.indexOf(String(over.id));
    if (oldIdx < 0 || newIdx < 0) return;
    reorder(arrayMove(rowIds, oldIdx, newIdx));
  };
  return (
    <div className="bg-white/[0.04] border border-white/10 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        {dragHandle}
        <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
        <span className="text-[11px] uppercase tracking-wider text-white/80 font-semibold">{meta.label}</span>
        <span className="text-[10px] text-white/40">({rows.length})</span>
        <div className="flex-1 h-px bg-white/10 ml-2" />
        <span className="text-[10px] text-white/50 uppercase tracking-wider">Subtotal</span>
        <span className="text-xs text-white/90 font-medium">{formatCurrency(subtotal)}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm table-fixed min-w-[1640px]">
          <FolhaTableHeader />
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis, restrictToParentElement]}
            onDragEnd={onRowDragEnd}
          >
            <SortableContext items={rowIds} strategy={verticalListSortingStrategy}>
              <tbody>
                {sortedRows.map(i => (
                  <SortableFolhaRow key={i.id} item={i} setores={setores} update={update} remove={remove} />
                ))}
              </tbody>
            </SortableContext>
          </DndContext>
        </table>
      </div>
    </div>
  );
}

function SortableSetorGroup(props: {
  id: string;
  meta: SetorMeta;
  rows: DespesaPadrao[];
  setores: SetorMeta[];
  update: ReturnType<typeof useDespesasPadrao>['update'];
  remove: ReturnType<typeof useDespesasPadrao>['remove'];
  reorder: ReturnType<typeof useDespesasPadrao>['reorder'];
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  const handle = (
    <button
      {...attributes}
      {...listeners}
      className="p-0.5 rounded hover:bg-white/10 text-white/40 hover:text-white/80 cursor-grab active:cursor-grabbing"
      title="Arrastar setor"
      type="button"
    >
      <GripVertical className="w-3.5 h-3.5" />
    </button>
  );
  return (
    <div ref={setNodeRef} style={style}>
      <FolhaSetorGroup
        meta={props.meta}
        rows={props.rows}
        setores={props.setores}
        update={props.update}
        remove={props.remove}
        reorder={props.reorder}
        dragHandle={handle}
      />
    </div>
  );
}

function SortableFolhaRow(props: {
  item: DespesaPadrao;
  setores: SetorMeta[];
  update: ReturnType<typeof useDespesasPadrao>['update'];
  remove: ReturnType<typeof useDespesasPadrao>['remove'];
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.item.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  const handle = (
    <button
      {...attributes}
      {...listeners}
      className="p-0.5 rounded hover:bg-white/10 text-white/30 hover:text-white/70 cursor-grab active:cursor-grabbing"
      title="Arrastar colaborador"
      type="button"
    >
      <GripVertical className="w-3.5 h-3.5" />
    </button>
  );
  return (
    <tr ref={setNodeRef as any} style={style} className="border-b border-white/5 hover:bg-white/[0.03]">
      <FolhaRowCells item={props.item} setores={props.setores} update={props.update} remove={props.remove} dragHandle={handle} />
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

/* ---------------- Tipos de Custos block ---------------- */

function TiposCustoBlock({
  titulo, icon, tipo, items, save, update, remove,
  allTipos, contarGastosVinculados, realocarEExcluir, reorderTipos,
}: {
  titulo: string;
  icon: React.ReactNode;
  tipo: 'fixa' | 'variavel' | 'imposto';
  items: TipoCusto[];
  save: ReturnType<typeof useTiposCustos>['saveTipoCusto'];
  update: ReturnType<typeof useTiposCustos>['updateTipoCusto'];
  remove: ReturnType<typeof useTiposCustos>['deleteTipoCusto'];
  allTipos: TipoCusto[];
  contarGastosVinculados: ReturnType<typeof useTiposCustos>['contarGastosVinculados'];
  realocarEExcluir: ReturnType<typeof useTiposCustos>['realocarEExcluirTipoCusto'];
  reorderTipos: ReturnType<typeof useTiposCustos>['reorderTiposCustos'];
}) {
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState(0);
  const [apareceNoDre, setApareceNoDre] = useState(true);
  const [empresaId, setEmpresaId] = useState<string>('');
  const [gerenciarCatOpen, setGerenciarCatOpen] = useState(false);
  const [categoriaId, setCategoriaId] = useState<string>('');
  const { empresas } = useEmpresasEmissoras();
  const empresasAtivas = (empresas || []).filter((e: any) => e.ativo !== false);
  const { categorias, createCategoria, renameCategoria, removeCategoria, reorderCategorias } = useDespesasCategorias();

  const [realocacaoDialog, setRealocacaoDialog] = useState<{ tipo: TipoCusto; count: number } | null>(null);
  const [destinoId, setDestinoId] = useState<string>('');
  const [realocando, setRealocando] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const handleRemoveTipo = async (id: string) => {
    const alvo = items.find(i => i.id === id);
    if (!alvo) return;
    const count = await contarGastosVinculados(id);
    if (count > 0) {
      setDestinoId('');
      setRealocacaoDialog({ tipo: alvo, count });
      return;
    }
    await remove(id);
  };

  const confirmarRealocacao = async () => {
    if (!realocacaoDialog || !destinoId) return;
    setRealocando(true);
    const ok = await realocarEExcluir(realocacaoDialog.tipo.id, destinoId);
    setRealocando(false);
    if (ok) { setRealocacaoDialog(null); setDestinoId(''); }
  };

  const destinosPossiveis = allTipos.filter(t =>
    t.tipo === realocacaoDialog?.tipo.tipo &&
    t.id !== realocacaoDialog?.tipo.id &&
    t.ativo
  );

  const totalAtivos = items.filter(i => i.ativo).reduce((s, i) => s + Number(i.valor_maximo_mensal || 0), 0);

  const onSave = async () => {
    if (!nome.trim()) return false;
    const ok = await save({
      nome: nome.trim(),
      descricao: descricao.trim() || null,
      valor_maximo_mensal: valor,
      tipo,
      aparece_no_dre: apareceNoDre,
      ativo: true,
      empresa_id: empresaId || null,
      categoria_id: categoriaId || null,
    } as any);
    if (ok) { setNome(''); setDescricao(''); setValor(0); setApareceNoDre(true); setEmpresaId(''); setCategoriaId(''); }
    return ok;
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const catIds = useMemo(() => categorias.map(c => c.id), [categorias]);
  const onCatDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = catIds.indexOf(String(active.id));
    const newIdx = catIds.indexOf(String(over.id));
    if (oldIdx < 0 || newIdx < 0) return;
    reorderCategorias(arrayMove(catIds, oldIdx, newIdx));
  };

  const grupos = useMemo(() => {
    return categorias
      .map((cat, idx) => ({
        cat,
        palette: getCategoriaPalette(idx),
        rows: items.filter(i => i.categoria_id === cat.id),
      }))
      .filter(g => g.rows.length > 0);
  }, [categorias, items]);

  const semCategoria = items.filter(i => !i.categoria_id);

  const [collapsedCategorias, setCollapsedCategorias] = useState<Set<string>>(new Set());
  const toggleCat = (key: string) => {
    setCollapsedCategorias(prev => {
      const n = new Set(prev);
      if (n.has(key)) n.delete(key); else n.add(key);
      return n;
    });
  };
  const isExpanded = (key: string) => !collapsedCategorias.has(key);

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-5">
      <div className="flex items-center gap-2 text-white mb-3">
        {icon}
        <h3 className="font-semibold">{titulo}</h3>
        <span className="text-white/40 text-sm">({items.length})</span>
        <div className="ml-auto flex items-center gap-1.5">
          <button
            onClick={() => setGerenciarCatOpen(true)}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white/80 hover:text-white transition-colors"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            Gerenciar categorias
          </button>
          <button
            onClick={() => setAddDialogOpen(true)}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/30 text-xs text-emerald-200 hover:text-emerald-100 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Nova despesa
          </button>
        </div>
      </div>

      <GerenciarCategoriasDialog open={gerenciarCatOpen} onOpenChange={setGerenciarCatOpen} />

      <div>
        <CategoriaGroup
          cat={null}
          palette={{ color: 'bg-white/5 border-white/15 text-white/60', dot: 'bg-white/40' }}
          rows={items}
          categorias={categorias}
          empresasAtivas={empresasAtivas}
          update={update}
          remove={handleRemoveTipo}
          expanded={true}
          onToggle={() => {}}
          hideHeader
          reorderRows={reorderTipos}
        />
      </div>

      <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between px-2">
        <span className="text-xs text-white/50 uppercase tracking-wider">Total mensal estimado (ativos)</span>
        <span className="text-base font-bold text-white">{formatCurrency(totalAtivos)}</span>
      </div>

      <Dialog open={!!realocacaoDialog} onOpenChange={(open) => { if (!open) { setRealocacaoDialog(null); setDestinoId(''); } }}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Realocar gastos antes de excluir</DialogTitle>
            <DialogDescription>
              Existem <span className="font-semibold text-white">{realocacaoDialog?.count}</span> gasto(s) vinculados a{' '}
              <span className="font-semibold text-white">"{realocacaoDialog?.tipo.nome}"</span>. Escolha outro tipo de custo para receber esses gastos.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-2">
            <Label className="text-xs text-white/70">Tipo de custo de destino</Label>
            <Select value={destinoId} onValueChange={setDestinoId}>
              <SelectTrigger><SelectValue placeholder="Selecione um tipo de custo" /></SelectTrigger>
              <SelectContent>
                {destinosPossiveis.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-muted-foreground">Nenhum outro tipo disponível neste grupo</div>
                ) : (
                  destinosPossiveis.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRealocacaoDialog(null); setDestinoId(''); }} disabled={realocando}>Cancelar</Button>
            <Button onClick={confirmarRealocacao} disabled={!destinoId || realocando} className="bg-red-600 hover:bg-red-700">
              {realocando ? 'Realocando…' : 'Realocar e excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addDialogOpen} onOpenChange={(open) => { if (!open) setAddDialogOpen(false); }}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Nova despesa — {titulo}</DialogTitle>
            <DialogDescription>Preencha os dados da nova despesa.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-white/70">Nome</Label>
              <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Aluguel"
                className="w-full h-9 bg-white/5 border border-white/10 rounded px-3 text-white text-sm outline-none focus:border-blue-400/50" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-white/70">Descrição (opcional)</Label>
              <input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descrição"
                className="w-full h-9 bg-white/5 border border-white/10 rounded px-3 text-white text-sm outline-none focus:border-blue-400/50" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-white/70">Categoria</Label>
                <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}
                  className="w-full h-9 bg-white/5 border border-white/10 rounded px-2 text-white text-sm outline-none focus:border-blue-400/50">
                  <option value="" className="bg-slate-900 text-white">— Sem categoria</option>
                  {categorias.map(c => <option key={c.id} value={c.id} className="bg-slate-900 text-white">{c.nome}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-white/70">Empresa</Label>
                <select value={empresaId} onChange={(e) => setEmpresaId(e.target.value)}
                  className="w-full h-9 bg-white/5 border border-white/10 rounded px-2 text-white text-sm outline-none focus:border-blue-400/50">
                  <option value="" className="bg-slate-900">— Empresa</option>
                  {empresasAtivas.map((e: any) => <option key={e.id} value={e.id} className="bg-slate-900">{e.nome}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 items-end">
              <div className="space-y-1.5">
                <Label className="text-xs text-white/70">Valor projetado mensal</Label>
                <NumCell value={valor} onChange={setValor} />
              </div>
              <div className="flex items-center gap-2 h-9">
                <Switch checked={apareceNoDre} onCheckedChange={setApareceNoDre} />
                <Label className="text-xs text-white/70">Aparecer no DRE</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={async () => { const ok = await onSave(); if (ok) setAddDialogOpen(false); }}
              disabled={!nome.trim()}
              className="bg-emerald-600 hover:bg-emerald-700"
            >Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function categoriaSelectClass(_list: CategoriaDespesa[], v?: string | null) {
  const base = 'w-full h-8 border rounded-full px-3 text-xs font-medium outline-none focus:ring-2 focus:ring-blue-400/40 appearance-none cursor-pointer transition-colors';
  if (!v) return `${base} bg-white/5 border-white/15 text-white/60`;
  const idx = _list.findIndex(c => c.id === v);
  const p = getCategoriaPalette(Math.max(0, idx));
  return `${base} ${p.color}`;
}

function CategoriaGroup({
  cat, palette, rows, categorias, empresasAtivas, update, remove, dragHandle, rename, removeCat, expanded, onToggle, hideHeader, reorderRows,
}: {
  cat: CategoriaDespesa | null;
  palette: { color: string; dot: string };
  rows: TipoCusto[];
  categorias: CategoriaDespesa[];
  empresasAtivas: any[];
  update: ReturnType<typeof useTiposCustos>['updateTipoCusto'];
  remove: (id: string) => void | Promise<any>;
  dragHandle?: React.ReactNode;
  rename?: ReturnType<typeof useDespesasCategorias>['renameCategoria'];
  removeCat?: ReturnType<typeof useDespesasCategorias>['removeCategoria'];
  expanded: boolean;
  onToggle: () => void;
  hideHeader?: boolean;
  reorderRows?: (orderedIds: string[]) => void | Promise<any>;
}) {
  const subtotal = rows.reduce((s, i) => s + Number(i.valor_maximo_mensal || 0), 0);
  const rowSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const rowIds = rows.map(r => r.id);
  const onRowDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id || !reorderRows) return;
    const oldIdx = rowIds.indexOf(String(active.id));
    const newIdx = rowIds.indexOf(String(over.id));
    if (oldIdx < 0 || newIdx < 0) return;
    reorderRows(arrayMove(rowIds, oldIdx, newIdx));
  };
  return (
    <div className={`${hideHeader ? '' : 'border-b border-white/[0.06]'} px-1 ${expanded ? 'pt-2 pb-3' : 'py-2.5'} group/cat transition-colors`}>
      {!hideHeader && (
      <div
        className={`flex items-center gap-2 ${expanded ? 'mb-2' : ''} cursor-pointer select-none`}
        onClick={onToggle}
      >
        <ChevronRight
          className={`w-4 h-4 text-white/40 transition-transform ${expanded ? 'rotate-90 text-white/60' : ''}`}
        />
        {dragHandle ? (
          <span onClick={(e) => e.stopPropagation()} className="flex items-center opacity-0 group-hover/cat:opacity-100 transition-opacity">{dragHandle}</span>
        ) : null}
        <span className={`w-2 h-2 rounded-full ${palette.dot}`} />
        {cat && rename ? (
          <div
            className="text-sm text-white/90 font-medium"
            onClick={(e) => e.stopPropagation()}
          >
            <InlineText value={cat.nome} onSave={(v) => rename({ id: cat.id, nome: v })} />
          </div>
        ) : (
          <span className="text-sm text-white/90 font-medium">{cat?.nome ?? 'Sem categoria'}</span>
        )}
        <span className="text-xs text-white/40 tabular-nums">{rows.length}</span>
        <div className="flex-1" />
        <span className="text-sm text-white/90 font-semibold tabular-nums">{formatCurrency(subtotal)}</span>
        {cat && removeCat && (
          <button
            onClick={(e) => { e.stopPropagation(); removeCat(cat.id); }}
            className="p-0.5 rounded hover:bg-red-500/20 text-red-300/50 hover:text-red-300 ml-1 opacity-0 group-hover/cat:opacity-100 transition-opacity"
            title="Excluir categoria"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
      )}
      {expanded && (
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[10px] uppercase tracking-wider text-white/40 border-b border-white/10">
            <th className="pb-2 w-6"></th>
            <th className="text-left font-normal pb-2 pl-1 w-[34%]">Nome</th>
            <th className="text-left font-normal pb-2 px-2 w-[22%]">Categoria</th>
            <th className="text-left font-normal pb-2 px-2 w-[18%]">Empresa</th>
            <th className="text-right font-normal pb-2 px-2 w-[18%]">Valor projetado</th>
            <th className="text-center font-normal pb-2 px-2 w-[8%]">DRE</th>
            <th className="text-center font-normal pb-2 px-2 w-[8%]" title="Marcar para eliminar essa despesa">Eliminar</th>
            <th className="pb-2 pr-1 w-10"></th>
          </tr>
        </thead>
        <DndContext sensors={rowSensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis, restrictToParentElement]} onDragEnd={onRowDragEnd}>
          <SortableContext items={rowIds} strategy={verticalListSortingStrategy}>
            <tbody>
              {rows.map(i => (
                <SortableTipoRow
                  key={i.id}
                  i={i}
                  categorias={categorias}
                  empresasAtivas={empresasAtivas}
                  update={update}
                  remove={remove}
                />
              ))}
            </tbody>
          </SortableContext>
        </DndContext>
      </table>
      )}
    </div>
  );
}

function SortableTipoRow({
  i, categorias, empresasAtivas, update, remove,
}: {
  i: TipoCusto;
  categorias: CategoriaDespesa[];
  empresasAtivas: any[];
  update: ReturnType<typeof useTiposCustos>['updateTipoCusto'];
  remove: (id: string) => void | Promise<any>;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: i.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  } as React.CSSProperties;
  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`border-b border-white/5 hover:bg-white/[0.03] group/row ${!i.ativo ? 'opacity-50' : ''} ${i.marcada_para_eliminar ? 'border-l-2 border-l-red-500/60' : ''}`}
    >
      <td className="py-2 w-6 align-middle">
        <button
          {...attributes}
          {...listeners}
          type="button"
          className="p-0.5 rounded hover:bg-white/10 text-white/30 hover:text-white/70 cursor-grab active:cursor-grabbing opacity-0 group-hover/row:opacity-100 transition-opacity"
          title="Arrastar para reordenar"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </button>
      </td>
      <td className="py-2 pl-1 text-white/90">
        <InlineText value={i.nome} onSave={(v) => update(i.id, { nome: v })} />
      </td>
      <td className="px-2">
        <select
          value={i.categoria_id || ''}
          onChange={(e) => update(i.id, { categoria_id: e.target.value || null } as any)}
          className={categoriaSelectClass(categorias, i.categoria_id)}
        >
          <option value="" className="bg-slate-900 text-white">— Sem categoria</option>
          {categorias.map(c => <option key={c.id} value={c.id} className="bg-slate-900 text-white">{c.nome}</option>)}
        </select>
      </td>
      <td className="px-2 text-white/50">
        <select
          value={i.empresa_id || ''}
          onChange={(e) => update(i.id, { empresa_id: e.target.value || null })}
          className="w-full h-7 bg-transparent border border-transparent hover:border-white/10 focus:border-white/20 rounded px-1.5 text-white/50 text-xs outline-none transition-colors"
        >
          <option value="" className="bg-slate-900">—</option>
          {empresasAtivas.map((e: any) => (
            <option key={e.id} value={e.id} className="bg-slate-900">{e.nome}</option>
          ))}
        </select>
      </td>
      <td className={`px-2 text-right font-medium ${i.marcada_para_eliminar ? 'text-red-400 line-through' : 'text-white'}`}>
        <InlineNum value={i.valor_maximo_mensal} onSave={(v) => update(i.id, { valor_maximo_mensal: v })} format="currency" />
      </td>
      <td className="px-2 text-center">
        <Switch checked={i.aparece_no_dre} onCheckedChange={(v) => update(i.id, { aparece_no_dre: v })} />
      </td>
      <td className="px-2 text-center">
        <button
          type="button"
          onClick={() => update(i.id, { marcada_para_eliminar: !i.marcada_para_eliminar } as any)}
          title={i.marcada_para_eliminar ? 'Desmarcar — manter despesa' : 'Marcar para eliminar essa despesa'}
          className={`inline-flex items-center justify-center w-7 h-7 rounded transition-colors ${
            i.marcada_para_eliminar
              ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
              : 'text-white/30 hover:text-red-300 hover:bg-red-500/10'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
        </button>
      </td>
      <td className="pr-1 text-right">
        <button onClick={() => remove(i.id)} className="p-1 rounded hover:bg-red-500/20 text-red-300/70 hover:text-red-300">
          <Trash2 className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
}

function SortableCategoriaGroup(props: {
  id: string;
  cat: CategoriaDespesa;
  palette: { color: string; dot: string };
  rows: TipoCusto[];
  categorias: CategoriaDespesa[];
  empresasAtivas: any[];
  update: ReturnType<typeof useTiposCustos>['updateTipoCusto'];
  remove: (id: string) => void | Promise<any>;
  rename: ReturnType<typeof useDespesasCategorias>['renameCategoria'];
  removeCat: ReturnType<typeof useDespesasCategorias>['removeCategoria'];
  expanded: boolean;
  onToggle: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  const handle = (
    <button
      {...attributes}
      {...listeners}
      className="p-0.5 rounded hover:bg-white/10 text-white/40 hover:text-white/80 cursor-grab active:cursor-grabbing"
      title="Arrastar categoria"
      type="button"
    >
      <GripVertical className="w-3.5 h-3.5" />
    </button>
  );
  return (
    <div ref={setNodeRef} style={style}>
      <CategoriaGroup
        cat={props.cat}
        palette={props.palette}
        rows={props.rows}
        categorias={props.categorias}
        empresasAtivas={props.empresasAtivas}
        update={props.update}
        remove={props.remove}
        rename={props.rename}
        removeCat={props.removeCat}
        dragHandle={handle}
        expanded={props.expanded}
        onToggle={props.onToggle}
      />
    </div>
  );
}