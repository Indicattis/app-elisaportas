import ProdutosFabrica from '@/pages/direcao/estoque/ProdutosFabrica';

export default function EstrategiaItens() {
  return (
    <ProdutosFabrica
      hideSku
      hideMateriaPrima
      hidePedidos
      hideConferir
      disableNavigate
      showPrecoVenda
      blockDelete
      titleOverride="Itens"
      subtitleOverride="Catálogo de itens"
      backPathOverride="/direcao/estrategia"
      breadcrumbItemsOverride={[
        { label: 'Home', path: '/home' },
        { label: 'Direção', path: '/direcao' },
        { label: 'Estratégia', path: '/direcao/estrategia' },
        { label: 'Itens' },
      ]}
    />
  );
}