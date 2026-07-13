## Objetivo
Ao clicar numa venda em `/vendas/minhas-vendas`, abrir uma página apenas de visualização, sem tentar editar nem exibir o diálogo de bloqueio.

## Mudanças

1. **`src/pages/vendas/MinhasVendas.tsx`**
   - Substituir a lógica atual de `handleRowClick` (que checa faturamento/pedido e navega para `/editar/:id` ou abre o `bloqueioDialog`) por uma navegação direta para uma nova rota de visualização: `navigate(`/vendas/minhas-vendas/${venda.id}`)`.
   - Remover o estado e o dialog de bloqueio (`bloqueioDialogOpen`, `blockReason`, `selectedPedidoId`) usados apenas por esse fluxo, se não forem reutilizados em outro lugar da tela.
   - Manter os botões de "Nova venda", "Correção" e edição de rascunho como estão (rascunho ainda vai para `/editar/:id`).

2. **`src/App.tsx`**
   - Adicionar nova rota `/vendas/minhas-vendas/:id` apontando para o componente de visualização já existente `VendaDetalhesMinimalista` (mesmo componente usado em `/administrativo/vendas/:id`), protegida por `ProtectedRoute routeKey="vendas_hub"`.
   - A rota de edição `/vendas/minhas-vendas/editar/:id` continua existindo para rascunhos.

## Observações
- Nenhuma mudança de regra de negócio: a edição via botão de rascunho segue igual; apenas o clique na linha da venda deixa de tentar editar e passa a apenas visualizar.
- Se `VendaDetalhesMinimalista` já cobrir o layout desejado, não é necessário criar nova página. Caso a página apresente ações que não caibam para o atendente, ajusto para modo puramente leitura numa segunda iteração — confirme se quer isso agora.
