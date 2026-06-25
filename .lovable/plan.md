## Problema

Hoje qualquer usuário (vendedor em **Meus Contratos** e diretor em **Direção › Vendas › Contratos**) vê o botão "Liberar para Pend. Faturamento" na aba **Contrato Assinado**. Quando o vendedor clica nesse botão logo após anexar o assinado, a venda some da aba e cai direto em **Pend. Faturamento** da Gestão de Pedidos — sem passar por nenhuma confirmação da Direção.

Verifiquei no banco: várias vendas têm `contrato_liberado_em` praticamente igual a `contrato_assinado_em`, confirmando que a liberação está acontecendo logo na sequência da assinatura, sem etapa de revisão.

## Mudanças

### 1. Restringir a ação de "Liberar para Faturamento" à Direção
Arquivo: `src/pages/vendas/ContratosVendas.tsx`

- Na aba **Contrato Assinado**, só renderizar o botão `Liberar para Pend. Faturamento` (e o handler `handleLiberarFaturamento`) quando `scope !== 'meus'`. Em **Meus Contratos** a venda fica visível na aba assinados apenas como acompanhamento — sem ação de avanço.
- Vendedor continua podendo ver os arquivos (visualizar/baixar) e, se quiser corrigir, usar "Retornar para Gerado".

### 2. Adicionar diálogo de confirmação na Direção
Mesma página, somente no modo Direção:

- Substituir o `onAction` que chama `handleLiberarFaturamento` direto por um `AlertDialog` que exibe nome do cliente, valor da venda e a mensagem: "Esta venda será movida para Pend. Faturamento na Gestão de Pedidos. Confirma a liberação?".
- Botão de confirmação roda o `handleLiberarFaturamento` atual (que já grava `contrato_liberado_faturamento=true`, `contrato_liberado_em`, `contrato_liberado_por`).

### 3. Mensagem do `AnexarContratoModal`
Arquivo: `src/components/vendas/AnexarContratoModal.tsx`

- Trocar o toast atual "Contrato anexado! Venda enviada para faturamento." por "Contrato anexado! Aguardando liberação da Direção para faturamento." — assim o vendedor entende que ainda há uma etapa.

### Fora do escopo
- Não mexer no comportamento de "Dispensar contrato" (essa ação continua liberando direto, como já é hoje, porque é fluxo administrativo).
- Não alterar `useVendasPendenteFaturamento` — ele já exige `contrato_liberado_faturamento=true`, então essa parte está correta.
- Sem migration: o flag e os campos de auditoria já existem.
