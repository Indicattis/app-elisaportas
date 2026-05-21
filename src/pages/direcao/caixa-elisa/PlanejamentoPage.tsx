import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarRange, ArrowLeft } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { AnimatedBreadcrumb } from '@/components/AnimatedBreadcrumb';
import { FloatingProfileMenu } from '@/components/FloatingProfileMenu';
import { DelayedParticles } from '@/components/DelayedParticles';
import { supabase } from '@/integrations/supabase/client';

const formatBRL = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n || 0);

interface Obrigacao {
  id: string;
  nome: string;
  data: string;
  valor: number;
  pago: boolean;
}

export default function PlanejamentoPage() {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  const { data: obrigacoes = [] } = useQuery({
    queryKey: ['caixa-elisa-obrigacoes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('caixa_elisa_obrigacoes')
        .select('*')
        .order('data', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Obrigacao[];
    },
  });

  const grupos = useMemo(() => {
    const map = new Map<string, { label: string; items: Obrigacao[]; subtotal: number }>();
    for (const o of obrigacoes) {
      const d = new Date(o.data + 'T12:00:00');
      const key = format(d, 'yyyy-MM');
      const label = format(d, "MMMM 'de' yyyy", { locale: ptBR });
      const labelCap = label.charAt(0).toUpperCase() + label.slice(1);
      const entry = map.get(key) ?? { label: labelCap, items: [], subtotal: 0 };
      entry.items.push(o);
      entry.subtotal += Number(o.valor || 0);
      map.set(key, entry);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);
  }, [obrigacoes]);

  const totalAcumulado = useMemo(
    () => obrigacoes.reduce((s, o) => s + Number(o.valor || 0), 0),
    [obrigacoes],
  );
  const totalPago = useMemo(
    () => obrigacoes.filter(o => o.pago).reduce((s, o) => s + Number(o.valor || 0), 0),
    [obrigacoes],
  );

  return (
    <div className="min-h-screen bg-black relative overflow-x-hidden">
      <DelayedParticles />
      <AnimatedBreadcrumb
        items={[
          { label: 'Home', path: '/home' },
          { label: 'Direção', path: '/direcao' },
          { label: 'Caixa Elisa', path: '/direcao/caixa-elisa' },
          { label: 'Planejamento 2M de Giro' },
        ]}
        mounted={mounted}
      />
      <FloatingProfileMenu mounted={mounted} />

      <button
        onClick={() => navigate('/direcao/caixa-elisa')}
        className="fixed top-4 left-4 z-50 p-1.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/10 transition-all duration-300"
      >
        <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-500/20">
          <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
        </div>
      </button>

      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-16">
        <div className="rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 p-5 flex items-center gap-4 mb-6">
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
            <CalendarRange className="w-6 h-6 text-emerald-400" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">Planejamento 2M de Giro</h1>
            <p className="text-sm text-white/50">Obrigações agrupadas por mês</p>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-4">
          {/* 80% — agrupado por mês */}
          <div className="lg:w-4/5 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 p-4">
            {grupos.length === 0 ? (
              <div className="py-10 text-center text-sm text-white/40">Nenhuma obrigação cadastrada.</div>
            ) : (
              <div className="flex flex-col gap-6">
                {grupos.map((g) => (
                  <div key={g.label}>
                    <div className="flex items-center justify-between mb-2 px-2">
                      <h2 className="text-sm font-semibold text-white/80 uppercase tracking-wider">{g.label}</h2>
                      <span className="text-xs text-white/40">Subtotal: <span className="text-white font-semibold">{formatBRL(g.subtotal)}</span></span>
                    </div>
                    <ul className="flex flex-col gap-2">
                      {g.items.map((o) => (
                        <li
                          key={o.id}
                          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10"
                        >
                          <div className={`w-2 h-2 rounded-full ${o.pago ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                          <div className="flex flex-col min-w-0 flex-1">
                            <span className={`font-semibold truncate ${o.pago ? 'text-white/40 line-through' : 'text-white'}`}>
                              {o.nome}
                            </span>
                            <span className="text-xs text-white/40">
                              {format(new Date(o.data + 'T12:00:00'), 'dd/MM/yyyy')}
                            </span>
                          </div>
                          <div className={`font-semibold whitespace-nowrap ${o.pago ? 'text-white/40' : 'text-white'}`}>
                            {formatBRL(Number(o.valor))}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 20% — totais */}
          <div className="lg:w-1/5 flex flex-col gap-4">
            <div className="rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 p-6 text-center">
              <div className="text-xs tracking-widest text-white/40 uppercase">Total Acumulado</div>
              <div className="mt-3 text-3xl font-bold text-white tracking-tight">{formatBRL(totalAcumulado)}</div>
            </div>
            <div className="rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 p-6 text-center">
              <div className="text-xs tracking-widest text-white/40 uppercase">Total Pago</div>
              <div className="mt-3 text-3xl font-bold text-emerald-300 tracking-tight">{formatBRL(totalPago)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}