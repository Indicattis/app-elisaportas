## Problema

Em `/financeiro/faturamento/vendas`, a venda `12bda7ce…` aparece com **Acréscimo de R$ 956**, mas na verdade tem **Desconto de R$ 1.204** (vide página de detalhe e tabela `vendas_balanco_desconto`).

## Causa

`src/pages/administrativo/FaturamentoVendasMinimalista.tsx` (linhas 1032–1049 e 662–670) calcula desconto/acréscimo assim:

```
tabelaTotal = Σ (valor_produto + valor_pintura + valor_instalacao) × qty   // bruto, sem desconto
diff        = vendas.valor_venda − tabelaTotal
diff > 0 → Acréscimo    diff < 0 → Desconto
```

`vendas.valor_venda` pode incluir frete, crédito e eventuais divergências legadas, então a diferença não representa o ajuste real do vendedor. No caso citado: `valor_venda=5.400` vs `tabelaTotal=4.444` → falso acréscimo de 956, quando os itens na verdade têm `Σ desconto_valor = 1.204` (positivo = desconto).

## Correção

Usar a fonte de verdade que já existe nos itens:

- **Desconto da venda** = `Σ max(desconto_valor, 0)` em `produtos_vendas`
- **Acréscimo da venda** = `Σ max(−desconto_valor, 0)` em `produtos_vendas`

(Isto bate com o critério do detalhe `FaturamentoProdutosTable` — sinal positivo = desconto, negativo = acréscimo — e com `vendas_balanco_desconto`.)

## Mudanças

Arquivo único: `src/pages/administrativo/FaturamentoVendasMinimalista.tsx`

1. Criar helper `calcAjusteVenda(venda)` que retorna `{ desconto, acrescimo }` a partir de `Σ desconto_valor` dos itens.
2. Substituir os blocos `case 'desconto'` e `case 'acrescimo'` do render (≈1032–1049) para usar o helper.
3. Substituir o trecho equivalente do `sortedVendas` (≈662–670) pelo mesmo helper.
4. Manter formatação atual: vermelho com `−` para desconto, verde com `+` para acréscimo, `-` quando zero.

Sem mudanças em banco, em outras telas, ou no detalhe de faturamento.

## Validação

- A venda `12bda7ce…` passará a mostrar **Desconto R$ 1.204** e Acréscimo `-`.
- Vendas com `desconto_valor` negativo em algum item continuarão mostrando Acréscimo correto.
- Build TS.
