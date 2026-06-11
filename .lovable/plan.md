## Problema

A aba "Pendente de Contrato" em `/vendas/contratos` lista vendas sem contrato, mas não exclui vendas que foram inativadas/dispensadas no sistema (`dispensada_sistema = true`). Isso faz com que vendas inativas continuem aparecendo na fila de pendência de contrato.

## Mudança

Em `src/pages/vendas/ContratosVendas.tsx`, adicionar ao query de vendas o filtro:

```
.eq('dispensada_sistema', false)
```

ao lado do `.eq('contrato_dispensado', false)` existente.

## Resultado

- Apenas vendas ativas no sistema aparecerão em "Pendente de Contrato".
- Vendas inativadas via `/financeiro/faturamento/vendas` deixam de aparecer.
- Nenhuma outra aba ou comportamento é alterado.