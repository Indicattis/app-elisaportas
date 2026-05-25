import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/utils';
import { Users, Receipt, TrendingDown, Trash2, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

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
};

type TipoCusto = { id: string; nome: string; tipo: 'fixa' | 'variavel' };

function calcTotalFolha(f: { salario: number; aux_combustivel: number; insalubridade_pct: number; fgts_pct: number; previsao_13_valor: number }) {
  const insalub = f.salario * (f.insalubridade_pct || 0) / 100;
  const fgts = f.salario * (f.fgts_pct || 0) / 100;
  const ferias = f.salario / 3 + fgts;
  return f.salario + f.aux_combustivel + insalub + fgts + f.previsao_13_valor + ferias;
}

interface Props {
  mes: string | null; // 'YYYY-MM'
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

  const [openFolha, setOpenFolha] = useState(false);
  const [openDespesa, setOpenDespesa] = useState<null | 'fixa' | 'variavel'>(null);
  const [confirmDel, setConfirmDel] = useState<null | { kind: 'folha' | 'lanc'; id: string }>(null);

  const mesStart = mes ? `${mes}-01` : null;

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
        onAdd={() => setOpenFolha(true)}
        onDelete={(id) => setConfirmDel({ kind: 'folha', id })}
        onUpdated={reload}
      />
      <BlocoDespesa
        titulo="Despesas Fixas"
        icon={<Receipt className="w-4 h-4" />}
        rows={fixas}
        loading={loading}
        onAdd={() => setOpenDespesa('fixa')}
        onDelete={(id) => setConfirmDel({ kind: 'lanc', id })}
        onUpdated={reload}
      />
      <BlocoDespesa
        titulo="Despesas Variáveis"
        icon={<TrendingDown className="w-4 h-4" />}
        rows={variaveis}
        loading={loading}
        onAdd={() => setOpenDespesa('variavel')}
        onDelete={(id) => setConfirmDel({ kind: 'lanc', id })}
        onUpdated={reload}
      />

      {openFolha && mesStart && (
        <DialogFolha
          mes={mesStart}
          onClose={() => setOpenFolha(false)}
          onSaved={() => { setOpenFolha(false); reload(); }}
        />
      )}

      {openDespesa && mesStart && (
        <DialogDespesa
          mes={mesStart}
          categoria={openDespesa}
          onClose={() => setOpenDespesa(null)}
          onSaved={() => { setOpenDespesa(null); reload(); }}
        />
      )}

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

/* ---------------- Folha block ---------------- */

function BlocoFolha({
  rows, loading, onAdd, onDelete, onUpdated,
}: {
  rows: FolhaRow[];
  loading: boolean;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onUpdated: () => void;
}) {
  const total = rows.reduce((s, r) => s + Number(r.total || 0), 0);
  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-white">
          <Users className="w-4 h-4" />
          <h3 className="font-semibold">Folha Salarial</h3>
          <span className="text-white/40 text-sm">({rows.length})</span>
        </div>
        <Button size="sm" onClick={onAdd} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-1" /> Adicionar
        </Button>
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
              <th className="pb-2 pr-1"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-white/40 px-2 py-3">Carregando...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={8} className="text-white/40 px-2 py-3 text-center">Nenhum lançamento. Clique em Adicionar.</td></tr>
            ) : rows.map(r => (
              <tr key={r.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                <td className="py-2 pl-1 text-white/90">{r.colaborador_nome}</td>
                <td className="px-2 text-right text-white/80">{formatCurrency(r.salario)}</td>
                <td className="px-2 text-right text-white/60">{formatCurrency(r.aux_combustivel)}</td>
                <td className="px-2 text-right text-white/60">{Number(r.insalubridade_pct).toFixed(2)}%</td>
                <td className="px-2 text-right text-white/60">{Number(r.fgts_pct).toFixed(2)}%</td>
                <td className="px-2 text-right text-white/60">{formatCurrency(r.previsao_13_valor)}</td>
                <td className="px-2 text-right text-white font-medium">{formatCurrency(r.total)}</td>
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
  titulo, icon, rows, loading, onAdd, onDelete, onUpdated,
}: {
  titulo: string;
  icon: React.ReactNode;
  rows: LancRow[];
  loading: boolean;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onUpdated: () => void;
}) {
  const total = rows.reduce((s, r) => s + Number(r.valor || 0), 0);
  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-white">
          {icon}
          <h3 className="font-semibold">{titulo}</h3>
          <span className="text-white/40 text-sm">({rows.length})</span>
        </div>
        <Button size="sm" onClick={onAdd} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-1" /> Adicionar
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-white/40 border-b border-white/10">
              <th className="text-left font-normal pb-2 pl-1">Tipo</th>
              <th className="text-left font-normal pb-2 px-2">Descrição</th>
              <th className="text-left font-normal pb-2 px-2">Data</th>
              <th className="text-right font-normal pb-2 px-2">Valor pago</th>
              <th className="pb-2 pr-1"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-white/40 px-2 py-3">Carregando...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={5} className="text-white/40 px-2 py-3 text-center">Nenhum lançamento. Clique em Adicionar.</td></tr>
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

/* ---------------- Dialog Folha ---------------- */

function DialogFolha({ mes, onClose, onSaved }: { mes: string; onClose: () => void; onSaved: () => void }) {
  const [colabs, setColabs] = useState<Colab[]>([]);
  const [adminUserId, setAdminUserId] = useState<string>('');
  const [form, setForm] = useState({
    salario: 0, aux_combustivel: 0, insalubridade_pct: 0,
    fgts_pct: 8, previsao_13_valor: 0,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('admin_users')
        .select('id, nome, custo_colaborador, aux_combustivel, insalubridade_pct, fgts_pct, previsao_13_valor')
        .eq('ativo', true)
        .in('tipo_usuario', ['colaborador', 'metamorfo'])
        .order('nome');
      setColabs(((data || []) as any[]).map(c => ({
        id: c.id,
        nome: c.nome,
        salario: Number(c.custo_colaborador) || 0,
        aux_combustivel: Number(c.aux_combustivel) || 0,
        insalubridade_pct: Number(c.insalubridade_pct) || 0,
        fgts_pct: c.fgts_pct == null ? 8 : Number(c.fgts_pct),
        previsao_13_valor: Number(c.previsao_13_valor) || 0,
      })));
    })();
  }, []);

  const selected = colabs.find(c => c.id === adminUserId);

  const onSelectColab = (id: string) => {
    setAdminUserId(id);
    const c = colabs.find(x => x.id === id);
    if (c) {
      setForm({
        salario: c.salario,
        aux_combustivel: c.aux_combustivel,
        insalubridade_pct: c.insalubridade_pct,
        fgts_pct: c.fgts_pct,
        previsao_13_valor: c.previsao_13_valor,
      });
    }
  };

  const total = useMemo(() => calcTotalFolha(form), [form]);
  const insalubR = form.salario * (form.insalubridade_pct || 0) / 100;
  const fgtsR = form.salario * (form.fgts_pct || 0) / 100;
  const feriasR = form.salario / 3 + fgtsR;

  const save = async () => {
    if (!selected) { toast.error('Selecione um colaborador'); return; }
    setSaving(true);
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id || null;
      const { error } = await supabase.from('despesas_manuais_folha' as any).insert({
        mes_referencia: mes,
        admin_user_id: selected.id,
        colaborador_nome: selected.nome,
        salario: form.salario,
        aux_combustivel: form.aux_combustivel,
        insalubridade_pct: form.insalubridade_pct,
        fgts_pct: form.fgts_pct,
        previsao_13_valor: form.previsao_13_valor,
        total,
        created_by: userId,
      } as any);
      if (error) throw error;
      toast.success('Lançamento de folha salvo');
      onSaved();
    } catch (e: any) {
      toast.error('Erro ao salvar: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Novo lançamento de folha</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>Colaborador</Label>
            <Select value={adminUserId} onValueChange={onSelectColab}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {colabs.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1">
              <Label>Salário</Label>
              <Input type="number" step="0.01" value={form.salario} onChange={e => setForm({ ...form, salario: Number(e.target.value) || 0 })} />
            </div>
            <div className="grid gap-1">
              <Label>Aux. Combustível</Label>
              <Input type="number" step="0.01" value={form.aux_combustivel} onChange={e => setForm({ ...form, aux_combustivel: Number(e.target.value) || 0 })} />
            </div>
            <div className="grid gap-1">
              <Label>Insalubridade %</Label>
              <Input type="number" step="0.01" value={form.insalubridade_pct} onChange={e => setForm({ ...form, insalubridade_pct: Number(e.target.value) || 0 })} />
            </div>
            <div className="grid gap-1">
              <Label>FGTS %</Label>
              <Input type="number" step="0.01" value={form.fgts_pct} onChange={e => setForm({ ...form, fgts_pct: Number(e.target.value) || 0 })} />
            </div>
            <div className="grid gap-1 col-span-2">
              <Label>Previsão 13° + FGTS</Label>
              <Input type="number" step="0.01" value={form.previsao_13_valor} onChange={e => setForm({ ...form, previsao_13_valor: Number(e.target.value) || 0 })} />
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm space-y-1">
            <div className="flex justify-between text-white/60"><span>Insalubridade R$</span><span>{formatCurrency(insalubR)}</span></div>
            <div className="flex justify-between text-white/60"><span>FGTS R$</span><span>{formatCurrency(fgtsR)}</span></div>
            <div className="flex justify-between text-white/60"><span>Previsão férias + 1/3 + FGTS</span><span>{formatCurrency(feriasR)}</span></div>
            <div className="flex justify-between text-white font-semibold pt-1 border-t border-white/10"><span>Total mensal</span><span>{formatCurrency(total)}</span></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={saving || !selected}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Dialog Despesa ---------------- */

function DialogDespesa({
  mes, categoria, onClose, onSaved,
}: {
  mes: string;
  categoria: 'fixa' | 'variavel';
  onClose: () => void;
  onSaved: () => void;
}) {
  const [tipos, setTipos] = useState<TipoCusto[]>([]);
  const [tipoCustoId, setTipoCustoId] = useState<string>('');
  const [valor, setValor] = useState<number>(0);
  const [data, setData] = useState<string>(mes);
  const [descricao, setDescricao] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('tipos_custos' as any)
        .select('id, nome, tipo, ativo')
        .eq('ativo', true)
        .eq('tipo', categoria)
        .order('nome');
      setTipos(((data || []) as any[]).map((t: any) => ({ id: t.id, nome: t.nome, tipo: t.tipo })));
    })();
  }, [categoria]);

  const selected = tipos.find(t => t.id === tipoCustoId);

  const save = async () => {
    if (!selected) { toast.error('Selecione um tipo de custo'); return; }
    if (!data) { toast.error('Informe a data'); return; }
    setSaving(true);
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id || null;
      const { error } = await supabase.from('despesas_manuais_lancamentos' as any).insert({
        mes_referencia: mes,
        tipo_custo_id: selected.id,
        categoria,
        tipo_nome: selected.nome,
        valor,
        data,
        descricao: descricao || null,
        created_by: userId,
      } as any);
      if (error) throw error;
      toast.success('Lançamento salvo');
      onSaved();
    } catch (e: any) {
      toast.error('Erro ao salvar: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Nova despesa {categoria === 'fixa' ? 'fixa' : 'variável'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>Tipo de custo</Label>
            <Select value={tipoCustoId} onValueChange={setTipoCustoId}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {tipos.map(t => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1">
              <Label>Valor pago</Label>
              <Input type="number" step="0.01" value={valor} onChange={e => setValor(Number(e.target.value) || 0)} />
            </div>
            <div className="grid gap-1">
              <Label>Data</Label>
              <Input type="date" value={data} onChange={e => setData(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-1">
            <Label>Descrição (opcional)</Label>
            <Textarea value={descricao} onChange={e => setDescricao(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={saving || !selected}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
