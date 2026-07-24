## Objetivo
Unificar o cálculo de faturamento e ranking no `/paineis/tv-dashboard` com o helper canônico `calcularFaturamentoLiquido` (`valor_venda + valor_credito`), igual ao que já foi feito na `/home`.

## Problema
Hoje o TV Dashboard usa a fórmula antiga `valor_venda - valor_frete + valor_credito` em dois lugares:
- `src/pages/TvDashboard.tsx` (card de faturamento do mês)
- `src/hooks/useDashboardData.ts` (ranking de vendedores)

Isso gera divergência com `/home` e com o card de faturamento oficial quando `valor_venda` já não contém frete.

## Mudanças

1. **`src/hooks/useDashboardData.ts` — ranking**
   - Trocar o cálculo por `calcularFaturamentoLiquido(venda)`.
   - Alinhar filtros com `useRankingMes`: manter `.eq('is_rascunho', false)` e adicionar `.not('custo_total', 'is', null)` para excluir vendas ainda não faturadas.
   - Remover `valor_frete` do `select`.

2. **`src/pages/TvDashboard.tsx` — card de faturamento**
   - Usar `calcularFaturamentoLiquido` na agregação diária.
   - Remover `valor_frete` do `select`.

## Fora de escopo
- Nenhuma alteração de UI/layout.
- Nenhuma alteração no banco.
