## Objetivo

Adicionar uma coluna final "Lucro" na tabela em `/direcao/vendas/todas` mostrando o lucro real da venda apenas quando ela estiver faturada.

## Onde

`src/pages/direcao/VendasDirecao.tsx`

## Regra de cálculo (mesma usada em `FaturamentoVendaDirecao`)

```
lucroBruto  = Σ produtos_vendas.lucro_item + (vendas.lucro_instalacao || 0)
lucroReal   = lucroBruto − excedidoValor
```

Onde `excedidoValor` já é calculado nesta página por `calcularExcedidoDesconto(...)` (o valor de desconto que ultrapassou o limite permitido, exibido na coluna "Excedido").

## Exibição

- Coluna adicionada como **última** em `COLUNAS_DISPONIVEIS` com id `lucro`, label "Lucro", `defaultVisible: true`.
- Se a venda **não** estiver faturada (mesmo helper `isFaturada()` já existente — produtos com `faturamento = true`): exibe `-`.
- Se faturada: exibe `formatCurrency(lucroReal)`, em verde quando `>= 0` e vermelho quando negativo, alinhado à direita (mesmo padrão das colunas monetárias).
- Ordenação: incluir case `lucro` no `getSortValue` retornando `lucroReal` (ou `-Infinity` quando não faturada, para ficarem no fim).
- Alinhamento: adicionar `lucro` na lista de colunas com `justify-end` no header (linha ~1003).

## Dados

Nenhuma alteração de query: `useVendas` já traz `produtos_vendas.*` (inclui `lucro_item`) e `vendas.*` (inclui `lucro_instalacao`). Sem migrations.

## Validação

`bun run build` após a edição.
