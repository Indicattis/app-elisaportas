import TabelaPrecos from '@/pages/TabelaPrecos';
import { MinimalistLayout } from '@/components/MinimalistLayout';
import { CatalogoPrecosTab } from '@/components/tabela-precos/CatalogoPrecosTab';

export default function EstrategiaPrecos() {
  return (
    <MinimalistLayout
      title="Tabela de Preços"
      subtitle="Kits de portas e catálogo"
      backPath="/direcao/estrategia"
      breadcrumbItems={[
        { label: 'Home', path: '/home' },
        { label: 'Direção', path: '/direcao' },
        { label: 'Estratégia', path: '/direcao/estrategia' },
        { label: 'Tabela de Preços' },
      ]}
    >
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <TabelaPrecos
            embedded
            hideLucroColumn
            hideAcoesColumn
            hideTotalColumn
          />
        </div>
        <div className="lg:col-span-2">
          <CatalogoPrecosTab compact />
        </div>
      </div>
    </MinimalistLayout>
  );
}