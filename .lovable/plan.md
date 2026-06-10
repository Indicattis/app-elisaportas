## Objetivo

Substituir, em `/marketing/balanco-descontos` e em `/financeiro/faturamento/{id}`, os valores teóricos (3% e 5% do total) pelo **desconto real aplicado** em cada faixa (À Vista, Frio, Gerente). Mesma lógica já usada em `/financeiro/faturamento/vendas`.

## Regra de distribuição (espelha `calcDescontoTiers`)

A partir do desconto total real (`total_venda * pct_desconto_dado / 100`):

```
limAvista       = 3   (config.limite_desconto_avista)
limPresencial   = 5   (config.limite_desconto_presencial)
limResponsavel  = 7   (config.limite_adicional_responsavel)

pctTotal  = desconto_dado / total_venda * 100
isCartao  = forma_pagamento === 'cartao_credito'
isFrio    = venda_presencial === true

pctAvista = isCartao ? 0 : min(pctTotal, limAvista)
restante1 = pctTotal - pctAvista
pctFrio   = isFrio ? min(restante1, limPresencial) : 0
pctGer    = max(0, pctTotal - pctAvista - pctFrio)

valorAvista = total_venda * pctAvista / 100
valorFrio   = total_venda * pctFrio   / 100
valorGer    = total_venda * pctGer    / 100
```

Para a venda do JONATHAN (total 1020, desconto 20, à vista presencial): À Vista = R$ 20,00; Frio = R$ 0; Gerente = R$ 0.

## Mudanças

### 1. `src/pages/marketing/BalancoDescontos.tsx`
- Em `computeRow`: calcular `valorAvistaAplicado`, `valorFrioAplicado`, `valorGerenteAplicado` segundo a regra acima (usando `Number(r.desconto_dado)` e `Number(r.total_venda)`).
- Trocar render das três células (linhas ~262‑270):
  - "À Vista (3%)" → `valorAvistaAplicado` (se 0, mostra "-")
  - "Frio (5%)"    → `valorFrioAplicado`
  - "Gerente (+7%)" → `valorGerenteAplicado`
- Manter a coloração `check(n)` baseada no percentual realmente consumido em cada faixa.
- Cabeçalhos: manter, mas adicionar tooltip “Valor real do desconto que caiu nesta faixa”.

### 2. `src/pages/administrativo/FaturamentoVendaMinimalista.tsx`
- Substituir o cálculo atual em `descontoTiers` (linhas ~1074‑1078) pelo mesmo algoritmo (usando `valorTabela`, `descontoAplicado` total, `forma_pagamento`, `venda_presencial` e os limites de `configVendas`).
- Atualizar os três cards do bloco visual (linhas ~1216‑1232 e o card Gerente subsequente) para exibir o valor aplicado em cada faixa, com fallback "-" quando 0.
- Atualizar labels para refletir os limites configurados (`Avista`, `Presencial`, `Adicional Responsável`) em vez de hardcode 3/5/7.

### 3. Fonte dos limites
- `BalancoDescontos`: hoje usa hardcode 3/5/7. Passar a ler de `useConfiguracoesVendas` (já presente no projeto) para evitar nova divergência.

## Fora de escopo

- `/financeiro/faturamento/vendas` (lista) — já correto.
- Banco / RPC `recalcular_balanco_desconto_vendas` — sem alteração; o valor `desconto_dado` continua sendo a fonte de verdade.
- Renomeação de cabeçalhos / nova UI.

## Riscos

- Vendas com `pct_desconto_dado` negativo (acréscimo) devem cair em todas as faixas como 0 e exibir "-".
- Vendas com `total_venda = 0` → guard para evitar divisão por zero.
