import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, startOfYear, endOfYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { MinimalistLayout } from '@/components/MinimalistLayout';

interface FaturamentoMes {
  mes: number;
  valor: number;
}

export default function DREDirecao() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [faturamentos, setFaturamentos] = useState<FaturamentoMes[]>([]);

  const anoAtual = new Date().getFullYear();

  useEffect(() => {
    const fetchData = async () => {
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

        // Agrupar por mês
        const porMes: Record<number, number> = {};
        for (let i = 0; i < 12; i++) porMes[i] = 0;

        vendas?.forEach(v => {
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

  return (
    <MinimalistLayout
      title="D.R.E"
      subtitle={`Ano ${anoAtual}`}
      backPath="/direcao"
      breadcrumbItems={[
        { label: 'Home', path: '/home' },
        { label: 'Direção', path: '/direcao' },
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

              return (
                <button
                  key={item.mes}
                  onClick={() => navigate(`/direcao/estrategia/dre/${mesKey}`)}
                  className="p-5 rounded-xl bg-white/5 border border-white/10 text-left
                             hover:bg-white/10 transition-all duration-200 group"
                >
                  <p className="text-sm text-white/50 capitalize mb-1">{mesNome}</p>
                  <p className={`text-lg font-semibold ${item.valor > 0 ? 'text-white' : 'text-white/30'}`}>
                    {formatCurrency(item.valor)}
                  </p>
                </button>
              );
            })}
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
