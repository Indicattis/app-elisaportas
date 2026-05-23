import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { MinimalistLayout } from '@/components/MinimalistLayout';
import DespesasResumoTopo from '@/components/direcao/estrategia/DespesasResumoTopo';
import { formatCurrency } from '@/lib/utils';

export default function EstrategiaDespesas() {
  const anoAtual = new Date().getFullYear();
  const [ano, setAno] = useState(anoAtual);
  const [mesSelecionado, setMesSelecionado] = useState<string | null>(null);
  const [mediaMensal, setMediaMensal] = useState<number>(0);

  return (
    <MinimalistLayout
      title="Despesas"
      subtitle={`Ano ${ano} — ${mediaMensal > 1 ? formatCurrency(mediaMensal) + '/mês' : 'Carregando...'}`}
      backPath="/direcao/estrategia"
      breadcrumbItems={[
        { label: 'Home', path: '/home' },
        { label: 'Direção', path: '/direcao' },
        { label: 'Estratégia', path: '/direcao/estrategia' },
        { label: 'Despesas' },
      ]}
    >
      <DespesasResumoTopo mes={mesSelecionado} ano={ano} onMediaMensalChange={setMediaMensal} />

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
                <p className="text-lg font-semibold text-white">{mesKey}</p>
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