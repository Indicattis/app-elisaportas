# Follow-up de contato no Pós-Vendas

## O que muda para o usuário

Na lista de `/pos-vendas/pedidos`, cada pedido ganha uma coluna **Follow-up** com 3 bolinhas (tentativas de contato com o cliente).

- Clicar na próxima bolinha marca a tentativa (fica preenchida); clicar na última marcada desmarca (para corrigir engano).
- Ao passar o mouse na bolinha, aparece quem marcou e quando.
- Quando as 3 tentativas estiverem marcadas, aparece o botão **"Arquivar"** naquele pedido. Ao confirmar, o pedido vai para os itens arquivados (mesmo histórico de `/direcao/pedidos-arquivados`), sem precisar responder a pesquisa.
- O fluxo atual (responder pesquisa e arquivar automaticamente) continua igual.

## Detalhes técnicos

- Migração: nova tabela `pos_vendas_followups` (`pedido_id` FK `pedidos_producao` on delete cascade, `tentativa` 1-3, `realizado_por`, `realizado_em`, unique `(pedido_id, tentativa)`), com GRANTs para authenticated/service_role, RLS para usuários autenticados ativos (ler, inserir, excluir).
- `PosVendasPedidos.tsx`: query dos follow-ups dos pedidos listados; componente de 3 bolinhas com insert/delete sequencial; botão Arquivar (habilitado com 3 tentativas) que reutiliza `ArquivarPedidoModal` e atualiza `pedidos_producao` (`arquivado=true`, `data_arquivamento`, `arquivado_por`), fecha `pedidos_etapas` pos_vendas e registra `pedidos_movimentacoes` "Arquivado após 3 tentativas de follow-up".
- Atualizar memória do Pós-Vendas.
