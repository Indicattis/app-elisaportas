## Objetivo

Manter vendas na primeira etapa **"Assinatura Contrato"** da Gestão de Pedidos enquanto o contrato **não estiver liberado para faturamento** e **não estiver dispensado** — mesmo que o PDF do contrato já tenha sido anexado.

## Diagnóstico

Hoje, em `src/hooks/useVendasAssinaturaContrato.ts`, o filtro é:

- `is_rascunho = false`
- `contrato_url IS NULL`
- `contrato_dispensado = false`
- `dispensada_sistema = false`

Assim que o vendedor anexa o PDF (`contrato_url` deixa de ser nulo), a venda **some da aba "Assinatura Contrato"**. Mas ela ainda não vai para "Pend. Faturamento" nem gera pedido de produção, porque o backend só cria o pedido quando `contrato_liberado_faturamento = true` (ou `contrato_dispensado = true`). Resultado: a venda "IURI BEDINOT DE QUADROS" ficou invisível na Gestão de Pedidos.

## Mudança

Em `src/hooks/useVendasAssinaturaContrato.ts`:

- Trocar `.is("contrato_url", null)` por `.eq("contrato_liberado_faturamento", false)`.
- Adicionar `contrato_liberado_faturamento` na lista de colunas do `select`.
- Manter as demais condições (`is_rascunho = false`, `contrato_dispensado = false`, `dispensada_sistema = false`, sem `pedidos_producao` vinculado, não reprovada, não faturada).

Isso faz a etapa "Assinatura Contrato" reunir toda venda aprovada que ainda depende de assinatura **ou** liberação de contrato — cobrindo tanto vendas sem PDF anexado quanto vendas com PDF anexado aguardando liberação.

## Fora de escopo

- Nenhuma alteração em contadores, layout, outras abas, ou regras de criação de pedido de produção.
- Nenhuma migração de banco.
