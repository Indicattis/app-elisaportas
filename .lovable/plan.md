## Problema

As colunas À Vista, Frio, Gerente e % Limite aparecem todas com "-" mesmo havendo vendas elegíveis. Confirmado no banco:

- 19 vendas em junho/2026
- **Todas** com `venda_presencial=true` (deveriam exibir Frio 5%)
- **15** com `forma_pagamento='a_vista'` (deveriam exibir À Vista 3%)
- 0 com autorização de gerente (correto exibir "-")

O join `vendas:venda_id(cliente_nome, forma_pagamento, venda_presencial)` em `useBalancoDescontos.ts` não está retornando os campos extras em runtime — o `r.vendas?.forma_pagamento` e `r.vendas?.venda_presencial` ficam undefined, então `aptoAvista` e `aptoFrio` viram `false`.

## Correção

Em `src/hooks/useBalancoDescontos.ts`, substituir o embed por uma busca separada (mesmo padrão que já fiz para `tem_autorizacao_gerente`):

1. Manter o select simples: `select("*")` em `vendas_balanco_desconto`
2. Após receber as linhas, em paralelo:
   - Buscar `vendas` (`id, cliente_nome, forma_pagamento, venda_presencial`) pelos `venda_id`
   - Buscar `vendas_autorizacoes_desconto` (já existe)
3. Montar um `Map<venda_id, vendaInfo>` e popular `r.vendas` manualmente em cada linha.

Isso elimina qualquer ambiguidade de embed/RLS e garante que os 3 campos cheguem ao componente.

Nenhuma mudança necessária em `BalancoDescontos.tsx` — a lógica de apto/check já está correta.
