## Diagnóstico

Confirmado na venda `771dcd7b-…`: os dois itens têm `tamanho = "3x3"`, mas `largura` e `altura` estão `NULL` no banco.

A causa está em `src/hooks/useVendas.ts`. Nos dois blocos que fazem `insert` em `produtos_vendas` (criação da venda ~L433 e salvamento como rascunho ~L790), o objeto `baseSplit` grava apenas `tamanho`, ignorando `produto.largura` e `produto.altura`. O mesmo vale para os itens de `tipo_produto = 'instalacao'` gerados em seguida (~L469 e ~L826). Como o tipo `ProdutoVenda` e o formulário já carregam `largura`/`altura`, o dado chega ao hook mas é descartado antes do insert.

Efeito colateral: 934 linhas de `produtos_vendas` já foram salvas sem medidas (das quais 512 têm `tamanho` no formato numérico e podem ser recuperadas por parse).

## Correção

1. `src/hooks/useVendas.ts` — em ambos os blocos de insert:
   - Adicionar `largura: produto.largura ?? null` e `altura: produto.altura ?? null` ao `baseSplit`.
   - Adicionar os mesmos campos aos itens sintetizados de `tipo_produto: 'instalacao'` (para acompanhar a porta correspondente).

2. Backfill histórico via migração:
   - Preencher `largura`/`altura` em `produtos_vendas` onde estão `NULL` e `tamanho` casa com o padrão `^\s*\d+([.,]\d+)?\s*[xX]\s*\d+([.,]\d+)?\s*$`, extraindo os dois números (trocando `,` por `.`).
   - Restringir a `tipo_produto IN ('porta_enrolar','porta_social','pintura_epoxi','instalacao')`.
   - Não tocar em linhas onde já existe medida.

## Fora do escopo

- Não altero o fluxo de UI, exibição na tela de detalhes da venda, nem o cálculo de preços — apenas a persistência das medidas.
- Não modifico `pedidos_producao` / `pedido_linhas`; o pedido é gerado a partir de `produtos_vendas` e passará a receber as medidas corretas naturalmente após o fix.
