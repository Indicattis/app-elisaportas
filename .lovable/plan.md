## Objetivo

A forma de pagamento decidida pelo vendedor em `/vendas/minhas-vendas/nova` (métodos, parcelas, valores, vencimentos, empresa receptora) passa a ser a fonte da verdade e fica congelada. Nenhuma tela posterior do fluxo pode alterá-la — apenas a edição da própria venda em `/vendas/minhas-vendas/editar/[id]` pode mudar.

## Componente compartilhado (somente leitura)

Criar `src/components/vendas/PagamentoResumo.tsx`:
- Props: `vendaId` (ou já recebe `venda` + `contasReceber` já carregados pelo pai, para evitar refetches).
- Hidrata a partir de `contas_receber` (fonte da verdade) com fallback nas colunas escalares de `vendas` — mesma lógica de hidratação já existente em `FaturamentoVendaMinimalista` (linhas 399-460).
- Renderiza, agrupado por método:
  - Label legível ("À Vista", "Boleto", "Cartão de Crédito", "Pix", "Dinheiro")
  - Empresa receptora (quando houver)
  - Total do método e nº de parcelas (ex.: "Boleto · 5x · R$ 1.000,00")
  - Lista de parcelas: número, vencimento, valor, status (Pago/Pendente), data de pagamento se houver
  - Flag "Pago na entrega" e comprovante (quando houver `comprovante_url`)
- Sem nenhum input, select ou botão de mutação. Visual seguindo o glassmorphism do projeto (`bg-white/5`, `border-white/10`).

## Onde usar

1. **`src/pages/direcao/VendaDetalhesDirecao.tsx`** — substituir a linha única "Pagamento" (linha 604-610) por um card dedicado renderizando `<PagamentoResumo />`. Inclui no `select()` os campos faltantes (`metodo_pagamento`, `quantidade_parcelas`, `numero_parcelas`, `intervalo_boletos`, `empresa_receptora_id`, `valor_entrada`, `valor_a_receber`, `pagamento_na_entrega`, `comprovante_url`, `comprovante_nome`) e carrega `contas_receber` em paralelo.

2. **`src/pages/administrativo/FaturamentoVendaMinimalista.tsx`** — substituir o bloco `PagamentoSection` editável (linhas 1468-1489) e o card "Parcelas / Contas a Receber" editável (linhas 1563+) por `<PagamentoResumo />`. Remover do código:
   - `handleSalvarFormaPagamento`, `handleUpdateMetodoGrupo`, `handleUpdateMetodoParcela`, `handleUpdateMetodoVenda`
   - `handleAddParcela`, `handleRemoveParcela`, `handleRegenerarParcelas`, `handleGerarParcelas`
   - Edição inline de `valor_parcela`, `data_vencimento`, troca de método por linha
   - Botões "Regenerar", "+ Parcela", "Salvar Forma de Pagamento"
   - Manter apenas `handleUpdatePagamento` restrito a `status` (toggle Pago/Pendente) e `data_pagamento` automática quando vira pago — porque registrar o pagamento real continua sendo função do financeiro.
   - Caso a venda antiga não tenha parcelas geradas (`contas_receber` vazio), exibir aviso "Parcelas não geradas no cadastro — edite a venda para regenerar" em vez do botão "Gerar Parcelas".

3. **`src/components/pedidos/VendaPendentePedidoCard.tsx`** (downbar de `/direcao/gestao-fabrica`) — manter o card compacto atual, mas alimentar o label de pagamento pelo mesmo helper de formatação (`formatarPagamentoCompacto`) que o `PagamentoResumo` exporta, garantindo que aparecem todos os métodos ativos (até 2) com o mesmo texto. Se houver popover/tooltip de detalhe, plugar `<PagamentoResumo compact />`.

## Travamento no backend (defesa em profundidade)

Criar migration com trigger em `contas_receber` que, em `UPDATE` e `DELETE`, bloqueia mudanças em `metodo_pagamento`, `valor_parcela`, `data_vencimento`, `numero_parcela` e impede `DELETE`/`INSERT` após a venda ter sido faturada, exceto quando:
- a operação parte da edição da venda (RPC dedicada do fluxo de edição) — usar uma GUC `app.allow_pagamento_edit = 'on'` setada pela RPC de edição da venda, e a trigger só bloqueia quando essa GUC não está ativa.
- a coluna sendo alterada é `status` ou `data_pagamento` (sempre permitido).

Replicar trigger equivalente em `vendas` para travar `metodo_pagamento`, `quantidade_parcelas`, `numero_parcelas`, `intervalo_boletos`, `empresa_receptora_id`, `valor_entrada`, `valor_a_receber`, `pagamento_na_entrega` pelas mesmas regras.

## Edição da venda (caminho único de mudança)

`/vendas/minhas-vendas/editar/[id]` continua sendo o único lugar onde a forma de pagamento pode ser alterada. A mutation de update da venda (em `useVendas.ts`) precisa:
- Setar a GUC `app.allow_pagamento_edit = 'on'` na mesma transação (via RPC) antes de regravar `contas_receber`.
- Deletar todas as `contas_receber` da venda e recriá-las conforme o novo `pagamentoData`, mesma lógica do create.
- Atualizar as colunas escalares de `vendas` para refletir o novo cadastro.

## Detalhes técnicos

- O `PagamentoResumo` recebe `venda` (com colunas escalares já carregadas) e `contasReceber` (lista) como props para evitar N fetches; cada página passa o que já carrega.
- Helper compartilhado `formatarPagamentoMetodo(metodo)` exportado de `src/utils/formatters.ts` para garantir o mesmo label em todos os lugares.
- Tipo `PagamentoResumoData` derivado em `src/utils/pagamentoResumo.ts` com a função `hidratarPagamento(venda, contasReceber): PagamentoResumoData[]` reaproveitando a lógica de agrupamento já existente em `FaturamentoVendaMinimalista` linhas 412-460.

## Fora de escopo

- Não mexer no fluxo de criação `/vendas/minhas-vendas/nova`.
- Não mexer em RLS, somente triggers de validação.
- Não alterar visualmente o card de `VendaPendentePedidoCard` além do label de pagamento.
