import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MinimalistLayout } from '@/components/MinimalistLayout';
import DREMesDirecao from '@/pages/direcao/DREMesDirecao';

export default function EstrategiaDespesas() {
  const anoAtual = new Date().getFullYear();
  const [mesSelecionado, setMesSelecionado] = useState<string | null>(null);

  return (
    <MinimalistLayout
      title="Despesas"
      subtitle={`Ano ${anoAtual}`}
      backPath="/direcao/estrategia"
      breadcrumbItems={[
        { label: 'Home', path: '/home' },
        { label: 'Direção', path: '/direcao' },
        { label: 'Estratégia', path: '/direcao/estrategia' },
        { label: 'Despesas' },
      ]}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 12 }, (_, i) => i).map((mIdx) => {
          const mesDate = new Date(anoAtual, mIdx, 1);
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

      {mesSelecionado && (
        <div className="mt-8">
          <DREMesDirecao key={mesSelecionado} mesProp={mesSelecionado} viewMode="despesas" embedded />
        </div>
      )}
    </MinimalistLayout>
  );
}