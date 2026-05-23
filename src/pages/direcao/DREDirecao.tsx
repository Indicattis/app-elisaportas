import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, startOfYear, endOfYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loader2, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { MinimalistLayout } from '@/components/MinimalistLayout';

interface FaturamentoMes {
  mes: number;
  valor: number;
}

interface RealizadoMes {
  mes: number;
  lucro_liquido_final: number;
}

type StatusMes = 'futuro' | 'a_realizar' | 'nao_realizado' | 'realizado';

export default function DREDirecao() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [faturamentos, setFaturamentos] = useState<FaturamentoMes[]>([]);
  const [realizados, setRealizados] = useState<Record<number, RealizadoMes>>({});

  const anoAtual = new Date().getFullYear();
  const mesAtual = new Date().getMonth();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const inicioAno = startOfYear(new Date(anoAtual, 0, 1));
        const fimAno = endOfYear(new Date(anoAtual, 11, 31));

        const [vendasRes, realizadosRes] = await Promise.all([
          supabase
            .from('vendas')
            .select('data_venda, valor_venda, valor_frete, valor_credito')
            .gte('data_venda', inicioAno.toISOString())
            .lte('data_venda', fimAno.toISOString()),
          supabase
            .from('dre_realizados')
            .select('mes, lucro_liquido_final')
            .gte('mes', format(inicioAno, 'yyyy-MM-dd'))
            .lte('mes', format(fimAno, 'yyyy-MM-dd')),
        ]);

        if (vendasRes.error) throw vendasRes.error;
        if (realizadosRes.error) throw realizadosRes.error;

        // Agrupar por mês
        const porMes: Record<number, number> = {};
        for (let i = 0; i < 12; i++) porMes[i] = 0;

        vendasRes.data?.forEach(v => {
          const mes = new Date(v.data_venda).getMonth();
          const valorTotal = (v.valor_venda || 0) + (v.valor_credito || 0);
          porMes[mes] += valorTotal - (v.valor_frete || 0);
        });

        setFaturamentos(
          Object.entries(porMes).map(([mes, valor]) => ({
            mes: parseInt(mes),
            valor,
          }))
        );

        const mapaReal: Record<number, RealizadoMes> = {};
        realizadosRes.data?.forEach((r: any) => {
          const mesIdx = new Date(r.mes + 'T12:00:00').getMonth();
          mapaReal[mesIdx] = {
            mes: mesIdx,
            lucro_liquido_final: Number(r.lucro_liquido_final) || 0,
          };
        });
        setRealizados(mapaReal);
      } catch (err) {
        console.error('Erro ao buscar faturamento:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [anoAtual]);

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const getStatus = (mes: number): StatusMes => {
    if (realizados[mes]) return 'realizado';
    if (mes > mesAtual) return 'futuro';
    if (mes === mesAtual) return 'a_realizar';
    return 'nao_realizado';
  };

  const statusStyles: Record<StatusMes, { border: string; badge: string; icon: JSX.Element | null; label: string }> = {
    futuro: {
      border: 'border-white/10 hover:bg-white/10',
      badge: 'text-white/40',
      icon: null,
      label: 'Futuro',
    },
    a_realizar: {
      border: 'border-yellow-400/50 hover:bg-yellow-400/10',
      badge: 'text-yellow-300',
      icon: <Clock className="w-3.5 h-3.5" strokeWidth={1.8} />,
      label: 'A realizar',
    },
    nao_realizado: {
      border: 'border-red-500/40 hover:bg-red-500/10',
      badge: 'text-red-300',
      icon: <AlertCircle className="w-3.5 h-3.5" strokeWidth={1.8} />,
      label: 'Não realizado',
    },
    realizado: {
      border: 'border-emerald-500/50 hover:bg-emerald-500/10',
      badge: 'text-emerald-300',
      icon: <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={1.8} />,
      label: 'Realizado',
    },
  };

  return (
    <MinimalistLayout
      title="D.R.E"
      subtitle={`Ano ${anoAtual}`}
      backPath="/direcao"
      breadcrumbItems={[
        { label: 'Home', path: '/home' },
        { label: 'Direção', path: '/direcao' },
        { label: 'Estratégia', path: '/direcao/estrategia' },
        { label: 'DRE' },
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
              const status = getStatus(item.mes);
              const style = statusStyles[status];
              const real = realizados[item.mes];
              return (
                <button
                  key={item.mes}
                  onClick={() => navigate(`/direcao/estrategia/dre/${mesKey}`)}
                  className={`p-5 rounded-xl bg-white/5 border text-left transition-all duration-200 group ${style.border}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm text-white/50 capitalize">{mesNome}</p>
                    <span className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wider ${style.badge}`}>
                      {style.icon}
                      {style.label}
                    </span>
                  </div>
                  <p className={`text-lg font-semibold ${item.valor > 0 ? 'text-white' : 'text-white/30'}`}>
                    {formatCurrency(item.valor)}
                  </p>
                  {real && (
                    <p className="text-xs text-emerald-300/80 mt-1">
                      Líquido: {formatCurrency(real.lucro_liquido_final)}
                    </p>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-5 text-[11px] text-white/40">
            <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-yellow-400/70" /> A realizar</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500/70" /> Realizado</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500/70" /> Não realizado</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-white/30" /> Futuro</span>
          </div>

          <div className="flex gap-4 mt-6">
            <button
              onClick={() => navigate('/direcao/estrategia/dre/despesas')}
              className="flex-1 p-4 rounded-xl bg-white/5 border border-white/10 text-left
                         hover:bg-white/10 transition-all duration-200"
            >
              <p className="text-sm text-white/50 mb-1">Configuração</p>
              <p className="text-lg font-semibold text-white">Despesas</p>
            </button>
            <button
              onClick={() => navigate('/direcao/estrategia/dre/custos')}
              className="flex-1 p-4 rounded-xl bg-white/5 border border-white/10 text-left
                         hover:bg-white/10 transition-all duration-200"
            >
              <p className="text-sm text-white/50 mb-1">Configuração</p>
              <p className="text-lg font-semibold text-white">Custos</p>
            </button>
          </div>
        </>
      )}
    </MinimalistLayout>
  );
}
