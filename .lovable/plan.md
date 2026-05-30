## Objetivo

Em `/direcao/gestao-fabrica`, mover o badge **🔥 Quente / ❄️ Frio** da listagem compacta (abaixo do nome do cliente, onde está ocupando o espaço do último comentário) para a barra de detalhes (`PedidoDetalhesSheet`) que abre ao clicar no pedido.

## Mudanças

### 1. `src/components/pedidos/PedidoCard.tsx` (~linhas 1477-1486)
Remover o bloco que renderiza o badge `venda.venda_presencial ? "🔥 Quente" : "❄️ Frio"` dentro da view compacta (list view). Manter `ultimoComentario` no mesmo lugar — ele volta a aparecer normalmente abaixo do nome do cliente.

### 2. `src/components/pedidos/PedidoDetalhesSheet.tsx` (Hero Section, ~linha 525)
Adicionar o badge **Quente/Frio** ao lado/abaixo do nome do cliente no bloco "Hero Section - Cliente e Valor", usando o mesmo estilo já existente (laranja para presencial/Quente, ciano para Frio). Renderizar apenas quando `venda.venda_presencial != null`.

## Detalhes técnicos
- `venda` no Sheet vem de `pedido.vendas` (já contém `venda_presencial`), sem necessidade de novas queries.
- Sem mudanças em backend, hooks ou outros locais (a versão full-card de `PedidoCard` já não exibia o badge e continua igual).
