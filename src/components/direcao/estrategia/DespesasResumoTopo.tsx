import { Fragment, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/utils';
import { Users, Receipt, TrendingDown, Trash2, Check, X, Landmark, ChevronRight, ChevronDown } from 'lucide-react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDespesasPadrao } from '@/hooks/useDespesasPadrao';
import type { DespesaPadrao } from '@/hooks/useDespesasPadrao';


async function getCurrentUserInfo(): Promise<{ id: string | null; nome: string | null }> {
  const { data } = await supabase.auth.getUser();
  const id = data.user?.id || null;
  if (!id) return { id: null, nome: null };
  const { data: au } = await supabase
    .from('admin_users' as any)
    .select('nome')
    .eq('id', id)
    .maybeSingle();
  const nome = (au as any)?.nome || data.user?.email || null;
  return { id, nome };
}

export async function logStatusChange(payload: {
  mes_referencia: string;
  escopo: 'mes' | 'folha' | 'lanc';
  ref_id: string | null;
  ref_nome: string;
  status_anterior: 'pendente' | 'alana' | 'luan';
  status_novo: 'pendente' | 'alana' | 'luan';
}) {
  const { id, nome } = await getCurrentUserInfo();
  await supabase.from('despesas_status_historico' as any).insert({
    ...payload,
    changed_by: id,
    changed_by_nome: nome,
  } as any);
}

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
  confirmado_por?: 'alana' | 'luan';
};

type LancRow = {
  id: string;
  mes_referencia: string;
  tipo_custo_id: string | null;
  categoria: 'fixa' | 'variavel' | 'imposto';
  tipo_nome: string;
  valor: number;
  data: string;
  descricao: string | null;
  confirmado_por?: 'alana' | 'luan';
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

type TipoCusto = { id: string; nome: string; tipo: 'fixa' | 'variavel' | 'imposto' };

type GastoAgrupado = {
  tipo_custo_id: string;
  tipo_nome: string;
  total: number;
  quantidade: number;
  valor_projetado: number;
  itens: GastoItem[];
};

type GastoItem = {
  id: string;
  data: string;
  valor: number;
  descricao: string | null;
  responsavel_nome: string;
  banco_nome: string;
};

function calcTotalFolha(f: { salario: number; aux_combustivel: number; insalubridade_pct: number; fgts_pct: number; previsao_13_valor: number; em_folha?: boolean }) {
  if (f.em_folha === false) return Number(f.salario) || 0;
  const insalub = f.salario * (f.insalubridade_pct || 0) / 100;
  const fgts = f.salario * (f.fgts_pct || 0) / 100;
  const ferias = f.salario / 3;
  const prev13 = f.salario / 12;
  const fgts13 = fgts / 12;
  return f.salario + f.aux_combustivel + insalub + fgts + prev13 + fgts13 + ferias;
}

const norm = (s: string | null | undefined) => String(s || '').trim().toLowerCase();

interface Props {
  mes: string | null;
  ano?: number;
  onMediaMensalChange?: (media: number) => void;
  onDataChange?: () => void;
  reloadKey?: number;
  onRequestNovoGasto?: (categoria: 'fixa' | 'variavel' | 'imposto') => void;
}

export default function DespesasResumoTopo({ mes, onMediaMensalChange, onDataChange, reloadKey, onRequestNovoGasto }: Props) {
  const [folha, setFolha] = useState<FolhaRow[]>([]);
  const [impostos, setImpostos] = useState<LancRow[]>([]);
  const [gastosFixas, setGastosFixas] = useState<GastoAgrupado[]>([]);
  const [gastosVariaveis, setGastosVariaveis] = useState<GastoAgrupado[]>([]);
  const [loading, setLoading] = useState(false);
  const [reloadV, setReloadV] = useState(0);
  const reload = () => { setReloadV(v => v + 1); onDataChange?.(); };

  // External reload trigger
  useEffect(() => {
    if (reloadKey === undefined) return;
    setReloadV((v) => v + 1);
  }, [reloadKey]);

  const [colabs, setColabs] = useState<Colab[]>([]);
  const [tipos, setTipos] = useState<TipoCusto[]>([]);
  const [confirmDel, setConfirmDel] = useState<null | { kind: 'folha' | 'lanc'; id: string }>(null);

  const { items: padroes, remove: removePadrao } = useDespesasPadrao();

  const mesStart = mes ? `${mes}-01` : null;
  const padroesFolha = useMemo(() => padroes.filter(p => p.tipo === 'folha'), [padroes]);
  const padroesImpostos = useMemo(() => padroes.filter(p => p.tipo === 'imposto'), [padroes]);
  const totalExibido = useMemo(() => {
    const nomesFolha = new Set(folha.map(r => norm(r.colaborador_nome)));
    const nomesImpostos = new Set(impostos.map(r => norm(r.tipo_nome)));

    return folha.reduce((s, x) => s + Number(x.total || 0), 0)
      + padroesFolha.filter(p => !nomesFolha.has(norm(p.nome))).reduce((s, p) => s + calcTotalFolha({ ...p, em_folha: p.em_folha }), 0)
      + gastosFixas.reduce((s, x) => s + Number(x.total || 0), 0)
      + gastosVariaveis.reduce((s, x) => s + Number(x.total || 0), 0)
      + impostos.reduce((s, x) => s + Number(x.valor || 0), 0)
      + padroesImpostos.filter(p => !nomesImpostos.has(norm(p.nome))).reduce((s, p) => s + Number(p.valor || 0), 0);
  }, [folha, gastosFixas, gastosVariaveis, impostos, padroesFolha, padroesImpostos]);

  useEffect(() => {
    if (mes) onMediaMensalChange?.(totalExibido);
  }, [mes, totalExibido, onMediaMensalChange]);

  useEffect(() => {
    // Folha sempre derivada de despesas_padrao (configurações).
    setColabs([]);
  }, []);

  useEffect(() => {
    if (!mes || !mesStart) {
      setFolha([]); setImpostos([]); setGastosFixas([]); setGastosVariaveis([]);
      onMediaMensalChange?.(0);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        // Fim do mês
        const [y, m] = mes.split('-').map(Number);
        const lastDay = new Date(y, m, 0).getDate();
        const mesEnd = `${mes}-${String(lastDay).padStart(2, '0')}`;

        const [{ data: f }, { data: l }, { data: g }, { data: tiposAll }] = await Promise.all([
          supabase.from('despesas_manuais_folha' as any).select('*').eq('mes_referencia', mesStart).order('colaborador_nome'),
          supabase.from('despesas_manuais_lancamentos' as any).select('*').eq('mes_referencia', mesStart).order('data'),
          supabase.from('gastos' as any).select('id, tipo_custo_id, valor, data, descricao, responsavel_id, banco_id').gte('data', mesStart).lte('data', mesEnd),
          supabase.from('tipos_custos' as any).select('id, nome, tipo, aparece_no_dre, valor_maximo_mensal, ativo').eq('ativo', true),
        ]);
        if (cancelled) return;
        const folhaArr = (f || []) as unknown as FolhaRow[];
        const lancArr = (l || []) as unknown as LancRow[];
        setFolha(folhaArr);
        setImpostos(lancArr.filter(x => x.categoria === 'imposto'));

        const gastosRows = (g || []) as unknown as Array<{ id: string; tipo_custo_id: string; valor: number; data: string; descricao: string | null; responsavel_id: string | null; banco_id: string | null }>;
        const tiposMap: Record<string, { nome: string; tipo: 'fixa' | 'variavel' | 'imposto'; aparece_no_dre: boolean; valor_maximo_mensal: number }> = {};
        ((tiposAll || []) as any[]).forEach(t => {
          tiposMap[t.id] = {
            nome: t.nome,
            tipo: t.tipo,
            aparece_no_dre: t.aparece_no_dre !== false,
            valor_maximo_mensal: Number(t.valor_maximo_mensal || 0),
          };
        });
        // Atualiza lista de tipos para uso nos blocos (Impostos usa para sugestões)
        setTipos(((tiposAll || []) as any[])
          .filter(t => t.aparece_no_dre !== false)
          .map(t => ({ id: t.id, nome: t.nome, tipo: t.tipo })));

        const respIds = Array.from(new Set(gastosRows.map(r => r.responsavel_id).filter(Boolean))) as string[];
        const bancoIds = Array.from(new Set(gastosRows.map(r => r.banco_id).filter(Boolean))) as string[];
        const respMap: Record<string, string> = {};
        const bancoMap: Record<string, string> = {};
        await Promise.all([
          respIds.length
            ? supabase.from('admin_users').select('user_id, nome').in('user_id', respIds).then(({ data }) => {
                (data || []).forEach((u: any) => { respMap[u.user_id] = u.nome; });
              })
            : Promise.resolve(),
          bancoIds.length
            ? supabase.from('bancos' as any).select('id, nome').in('id', bancoIds).then(({ data }) => {
                (data || []).forEach((b: any) => { bancoMap[b.id] = b.nome; });
              })
            : Promise.resolve(),
        ]);

        const agruparPor = (categoria: 'fixa' | 'variavel'): GastoAgrupado[] => {
          const acc = new Map<string, GastoAgrupado>();
          // Seed: todos os tipos da categoria aparecem mesmo sem gastos
          Object.entries(tiposMap).forEach(([id, t]) => {
            if (!t.aparece_no_dre || t.tipo !== categoria) return;
            acc.set(id, {
              tipo_custo_id: id,
              tipo_nome: t.nome,
              total: 0,
              quantidade: 0,
              valor_projetado: Number(t.valor_maximo_mensal || 0),
              itens: [],
            });
          });
          for (const r of gastosRows) {
            const t = tiposMap[r.tipo_custo_id];
            if (!t || !t.aparece_no_dre) continue;
            if (t.tipo !== categoria) continue;
            const item: GastoItem = {
              id: r.id,
              data: r.data,
              valor: Number(r.valor || 0),
              descricao: r.descricao,
              responsavel_nome: r.responsavel_id ? (respMap[r.responsavel_id] || '—') : '—',
              banco_nome: r.banco_id ? (bancoMap[r.banco_id] || '—') : '—',
            };
            const cur = acc.get(r.tipo_custo_id);
            if (cur) {
              cur.total += item.valor;
              cur.quantidade += 1;
              cur.itens.push(item);
            } else {
              acc.set(r.tipo_custo_id, {
                tipo_custo_id: r.tipo_custo_id,
                tipo_nome: t.nome,
                total: item.valor,
                quantidade: 1,
                valor_projetado: Number(t.valor_maximo_mensal || 0),
                itens: [item],
              });
            }
          }
          const out = Array.from(acc.values()).sort((a, b) => a.tipo_nome.localeCompare(b.tipo_nome));
          out.forEach(g => g.itens.sort((a, b) => b.data.localeCompare(a.data)));
          return out;
        };

        setGastosFixas(agruparPor('fixa'));
        setGastosVariaveis(agruparPor('variavel'));
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
    const emFolha = padroesFolha.find(p => norm(p.nome) === norm(current.colaborador_nome))?.em_folha ?? true;
    const total = calcTotalFolha({ ...updated, em_folha: emFolha });
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
    const total = calcTotalFolha({ ...payload, em_folha: payload.colab.em_folha });
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
    tipo: TipoCusto; categoria: 'fixa' | 'variavel' | 'imposto'; valor: number; data: string; descricao: string;
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

  const handleUpdateLanc = async (
    id: string,
    patch: Partial<{ valor: number; data: string; descricao: string | null; tipo_nome: string }>,
  ) => {
    // optimistic update
    const apply = (arr: LancRow[]) => arr.map(r => r.id === id ? { ...r, ...patch } as LancRow : r);
    setImpostos(prev => apply(prev));
    const { error } = await supabase
      .from('despesas_manuais_lancamentos' as any)
      .update(patch as any)
      .eq('id', id);
    if (error) {
      toast.error('Erro ao salvar: ' + error.message);
      reload();
      return;
    }
    onDataChange?.();
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
        padroesFolha={padroesFolha}
        onDelete={(id) => setConfirmDel({ kind: 'folha', id })}
        onPatch={handlePatchFolha}
        onInsert={handleInsertFolha}
        onDeletePadrao={async (id) => { await removePadrao(id); reload(); }}
      />
      <BlocoGastosReadonly
        titulo="Despesas Fixas"
        icon={<Receipt className="w-4 h-4" />}
        rows={gastosFixas}
        loading={loading}
        onAddGasto={onRequestNovoGasto ? () => onRequestNovoGasto('fixa') : undefined}
      />
      <BlocoGastosReadonly
        titulo="Despesas Variáveis"
        icon={<TrendingDown className="w-4 h-4" />}
        rows={gastosVariaveis}
        loading={loading}
        onAddGasto={onRequestNovoGasto ? () => onRequestNovoGasto('variavel') : undefined}
      />
      <BlocoDespesa
        titulo="Despesas de Imposto"
        icon={<Landmark className="w-4 h-4" />}
        rows={impostos}
        loading={loading}
        categoria="imposto"
        tipos={tipos.filter(t => t.tipo === 'imposto')}
        padroes={padroesImpostos}
        mesStart={mesStart || ''}
        onDelete={(id) => setConfirmDel({ kind: 'lanc', id })}
        onInsert={handleInsertLanc}
        onUpdate={handleUpdateLanc}
        onDeletePadrao={async (id) => { await removePadrao(id); reload(); }}
        onAddGasto={onRequestNovoGasto ? () => onRequestNovoGasto('imposto') : undefined}
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
  rows, loading, colabs, padroesFolha, onDelete, onPatch, onInsert, onDeletePadrao,
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
  onDeletePadrao: (id: string) => Promise<void> | void;
}) {
  // Lista unificada por nome: lançamentos salvos + colaboradores cadastrados + padrões.
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
        em_folha: p.em_folha ?? true,
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

  const total = sortedColabs.reduce((s, colab) => {
    const r = rowsByNome.get(norm(colab.nome));
    const valores = r ? r : colab;
    return s + calcTotalFolha({
      salario: Number(valores.salario) || 0,
      aux_combustivel: Number(valores.aux_combustivel) || 0,
      insalubridade_pct: Number(valores.insalubridade_pct) || 0,
      fgts_pct: Number(valores.fgts_pct) || 0,
      previsao_13_valor: Number(valores.previsao_13_valor) || 0,
      em_folha: colab.em_folha,
    });
  }, 0);

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

  // Form para adicionar colaborador avulso (não vira padrão)
  const [addNome, setAddNome] = useState('');
  const [addSalario, setAddSalario] = useState(0);
  const [addAux, setAddAux] = useState(0);
  const [addInsalub, setAddInsalub] = useState(0);
  const [addFgts, setAddFgts] = useState(8);
  const [addPrev13, setAddPrev13] = useState(0);
  const [addSaving, setAddSaving] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  const addClear = () => {
    setAddNome(''); setAddSalario(0); setAddAux(0); setAddInsalub(0); setAddFgts(8); setAddPrev13(0);
  };

  const addSave = async () => {
    if (!addNome.trim() || addSalario <= 0) return;
    setAddSaving(true);
    try {
      const adHoc: Colab = {
        id: crypto.randomUUID(),
        nome: addNome.trim(),
        salario: addSalario,
        aux_combustivel: addAux,
        insalubridade_pct: addInsalub,
        fgts_pct: addFgts,
        previsao_13_valor: addPrev13,
        em_folha: true,
      };
      await onInsert({
        colab: adHoc,
        salario: addSalario,
        aux_combustivel: addAux,
        insalubridade_pct: addInsalub,
        fgts_pct: addFgts,
        previsao_13_valor: addPrev13,
      });
      addClear();
      setShowAdd(false);
    } finally { setAddSaving(false); }
  };

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-5">
      <div className="flex items-center gap-2 text-white mb-3">
        <Users className="w-4 h-4" />
        <h3 className="text-xl font-semibold">Folha Salarial</h3>
        <span className="text-white/40 text-sm">({rows.length}/{sortedColabs.length})</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[1200px]">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-white/40 border-b border-white/10">
              <th className="text-left font-normal pb-2 pl-1">Colaborador</th>
              <th className="text-center font-normal pb-2 px-1">Em folha</th>
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
              <tr><td colSpan={12} className="text-white/40 px-2 py-3">Carregando...</td></tr>
            ) : sortedColabs.length === 0 ? (
              <tr><td colSpan={12} className="text-white/40 px-2 py-3 text-center">Nenhum padrão cadastrado. Configure em "Configurações padrão".</td></tr>
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
              const totalVal = calcTotalFolha({ salario, aux_combustivel, insalubridade_pct, fgts_pct, previsao_13_valor, em_folha: colab.em_folha });
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
                  <td className="px-2 text-right text-orange-400">{formatCurrency(insalubVal)}</td>
                  <td className={`px-2 text-right text-white/60`}>
                    {r ? (
                      <EditableCell value={fgts_pct} format="percent" onSave={(v) => onPatch(r.id, 'fgts_pct', v)} />
                    ) : (
                      <EditableCell value={fgts_pct} format="percent" onSave={(v) => insertField(colab, 'fgts_pct', v)} />
                    )}
                  </td>
                  <td className="px-2 text-right text-orange-400">{formatCurrency(fgtsVal)}</td>
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
                    {r ? (
                      <button
                        onClick={() => onDelete(r.id)}
                        className="p-1 rounded hover:bg-red-500/20 text-red-300/70 hover:text-red-300"
                        aria-label="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    ) : padroesByNome.get(norm(colab.nome)) ? (
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onInsert({ colab, salario, aux_combustivel, insalubridade_pct, fgts_pct, previsao_13_valor })}
                          className="p-1 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                          aria-label="Confirmar sugestão"
                          title="Confirmar sugestão"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDeletePadrao(colab.id)}
                          className="p-1 rounded hover:bg-red-500/20 text-red-300/50 hover:text-red-300"
                          aria-label="Remover sugestão"
                          title="Remover sugestão padrão"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : null}
                  </td>
                </tr>
              );
            })}

            {/* ------ Add colaborador avulso ------ */}
            {showAdd && (
            <tr className="border-b border-white/5 hover:bg-white/[0.03] bg-white/[0.02]">
              <td className="py-2 pl-1">
                <input
                  type="text"
                  value={addNome}
                  onChange={(e) => setAddNome(e.target.value)}
                  placeholder="Novo colaborador..."
                  className="w-full h-8 bg-white/5 border border-white/10 rounded px-2 text-white text-xs outline-none focus:border-blue-400/50"
                />
              </td>
              <td></td>
              <td className="px-2"><NumInput value={addSalario} onChange={setAddSalario} /></td>
              <td className="px-2"><NumInput value={addAux} onChange={setAddAux} /></td>
              <td className="px-2"><NumInput value={addInsalub} onChange={setAddInsalub} /></td>
              <td></td>
              <td className="px-2"><NumInput value={addFgts} onChange={setAddFgts} /></td>
              <td></td>
              <td className="px-2"><NumInput value={addPrev13} onChange={setAddPrev13} /></td>
              <td></td>
              <td></td>
              <td className="pr-1">
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={addSave}
                    disabled={!addNome.trim() || addSalario <= 0 || addSaving}
                    className="p-1 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Adicionar"
                    title="Adicionar"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => { addClear(); setShowAdd(false); }}
                    className="p-1 rounded hover:bg-white/10 text-white/50"
                    aria-label="Limpar"
                    title="Limpar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex justify-center">
        <button
          type="button"
          onClick={() => setShowAdd(v => !v)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-xs transition-colors"
        >
          {showAdd ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {showAdd ? 'Cancelar' : 'Adicionar colaborador'}
        </button>
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
  titulo, icon, rows, loading, categoria, tipos, padroes, mesStart, onDelete, onInsert, onUpdate, onDeletePadrao, onAddGasto,
}: {
  titulo: string;
  icon: React.ReactNode;
  rows: LancRow[];
  loading: boolean;
  categoria: 'fixa' | 'variavel' | 'imposto';
  tipos: TipoCusto[];
  padroes: DespesaPadrao[];
  mesStart: string;
  onDelete: (id: string) => void;
  onInsert: (payload: {
    tipo: TipoCusto; categoria: 'fixa' | 'variavel' | 'imposto'; valor: number; data: string; descricao: string;
  }) => Promise<void>;
  onUpdate: (
    id: string,
    patch: Partial<{ valor: number; data: string; descricao: string | null; tipo_nome: string }>,
  ) => Promise<void>;
  onDeletePadrao: (id: string) => Promise<void> | void;
  onAddGasto?: () => void;
}) {
  const [tipoId, setTipoId] = useState('');
  const [customNome, setCustomNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [data, setData] = useState(mesStart);
  const [valor, setValor] = useState(0);
  const [saving, setSaving] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => { setData(mesStart); }, [mesStart]);

  const selectedTipo = tipos.find(t => t.id === tipoId);
  const isCustom = tipoId === '__custom__';

  const clear = () => { setTipoId(''); setCustomNome(''); setDescricao(''); setData(mesStart); setValor(0); };

  const canSave = (isCustom ? customNome.trim().length > 0 : !!selectedTipo) && !!data && valor > 0;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const tipoFinal: TipoCusto = isCustom
        ? { id: crypto.randomUUID(), nome: customNome.trim(), tipo: categoria }
        : selectedTipo!;
      await onInsert({ tipo: tipoFinal, categoria, valor, data, descricao });
      clear();
      setShowAdd(false);
    } finally { setSaving(false); }
  };

  // Sugestões: padrões cujo nome ainda não existe em algum lançamento do mês
  const nomesExistentes = new Set(rows.map(r => (r.tipo_nome || '').trim().toLowerCase()));
  const sugestoes = padroes.filter(p => !nomesExistentes.has(p.nome.trim().toLowerCase()));
  const padraoByNome = new Map(padroes.map(p => [p.nome.trim().toLowerCase(), Number(p.valor || 0)]));
  const prevForRow = (nome: string) => padraoByNome.get((nome || '').trim().toLowerCase()) || 0;
  const total = rows.reduce((s, r) => s + Number(r.valor || 0), 0)
    + sugestoes.reduce((s, p) => s + Number(p.valor || 0), 0);
  const totalPrevisao = rows.reduce((s, r) => s + prevForRow(r.tipo_nome), 0)
    + sugestoes.reduce((s, p) => s + Number(p.valor || 0), 0);

  const aplicarSugestao = async (sug: DespesaPadrao, novoValor: number) => {
    if (novoValor <= 0) return;
    const tipoSugestao: TipoCusto = { id: sug.id, nome: sug.nome, tipo: categoria };
    await onInsert({ tipo: tipoSugestao, categoria, valor: novoValor, data: mesStart, descricao: '' });
  };

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-5">
      <div className="flex items-center gap-2 text-white mb-3">
        {icon}
        <h3 className="text-xl font-semibold">{titulo}</h3>
        <span className="text-white/40 text-sm">({rows.length})</span>
        {onAddGasto && (
          <button
            type="button"
            onClick={onAddGasto}
            className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-600/20 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Novo Gasto
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-white/40 border-b border-white/10">
              <th className="text-left font-normal pb-2 pl-1 w-[28%]">Tipo</th>
              <th className="text-left font-normal pb-2 px-2">Descrição</th>
              <th className="text-left font-normal pb-2 px-2 w-[140px]">Data</th>
              <th className="text-right font-normal pb-2 px-2 w-[140px]">Valor pago</th>
              <th className="text-right font-normal pb-2 px-2 w-[140px]">Previsão</th>
              <th className="pb-2 pr-1 w-[80px]"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-white/40 px-2 py-3">Carregando...</td></tr>
            ) : rows.map(r => (
              <tr key={r.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                <td className="py-2 pl-1 text-white/90">
                  <EditableText value={r.tipo_nome} onSave={(v) => onUpdate(r.id, { tipo_nome: v })} />
                </td>
                <td className="px-2 text-white/60">
                  <EditableText value={r.descricao || ''} placeholder="—" onSave={(v) => onUpdate(r.id, { descricao: v || null })} />
                </td>
                <td className="px-2 text-white/60">
                  <EditableDate value={r.data} onSave={(v) => onUpdate(r.id, { data: v })} />
                </td>
                <td className="px-2 text-right text-white font-medium">
                  <EditableCell value={r.valor} format="currency" onSave={(v) => onUpdate(r.id, { valor: v })} />
                </td>
                <td className="px-2 text-right text-white/50">{prevForRow(r.tipo_nome) > 0 ? formatCurrency(prevForRow(r.tipo_nome)) : '—'}</td>
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
                <td className="py-2 pl-1 text-white/90">{sug.nome}</td>
                <td className="px-2 text-white/60">—</td>
                <td className="px-2 text-white/60">{mesStart.split('-').reverse().join('/')}</td>
                <td className="px-2 text-right text-white/60">
                  <EditableCell value={sug.valor} format="currency" onSave={(v) => aplicarSugestao(sug, v)} />
                </td>
                <td className="px-2 text-right text-white/50">{Number(sug.valor) > 0 ? formatCurrency(Number(sug.valor)) : '—'}</td>
                <td className="pr-1 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => aplicarSugestao(sug, Number(sug.valor) || 0)}
                      disabled={!(Number(sug.valor) > 0)}
                      className="p-1 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label="Confirmar sugestão"
                      title="Confirmar sugestão"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeletePadrao(sug.id)}
                      className="p-1 rounded hover:bg-red-500/20 text-red-300/50 hover:text-red-300"
                      aria-label="Remover sugestão"
                      title="Remover sugestão padrão"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {/* ------ Add row ------ */}
            {showAdd && (
            <tr className="border-b border-white/5 hover:bg-white/[0.03]">
              <td className="py-2 pl-1">
                {isCustom ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      autoFocus
                      value={customNome}
                      onChange={(e) => setCustomNome(e.target.value)}
                      placeholder="Nome do item..."
                      className="flex-1 h-8 bg-white/5 border border-white/10 rounded px-2 text-white text-xs outline-none focus:border-blue-400/50"
                    />
                    <button
                      onClick={() => { setTipoId(''); setCustomNome(''); }}
                      className="p-1 rounded hover:bg-white/10 text-white/50"
                      title="Voltar para lista"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <Select value={tipoId} onValueChange={setTipoId}>
                    <SelectTrigger className="h-8 text-xs bg-white/5 border-white/10">
                      <SelectValue placeholder="Selecione tipo..." />
                    </SelectTrigger>
                    <SelectContent>
                      {tipos.map(t => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
                      <SelectItem value="__custom__">+ Outro (digitar nome)</SelectItem>
                    </SelectContent>
                  </Select>
                )}
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
              <td></td>
              <td className="pr-1">
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={save}
                    disabled={!canSave || saving}
                    className="p-1 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Salvar"
                    title="Salvar"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => { clear(); setShowAdd(false); }}
                    className="p-1 rounded hover:bg-white/10 text-white/50"
                    aria-label="Limpar"
                    title="Limpar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex justify-center">
        <button
          type="button"
          onClick={() => setShowAdd(v => !v)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-xs transition-colors"
        >
          {showAdd ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {showAdd ? 'Cancelar' : 'Adicionar item'}
        </button>
      </div>

      <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between px-2">
        <span className="text-xs text-white/50 uppercase tracking-wider">Total</span>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-white/40">Previsão</span>
            <span className="text-sm font-medium text-white/60">{formatCurrency(totalPrevisao)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-white/40">Pago</span>
            <span className="text-base font-bold text-white">{formatCurrency(total)}</span>
          </div>
        </div>
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

/* ---------------- EditableText / EditableDate ---------------- */

function EditableText({
  value, placeholder, onSave,
}: {
  value: string;
  placeholder?: string;
  onSave: (v: string) => void | Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (!editing) setDraft(value || ''); }, [value, editing]);

  const commit = async () => {
    const v = draft.trim();
    if (v === (value || '').trim()) { setEditing(false); return; }
    setSaving(true);
    try { await onSave(v); } finally { setSaving(false); setEditing(false); }
  };

  if (editing) {
    return (
      <input
        autoFocus
        type="text"
        value={draft}
        disabled={saving}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLInputElement).blur(); }
          else if (e.key === 'Escape') { setDraft(value || ''); setEditing(false); }
        }}
        onFocus={(e) => e.currentTarget.select()}
        className="w-full bg-white/10 border border-blue-400/50 rounded px-1 py-0.5 text-white text-sm outline-none"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="w-full text-left px-1 py-0.5 rounded hover:bg-white/10 cursor-pointer transition-colors"
      title="Clique para editar"
    >
      {value || placeholder || '—'}
    </button>
  );
}

function EditableDate({
  value, onSave,
}: {
  value: string;
  onSave: (v: string) => void | Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (!editing) setDraft(value); }, [value, editing]);

  const commit = async () => {
    if (!draft || draft === value) { setEditing(false); return; }
    setSaving(true);
    try { await onSave(draft); } finally { setSaving(false); setEditing(false); }
  };

  if (editing) {
    return (
      <input
        autoFocus
        type="date"
        value={draft}
        disabled={saving}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLInputElement).blur(); }
          else if (e.key === 'Escape') { setDraft(value); setEditing(false); }
        }}
        className="w-full bg-white/10 border border-blue-400/50 rounded px-1 py-0.5 text-white text-sm outline-none"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="w-full text-left px-1 py-0.5 rounded hover:bg-white/10 cursor-pointer transition-colors"
      title="Clique para editar"
    >
      {value ? value.split('-').reverse().join('/') : '—'}
    </button>
  );
}

/* ---------------- Gastos Readonly block (puxa de /financeiro/gastos) ---------------- */

function BlocoGastosReadonly({
  titulo, icon, rows, loading, onAddGasto,
}: {
  titulo: string;
  icon: React.ReactNode;
  rows: GastoAgrupado[];
  loading: boolean;
  onAddGasto?: () => void;
}) {
  const total = rows.reduce((s, r) => s + Number(r.total || 0), 0);
  const totalProjetado = rows.reduce((s, r) => s + Number(r.valor_projetado || 0), 0);
  const qtdLanc = rows.reduce((s, r) => s + r.quantidade, 0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fmtData = (iso: string) => {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}`;
  };

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-5">
      <div className="flex items-center gap-2 text-white mb-3">
        {icon}
        <h3 className="text-xl font-semibold">{titulo}</h3>
        <span className="text-white/40 text-sm">({rows.length} tipos · {qtdLanc} lançamentos)</span>
        {onAddGasto && (
          <button
            type="button"
            onClick={onAddGasto}
            className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-600/20 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Novo Gasto
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-white/40 border-b border-white/10">
              <th className="text-left font-normal pb-2 pl-1">Tipo de Custo</th>
              <th className="text-right font-normal pb-2 px-2 w-[140px]">Lançamentos</th>
              <th className="text-right font-normal pb-2 px-2 w-[160px]">Valor projetado</th>
              <th className="text-right font-normal pb-2 px-2 w-[180px]">Valor pago no mês</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="text-white/40 px-2 py-3">Carregando...</td></tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-white/40 px-2 py-6 text-center">
                  Nenhum gasto registrado neste mês em Financeiro › Gastos.
                </td>
              </tr>
            ) : rows.map(r => {
              const isOpen = expandedId === r.tipo_custo_id;
              return (
                <Fragment key={r.tipo_custo_id}>
                  <tr
                    onClick={() => setExpandedId(prev => prev === r.tipo_custo_id ? null : r.tipo_custo_id)}
                    className="border-b border-white/5 hover:bg-white/[0.03] cursor-pointer transition-colors"
                  >
                    <td className="py-2 pl-1 text-white/90">
                      <span className="inline-flex items-center gap-1.5">
                        {isOpen
                          ? <ChevronDown className="w-3.5 h-3.5 text-white/50" />
                          : <ChevronRight className="w-3.5 h-3.5 text-white/50" />}
                        {r.tipo_nome}
                      </span>
                    </td>
                    <td className="px-2 text-right text-white/60">{r.quantidade}</td>
                    <td className="px-2 text-right text-white/60">{formatCurrency(r.valor_projetado)}</td>
                    <td className="px-2 text-right text-white font-medium">{formatCurrency(r.total)}</td>
                  </tr>
                  {isOpen && (
                    <tr className="bg-white/[0.02]">
                      <td colSpan={4} className="px-3 py-2">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-[10px] uppercase tracking-wider text-white/30">
                              <th className="text-left font-normal py-1 w-[60px]">Data</th>
                              <th className="text-left font-normal py-1">Descrição</th>
                              <th className="text-left font-normal py-1 w-[160px]">Responsável</th>
                              <th className="text-left font-normal py-1 w-[140px]">Banco</th>
                              <th className="text-right font-normal py-1 w-[120px]">Valor</th>
                            </tr>
                          </thead>
                          <tbody>
                            {r.itens.map(it => (
                              <tr key={it.id} className="border-t border-white/5 text-white/80">
                                <td className="py-1 text-white/60">{fmtData(it.data)}</td>
                                <td className="py-1">{it.descricao || '—'}</td>
                                <td className="py-1 text-white/60">{it.responsavel_nome}</td>
                                <td className="py-1 text-white/60">{it.banco_nome}</td>
                                <td className="py-1 text-right text-white font-medium">{formatCurrency(it.valor)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between px-2 gap-6">
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/50 uppercase tracking-wider">Total projetado</span>
          <span className="text-sm font-medium text-white/80">{formatCurrency(totalProjetado)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/50 uppercase tracking-wider">Total pago</span>
          <span className="text-base font-bold text-white">{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  );
}
