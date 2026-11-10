# Vendedor avança vendas de "Contrato Assinado"

Hoje, em /vendas/contratos (Meus Contratos), a aba **Contrato Assinado** esconde o botão **"Liberar para Pend. Faturamento"** — só a Direção (/direcao/vendas/contratos) consegue avançar.

## O que muda
- O vendedor passa a ver o botão **"Liberar para Pend. Faturamento"** nas suas vendas com contrato assinado, com a mesma confirmação que a Direção já usa.
- Ao confirmar, a venda sai de "Contrato Assinado" e vai para Pendente de Faturamento, igual hoje na Direção.
- O vendedor só vê e avança as próprias vendas (a lista dele já é filtrada).

## Detalhes técnicos
- Em `src/pages/vendas/ContratosVendas.tsx`, na aba `assinados`, remover a condição `isMeus ? undefined : ...` de `actionLabel`, `actionIcon` e `onAction`, reaproveitando `setLiberarVenda` / `handleLiberarFaturamento`.
- Após aplicar, conferir se a gravação em `vendas` (contrato_liberado_faturamento) é permitida para vendedores; se as regras do banco bloquearem, ajustar para permitir que o vendedor atualize apenas as próprias vendas.
