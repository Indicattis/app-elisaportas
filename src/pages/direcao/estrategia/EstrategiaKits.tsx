import TabelaPrecos from '@/pages/TabelaPrecos';

export default function EstrategiaKits() {
  return (
    <TabelaPrecos
      titleOverride="Tabela de Kits"
      subtitleOverride="Kits e preços"
      backPathOverride="/direcao/estrategia"
      enableReorder
      breadcrumbItemsOverride={[
        { label: 'Home', path: '/home' },
        { label: 'Direção', path: '/direcao' },
        { label: 'Estratégia', path: '/direcao/estrategia' },
        { label: 'Tabela de Kits' },
      ]}
    />
  );
}