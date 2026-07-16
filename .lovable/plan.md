
## Problema

As 3 vendas que foram "Liberadas para Faturamento" sem anexar/dispensar contrato (`contrato_liberado_faturamento=true`, `contrato_url` nulo, `contrato_dispensado=false`) ficaram presas: aparecem em Faturamento com o badge "Liberado", mas não há botão para desfazer a liberação, e sumiram de `/direcao/vendas/contratos` e da aba Assinatura Contrato em `/direcao/gestao-fabrica`.

## Alteração

Tratar `contrato_liberado_faturamento=true` (sem contrato e sem dispensa) como um sub-estado visível do fluxo de contrato, com ação de reversão em todas as telas.

### 1. `src/pages/administrativo/FaturamentoVendasMinimalista.tsx`

- Na seção "Ações" do sidebar (bloco após a linha 1487), adicionar um botão "Desliberar contrato" visível somente quando `contrato_liberado_faturamento && !contrato_url && !contrato_dispensado`.
- Handler usa `toggleVendaFlag` (ou update direto) para setar `contrato_liberado_faturamento=false`, `contrato_liberado_em=null`, `contrato_liberado_por=null`, com toast "Liberação revertida".

### 2. `src/pages/vendas/ContratosVendas.tsx` (`/direcao/vendas/contratos` e `/vendas/contratos`)

- Remover o filtro `.eq('contrato_liberado_faturamento', false)` da query em `fetchVendas`.
- Ampliar o `select` para incluir `contrato_dispensado, contrato_liberado_faturamento`.
- Ajustar `useMemo` de buckets: nova categoria `liberadas` = `contrato_liberado_faturamento && !contrato_url && !contrato_dispensado`. Excluir essas linhas de `pendentes`.
- Adicionar 4ª aba "Liberadas sem contrato" (ícone `FileX`, contador). Renderiza `TableView` das liberadas com ação "Desliberar" que faz o update inverso e retorna a venda para "Pendentes".
- Vendas com contrato anexado/dispensado + liberadas continuam saindo da tela (a query já as excluía por outro caminho — mantido).

### 3. `src/hooks/useVendasAssinaturaContrato.ts` + `src/pages/direcao/GestaoFabricaDirecao.tsx`

- Remover `.eq("contrato_liberado_faturamento", false)` do hook, mantendo apenas `contrato_dispensado=false` e ausência de contrato/legado.
- Adicionar no retorno um novo `contrato_status: 'liberado'` quando `contrato_liberado_faturamento && !contrato_url && !contratosGerados`.
- Em `VendasPendenteDraggableList` (modo `contrato`), quando `contrato_status === 'liberado'`, exibir badge cinza "Liberado sem contrato" + botão "Desliberar" (mesmo update do item 1). Isso mantém a aba Assinatura Contrato coerente com Contratos.

### 4. Helper compartilhado

Criar `src/lib/desliberarContrato.ts` com a função `desliberarContrato(vendaId, userId?)` que executa o update em `vendas` (`contrato_liberado_faturamento=false`, `contrato_liberado_em=null`, `contrato_liberado_por=null`) e invalida os query keys `['vendas-assinatura-contrato']`, `['vendas-pendente-faturamento']`. Reutilizado nas 3 telas.

## Fora do escopo

- Sem mudança no fluxo de "Liberar para Faturamento" (o botão continua funcionando).
- Sem mudança em `useVendasPendenteFaturamento`, schema, ou permissões.
- Sem tocar em vendas cujo `contrato_dispensado=true` (fluxo já reversível via "Reverter dispensa").
