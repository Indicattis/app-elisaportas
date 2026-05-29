# Tornar "Valor de Venda" do catálogo somente leitura em /direcao/estrategia/precos

A página `/direcao/estrategia/precos` usa `CatalogoPrecosTab` com a prop `compact`. Nesse modo, a única coluna exibida é "Valor de Venda", que hoje renderiza via `renderEditableCell(produto, "preco_venda")`, permitindo clique para edição. A edição deve permanecer apenas em `/direcao/estrategia/itens`.

## Alteração

Em `src/components/tabela-precos/CatalogoPrecosTab.tsx`, no objeto `cellRenderers` da linha do produto, trocar o renderizador da coluna `venda` por uma versão somente leitura quando `compact` for true:

- `venda: compact ? <>{formatCurrency(preco)}</> : renderEditableCell(produto, "preco_venda")`

Isso mantém o fundo verde da coluna e o valor formatado, mas remove o cursor de edição, o hover sublinhado e o handler `onClick` que abre o input. Nenhuma outra tela é afetada (em `EstrategiaItens` o componente é usado sem `compact`).

## Arquivos

- `src/components/tabela-precos/CatalogoPrecosTab.tsx` — única alteração.
