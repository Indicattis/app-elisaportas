## Problema

Em `/direcao/estrategia/itens`, na aba **Itens do catálogo** (`CatalogoPrecosTab`):

1. A coluna **Valor de Venda** mostra apenas texto (`<span>{formatCurrency(preco)}</span>`) e não pode ser editada.
2. A cor de fundo da coluna está vazia (`COLUMN_BG.venda = ""`), enquanto na tabela acima (em `EstrategiaItens`) a mesma coluna tem cor verde (`green` em `DEFAULT_COLUMN_COLORS`, podendo ser personalizada pelo usuário e salva em `localStorage["estrategia-itens-column-colors-v1"]`).

## Mudanças

Arquivo único: `src/components/tabela-precos/CatalogoPrecosTab.tsx`.

1. **Tornar "Valor de Venda" editável**
   - Em `cellRenderers.venda` (linha 811), trocar `<span>{formatCurrency(preco)}</span>` por `renderEditableCell(produto, "preco_venda")`.
   - O helper `renderEditableCell` já suporta o campo `preco_venda` (clique para abrir input, Enter salva, Escape cancela) e usa a mesma mutation `editarProduto`.

2. **Espelhar a cor da coluna "Valor de Venda" da tabela acima**
   - Importar/replicar o mapa `COLUMN_COLOR_OPTIONS` (mesmas chaves usadas em `EstrategiaItens.tsx`: rose, red, orange, amber, …, slate) com as classes `bg-<cor>-100 dark:bg-<cor>-500/30`.
   - Ler dinamicamente `localStorage["estrategia-itens-column-colors-v1"]` no mount (com fallback para os defaults: `custo: rose, lucro: blue, imposto: orange, desconto: yellow, cartao: teal, venda: green, objetivo: violet`) e armazenar em estado `columnColors`.
   - Adicionar um listener `window.addEventListener("storage", …)` para refletir mudanças feitas em outra aba/sessão.
   - Substituir o uso de `COLUMN_BG[col]` (constante estática) pelos backgrounds derivados de `columnColors`, tanto no `SortableHeadCell` quanto nas células do `ProdutoRow`. Para isso, passar `columnColors` por prop ao `ProdutoRow` e aplicar a classe no `<TableCell>` correspondente (atualmente o cell wrapper não recebe background — adicionar `className={cn(COLUMN_WIDTHS[col], getColumnBg(columnColors, col), cellExtraCls[col])}` na célula que renderiza `cellRenderers[col]`).
   - Resultado: cada coluna (incluindo Valor de Venda) ganha a mesma cor exibida na tabela acima e acompanha mudanças configuradas pelo usuário lá.

3. **Sem mudanças de dados ou lógica**
   - Sem alterações em hooks (`useCatalogoPrecos`, mutations), banco ou outros arquivos.
   - Modo `compact` continua mostrando só a coluna `venda` com a mesma cor.

## Verificação

- Build limpo.
- Em `/direcao/estrategia/itens`, aba Itens do catálogo: clicar em qualquer valor da coluna "Valor de Venda" abre o input de edição; Enter salva; o valor persiste após reload.
- A cor do header e das células das colunas (custo, lucro, imposto, desconto, cartão, venda, preço objetivo) é idêntica à da tabela acima; mudar a cor da coluna "Valor de Venda" na tabela acima (via popover de cores) é refletida no catálogo após reload.