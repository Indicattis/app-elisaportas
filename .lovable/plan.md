# Pedidos "Autorizado" seguem para Expedição Coleta

## O que muda
Pedidos de vendas com modalidade **Autorizado** passam a seguir o mesmo caminho dos pedidos de **Entrega**: ao sair da produção (qualidade, pintura/embalagem ou só separação) vão para **Expedição Coleta**, e de lá para Finalizado após o carregamento. Não passam pela etapa de Instalações.

Também aparecem no fluxograma do pedido, no rastreio e nos filtros/legendas de "Entrega" da expedição e do carregamento como coleta.

## Detalhes técnicos
- `src/utils/pedidoFluxograma.ts`: `tipoEntrega === 'entrega' || 'autorizado'` → `aguardando_coleta`.
- `src/hooks/usePedidosEtapas.ts`: as 3 decisões (só separação, sem pintura, saída de embalagem) tratam 'autorizado' igual a 'entrega'.
- Função do banco `concluir_carregamento_e_avancar_pedido`: incluir 'autorizado' onde verifica `tipo_entrega = 'entrega'` (migração).
- Filtros de expedição/carregamento que usam `tipo_entrega === 'entrega'` (`ExpedicaoMinimalista`, `CalendarioExpedicaoReadOnly`, `OrdensEntregasLogistica`, `ProducaoCarregamento`, `EditarOrdemCarregamentoDrawer`, `useOrdensCarregamentoCalendario`, `useOrdensPorPedido`): considerar 'autorizado' como entrega/coleta.
- Na venda nova, a opção Autorizado deixa de travar o frete como "interno" (passa a seguir as regras de frete da Entrega).
