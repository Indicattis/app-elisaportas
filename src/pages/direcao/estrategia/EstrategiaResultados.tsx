import { useEffect, useState } from 'react';
import { format, startOfYear, endOfYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { MinimalistLayout } from '@/components/MinimalistLayout';
import DREMesDirecao from '@/pages/direcao/DREMesDirecao';

interface FaturamentoMes { mes: number; valor: number }

export default function EstrategiaResultados() {
  const anoAtual = new Date().getFullYear();
  const [loading, setLoading] = useState(true);
  const [faturamentos, setFaturamentos] = useState<FaturamentoMes[]>([]);
  const [mesSelecionado, setMesSelecionado] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const inicioAno = startOfYear(new Date(anoAtual, 0, 1));
        const fimAno = endOfYear(new Date(anoAtual, 11, 31));
        const { data: vendas, error } = await supabase
          .from('vendas')
          .select('data_venda, valor_venda, valor_frete, valor_credito')
          .gte('data_venda', inicioAno.toISOString())
          .lte('data_venda', fimAno.toISOString());
        if (error) throw error;
        const porMes: Record<number, number> = {};
        for (let i = 0; i < 12; i++) porMes[i] = 0;
        vendas?.forEach((v) => {
          const mes = new Date(v.data_venda).getMonth();
          const total = (v.valor_venda || 0) + (v.valor_credito || 0);
          porMes[mes] += total - (v.valor_frete || 0);
        });
        setFaturamentos(Object.entries(porMes).map(([m, v]) => ({ mes: parseInt(m), valor: v })));
      } finally {
        setLoading(false);
      }
    })();
  }, [anoAtual]);

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <MinimalistLayout
      title="Resultados"
      subtitle={`Ano ${anoAtual}`}
      backPath="/direcao/estrategia"
      breadcrumbItems={[
        { label: 'Home', path: '/home' },
        { label: 'Direção', path: '/direcao' },
        { label: 'Estratégia', path: '/direcao/estrategia' },
        { label: 'Resultados' },
      ]}
    >
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-white/40" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {faturamentos.map((item) => {
              const mesDate = new Date(anoAtual, item.mes, 1);
              const mesKey = format(mesDate, 'yyyy-MM');
              const mesNome = format(mesDate, 'MMMM', { locale: ptBR });
              const ativo = mesSelecionado === mesKey;
              return (
                <button
                  key={mesKey}
                  onClick={() => setMesSelecionado(ativo ? null : mesKey)}
                  className={`p-5 rounded-xl border text-left transition-all duration-200 ${
                    ativo
                      ? 'bg-blue-500/20 border-blue-400/40'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <p className="text-sm text-white/50 capitalize mb-1">{mesNome}</p>
                  <p className={`text-lg font-semibold ${item.valor > 0 ? 'text-white' : 'text-white/30'}`}>{fmt(item.valor)}</p>
                </button>
              );
            })}
          </div>

          {mesSelecionado && (
            <div className="mt-8">
              <DREMesDirecao key={mesSelecionado} mesProp={mesSelecionado} viewMode="resultados" embedded />
            </div>
          )}
        </>
      )}
    </MinimalistLayout>
  );
}