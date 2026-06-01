## Problema

Em `/vendas/minhas-vendas/nova`, quando nenhum método de pagamento foi escolhido ainda, o indicador mostra "limite 3%". Pelas regras em `/vendas/regras`, sem método selecionado o limite deve ser **0%** — os 3% só valem para À Vista / Boleto / Dinheiro / PIX (qualquer pagamento que não seja Cartão de Crédito).

## Causa

Em `src/utils/descontoVendasRules.ts` (`calcularLimitesDesconto`):

```ts
const limiteBase = formaPagamento !== 'cartao_credito' ? limiteAvista : 0;
```

Quando `formaPagamento === ''` (nada selecionado), a comparação `!== 'cartao_credito'` é verdadeira, então o limite vira 3%.

## Correção

Tratar string vazia como "sem método" e retornar 0:

```ts
const formaSelecionada = (formaPagamento || '').trim();
const limiteBase = formaSelecionada && formaSelecionada !== 'cartao_credito'
  ? limiteAvista
  : 0;
```

Apenas isso. Não toco em `VendaNovaMinimalista.tsx` — o `formaPagamentoAtual` já passa `''` quando o usuário ainda não escolheu.

## Verificação

- Abrir `/vendas/minhas-vendas/nova` sem selecionar pagamento → indicador deve mostrar 0%.
- Selecionar À Vista / Boleto / PIX → 3% (ou 8% se presencial).
- Selecionar Cartão de Crédito → 0%.
