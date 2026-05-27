import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Settings2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MinimalistLayout } from '@/components/MinimalistLayout';
import { formatCurrency } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

export default function EstrategiaDespesas() {
  const anoAtual = new Date().getFullYear();
  const [ano, setAno] = useState(anoAtual);
  const [totaisMes, setTotaisMes] = useState<Record<string, number>>({});
  const [statusMes, setStatusMes] = useState<Record<string, 'pendente' | 'alana' | 'luan'>>({});
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const start = `${ano}-01-01`;
      const end = `${ano}-12-31`;
      const [{ data: folhaRows }, { data: lancRows }, { data: statusRows }] = await Promise.all([
        supabase
          .from('despesas_manuais_folha' as any)
          .select('total, mes_referencia')
          .gte('mes_referencia', start)
          .lte('mes_referencia', end),
        supabase
          .from('despesas_manuais_lancamentos' as any)
          .select('valor, mes_referencia')
          .gte('mes_referencia', start)
          .lte('mes_referencia', end),
        supabase
          .from('despesas_mes_status' as any)
          .select('mes_referencia, status')
          .gte('mes_referencia', start)
          .lte('mes_referencia', end),
      ]);
      if (cancelled) return;
      const acc: Record<string, number> = {};
      ((folhaRows || []) as any[]).forEach((f) => {
        const key = String(f.mes_referencia).slice(0, 7);
        acc[key] = (acc[key] || 0) + (Number(f.total) || 0);
      });
      ((lancRows || []) as any[]).forEach((l) => {
        const key = String(l.mes_referencia).slice(0, 7);
        acc[key] = (acc[key] || 0) + (Number(l.valor) || 0);
      });
      setTotaisMes(acc);
      const st: Record<string, 'pendente' | 'alana' | 'luan'> = {};
      ((statusRows || []) as any[]).forEach((s) => {
        const key = String(s.mes_referencia).slice(0, 7);
        const raw = s.status as string;
        st[key] = raw === 'alana' ? 'alana' : raw === 'luan' || raw === 'pronto' ? 'luan' : 'pendente';
      });
      setStatusMes(st);
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [ano]);

  const totalAno = Object.values(totaisMes).reduce((s, v) => s + v, 0);
  const mediaMensal = totalAno / 12;

  return (
    <MinimalistLayout
      title="Despesas"
      subtitle={`Ano ${ano} — ${mediaMensal > 1 ? formatCurrency(mediaMensal) + '/mês' : 'Carregando...'}`}
      backPath="/direcao/estrategia"
      fullWidth
      breadcrumbItems={[
        { label: 'Home', path: '/home' },
        { label: 'Direção', path: '/direcao' },
        { label: 'Estratégia', path: '/direcao/estrategia' },
        { label: 'Despesas' },
      ]}
      headerActions={
        <button
          onClick={() => navigate('/direcao/estrategia/despesas/configuracoes')}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm hover:bg-white/10 transition-colors backdrop-blur-xl"
        >
          <Settings2 className="w-4 h-4" />
          Configurações padrão
        </button>
      }
    >
      <div className="text-center mb-2">
        <h2 className="text-3xl font-bold text-white tracking-wide">{ano}</h2>
        <div className="w-16 h-0.5 bg-blue-400/60 mx-auto mt-2 rounded-full" />
      </div>

      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => setAno((a) => a - 1)}
          className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
          aria-label="Ano anterior"
        >
          <ChevronLeft className="w-5 h-5 text-white/70" />
        </button>

        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 12 }, (_, i) => i).map((mIdx) => {
            const mesDate = new Date(ano, mIdx, 1);
            const mesKey = format(mesDate, 'yyyy-MM');
            const mesNome = format(mesDate, 'MMMM', { locale: ptBR });
            const st = statusMes[mesKey] || 'pendente';
            const dotColor = st === 'luan' ? 'bg-emerald-400' : st === 'alana' ? 'bg-yellow-400' : 'bg-red-400';
            const dotTitle = st === 'luan' ? 'Luan' : st === 'alana' ? 'Alana' : 'Pendente';
            return (
              <button
                key={mesKey}
                onClick={() => navigate(`/direcao/estrategia/despesas/${mesKey}`)}
                className="relative p-5 rounded-xl border text-left transition-all duration-200 bg-white/5 border-white/10 hover:bg-white/10 hover:border-blue-400/40"
              >
                <span
                  className={`absolute top-3 right-3 w-2.5 h-2.5 rounded-full ${dotColor}`}
                  title={dotTitle}
                />
                <p className="text-sm text-white/50 capitalize mb-1">{mesNome}</p>
                <p className="text-lg font-semibold text-white">
                  {formatCurrency(totaisMes[mesKey] || 0)}
                </p>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setAno((a) => a + 1)}
          className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
          aria-label="Próximo ano"
        >
          <ChevronRight className="w-5 h-5 text-white/70" />
        </button>
      </div>
    </MinimalistLayout>
  );
}