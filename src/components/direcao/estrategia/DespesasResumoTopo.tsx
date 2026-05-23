import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/utils';
import { Users, Receipt, TrendingDown } from 'lucide-react';

type Item = { id: string; nome: string; valor: number };

const isFolha = (nome: string) => /sal[áa]rio|folha/i.test(nome);

interface Props {
  mes: string | null;
}

export default function DespesasResumoTopo({ mes }: Props) {
  const [folha, setFolha] = useState<Item[]>([]);
  const [fixas, setFixas] = useState<Item[]>([]);
  const [variaveis, setVariaveis] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);

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
              .select('id, nome, tipo, valor_maximo_mensal, ativo')
              .eq('ativo', true),
            supabase
              .from('admin_users')
              .select('id, nome, salario, em_folha, ativo')
              .eq('ativo', true)
              .eq('em_folha', true),
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
            ((colabs || []) as any[]).map((c) => ({
              id: c.id,
              nome: c.nome,
              valor: Number(c.salario) || 0,
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
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [mes]);

  const rotulo = mes ? `Valores de ${mes}` : 'Configuração padrão';

  return (
    <div className="grid grid-cols-1 gap-4 mb-6">
      <Bloco titulo="Folha Salarial" icon={<Users className="w-4 h-4" />} itens={folha} rotulo={rotulo} loading={loading} />
      <Bloco titulo="Despesas Fixas" icon={<Receipt className="w-4 h-4" />} itens={fixas} rotulo={rotulo} loading={loading} />
      <Bloco titulo="Despesas Variáveis" icon={<TrendingDown className="w-4 h-4" />} itens={variaveis} rotulo={rotulo} loading={loading} />
    </div>
  );
}

function Bloco({
  titulo,
  icon,
  itens,
  rotulo,
  loading,
}: {
  titulo: string;
  icon: React.ReactNode;
  itens: Item[];
  rotulo: string;
  loading: boolean;
}) {
  const total = itens.reduce((s, i) => s + i.valor, 0);
  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-5 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-white">
          {icon}
          <h3 className="font-semibold">{titulo}</h3>
        </div>
        <span className="text-[10px] uppercase tracking-wider text-white/40">{rotulo}</span>
      </div>
      <div className="flex-1 max-h-64 overflow-y-auto space-y-1.5 pr-1">
        {loading ? (
          <p className="text-sm text-white/40">Carregando...</p>
        ) : itens.length === 0 ? (
          <p className="text-sm text-white/40">Sem itens</p>
        ) : (
          itens.map((i) => (
            <div key={i.id} className="flex justify-between text-sm border-b border-white/5 pb-1">
              <span className="text-white/70 truncate pr-2">{i.nome}</span>
              <span className="text-white/90 font-medium whitespace-nowrap">{formatCurrency(i.valor)}</span>
            </div>
          ))
        )}
      </div>
      <div className="mt-3 pt-3 border-t border-white/10 flex justify-between items-center">
        <span className="text-xs text-white/50 uppercase tracking-wider">Total</span>
        <span className="text-lg font-bold text-white">{formatCurrency(total)}</span>
      </div>
    </div>
  );
}