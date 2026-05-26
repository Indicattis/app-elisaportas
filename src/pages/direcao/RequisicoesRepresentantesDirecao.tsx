import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AnimatedBreadcrumb } from '@/components/AnimatedBreadcrumb';
import { DelayedParticles } from '@/components/DelayedParticles';

type Requisicao = {
  id: string;
  representante_id: string | null;
  orcamento_app_id: string | null;
  valor_total: number | null;
  valor_frete: number | null;
  comissao_pct: number | null;
  comissao_valor: number | null;
  status: string | null;
  observacoes: string | null;
  created_at: string;
  representantes?: { nome: string | null } | null;
  orcamentos_app?: {
    numero: number | null;
    nome_cliente: string | null;
    cidade: string | null;
    estado: string | null;
    valor_total: number | null;
  } | null;
};

const STATUS_COLORS: Record<string, string> = {
  pendente: 'bg-amber-500/15 text-amber-300 border-amber-400/30',
  aprovada: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30',
  recusada: 'bg-red-500/15 text-red-300 border-red-400/30',
  cancelada: 'bg-slate-500/15 text-slate-300 border-slate-400/30',
};

const fmtMoney = (v: number | null | undefined) =>
  (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

export default function RequisicoesRepresentantesDirecao() {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Requisicao[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('todos');

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('requisicoes_venda')
        .select(
          '*, representantes(nome), orcamentos_app(numero, nome_cliente, cidade, estado, valor_total)'
        )
        .order('created_at', { ascending: false });
      if (error) {
        console.error('[RequisicoesRepresentantesDirecao] erro ao buscar:', error);
      } else if (data) {
        setData(data as unknown as Requisicao[]);
      }
      setLoading(false);
    })();
  }, []);

  const statuses = Array.from(new Set(data.map((r) => r.status ?? 'pendente')));
  const filtered = statusFilter === 'todos' ? data : data.filter((r) => (r.status ?? 'pendente') === statusFilter);

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <DelayedParticles />

      <AnimatedBreadcrumb
        items={[
          { label: 'Home', path: '/home' },
          { label: 'Direção', path: '/direcao' },
          { label: 'Vendas', path: '/direcao/vendas' },
          { label: 'Requisições Representantes' },
        ]}
        mounted={mounted}
      />

      <button
        onClick={() => navigate('/direcao/vendas')}
        className="fixed top-4 left-4 z-50 p-1.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/10 transition-all duration-300"
      >
        <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-orange-700 text-white shadow-lg shadow-orange-500/20">
          <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
        </div>
      </button>

      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-12">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-orange-500 to-orange-700 shadow-lg shadow-orange-500/20">
            <FileText className="w-5 h-5 text-white" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">Requisições de Representantes</h1>
            <p className="text-xs text-white/40">Vendas solicitadas via app por representantes, com orçamento vinculado</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {['todos', ...statuses].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                statusFilter === s
                  ? 'bg-orange-500/20 text-orange-200 border-orange-400/40'
                  : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10'
              }`}
            >
              {s === 'todos' ? 'Todos' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        <div className="rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 text-white/40 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center text-white/40 text-sm">Nenhuma requisição encontrada.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-white/5 border-b border-white/10">
                  <tr className="text-white/50 text-xs uppercase tracking-wider">
                    <th className="px-4 py-3 text-left font-medium">Data</th>
                    <th className="px-4 py-3 text-left font-medium">Representante</th>
                    <th className="px-4 py-3 text-left font-medium">Orçamento</th>
                    <th className="px-4 py-3 text-left font-medium">Cliente</th>
                    <th className="px-4 py-3 text-right font-medium">Valor Total</th>
                    <th className="px-4 py-3 text-right font-medium">Frete</th>
                    <th className="px-4 py-3 text-right font-medium">Comissão (sem frete)</th>
                    <th className="px-4 py-3 text-center font-medium">Status</th>
                    <th className="px-4 py-3 text-left font-medium">Observações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filtered.map((r) => {
                    const statusKey = (r.status ?? 'pendente').toLowerCase();
                    const badge = STATUS_COLORS[statusKey] ?? 'bg-white/10 text-white/70 border-white/15';
                    return (
                      <tr key={r.id} className="text-white/80 hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-white/60">{fmtDate(r.created_at)}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{r.representantes?.nome ?? '—'}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {r.orcamentos_app?.numero ? (
                            <span className="font-mono text-orange-300">#{r.orcamentos_app.numero}</span>
                          ) : (
                            <span className="text-white/30">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-white/90">{r.orcamentos_app?.nome_cliente ?? '—'}</div>
                          {(r.orcamentos_app?.cidade || r.orcamentos_app?.estado) && (
                            <div className="text-xs text-white/40">
                              {[r.orcamentos_app?.cidade, r.orcamentos_app?.estado].filter(Boolean).join(' / ')}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap font-medium">{fmtMoney(r.valor_total)}</td>
                        <td className="px-4 py-3 text-right whitespace-nowrap text-white/60">{fmtMoney(r.valor_frete)}</td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div>{fmtMoney(r.comissao_valor)}</div>
                          <div className="text-xs text-white/40">
                            {(r.comissao_pct ?? 0).toFixed(2)}% sobre {fmtMoney((r.valor_total ?? 0) - (r.valor_frete ?? 0))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <span className={`inline-block px-2 py-1 rounded-md text-xs font-medium border ${badge}`}>
                            {statusKey.charAt(0).toUpperCase() + statusKey.slice(1)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-white/60 max-w-xs">
                          <div className="line-clamp-2">{r.observacoes || '—'}</div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-3 text-xs text-white/40">
          {filtered.length} {filtered.length === 1 ? 'requisição' : 'requisições'}
        </div>
      </div>
    </div>
  );
}