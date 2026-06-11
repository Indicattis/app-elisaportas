## Problema

A venda `7e8c324a-7a88-4a5d-8927-c98215b85219` está com `dispensada_sistema = true` (inativada), mas continua aparecendo na aba "Aprovação Diretor" em `/direcao/gestao-fabrica`.

## Causa

A aba "Aprovação Diretor" é alimentada pelo hook `useVendasPendentePedido`, que hoje filtra apenas por `pedido_dispensado = false`. Não verifica `dispensada_sistema`.

Quando o usuário reativa uma venda que tinha sido concluída sem pedido, o fluxo (em `FaturamentoVendasMinimalista.tsx`) zera **os dois** flags (`dispensada_sistema = false` e `pedido_dispensado = false`) e a devolve para a fila. Depois, ao inativar de novo via o toggle padrão, só `dispensada_sistema` volta para `true` — `pedido_dispensado` permanece `false`. Resultado: a venda continua sendo listada na aba.

A aba irmã `useVendasPendenteFaturamento` já filtra corretamente por `dispensada_sistema = false`.

## Mudança

Em `src/hooks/useVendasPendentePedido.ts`, adicionar ao query de `vendas` o filtro:

```
.eq("dispensada_sistema", false)
```

junto com o `pedido_dispensado = false` existente. Vendas inativadas no sistema deixam de entrar na fila de Aprovação Diretor mesmo se `pedido_dispensado` estiver `false`.

Nada mais é alterado — sem mudanças de schema, sem mudar a regra de reativação.

## Validação

- A venda do caso passa a sumir da aba "Aprovação Diretor" no próximo refetch (30s) ou ao recarregar.
- Vendas faturadas normais (sem `dispensada_sistema`) continuam aparecendo como antes.
