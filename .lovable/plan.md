## Diagnóstico

Na venda **ZANELLA TRANSPORTES** (`/direcao/gestao-fabrica`) a downbar mostra `20x`, mas a venda foi cadastrada como **2 planos de 10x no cartão** (1 plano de 10× R$ 1.000 + 1 plano de 10× R$ 2.200 = 20 registros em `contas_receber`).

Em `vendas.numero_parcelas` o valor está `NULL`. O número exibido vem de `useVendasPendentePedido.ts` linha 119:

```ts
parcelasPorVenda.set(conta.venda_id, (parcelasPorVenda.get(conta.venda_id) || 0) + 1);
```

Ou seja: ele soma **todas** as linhas de `contas_receber` da venda, ignorando que uma venda pode ter múltiplos planos de parcelamento (até 2 métodos de pagamento). Resultado: 10 + 10 = 20.

O mesmo padrão está em `useVendasPendenteFaturamento.ts` (linha ~) e `useVendasAssinaturaContrato.ts`.

## Correção

Calcular o número de parcelas **por plano** e exibir o maior plano (o que melhor representa "o quanto foi parcelado").

Critério de agrupamento de plano em `contas_receber`: `(venda_id, metodo_pagamento, valor_parcela)`. Cada combinação distinta = um plano. Tamanho do plano = `COUNT(*)`. Exibe-se `MAX(tamanho)` entre os planos da venda.

Para Zanella: planos `{cartao_credito, 1000} → 10` e `{cartao_credito, 2200} → 10`. Max = **10x** ✅.

### Arquivos a alterar

1. `src/hooks/useVendasPendentePedido.ts` (linhas ~104, 119)
2. `src/hooks/useVendasPendenteFaturamento.ts` (mesma lógica)
3. `src/hooks/useVendasAssinaturaContrato.ts` (mesma lógica)

### Mudança em cada hook

Substituir o `Map<string, number>` simples por um Map intermediário que agrupa por plano:

```ts
// Antes: const parcelasPorVenda = new Map<string, number>();
// Conta tudo

// Depois:
const planosPorVenda = new Map<string, Map<string, number>>();
// key plano = `${metodo_pagamento}__${valor_parcela}`
contasReceber.forEach((conta) => {
  if (!conta?.venda_id) return;
  const planos = planosPorVenda.get(conta.venda_id) ?? new Map();
  const planoKey = `${conta.metodo_pagamento ?? '_'}__${Number(conta.valor_parcela ?? 0)}`;
  planos.set(planoKey, (planos.get(planoKey) ?? 0) + 1);
  planosPorVenda.set(conta.venda_id, planos);
  // ... resto (pagoInstalacao, metodos) continua igual
});

const parcelasPorVenda = new Map<string, number>();
planosPorVenda.forEach((planos, vendaId) => {
  const max = Math.max(...planos.values());
  if (max > 0) parcelasPorVenda.set(vendaId, max);
});
```

O `select` em `contas_receber` precisa incluir `valor_parcela`:

```ts
.select("venda_id, metodo_pagamento, pago_na_instalacao, valor_parcela")
```

Resto do código (`numero_parcelas: parcelasPorVenda.get(v.id) || ...`) permanece igual.

### Fora de escopo

- Não muda `vendas.numero_parcelas` no banco.
- Não muda a UI da downbar (continua `{n}x`).
- Não muda a aba de detalhes da venda (sheet já lista todas as parcelas individualmente, comportamento correto).

## Validação

Em `/direcao/gestao-fabrica`, a venda da Zanella deve passar a mostrar **10x** na downbar (ou o tamanho do maior plano cadastrado). Vendas com 1 plano único continuam mostrando o número correto.