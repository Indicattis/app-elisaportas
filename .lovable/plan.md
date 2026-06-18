## Objetivo

No `PedidoCard` (downbar dos pedidos em Gestão da Fábrica), substituir a coluna **"Valor da Venda"** (atualmente mostra `venda.valor_venda`) pela mesma seção de 3 colunas que aparece no `VendaPendentePedidoCard` (downbar das vendas pendentes nas 3 primeiras abas):

1. **Forma Pagamento** — `pagamentoLabel` (combina `metodo_pagamento` + `metodo_pagamento_entrega` via `formatarMetodoPagamento`).
2. **Parcelas** — `{numero_parcelas}x` clicável, abre `VendaParcelasDialog`.
3. **Pago na Entrega** — badge "Sim" ou `formatCurrency(valor_a_receber_entrega)` em destaque âmbar quando `pagamento_na_entrega`.

A coluna **"Valor a Receber"** existente (com Popover de edição) permanece intacta.

## Mudanças em `src/components/pedidos/PedidoCard.tsx`

### 1. Imports
- Adicionar `VendaParcelasDialog` (`./VendaParcelasDialog`) e `formatarMetodoPagamento` (`@/utils/pagamentoResumo`).

### 2. State
- Adicionar `const [showParcelas, setShowParcelas] = useState(false);`.

### 3. Derivar `pagamentoLabel`
- Replicar a lógica do `VendaPendentePedidoCard` (linhas 97‑110) usando `venda?.metodo_pagamento` e `venda?.metodo_pagamento_entrega`.

### 4. Grid template (linha 1367‑1377)
- Trocar o slot de `80px` (que correspondia a "Valor da Venda") por **três colunas**: `90px 40px 70px` (Forma Pagamento, Parcelas, Pago na Entrega). Aplicar em ambos os ramos do `if (hideOrdensStatus)` e nas variantes `showEtapaBadge`.

### 5. Render (linhas 1790‑1795)
- Substituir o bloco `{/* Col: Valor da Venda */}` pelos 3 `<div className="text-center">` copiados de `VendaPendentePedidoCard` (linhas 506‑611) — Forma Pagamento, Parcelas (com `onClick` → `setShowParcelas(true)` e `e.stopPropagation()`), Pago na Entrega.

### 6. Modal
- Renderizar `<VendaParcelasDialog open={showParcelas} onOpenChange={setShowParcelas} vendaId={venda.id} numeroVenda={venda.cliente_nome} />` no final do JSX, ao lado dos outros modais já existentes no `PedidoCard`.

### 7. Header da tabela (se houver)
- Procurar e atualizar qualquer cabeçalho que rotule "Valor da Venda" → trocar pelos 3 títulos correspondentes ("Pagto.", "Parc.", "Entrega") para alinhar com o novo grid.

## Fora de escopo
- `PedidoDetalhesSheet` (sheet de detalhes) permanece sem alteração.
- Coluna "Valor a Receber" e seu Popover de edição não mudam.
- Nenhuma mudança em DB ou em outros cards.
