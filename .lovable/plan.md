## Objetivo
Ter um numeral único compartilhado entre venda e pedido, e exibi-lo na seção "Dados do Cliente" do Faturamento da Venda.

## Passos

1. **Migração DB**
   - Adicionar coluna `numero_pedido text` em `public.vendas`.
   - Backfill: `UPDATE vendas v SET numero_pedido = p.numero_pedido FROM pedidos_producao p WHERE p.venda_id = v.id AND v.numero_pedido IS NULL;`.
   - Trigger `sync_numero_pedido_vendas`:
     - AFTER INSERT/UPDATE OF `numero_pedido` em `pedidos_producao` → propaga para `vendas` pelo `venda_id`.
     - BEFORE INSERT em `pedidos_producao` quando a venda já tiver `numero_pedido` e o pedido não → copia da venda (mantém consistência nos dois sentidos).
   - Índice em `vendas(numero_pedido)` para busca.

2. **Faturamento Venda** (`src/pages/administrativo/FaturamentoVendaMinimalista.tsx`)
   - Incluir `numero_pedido` no `.select()` de `vendas`.
   - Adicionar campo **"Nº do Pedido"** como primeiro item da grid em "Dados do Cliente".

## Fora do escopo
Não altero outras telas nesta iteração (podem continuar lendo `pedidos_producao.numero_pedido` normalmente; o trigger apenas espelha).