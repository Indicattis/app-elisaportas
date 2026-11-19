# Lista de itens da fábrica mais limpa

## O que muda
Em /direcao/estoque/configuracoes/produtos/fabrica:

- **Saem as colunas** Est. Mín, Est. Máx e Atual. Os valores continuam salvos no cadastro do item, só deixam de aparecer na lista.
- **Cada categoria vira um bloco próprio:** um cartão separado com o nome da categoria, a bolinha de cor e a quantidade de itens no topo, e a tabela dela logo abaixo. Hoje é uma tabela única com divisórias.
- **Linhas mais baixas:** cada linha tem no máximo 50px de altura, com menos espaço interno e campos menores (Setor, Pintura e os demais).
- **Visual mais leve:** bordas mais suaves entre linhas e cabeçalho discreto em cada bloco.

O arrastar para reordenar, o clique duplo para editar e as trocas rápidas de Setor e Pintura continuam funcionando.

A mesma tabela aparece em /fabrica/produtos, então a mudança vale para as duas telas.

## Detalhes técnicos
- `ProdutosFabrica.tsx`: remover as 3 colunas (head, células de SortableProductRow e linha de totais) e ajustar `colSpanCount` (+5 vira +2).
- O render agrupado passa a gerar um cartão `bg-white/5 backdrop-blur-xl border-white/10 rounded-xl` por grupo, cada um com seu `<Table>` e `renderHeader()`, mantendo o DndContext/SortableContext em volta.
- Linhas com `h-[50px] max-h-[50px]` e células `py-1`; os triggers ficam com `h-7` e o texto pode ser truncado.
