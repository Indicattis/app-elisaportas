## Objetivo
Em `/direcao/gestao-fabrica`, na etapa **Aprovação Diretor**, restaurar o botão **Dispensar Pedido** nos cards de vendas pendentes. Ao clicar, a venda é marcada como dispensada e desaparece da listagem.

## Contexto
- A página renderiza vendas pendentes nessa etapa via `VendasPendenteDraggableList` → `VendaPendentePedidoCard` (mode `'pedido'`).
- O handler `handleDispensarPedido` já existe no card (linha 203) e faz `UPDATE vendas SET pedido_dispensado = true`, invalidando `["vendas-pendente-pedido"]`.
- O hook `useVendasPendentePedido` já filtra `.eq("pedido_dispensado", false)`, então a venda some automaticamente após a ação.
- Hoje, no bloco de ações do mode `'pedido'` (linhas 725–776), existem apenas **Aprovar** e **Reprovar**, seguidos de um `<div />` vazio reservando a 3ª coluna da grid.

## Mudança
Em `src/components/pedidos/VendaPendentePedidoCard.tsx`, substituir o slot vazio (`<div />` na linha 775) por um botão **Dispensar Pedido** com:
- Ícone `Archive` (já importado).
- Estilo coerente com os demais (`h-[20px]`, borda âmbar/zinc, `rounded-[3px]`).
- Confirmação via `AlertDialog` antes de executar (evitar clique acidental, já que a venda some).
- Reaproveita o `handleDispensarPedido` e o estado `isDispensando` existentes.
- Tooltip "Dispensar pedido — envia para Arquivo Morto".

Nenhuma alteração de schema, hooks ou outras telas. O `AlertDialog` de confirmação é adicionado junto aos demais no final do componente.

## Arquivos afetados
- `src/components/pedidos/VendaPendentePedidoCard.tsx` (apresentação — botão + dialog de confirmação)
