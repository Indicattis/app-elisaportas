## Ajuste no gate de "Pend. Faturamento"

Hoje a aba **Pend. Faturamento** mostra qualquer venda não faturada, mesmo sem contrato. Isso quebra o fluxo desejado, pois a venda aparece simultaneamente em Assinatura e em Pend. Faturamento.

### Mudança

**`src/hooks/useVendasPendenteFaturamento.ts`**
- Adicionar filtro: `.or("contrato_url.not.is.null,contrato_dispensado.eq.true")`
- Adicionar `contrato_url` e `contrato_dispensado` ao `select`

### Fluxo final (após mudança)

| Estado da venda | Assinatura | Pend. Faturamento | Aprovação Diretor |
|---|---|---|---|
| Criada, sem contrato | ✅ | — | — |
| Contrato anexado em `/vendas/contratos` | — | ✅ | — |
| Contrato dispensado em `/financeiro/faturamento/vendas` | — | ✅ | — |
| Faturada (pedido criado) | — | — | ✅ |
| Dispensada do sistema | — | — | — |

### Arquivo alterado

- `src/hooks/useVendasPendenteFaturamento.ts`
