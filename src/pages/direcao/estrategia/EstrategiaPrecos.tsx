import TabelaPrecos from '@/pages/TabelaPrecos';

export default function EstrategiaPrecos() {
  return (
    <TabelaPrecos
      hideLucroColumn
      hideAcoesColumn
      hideCatalogoTab
      titleOverride="Tabela de Preços"
      subtitleOverride="Preços das portas por tamanho"
      backPathOverride="/direcao/estrategia"
      breadcrumbItemsOverride={[
        { label: 'Home', path: '/home' },
        { label: 'Direção', path: '/direcao' },
        { label: 'Estratégia', path: '/direcao/estrategia' },
        { label: 'Tabela de Preços' },
      ]}
    />
  );
}