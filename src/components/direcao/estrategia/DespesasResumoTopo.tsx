import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/utils';
import { Users, Receipt, TrendingDown, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

type Item = { id: string; nome: string; valor: number };
type ColabFolha = {
  id: string;
  nome: string;
  salario: number;
  aux_combustivel: number;
  insalubridade_pct: number;
  fgts_pct: number;
  previsao_13_valor: number;
  em_folha: boolean;
};

const isFolha = (nome: string) => /sal[áa]rio|folha/i.test(nome);

function calcCustos(c: { salario: number; aux_combustivel: number; insalubridade_pct: number; fgts_pct: number; previsao_13_valor: number; }) {
  const insalub = c.salario * (c.insalubridade_pct || 0) / 100;
  const fgts = c.salario * (c.fgts_pct || 0) / 100;
  const ferias = c.salario / 3 + fgts;
  const total = c.salario + c.aux_combustivel + insalub + fgts + c.previsao_13_valor + ferias;
  return { insalub, fgts, ferias, total };
}

interface Props {
  mes: string | null;
  ano?: number;
  onMediaMensalChange?: (media: number) => void;
}

export default function DespesasResumoTopo({ mes, onMediaMensalChange }: Props) {
  const [folha, setFolha] = useState<Item[]>([]);
  const [colabs, setColabs] = useState<ColabFolha[]>([]);
  const [fixas, setFixas] = useState<Item[]>([]);
  const [variaveis, setVariaveis] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [reloadV, setReloadV] = useState(0);
  const reload = () => setReloadV((v) => v + 1);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        if (!mes) {
          // CONFIGURAÇÃO: tipos_custos ativos + colaboradores em_folha
          const [{ data: tipos }, { data: colabs }] = await Promise.all([
            supabase
              .from('tipos_custos' as any)
              .select('id, nome, tipo, valor_maximo_mensal, ativo, aparece_no_dre')
              .eq('ativo', true)
              .eq('aparece_no_dre', true),
             supabase
               .from('admin_users')
               .select('id, nome, custo_colaborador, ativo, tipo_usuario, visivel_organograma, em_folha, aux_combustivel, insalubridade_pct, fgts_pct, previsao_13_valor')
               .eq('ativo', true)
               .in('tipo_usuario', ['colaborador', 'metamorfo'])
               .eq('visivel_organograma', true)
               .neq('role', 'administrador')
               .order('nome'),
          ]);
          if (cancelled) return;
          const tiposList = ((tipos || []) as any[]).filter((t) => !isFolha(t.nome));
          setFixas(
            tiposList
              .filter((t) => t.tipo === 'fixa')
              .map((t) => ({ id: t.id, nome: t.nome, valor: Number(t.valor_maximo_mensal) || 0 }))
          );
          setVariaveis(
            tiposList
              .filter((t) => t.tipo === 'variavel')
              .map((t) => ({ id: t.id, nome: t.nome, valor: Number(t.valor_maximo_mensal) || 0 }))
          );
           setFolha(
             ((colabs || []) as any[])
               .slice()
               .sort((a, b) => {
                 if (a.em_folha === b.em_folha) return a.nome.localeCompare(b.nome);
                 return a.em_folha ? -1 : 1;
               })
               .map((c) => ({
                 id: c.id,
                 nome: c.nome,
                 valor: Number(c.custo_colaborador) || 0,
               }))
           );
           setColabs(
             ((colabs || []) as any[])
               .slice()
               .sort((a, b) => {
                 if (a.em_folha === b.em_folha) return a.nome.localeCompare(b.nome);
                 return a.em_folha ? -1 : 1;
               })
               .map((c: any) => ({
                 id: c.id,
                 nome: c.nome,
                 salario: Number(c.custo_colaborador) || 0,
                 aux_combustivel: Number(c.aux_combustivel) || 0,
                 insalubridade_pct: Number(c.insalubridade_pct) || 0,
                 fgts_pct: c.fgts_pct == null ? 8 : Number(c.fgts_pct),
                 previsao_13_valor: Number(c.previsao_13_valor) || 0,
                 em_folha: !!c.em_folha,
               }))
           );
        } else {
          // MÊS REAL: gastos + custos_folha_mensais
          const start = `${mes}-01`;
          const [y, m] = mes.split('-').map(Number);
          const end = new Date(y, m, 0).toISOString().split('T')[0];

          const [{ data: gastos }, { data: tipos }, { data: folhaItens }] = await Promise.all([
            supabase
              .from('gastos' as any)
              .select('id, valor, tipo_custo_id, descricao, data')
              .gte('data', start)
              .lte('data', end),
            supabase
              .from('tipos_custos' as any)
              .select('id, nome, tipo, aparece_no_dre')
              .eq('aparece_no_dre', true),
            supabase
              .from('custos_folha_mensais' as any)
              .select('id, colaborador_nome, valor')
              .eq('mes_referencia', start),
          ]);
          if (cancelled) return;

          const tiposMap: Record<string, { nome: string; tipo: string }> = {};
          ((tipos || []) as any[]).forEach((t: any) => {
            tiposMap[t.id] = { nome: t.nome, tipo: t.tipo };
          });
          const agrupado: Record<string, { nome: string; tipo: string; valor: number }> = {};
          ((gastos || []) as any[]).forEach((g: any) => {
            const t = tiposMap[g.tipo_custo_id];
            if (!t) return;
            if (!agrupado[g.tipo_custo_id])
              agrupado[g.tipo_custo_id] = { nome: t.nome, tipo: t.tipo, valor: 0 };
            agrupado[g.tipo_custo_id].valor += Number(g.valor) || 0;
          });
          const items = Object.entries(agrupado).map(([id, v]) => ({
            id,
            nome: v.nome,
            valor: v.valor,
            tipo: v.tipo,
          }));
          setFixas(items.filter((i) => i.tipo === 'fixa' && !isFolha(i.nome)));
          setVariaveis(items.filter((i) => i.tipo === 'variavel' && !isFolha(i.nome)));
          setFolha(
            ((folhaItens || []) as any[]).map((f) => ({
              id: f.id,
              nome: f.colaborador_nome,
              valor: Number(f.valor) || 0,
            }))
          );
          setColabs([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [mes, reloadV]);

  useEffect(() => {
    if (loading) return;
    const totalFolha = !mes && colabs.length
      ? colabs.reduce((s, c) => s + calcCustos(c).total, 0)
      : folha.reduce((s, i) => s + i.valor, 0);
    const totalMensal = totalFolha
      + fixas.reduce((s, i) => s + i.valor, 0)
      + variaveis.reduce((s, i) => s + i.valor, 0);
    onMediaMensalChange?.(totalMensal);
  }, [folha, colabs, fixas, variaveis, loading, mes, onMediaMensalChange]);


  const rotulo = mes ? `Valores de ${mes}` : 'Configuração padrão';

  const updateColab = async (id: string, patch: Partial<ColabFolha>) => {
    setColabs((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    const dbPatch: any = { ...patch };
    if ('salario' in dbPatch) {
      dbPatch.custo_colaborador = dbPatch.salario;
      delete dbPatch.salario;
    }
    const { error } = await supabase.from('admin_users').update(dbPatch).eq('id', id);
    if (error) toast.error('Erro ao salvar: ' + error.message);
  };

  return (
    <div className="grid grid-cols-1 gap-4 mb-6">
      {!mes ? (
        <BlocoFolhaEditavel
          colabs={colabs}
          rotulo={rotulo}
          loading={loading}
          onChange={updateColab}
        />
      ) : (
        <Bloco titulo="Folha Salarial" icon={<Users className="w-4 h-4" />} itens={folha} rotulo={rotulo} loading={loading} />
      )}
      <Bloco
        titulo="Despesas Fixas"
        icon={<Receipt className="w-4 h-4" />}
        itens={fixas}
        rotulo={rotulo}
        loading={loading}
        editable={!mes ? 'fixa' : undefined}
        onChanged={reload}
      />
      <Bloco
        titulo="Despesas Variáveis"
        icon={<TrendingDown className="w-4 h-4" />}
        itens={variaveis}
        rotulo={rotulo}
        loading={loading}
        editable={!mes ? 'variavel' : undefined}
        onChanged={reload}
      />
    </div>
  );
}

function NumInput({
  value,
  onCommit,
  suffix,
  step = '0.01',
  valueClassName,
}: {
  value: number;
  onCommit: (v: number) => void;
  suffix?: string;
  step?: string;
  valueClassName?: string;
}) {
  const [local, setLocal] = useState(String(value ?? 0));
  const [editing, setEditing] = useState(false);
  useEffect(() => { setLocal(String(value ?? 0)); }, [value]);
  if (!editing) {
    const display = suffix === '%'
      ? `${Number(value ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}${suffix}`
      : formatCurrency(Number(value ?? 0));
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className={`w-full text-right text-sm px-2 py-1 rounded-md hover:bg-white/5 border border-transparent hover:border-white/10 transition-colors whitespace-nowrap ${valueClassName ?? 'text-white/90'}`}
      >
        {display}
      </button>
    );
  }
  return (
    <div className="relative">
      <input
        autoFocus
        type="number"
        step={step}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => {
          const n = Number(local);
          if (!isNaN(n) && n !== value) onCommit(n);
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          if (e.key === 'Escape') { setLocal(String(value ?? 0)); setEditing(false); }
        }}
        className="w-full bg-white/5 border border-white/10 rounded-md px-2 py-1 text-right text-sm text-white outline-none focus:border-white/30 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      {suffix && (
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-white/40 pointer-events-none">{suffix}</span>
      )}
    </div>
  );
}

function BlocoFolhaEditavel({
  colabs,
  rotulo,
  loading,
  onChange,
}: {
  colabs: ColabFolha[];
  rotulo: string;
  loading: boolean;
  onChange: (id: string, patch: Partial<ColabFolha>) => void;
}) {
  const linhas = colabs.map((c) => ({ c, ...calcCustos(c) }));
  const totalMensal = linhas.reduce((s, l) => s + l.total, 0);
  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-5 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-white">
          <Users className="w-4 h-4" />
          <h3 className="font-semibold">Folha Salarial</h3>
        </div>
        <span className="text-[10px] uppercase tracking-wider text-white/40">{rotulo}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[1100px]">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-white/40 border-b border-white/10">
              <th className="text-left font-normal pb-2 pl-1">Colaborador</th>
              <th className="text-right font-normal pb-2 px-2">Salário</th>
              <th className="text-right font-normal pb-2 px-2">Combustível</th>
              <th className="text-right font-normal pb-2 px-2">Insalub %</th>
              <th className="text-right font-normal pb-2 px-2">Insalub R$</th>
              <th className="text-right font-normal pb-2 px-2">FGTS %</th>
              <th className="text-right font-normal pb-2 px-2">FGTS R$</th>
              <th className="text-right font-normal pb-2 px-2">Previsão 13° + FGTS</th>
              <th className="text-right font-normal pb-2 px-2">Previsão de férias + 1/3 + FGTS</th>
              <th className="text-right font-normal pb-2 px-2">Total mensal</th>
              <th className="text-center font-normal pb-2 pr-1">Na folha</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={11} className="text-white/40 px-2 py-3">Carregando...</td></tr>
            ) : linhas.length === 0 ? (
              <tr><td colSpan={11} className="text-white/40 px-2 py-3">Sem colaboradores</td></tr>
            ) : linhas.map(({ c, insalub, fgts, ferias, total }) => (
              <tr key={c.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                <td className="py-1.5 pl-1 text-white/80 truncate max-w-[200px]">
                  <span className="truncate">{c.nome}</span>
                </td>
                <td className="px-2"><NumInput value={c.salario} onCommit={(v) => onChange(c.id, { salario: v })} valueClassName="text-emerald-400" /></td>
                <td className="px-2"><NumInput value={c.aux_combustivel} onCommit={(v) => onChange(c.id, { aux_combustivel: v })} /></td>
                <td className="px-2"><NumInput value={c.insalubridade_pct} onCommit={(v) => onChange(c.id, { insalubridade_pct: v })} suffix="%" /></td>
                <td className="px-2 text-right text-white/60 whitespace-nowrap">{formatCurrency(insalub)}</td>
                <td className="px-2"><NumInput value={c.fgts_pct} onCommit={(v) => onChange(c.id, { fgts_pct: v })} suffix="%" /></td>
                <td className="px-2 text-right text-white/60 whitespace-nowrap">{formatCurrency(fgts)}</td>
                <td className="px-2"><NumInput value={c.previsao_13_valor} onCommit={(v) => onChange(c.id, { previsao_13_valor: v })} /></td>
                <td className="px-2 text-right text-white/60 whitespace-nowrap">{formatCurrency(ferias)}</td>
                <td className="px-2 text-right text-white font-medium whitespace-nowrap">{formatCurrency(total)}</td>
                <td className="pr-1 text-center whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => onChange(c.id, { em_folha: !c.em_folha })}
                    className={`px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wider font-semibold border transition-colors ${
                      c.em_folha
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
                        : 'bg-red-500/15 text-red-300 border-red-500/30 hover:bg-red-500/25'
                    }`}
                  >
                    {c.em_folha ? 'Sim' : 'Não'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between px-2">
        <span className="text-xs text-white/50 uppercase tracking-wider">Total</span>
        <span className="text-base font-bold text-white whitespace-nowrap">{formatCurrency(totalMensal)}</span>
      </div>
    </div>
  );
}

function Bloco({
  titulo,
  icon,
  itens,
  rotulo,
  loading,
  editable,
  onChanged,
}: {
  titulo: string;
  icon: React.ReactNode;
  itens: Item[];
  rotulo: string;
  loading: boolean;
  editable?: 'fixa' | 'variavel';
  onChanged?: () => void;
}) {
  const total = itens.reduce((s, i) => s + i.valor, 0);
  const [novoNome, setNovoNome] = useState('');
  const [novoValor, setNovoValor] = useState('');

  const updateTipo = async (id: string, patch: { nome?: string; valor_maximo_mensal?: number }) => {
    const { error } = await supabase.from('tipos_custos' as any).update(patch as any).eq('id', id);
    if (error) { toast.error('Erro ao salvar: ' + error.message); return; }
    onChanged?.();
  };
  const deleteTipo = async (id: string) => {
    const { error } = await supabase.from('tipos_custos' as any).delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir: ' + error.message); return; }
    toast.success('Despesa excluída');
    onChanged?.();
  };
  const addTipo = async () => {
    const nome = novoNome.trim();
    const valor = Number(novoValor) || 0;
    if (!nome) { toast.error('Informe o nome'); return; }
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from('tipos_custos' as any).insert([{
      nome,
      tipo: editable,
      valor_maximo_mensal: valor,
      ativo: true,
      aparece_no_dre: true,
      created_by: userData.user?.id || '',
    }] as any);
    if (error) { toast.error('Erro ao criar: ' + error.message); return; }
    toast.success('Despesa criada');
    setNovoNome(''); setNovoValor('');
    onChanged?.();
  };

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-5 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-white">
          {icon}
          <h3 className="font-semibold">{titulo}</h3>
        </div>
        <span className="text-[10px] uppercase tracking-wider text-white/40">{rotulo}</span>
      </div>
      <div className={`grid ${editable ? 'grid-cols-[1fr_140px_32px]' : 'grid-cols-[1fr_110px]'} gap-x-6 px-2 pb-2 mb-1 border-b border-white/10 text-[10px] uppercase tracking-wider text-white/40`}>
        <span className="pl-1">Item</span>
        <span className="text-right pr-1">Valor mensal</span>
        {editable && <span />}
      </div>
      <div className="flex-1 max-h-64 overflow-y-auto space-y-1 pr-1">
        {loading ? (
          <p className="text-sm text-white/40 px-2">Carregando...</p>
        ) : itens.length === 0 && !editable ? (
          <p className="text-sm text-white/40 px-2">Sem itens</p>
        ) : (
          itens.map((i) => (
            <div key={i.id} className={`group grid ${editable ? 'grid-cols-[1fr_140px_32px]' : 'grid-cols-[1fr_110px]'} gap-x-6 text-sm px-2 py-1.5 rounded-md hover:bg-white/[0.03] transition-colors items-center`}>
              {editable ? (
                <TextInput value={i.nome} onCommit={(v) => updateTipo(i.id, { nome: v })} />
              ) : (
                <span className="text-white/70 truncate">{i.nome}</span>
              )}
              {editable ? (
                <NumInput value={i.valor} onCommit={(v) => updateTipo(i.id, { valor_maximo_mensal: v })} />
              ) : (
                <span className="text-white/90 font-medium whitespace-nowrap text-right">{formatCurrency(i.valor)}</span>
              )}
              {editable && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="opacity-0 group-hover:opacity-100 transition text-white/40 hover:text-red-400 flex justify-center" aria-label="Excluir">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir "{i.nome}"?</AlertDialogTitle>
                      <AlertDialogDescription>Esta ação remove a despesa do catálogo. Lançamentos existentes não são removidos.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteTipo(i.id)}>Excluir</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          ))
        )}
        {editable && (
          <div className="grid grid-cols-[1fr_140px_32px] gap-x-6 text-sm px-2 py-1.5 items-center mt-2 border-t border-white/5 pt-3">
            <input
              type="text"
              placeholder="Nova despesa..."
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-md px-2 py-1 text-sm text-white outline-none focus:border-white/30"
            />
            <input
              type="number"
              step="0.01"
              placeholder="0,00"
              value={novoValor}
              onChange={(e) => setNovoValor(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-md px-2 py-1 text-sm text-right text-white outline-none focus:border-white/30 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span />
            <button onClick={addTipo} className="flex justify-center text-white/60 hover:text-white" aria-label="Adicionar">
              <Plus className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
      <div className={`mt-3 pt-3 border-t border-white/10 grid ${editable ? 'grid-cols-[1fr_140px_32px]' : 'grid-cols-[1fr_110px]'} gap-x-6 items-center px-2`}>
        <span className="text-xs text-white/50 uppercase tracking-wider">Total</span>
        <span className="text-base font-bold text-white text-right whitespace-nowrap">{formatCurrency(total)}</span>
        {editable && <span />}
      </div>
    </div>
  );
}

function TextInput({ value, onCommit }: { value: string; onCommit: (v: string) => void }) {
  const [local, setLocal] = useState(value);
  const [editing, setEditing] = useState(false);
  useEffect(() => { setLocal(value); }, [value]);
  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="w-full text-left text-sm text-white/80 px-2 py-1 rounded-md hover:bg-white/5 border border-transparent hover:border-white/10 transition-colors truncate"
      >
        {value}
      </button>
    );
  }
  return (
    <input
      autoFocus
      type="text"
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => { const v = local.trim(); if (v && v !== value) onCommit(v); else setLocal(value); setEditing(false); }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        if (e.key === 'Escape') { setLocal(value); setEditing(false); }
      }}
      className="w-full bg-transparent hover:bg-white/5 focus:bg-white/5 border border-transparent hover:border-white/10 focus:border-white/30 rounded-md px-2 py-1 text-sm text-white/80 outline-none"
    />
  );
}