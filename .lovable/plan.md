# Tornar Forma de Pagamento editável no Faturamento da Venda

## Estado atual
A página `/financeiro/faturamento/:id` (`FaturamentoVendaMinimalista.tsx`) usa `PagamentoResumo` (somente leitura). Todos os handlers de edição já existem no arquivo mas não estão ligados a nenhum botão/UI:

- `handleSalvarFormaPagamento` — salva forma/método/parcelas/intervalo via `PagamentoSection` + regenera parcelas
- `handleUpdatePagamento` — altera campos de uma parcela (status, valor, vencimento, observações)
- `handleUpdateMetodoGrupo` / `handleUpdateMetodoParcela` / `handleUpdateMetodoVenda`
- `handleAddParcela` / `handleRemoveParcela`
- `gerarParcelas` (já existe)
- `pagamentoData` state + `PagamentoSection` já importados

## Mudanças

### 1. Substituir `PagamentoResumo` por uma seção editável
Em `src/pages/administrativo/FaturamentoVendaMinimalista.tsx` (~linha 1515), trocar o bloco `<PagamentoResumo .../>` por:

a. **`<PagamentoSection ... />`** ligado a `pagamentoData` + `setPagamentoData`, com botão **"Salvar forma de pagamento"** que chama `handleSalvarFormaPagamento` (já regenera parcelas via diálogo `showRegenerarAposSalvarDialog`, que também já existe).

b. **Tabela de parcelas editável** logo abaixo, listando `contasReceber` com:
   - **Status** (Select Pago / Pendente) → `handleUpdatePagamento(id, 'status', valor)` (limpa/define `data_pagamento` automaticamente — já implementado)
   - **Método** (Select) → `handleUpdateMetodoParcela`
   - **Valor** (Input numérico) → `handleUpdatePagamento(id, 'valor_parcela', ...)`
   - **Vencimento** (Input date) → `handleUpdatePagamento(id, 'data_vencimento', ...)`
   - **Data pagamento** (Input date, só quando status = pago) → `handleUpdatePagamento(id, 'data_pagamento', ...)`
   - Botão remover (ícone lixeira) com `AlertDialog` confirmando → `handleRemoveParcela`
   - Botão **"+ Adicionar parcela"** acima/abaixo da tabela → `handleAddParcela`

c. Manter visualização do comprovante (renderizar `PagamentoResumo` ou só o trecho de comprovante reaproveitado) para não perder a funcionalidade já existente.

### 2. Estilo
Cards `bg-white/5 backdrop-blur-xl border-white/10`, badges de status com cores existentes (`emerald` pago, `amber` pendente), tabela em ScrollArea — mantém o padrão glassmorphism do projeto.

### 3. Fora de escopo
- Não alterar schema/RLS — `contas_receber` já é editável pelos handlers.
- Não tocar em outras telas (`/direcao/...`, `/vendas/...`).
- Não regenerar parcelas automaticamente ao editar status; só ao salvar forma de pagamento (já há diálogo confirmatório).

## Riscos
- Status `pago` em parcela cria/limpa `data_pagamento` no banco — já tratado.
- Trocar método/parcelas via `PagamentoSection` + regenerar pode sobrescrever parcelas já marcadas como pagas; o diálogo `showRegenerarAposSalvarDialog` existente já avisa o usuário.
