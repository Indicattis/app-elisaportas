
# Atualizar índices de desconto em `/financeiro/faturamento/:id`

## Problema
Em `src/pages/administrativo/FaturamentoVendaMinimalista.tsx` os cards de desconto estão desatualizados em relação a `/marketing/balanco-descontos`:

1. **Rótulos antigos**: "Desc. Cartão", "Desc. Quente", "Luan/Alana". O Balanço usa "À Vista (3%)", "Frio (5%)", "Gerente (+7%)".
2. **Regra de "Frio" invertida**: o faturamento usa `isFrio = venda.venda_presencial === false`, enquanto o Balanço (fonte da verdade) usa `aptoFrio = !!venda.venda_presencial` (frio = venda presencial).
3. **Limite "Gerente"**: o faturamento divide o restante usando `configLimites.presencial` e nomeia o terceiro tier como "responsavel". O Balanço usa um terceiro tier fixo de **+7%** (gerente), exibido sempre que `tem_autorizacao_gerente` OR `pctDado > limiteBase`.
4. **Excedente**: hoje calculado contra `LIMITE_DESCONTO_LUCRO` (`limitesVendas.totalComResponsavel`). No Balanço o limite efetivo é `limiteBase + (aptoGerente ? 7 : 0)`, então o excedente diverge entre as duas telas para a mesma venda.

## Mudanças (apenas UI/cálculo desta página — sem tocar em outras telas)

### 1. Reescrever o cálculo `descontoTiers` para espelhar `computeRow` do Balanço
Em `FaturamentoVendaMinimalista.tsx` (~linha 1059):

- Buscar `tem_autorizacao_gerente` da venda (consultar `vendas_autorizacoes_desconto` por `venda_id` no `fetchVenda` e armazenar como booleano em estado).
- `aptoAvista = forma_pagamento !== '' && forma_pagamento !== 'cartao_credito'` → tier "À Vista (3%)".
- `aptoFrio = !!venda.venda_presencial` (corrigir inversão) → tier "Frio (5%)".
- `aptoGerente = temAutorizacaoGerente || pctDado > limiteBase` → tier "Gerente (+7%)".
- `pctLimite = (aptoAvista ? 3 : 0) + (aptoFrio ? 5 : 0) + (aptoGerente ? 7 : 0)`.
- Valores exibidos: `0.03 * valorTabela`, `0.05 * valorTabela`, `0.07 * valorTabela` (mostrando `-` quando o tier não se aplica), idênticos ao Balanço.

### 2. Atualizar os 4 cards no header de indicadores (linhas ~1229-1264)
- "Desc. Cartão" → **"À Vista (3%)"**, valor exibido apenas se `aptoAvista`.
- "Desc. Quente" → **"Frio (5%)"**, valor exibido apenas se `aptoFrio`.
- "Luan/Alana" → **"Gerente (+7%)"**, valor exibido apenas se `aptoGerente`.
- Card "Excedente >X%" passa a usar `pctLimite` calculado acima (em vez de `LIMITE_DESCONTO_LUCRO`), com mesmo cálculo `excedidoPct = max(0, pctDado - pctLimite)` e `excedidoValor = (excedidoPct/100) * totalVenda`. Mantém posição e estilo.

### 3. Substituir `excedenteValor`/`excedentePct` na página
Hoje vêm de outro cálculo local (linha ~1018 em diante). Refatorar para reaproveitar os mesmos números do tier acima, garantindo que:
- O card "Excedente" mostre o mesmo valor do Balanço.
- O abatimento do excedente sobre o lucro dos itens (loop em ~linha 1351 `excedenteValor * (descontoValorAbs / totalDescontosCalc)`) continue funcionando com o novo `excedenteValor` (apenas a fórmula da base muda; o restante do código permanece igual).

### 4. Cores e estilo
- Manter glassmorphism existente (`bg-white/5 backdrop-blur-xl border border-white/10`).
- Cores: `text-emerald-400` quando dentro do limite, `text-red-400` quando excede, `text-white/30` quando tier inativo — igual ao Balanço.

## Fora de escopo
- Não alterar `useBalancoDescontos`, RPC `recalcular_balanco_desconto_vendas`, nem a view `vendas_balanco_desconto`.
- Não mexer em `/marketing/balanco-descontos`.
- Não tocar nas demais seções da página de faturamento (forma de pagamento, parcelas, produtos, lucros).
- Sem migrations.

## Riscos
- Inversão de `venda_presencial` muda o valor exibido para vendas existentes (intencional — é a correção do bug).
- Mudança do limite do excedente (de `totalComResponsavel` para `base + gerente×7`) pode aumentar ou reduzir o abatimento do excedente no lucro de itens individuais. Isso é o comportamento canônico definido pelo Balanço; vai alinhar as duas telas.
