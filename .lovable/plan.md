## Mudança

Reaplicar o filtro `pedido_dispensado = false` **apenas** no hook de Pend. Faturamento, mantendo a aba Assinatura Contrato sem o filtro (para continuar exibindo vendas com pedido dispensado que ainda não têm contrato anexado/dispensado).

## Arquivo a editar

`src/hooks/useVendasPendenteFaturamento.ts` — adicionar `.eq("pedido_dispensado", false)` na query do Supabase, junto dos demais filtros (`is_rascunho`, `contrato_url/contrato_dispensado`).

Sem alterações em `useVendasAssinaturaContrato.ts` nem em componentes.

## Efeito

- Aba **Assinatura Contrato**: continua mostrando vendas com `pedido_dispensado = true` (sem contrato).
- Aba **Pend. Faturamento**: volta a ocultar vendas com `pedido_dispensado = true`, exibindo somente vendas com contrato (anexado ou dispensado) que ainda não foram faturadas e não têm pedido de produção.