
## Problema

Em `/administrativo/financeiro/faturamento/vendas` aparecem 6 vendas com o indicador "aguardando assinatura do contrato". Já em `/direcao/vendas/contratos` e na aba "Assinatura Contrato" de `/direcao/gestao-fabrica` só aparecem 3 dessas vendas. A divergência acontece porque 3 vendas foram liberadas manualmente para faturamento sem contrato (`contrato_liberado_faturamento = true`), mas o Faturamento não consulta esse campo ao pintar o badge.

## Alteração

Alinhar o Faturamento com as outras telas: uma venda com `contrato_liberado_faturamento = true` deixa de ser tratada como "aguardando contrato".

### Arquivo único: `src/pages/administrativo/FaturamentoVendasMinimalista.tsx`

1. Adicionar `contrato_liberado_faturamento` ao `select` de `fetchVendas` (por volta da linha 443) para que o campo chegue no objeto `venda`.
2. Adicionar `contrato_liberado_faturamento?: boolean | null` na interface `Venda` (por volta da linha 104).
3. Atualizar a função `aguardandoContrato` (linha 572-573) para:
   ```ts
   const aguardandoContrato = (venda: Venda) =>
     !isFaturada(venda)
     && !(venda as any).contrato_url
     && !(venda as any).contrato_dispensado
     && !(venda as any).contrato_liberado_faturamento;
   ```
4. Ajustar as ramificações da coluna "Contrato" (linha ~958) e do sidebar de detalhes (linhas ~1326-1381) para tratar `contrato_liberado_faturamento` como "liberado sem contrato" — mesmo grupo visual do `contrato_dispensado` (badge "Contrato dispensado / liberado") e liberando o botão "Faturar".

Após isso, as 3 vendas já liberadas continuam podendo ser faturadas normalmente, mas somem da contagem de "aguardando contrato", alinhando com Contratos e Gestão de Fábrica (3 vendas em todas as telas).

## Fora do escopo

- Nenhuma mudança em `useVendasAssinaturaContrato`, `ContratosVendas`, `GestaoFabricaDirecao`, no schema ou nos dados existentes.
- Sem alteração de regras de negócio de liberação / dispensa.
