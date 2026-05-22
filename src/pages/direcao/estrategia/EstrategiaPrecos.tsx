import TabelaPrecos from '@/pages/TabelaPrecos';

export default function EstrategiaPrecos() {
  return (
    <TabelaPrecos
      titleOverride="Tabela de Preços"
      subtitleOverride="Kits de portas e catálogo"
      backPathOverride="/direcao/estrategia"
      breadcrumbItemsOverride={[
        { label: 'Home', path: '/home' },
        { label: 'Direção', path: '/direcao' },
        { label: 'Estratégia', path: '/direcao/estrategia' },
        { label: 'Tabela de Preços' },
      ]}
      hideLucroColumn
      hideAcoesColumn
      hideTotalColumn
    />
  );
}
