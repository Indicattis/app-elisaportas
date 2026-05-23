import TabelaPrecos from '@/pages/TabelaPrecos';
import { CatalogoPrecosTab } from '@/components/tabela-precos/CatalogoPrecosTab';
import { MinimalistLayout } from '@/components/MinimalistLayout';

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
      fullWidth
    >
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <TabelaPrecos
            embedded
            hideLucroColumn
            hideAcoesColumn
          />
        </div>
        <div className="xl:col-span-1">
          <CatalogoPrecosTab compact />
        </div>
      </div>
    </MinimalistLayout>
  );
}
