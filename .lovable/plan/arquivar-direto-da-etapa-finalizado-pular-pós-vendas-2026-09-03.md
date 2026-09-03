# Arquivar direto da etapa "Finalizado" (pular Pós-Vendas)

## O que muda para o usuário

Nos cards de pedidos da etapa **Finalizado** em `/direcao/gestao-fabrica` (ao lado dos botões "Enviar para Correção" e "Aguardando Cliente"), aparece um novo botão **"Arquivar (pular Pós-Vendas)"** com ícone de arquivo.

Ao clicar:
1. Abre uma confirmação explicando que o pedido irá para o arquivo morto sem passar pelo Pós-Vendas (sem pesquisa de satisfação).
2. Ao confirmar, o pedido é arquivado, some da etapa Finalizado e passa a aparecer no histórico de arquivados (`/direcao/pedidos-arquivados`), como os demais.

Os botões existentes (Correção, Aguardando Cliente, Avançar para Pós-Vendas) continuam iguais. O botão de arquivar da etapa Pós-Vendas também permanece.

## Detalhes técnicos

- `src/hooks/usePedidosEtapas.ts`: nova mutation `arquivarPedidoDireto(pedidoId)`:
  - Atualiza `pedidos_producao` com `arquivado=true`, `data_arquivamento`, `arquivado_por`, filtrando `etapa_atual='finalizado'` (mantém `etapa_atual` como `finalizado`).
  - Fecha a linha `finalizado` em `pedidos_etapas` (`data_saida = now`).
  - Insere em `pedidos_movimentacoes` com `etapa_origem='finalizado'`, `etapa_destino='finalizado'`, descrição "Pedido arquivado diretamente (Pós-Vendas dispensado)".
  - Invalida `pedidos-etapas` e `pedidos-contadores`; toasts de sucesso/erro.
- `src/components/pedidos/PedidoCard.tsx`:
  - Nova prop opcional `onArquivarDireto?: (pedidoId) => Promise<void>`.
  - Botão na etapa `finalizado` (quando `!readOnly` e prop presente), estilo igual aos vizinhos (22px, cor laranja, ícone `Archive`), nas duas variantes de layout do card.
  - Reutiliza `ArquivarPedidoModal` (texto ajustado via prop opcional `descricao`) e `ArquivamentoLoadingModal` já existentes.
- `src/pages/direcao/GestaoFabricaDirecao.tsx`: handler `handleArquivarDireto` passado ao `PedidoCard` apenas quando `etapa === 'finalizado'`.
- Sem migração de banco. O trigger que marca parcelas como pagas já dispara ao entrar em `finalizado`, então nada muda no financeiro.
