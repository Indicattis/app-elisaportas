## Causa confirmada

Consultei as vendas do mês em curso e a diferença de R$ 6.819,00 vem de **1 venda em rascunho** (`is_rascunho = true`, valor R$ 6.819,00, atendente 68caa17c…) que:

- é contada pelo `useRankingMes` (só filtra por `isVendaValida`, ou seja `valor_venda >= 500`);
- é ignorada pelo `useHomeIndices` do card de faturamento (filtra `is_rascunho = false` e `custo_total IS NOT NULL`).

Somas conferidas na base para o mês corrente:
- Ranking (regra atual): R$ 340.892,50
- Home / faturamento do mês: R$ 334.073,50
- Diferença: R$ 6.819,00 → exatamente o rascunho.

## Correção

Alinhar o `useRankingMes` aos mesmos filtros do card de faturamento do mês, para que a soma do ranking nunca ultrapasse o número exibido acima:

- Em `src/hooks/useRankingMes.ts`, na query de `vendas`, adicionar:
  - `.eq('is_rascunho', false)`
  - `.not('custo_total', 'is', null)`

Nenhuma outra alteração é necessária — a fórmula de faturamento (sem frete) já foi unificada em `calcularFaturamentoLiquido`.

## Verificação

Após a mudança, recarregar `/home` e conferir que:
- o rascunho de R$ 6.819,00 do atendente 68caa17c… não aparece mais no card "Ranking Vendedores";
- a soma dos 4 cards de ranking é ≤ ao valor do card "Faturamento do mês".
