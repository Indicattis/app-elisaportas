---
name: Dispensa de contrato em vendas
description: Vendas podem dispensar o contrato para serem faturadas; vendas faturadas legadas sem contrato foram migradas como dispensadas
type: feature
---
- Tabela `vendas` tem `contrato_dispensado` (boolean, default false), `contrato_dispensado_em`, `contrato_dispensado_por`.
- `aguardandoContrato = !faturada && !contrato_url && !contrato_dispensado`.
- Sidebar de `/administrativo/financeiro/faturamento/vendas` mostra: "Ver Contrato" (se url), "Anexar Contrato" + "Dispensar Contrato" (se nada), ou indicador "Contrato dispensado".
- Hook `useVendasAssinaturaContrato` exclui dispensadas; `useVendasPendenteFaturamento` inclui via `or("contrato_url.not.is.null,contrato_dispensado.eq.true")`.
- Backfill da migração marcou como dispensadas vendas com frete_aprovado=true e todos os produtos com faturamento=true sem contrato_url.
