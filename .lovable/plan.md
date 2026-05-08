## Problema

A venda `d4a3d889-22e8-4cba-a755-f4f2ecb99fc9` (AMICI EMPREENDIMENTOS, R$ 33.000) foi faturada corretamente:
- `frete_aprovado = true`
- todos os 3 produtos com `faturamento = true`
- `status_aprovacao = aprovado`
- nenhum `pedido_producao` vinculado

Mas ela tem `pedido_dispensado = true`, e o hook `useVendasPendentePedido` (que alimenta a aba "Aprovação Diretor" em `/direcao/gestao-fabrica`) filtra essas vendas com `.eq("pedido_dispensado", false)`.

Esse flag foi marcado quando alguém clicou em **"Dispensar Pedido"** ou **"Finalizar Direto"** no `VendaPendentePedidoCard`. Hoje o flag é uma via de mão única — não existe UI para reverter.

## Plano

### 1. Correção pontual desta venda
Migration setando `pedido_dispensado = false` na venda `d4a3d889-22e8-4cba-a755-f4f2ecb99fc9`. Após isso ela voltará a aparecer na aba "Aprovação Diretor" automaticamente (refetch a cada 30s + invalidação manual).

### 2. (Opcional) Reverter dispensa pela UI
Adicionar um botão "Reativar Pedido" em `/direcao/gestao-fabrica` na aba **Arquivo Morto** (ou em uma seção dedicada de "Vendas Dispensadas") que faz `UPDATE vendas SET pedido_dispensado = false` e invalida `vendas-pendente-pedido`. Isso evita ter que pedir migration toda vez que alguém dispensa por engano.

## Detalhes técnicos

- Arquivo do filtro: `src/hooks/useVendasPendentePedido.ts:85`
- Arquivos onde o flag é setado: `src/components/pedidos/VendaPendentePedidoCard.tsx:142,161` (handlers `handleDispensarPedido` e `handleFinalizarDireto`)
- Sem alterações em RLS — a coluna já é editável pelos mesmos perfis que dispensam.

## Pergunta antes de implementar

Quer só a correção pontual (item 1), ou também o botão de reativação para evitar o problema no futuro (item 1 + item 2)?