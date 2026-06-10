Plano para corrigir /direcao/gestao-fabrica:

1. Corrigir a aba “Aprovação Diretor” para ser uma fila de vendas
- Mostrar somente as vendas faturadas sem pedido vindas de `useVendasPendentePedido`.
- Parar de renderizar `PedidosDraggableList` quando a aba ativa for `aprovacao_diretor`.
- Ajustar o contador da aba para usar apenas `vendasPendentePedido.length`, sem somar pedidos existentes em `pedidos_producao`.

2. Manter o fluxo correto de criação
- Na ação de aprovar a venda, manter o comportamento esperado: criar o pedido a partir da venda e mover imediatamente para `aberto`.
- O pedido recém-criado deve aparecer na aba “Pedidos em Aberto”, não em “Aprovação Diretor”.

3. Corrigir a reativação que entrou no fluxo errado
- Ajustar a reativação de venda concluída sem pedido para voltar como venda pendente de criação de pedido, em vez de criar um pedido diretamente em `aprovacao_diretor`.
- Invalidar as queries certas para a venda aparecer imediatamente na aba “Aprovação Diretor”.

4. Atualizar a regra salva do projeto
- Atualizar a memória da regra de reativação para refletir: “Aprovação Diretor é fila de vendas; pedido só nasce quando a venda é aprovada e já vai para Aberto”.

Arquivos prováveis:
- `src/pages/direcao/GestaoFabricaDirecao.tsx`
- `src/pages/administrativo/FaturamentoVendasMinimalista.tsx`
- `mem://features/vendas/reativacao-venda-sistema.md`
- `mem://index.md`