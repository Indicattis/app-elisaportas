import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/utils';
import { Users, Receipt, TrendingDown, Trash2, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDespesasPadrao } from '@/hooks/useDespesasPadrao';
import type { DespesaPadrao } from '@/hooks/useDespesasPadrao';

type FolhaRow = {
  id: string;
  mes_referencia: string;
  admin_user_id: string;
  colaborador_nome: string;
  salario: number;
  aux_combustivel: number;
  insalubridade_pct: number;
  fgts_pct: number;
  previsao_13_valor: number;
  total: number;
};

type LancRow = {
  id: string;
  mes_referencia: string;
  tipo_custo_id: string | null;
  categoria: 'fixa' | 'variavel';
  tipo_nome: string;
  valor: number;
  data: string;
  descricao: string | null;
};

type Colab = {
  id: string;
  nome: string;
  salario: number;
  aux_combustivel: number;
  insalubridade_pct: number;
  fgts_pct: number;
  previsao_13_valor: number;
  em_folha: boolean;
};

type TipoCusto = { id: string; nome: string; tipo: 'fixa' | 'variavel' };

function calcTotalFolha(f: { salario: number; aux_combustivel: number; insalubridade_pct: number; fgts_pct: number; previsao_13_valor: number }) {
  const insalub = f.salario * (f.insalubridade_pct || 0) / 100;
  const fgts = f.salario * (f.fgts_pct || 0) / 100;
  const ferias = f.salario / 3 + fgts;
  return f.salario + f.aux_combustivel + insalub + fgts + f.previsao_13_valor + ferias;
}

interface Props {
  mes: string | null;
  ano?: number;
  onMediaMensalChange?: (media: number) => void;
  onDataChange?: () => void;
}

export default function DespesasResumoTopo({ mes, onMediaMensalChange, onDataChange }: Props) {
  const [folha, setFolha] = useState<FolhaRow[]>([]);
  const [fixas, setFixas] = useState<LancRow[]>([]);
  const [variaveis, setVariaveis] = useState<LancRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [reloadV, setReloadV] = useState(0);
  const reload = () => { setReloadV(v => v + 1); onDataChange?.(); };

  const [colabs, setColabs] = useState<Colab[]>([]);
  const [tipos, setTipos] = useState<TipoCusto[]>([]);
  const [confirmDel, setConfirmDel] = useState<null | { kind: 'folha' | 'lanc'; id: string }>(null);

  const { items: padroes } = useDespesasPadrao();

  const mesStart = mes ? `${mes}-01` : null;

  useEffect(() => {
    // Sem pré-carregamento: a página passa a se basear apenas em "Configurações padrão".
    setColabs([]);
    setTipos([]);
  }, []);

  useEffect(() => {
    if (!mes || !mesStart) {
      setFolha([]); setFixas([]); setVariaveis([]);
      onMediaMensalChange?.(0);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [{ data: f }, { data: l }] = await Promise.all([
          supabase.from('despesas_manuais_folha' as any).select('*').eq('mes_referencia', mesStart).order('colaborador_nome'),
          supabase.from('despesas_manuais_lancamentos' as any).select('*').eq('mes_referencia', mesStart).order('data'),
        ]);
        if (cancelled) return;
        const folhaArr = (f || []) as unknown as FolhaRow[];
        const lancArr = (l || []) as unknown as LancRow[];
        setFolha(folhaArr);
        setFixas(lancArr.filter(x => x.categoria === 'fixa'));
        setVariaveis(lancArr.filter(x => x.categoria === 'variavel'));
        const total =
          folhaArr.reduce((s, x) => s + Number(x.total || 0), 0) +
          lancArr.reduce((s, x) => s + Number(x.valor || 0), 0);
        onMediaMensalChange?.(total);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [mes, mesStart, reloadV]);

  const handleDelete = async () => {
    if (!confirmDel) return;
    const table = confirmDel.kind === 'folha' ? 'despesas_manuais_folha' : 'despesas_manuais_lancamentos';
    const { error } = await supabase.from(table as any).delete().eq('id', confirmDel.id);
    if (error) { toast.error('Erro ao excluir: ' + error.message); return; }
    setConfirmDel(null);
    toast.success('Excluído');
    reload();
  };

  const handlePatchFolha = async (
    id: string,
    field: 'salario' | 'aux_combustivel' | 'insalubridade_pct' | 'fgts_pct' | 'previsao_13_valor',
    value: number,
  ) => {
    const current = folha.find(r => r.id === id);
    if (!current) return;
    const updated = { ...current, [field]: value };
    const total = calcTotalFolha(updated);
    setFolha(prev => prev.map(r => r.id === id ? { ...updated, total } : r));
    const { error } = await supabase
      .from('despesas_manuais_folha' as any)
      .update({ [field]: value, total } as any)
      .eq('id', id);
    if (error) {
      toast.error('Erro ao salvar: ' + error.message);
      reload();
      return;
    }
    onDataChange?.();
  };

  const handleInsertFolha = async (payload: {
    colab: Colab;
    salario: number; aux_combustivel: number; insalubridade_pct: number; fgts_pct: number; previsao_13_valor: number;
  }) => {
    if (!mesStart) return;
    const total = calcTotalFolha(payload);
    const userId = (await supabase.auth.getUser()).data.user?.id || null;
    const { error } = await supabase.from('despesas_manuais_folha' as any).insert({
      mes_referencia: mesStart,
      admin_user_id: payload.colab.id,
      colaborador_nome: payload.colab.nome,
      salario: payload.salario,
      aux_combustivel: payload.aux_combustivel,
      insalubridade_pct: payload.insalubridade_pct,
      fgts_pct: payload.fgts_pct,
      previsao_13_valor: payload.previsao_13_valor,
      total,
      created_by: userId,
    } as any);
    if (error) { toast.error('Erro ao salvar: ' + error.message); return; }
    toast.success('Lançamento de folha adicionado');
    reload();
  };

  const handleInsertLanc = async (payload: {
    tipo: TipoCusto; categoria: 'fixa' | 'variavel'; valor: number; data: string; descricao: string;
  }) => {
    if (!mesStart) return;
    const userId = (await supabase.auth.getUser()).data.user?.id || null;
    const { error } = await supabase.from('despesas_manuais_lancamentos' as any).insert({
      mes_referencia: mesStart,
      tipo_custo_id: payload.tipo.id,
      categoria: payload.categoria,
      tipo_nome: payload.tipo.nome,
      valor: payload.valor,
      data: payload.data,
      descricao: payload.descricao || null,
      created_by: userId,
    } as any);
    if (error) { toast.error('Erro ao salvar: ' + error.message); return; }
    toast.success('Lançamento adicionado');
    reload();
  };

  if (!mes) {
    return (
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-8 text-center text-white/60">
        Selecione um mês acima para visualizar e cadastrar lançamentos.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 mb-6">
      <BlocoFolha
        rows={folha}
        loading={loading}
        colabs={colabs}
        padroesFolha={padroes.filter(p => p.tipo === 'folha')}
        onDelete={(id) => setConfirmDel({ kind: 'folha', id })}
        onPatch={handlePatchFolha}
        onInsert={handleInsertFolha}
      />
      <BlocoDespesa
        titulo="Despesas Fixas"
        icon={<Receipt className="w-4 h-4" />}
        rows={fixas}
        loading={loading}
        categoria="fixa"
        tipos={tipos.filter(t => t.tipo === 'fixa')}
        padroes={padroes.filter(p => p.tipo === 'fixa')}
        mesStart={mesStart || ''}
        onDelete={(id) => setConfirmDel({ kind: 'lanc', id })}
        onInsert={handleInsertLanc}
      />
      <BlocoDespesa
        titulo="Despesas Variáveis"
        icon={<TrendingDown className="w-4 h-4" />}
        rows={variaveis}
        loading={loading}
        categoria="variavel"
        tipos={tipos.filter(t => t.tipo === 'variavel')}
        padroes={padroes.filter(p => p.tipo === 'variavel')}
        mesStart={mesStart || ''}
        onDelete={(id) => setConfirmDel({ kind: 'lanc', id })}
        onInsert={handleInsertLanc}
      />

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ---------------- EditableCell ---------------- */

function EditableCell({
  value, format, onSave,
}: {
  value: number;
  format: 'currency' | 'percent';
  onSave: (v: number) => void | Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value ?? 0));
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (!editing) setDraft(String(value ?? 0)); }, [value, editing]);

  const display = format === 'currency'
    ? formatCurrency(Number(value) || 0)
    : `${(Number(value) || 0).toFixed(2)}%`;

  const commit = async () => {
    const parsed = Number(String(draft).replace(',', '.'));
    if (Number.isNaN(parsed)) { setEditing(false); setDraft(String(value)); return; }
    if (parsed === Number(value)) { setEditing(false); return; }
    setSaving(true);
    try { await onSave(parsed); } finally { setSaving(false); setEditing(false); }
  };

  if (editing) {
    return (
      <input
        autoFocus
        type="number"
        step="0.01"
        value={draft}
        disabled={saving}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLInputElement).blur(); }
          else if (e.key === 'Escape') { setDraft(String(value)); setEditing(false); }
        }}
        onFocus={(e) => e.currentTarget.select()}
        className="w-full bg-white/10 border border-blue-400/50 rounded px-1 py-0.5 text-right text-white text-sm outline-none"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="w-full text-right px-1 py-0.5 rounded hover:bg-white/10 cursor-pointer transition-colors"
      title="Clique para editar"
    >
      {display}
    </button>
  );
}

/* ---------------- Folha block ---------------- */

function BlocoFolha({
  rows, loading, colabs, padroesFolha, onDelete, onPatch, onInsert,
}: {
  rows: FolhaRow[];
  loading: boolean;
  colabs: Colab[];
  padroesFolha: DespesaPadrao[];
  onDelete: (id: string) => void;
  onPatch: (
    id: string,
    field: 'salario' | 'aux_combustivel' | 'insalubridade_pct' | 'fgts_pct' | 'previsao_13_valor',
    value: number,
  ) => void | Promise<void>;
  onInsert: (payload: {
    colab: Colab;
    salario: number; aux_combustivel: number; insalubridade_pct: number; fgts_pct: number; previsao_13_valor: number;
  }) => Promise<void>;
}) {
  const total = rows.reduce((s, r) => s + Number(r.total || 0), 0);

  // Lista unificada por nome: lançamentos salvos + colaboradores cadastrados + padrões.
  const norm = (s: string) => s.trim().toLowerCase();
  const colabsByNome = new Map(colabs.map(c => [norm(c.nome), c]));
  const padroesByNome = new Map(padroesFolha.map(p => [norm(p.nome), p]));
  const rowsByNome = new Map(rows.map(r => [norm(r.colaborador_nome), r]));

  const nomes = new Set<string>([
    ...colabs.map(c => norm(c.nome)),
    ...padroesFolha.map(p => norm(p.nome)),
    ...rows.map(r => norm(r.colaborador_nome)),
  ]);

  const sortedColabs: Colab[] = Array.from(nomes).map((key) => {
    const c = colabsByNome.get(key);
    if (c) return c;
    const p = padroesByNome.get(key);
    if (p) {
      return {
        id: p.id,
        nome: p.nome,
        salario: p.salario,
        aux_combustivel: p.aux_combustivel,
        insalubridade_pct: p.insalubridade_pct,
        fgts_pct: p.fgts_pct,
        previsao_13_valor: p.previsao_13_valor,
        em_folha: true,
      };
    }
    // Só existe como lançamento salvo (sem padrão nem cadastro)
    const r = rowsByNome.get(key)!;
    return {
      id: r.id,
      nome: r.colaborador_nome,
      salario: 0,
      aux_combustivel: 0,
      insalubridade_pct: 0,
      fgts_pct: 8,
      previsao_13_valor: 0,
      em_folha: true,
    };
  }).sort((a, b) => a.nome.localeCompare(b.nome));

  const insertField = async (
    colab: Colab,
    field: 'salario' | 'aux_combustivel' | 'insalubridade_pct' | 'fgts_pct' | 'previsao_13_valor',
    value: number,
  ) => {
    const payload = {
      salario: colab.salario,
      aux_combustivel: colab.aux_combustivel,
      insalubridade_pct: colab.insalubridade_pct,
      fgts_pct: colab.fgts_pct,
      previsao_13_valor: colab.previsao_13_valor,
    };
    payload[field] = value;
    await onInsert({ colab, ...payload });
  };

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-5">
      <div className="flex items-center gap-2 text-white mb-3">
        <Users className="w-4 h-4" />
        <h3 className="font-semibold">Folha Salarial</h3>
        <span className="text-white/40 text-sm">({rows.length}/{sortedColabs.length})</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[1200px]">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-white/40 border-b border-white/10">
              <th className="text-left font-normal pb-2 pl-1">Colaborador</th>
              <th className="text-center font-normal pb-2 px-1">Em folha</th>
              <th className="text-center font-normal pb-2 px-1 w-10">Status</th>
              <th className="text-right font-normal pb-2 px-2 text-emerald-400">Salário</th>
              <th className="text-right font-normal pb-2 px-2">Combustível</th>
              <th className="text-right font-normal pb-2 px-2">Insalub %</th>
              <th className="text-right font-normal pb-2 px-2">Insalub valor</th>
              <th className="text-right font-normal pb-2 px-2">FGTS %</th>
              <th className="text-right font-normal pb-2 px-2">FGTS valor</th>
              <th className="text-right font-normal pb-2 px-2">Previsão 13° + FGTS 13°</th>
              <th className="text-right font-normal pb-2 px-2">Férias + 1/3 + FGTS</th>
              <th className="text-right font-normal pb-2 px-2">Total</th>
              <th className="pb-2 pr-1"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={13} className="text-white/40 px-2 py-3">Carregando...</td></tr>
            ) : sortedColabs.length === 0 ? (
              <tr><td colSpan={13} className="text-white/40 px-2 py-3 text-center">Nenhum padrão cadastrado. Configure em "Configurações padrão".</td></tr>
            ) : sortedColabs.map(colab => {
              const r = rowsByNome.get(norm(colab.nome));
              const salario = r ? Number(r.salario) : colab.salario;
              const aux_combustivel = r ? Number(r.aux_combustivel) : colab.aux_combustivel;
              const insalubridade_pct = r ? Number(r.insalubridade_pct) : colab.insalubridade_pct;
              const fgts_pct = r ? Number(r.fgts_pct) : colab.fgts_pct;
              const previsao_13_valor = r ? Number(r.previsao_13_valor) : colab.previsao_13_valor;
              const insalubVal = salario * (insalubridade_pct || 0) / 100;
              const fgtsVal = salario * (fgts_pct || 0) / 100;
              const prev13ComFgts = previsao_13_valor * (1 + (fgts_pct || 0) / 100);
              const feriasComUmTerco = salario / 3 + fgtsVal;
              const totalVal = calcTotalFolha({ salario, aux_combustivel, insalubridade_pct, fgts_pct, previsao_13_valor });
              return (
                <tr key={colab.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                  <td className="py-2 pl-1 text-white/90">{colab.nome}</td>
                  <td className="py-2 px-1 text-center">
                    {colab.em_folha ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-400/15 text-emerald-300 border border-emerald-400/20">Sim</span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/10 text-white/50 border border-white/10">Não</span>
                    )}
                  </td>
                  <td className="py-2 px-1 text-center">
                    {r ? (
                      <span title="Em folha" className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-400/15 text-emerald-300 text-[10px]">&#9679;</span>
                    ) : (
                      <span title="Sem folha" className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-400/15 text-red-300 text-[10px]">&#9679;</span>
                    )}
                  </td>
                  <td className={`px-2 text-right ${r ? 'text-emerald-400 font-medium' : 'text-white/60'}`}>
                    {r ? (
                      <EditableCell value={salario} format="currency" onSave={(v) => onPatch(r.id, 'salario', v)} />
                    ) : (
                      <EditableCell value={salario} format="currency" onSave={(v) => insertField(colab, 'salario', v)} />
                    )}
                  </td>
                  <td className={`px-2 text-right text-white/60`}>
                    {r ? (
                      <EditableCell value={aux_combustivel} format="currency" onSave={(v) => onPatch(r.id, 'aux_combustivel', v)} />
                    ) : (
                      <EditableCell value={aux_combustivel} format="currency" onSave={(v) => insertField(colab, 'aux_combustivel', v)} />
                    )}
                  </td>
                  <td className={`px-2 text-right text-white/60`}>
                    {r ? (
                      <EditableCell value={insalubridade_pct} format="percent" onSave={(v) => onPatch(r.id, 'insalubridade_pct', v)} />
                    ) : (
                      <EditableCell value={insalubridade_pct} format="percent" onSave={(v) => insertField(colab, 'insalubridade_pct', v)} />
                    )}
                  </td>
                  <td className={`px-2 text-right ${r ? 'text-white/60' : 'text-white/30'}`}>{formatCurrency(insalubVal)}</td>
                  <td className={`px-2 text-right text-white/60`}>
                    {r ? (
                      <EditableCell value={fgts_pct} format="percent" onSave={(v) => onPatch(r.id, 'fgts_pct', v)} />
                    ) : (
                      <EditableCell value={fgts_pct} format="percent" onSave={(v) => insertField(colab, 'fgts_pct', v)} />
                    )}
                  </td>
                  <td className={`px-2 text-right ${r ? 'text-white/60' : 'text-white/30'}`}>{formatCurrency(fgtsVal)}</td>
                  <td className={`px-2 text-right text-white/60`}>
                    {r ? (
                      <EditableCell value={previsao_13_valor} format="currency" onSave={(v) => onPatch(r.id, 'previsao_13_valor', v)} />
                    ) : (
                      <EditableCell value={previsao_13_valor} format="currency" onSave={(v) => insertField(colab, 'previsao_13_valor', v)} />
                    )}
                  </td>
                  <td className={`px-2 text-right ${r ? 'text-white/60' : 'text-white/30'}`}>{formatCurrency(feriasComUmTerco)}</td>
                  <td className="px-2 text-right text-white font-medium">{formatCurrency(totalVal)}</td>
                  <td className="pr-1 text-right">
                    {r && (
                      <button
                        onClick={() => onDelete(r.id)}
                        className="p-1 rounded hover:bg-red-500/20 text-red-300/70 hover:text-red-300"
                        aria-label="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between px-2">
        <span className="text-xs text-white/50 uppercase tracking-wider">Total</span>
        <span className="text-base font-bold text-white">{formatCurrency(total)}</span>
      </div>
    </div>
  );
}

/* ---------------- Despesa block ---------------- */

function BlocoDespesa({
  titulo, icon, rows, loading, categoria, tipos, padroes, mesStart, onDelete, onInsert,
}: {
  titulo: string;
  icon: React.ReactNode;
  rows: LancRow[];
  loading: boolean;
  categoria: 'fixa' | 'variavel';
  tipos: TipoCusto[];
  padroes: DespesaPadrao[];
  mesStart: string;
  onDelete: (id: string) => void;
  onInsert: (payload: {
    tipo: TipoCusto; categoria: 'fixa' | 'variavel'; valor: number; data: string; descricao: string;
  }) => Promise<void>;
}) {
  const total = rows.reduce((s, r) => s + Number(r.valor || 0), 0);

  const [tipoId, setTipoId] = useState('');
  const [descricao, setDescricao] = useState('');
  const [data, setData] = useState(mesStart);
  const [valor, setValor] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setData(mesStart); }, [mesStart]);

  const selectedTipo = tipos.find(t => t.id === tipoId);

  const clear = () => { setTipoId(''); setDescricao(''); setData(mesStart); setValor(0); };

  const save = async () => {
    if (!selectedTipo || !data || valor <= 0) return;
    setSaving(true);
    try {
      await onInsert({ tipo: selectedTipo, categoria, valor, data, descricao });
      clear();
    } finally { setSaving(false); }
  };

  // Sugestões: padrões cujo nome ainda não existe em algum lançamento do mês
  const nomesExistentes = new Set(rows.map(r => (r.tipo_nome || '').trim().toLowerCase()));
  const sugestoes = padroes.filter(p => !nomesExistentes.has(p.nome.trim().toLowerCase()));

  const aplicarSugestao = async (sug: DespesaPadrao, novoValor: number) => {
    if (novoValor <= 0) return;
    const tipoSugestao: TipoCusto = { id: sug.id, nome: sug.nome, tipo: categoria };
    await onInsert({ tipo: tipoSugestao, categoria, valor: novoValor, data: mesStart, descricao: '' });
  };

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-5">
      <div className="flex items-center gap-2 text-white mb-3">
        {icon}
        <h3 className="font-semibold">{titulo}</h3>
        <span className="text-white/40 text-sm">({rows.length})</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-white/40 border-b border-white/10">
              <th className="text-left font-normal pb-2 pl-1 w-[28%]">Tipo</th>
              <th className="text-left font-normal pb-2 px-2">Descrição</th>
              <th className="text-left font-normal pb-2 px-2 w-[140px]">Data</th>
              <th className="text-right font-normal pb-2 px-2 w-[140px]">Valor pago</th>
              <th className="pb-2 pr-1 w-[80px]"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-white/40 px-2 py-3">Carregando...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={5} className="text-white/40 px-2 py-3 text-center">Nenhum lançamento ainda.</td></tr>
            ) : rows.map(r => (
              <tr key={r.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                <td className="py-2 pl-1 text-white/90">{r.tipo_nome}</td>
                <td className="px-2 text-white/60">{r.descricao || '—'}</td>
                <td className="px-2 text-white/60">{r.data.split('-').reverse().join('/')}</td>
                <td className="px-2 text-right text-white font-medium">{formatCurrency(r.valor)}</td>
                <td className="pr-1 text-right">
                  <button
                    onClick={() => onDelete(r.id)}
                    className="p-1 rounded hover:bg-red-500/20 text-red-300/70 hover:text-red-300"
                    aria-label="Excluir"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}

            {/* ------ Sugestões padrão ------ */}
            {!loading && sugestoes.map(sug => (
              <tr key={`sug-${sug.id}`} className="border-b border-white/5 hover:bg-white/[0.03]">
                <td className="py-2 pl-1 text-white/40 italic">
                  {sug.nome}
                  <span className="ml-2 text-[9px] uppercase tracking-wider bg-white/5 border border-white/10 text-white/40 px-1.5 py-0.5 rounded">Padrão</span>
                </td>
                <td className="px-2 text-white/30">—</td>
                <td className="px-2 text-white/30">{mesStart.split('-').reverse().join('/')}</td>
                <td className="px-2 text-right">
                  <EditableCell value={sug.valor} format="currency" onSave={(v) => aplicarSugestao(sug, v)} />
                </td>
                <td className="pr-1" />
              </tr>
            ))}

            {/* ------ Add row ------ */}
            {tipos.length > 0 && <tr className="border-b border-white/5 hover:bg-white/[0.03]">
              <td className="py-2 pl-1">
                <Select value={tipoId} onValueChange={setTipoId}>
                  <SelectTrigger className="h-8 text-xs bg-white/5 border-white/10">
                    <SelectValue placeholder="Selecione tipo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {tipos.map(t => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </td>
              <td className="px-2">
                <input
                  type="text"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Opcional"
                  className="w-full h-8 bg-white/5 border border-white/10 rounded px-2 text-white text-xs outline-none focus:border-blue-400/50"
                />
              </td>
              <td className="px-2">
                <input
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  className="w-full h-8 bg-white/5 border border-white/10 rounded px-2 text-white text-xs outline-none focus:border-blue-400/50"
                />
              </td>
              <td className="px-2">
                <NumInput value={valor} onChange={setValor} />
              </td>
              <td className="pr-1">
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={save}
                    disabled={!selectedTipo || valor <= 0 || saving}
                    className="p-1 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Salvar"
                    title="Salvar"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={clear}
                    className="p-1 rounded hover:bg-white/10 text-white/50"
                    aria-label="Limpar"
                    title="Limpar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>}
          </tbody>
        </table>
      </div>

      <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between px-2">
        <span className="text-xs text-white/50 uppercase tracking-wider">Total</span>
        <span className="text-base font-bold text-white">{formatCurrency(total)}</span>
      </div>
    </div>
  );
}

/* ---------------- NumInput ---------------- */

function NumInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <input
      type="number"
      step="0.01"
      value={value || ''}
      onChange={(e) => onChange(Number(e.target.value) || 0)}
      onFocus={(e) => e.currentTarget.select()}
      placeholder="0"
      className="w-full h-8 bg-white/5 border border-white/10 rounded px-2 text-white text-xs text-right outline-none focus:border-blue-400/50"
    />
  );
}
