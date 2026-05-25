import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { MinimalistLayout } from '@/components/MinimalistLayout';
import DespesasResumoTopo from '@/components/direcao/estrategia/DespesasResumoTopo';
import { formatCurrency } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

export default function EstrategiaDespesas() {
  const anoAtual = new Date().getFullYear();
  const [ano, setAno] = useState(anoAtual);
  const [mesSelecionado, setMesSelecionado] = useState<string | null>(null);
  const [mediaMensal, setMediaMensal] = useState<number>(0);
  const [totaisMes, setTotaisMes] = useState<Record<string, number>>({});
  const [reloadTotais, setReloadTotais] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const start = `${ano}-01-01`;
      const end = `${ano}-12-31`;
      const [{ data: folhaRows }, { data: lancRows }] = await Promise.all([
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
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [ano, reloadTotais]);

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
            const ativo = mesSelecionado === mesKey;
            return (
              <button
                key={mesKey}
                onClick={() => setMesSelecionado(ativo ? null : mesKey)}
                className={`p-5 rounded-xl border text-left transition-all duration-200 ${
                  ativo
                    ? 'bg-blue-500/20 border-blue-400/40 text-white'
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
              >
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

      <DespesasResumoTopo
        mes={mesSelecionado}
        ano={ano}
        onMediaMensalChange={setMediaMensal}
        onDataChange={() => setReloadTotais((v) => v + 1)}
      />
    </MinimalistLayout>
  );
}