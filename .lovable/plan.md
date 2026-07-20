
## Objetivo

Remover o checkbox independente "Pagamento será feito na entrega/instalação" e transformá-lo em uma nova opção do seletor de tipo do **Método 2**. Ao selecionar essa opção, o Método 2 deve ser automaticamente configurado como **À Vista** cobrindo 100% do valor restante, com a flag `pagamento_na_entrega = true`.

## Mudanças

### 1. `src/components/vendas/MetodoPagamentoCard.tsx`
- Adicionar nova opção no `Select` de tipo: **"Pagamento na Entrega/Instalação"** (valor interno: `entrega`).
- Essa opção só aparece quando uma nova prop `permitirEntrega?: boolean` for `true` (usada apenas no Método 2).
- Quando selecionada, emitir via `onChange` o método com `tipo: 'a_vista'`, `data_pagamento: undefined`, `parcelas_*` default, e uma flag interna (via callback separado ou estendendo `MetodoPagamento` com `pagamento_na_entrega?: boolean`).
- Enquanto essa flag estiver ativa, ocultar campos de data de pagamento e empresa receptora (não há cobrança antecipada) e exibir bloco informativo explicando que o valor será cobrado na entrega/instalação.

### 2. `src/components/vendas/PagamentoSection.tsx`
- Remover o bloco do checkbox `pagamento-na-entrega` (linhas 597–619).
- Ao renderizar o `MetodoPagamentoCard` do Método 2, passar `permitirEntrega`.
- No `handleMetodo2Change`, detectar quando o tipo mudou para `entrega`:
  - Setar `paymentData.pagamento_na_entrega = true`
  - Forçar Método 2: `tipo='a_vista'`, `valor = valorTotal - valorMetodo1` (já é auto pelo `valorFixo`).
  - Ao sair dessa opção (trocar para outro tipo), setar `pagamento_na_entrega = false`.
- No **Resumo do Pagamento**, quando `pagamento_na_entrega` estiver ativo no Método 2, exibir rótulo "À Vista (na entrega/instalação)" em vez da data.
- Ajustar validações existentes que dependem do checkbox para continuarem funcionando via `paymentData.pagamento_na_entrega`.

### 3. Interação com regra do boleto e comprovantes
- Se Método 1 for boleto (regra 70/30/21d ativa), a opção "Entrega" fica indisponível no Método 2 (mantém o boleto travado).
- Comprovante continua opcional; nenhum ajuste extra.

## Observações
- Nenhuma alteração no banco ou em `useVendas.ts` — a flag `paymentData.pagamento_na_entrega` já é persistida hoje.
- Comportamento equivalente ao anterior, apenas reposicionado na UI para melhor descoberta.
