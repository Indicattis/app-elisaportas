## Objetivo

Em **Pós-Vendas → Pedidos**, trocar a listagem atual por um visual em "pílula" igual ao do **Ranking de Equipes**, e adicionar um botão que abre a downbar (Sheet) de detalhes do pedido — a mesma usada em Gestão de Pedidos.

## Mudanças

### 1. `src/pages/pos-vendas/PosVendasPedidos.tsx`

- Substituir os cards atuais por linhas no estilo `RankingListItem` (`logistica/RankingEquipesInstalacao.tsx`):
  - Container `rounded-full border-white/10 bg-white/5 backdrop-blur-xl`, animação `motion` com `initial/animate` (delay por índice).
  - Avatar circular à esquerda com inicial do cliente (cor azul padrão), badge numérica de posição opcional removida (não é ranking).
  - Nome do cliente em destaque + `Badge` com `#numero_pedido`.
  - Status "Pendente"/"Respondido" mantido (badge âmbar/esmeralda).
  - Telefone como subtexto discreto.
  - `ArrowRight` à direita no hover.
- Manter filtros (Pendentes/Respondidos/Todos) e busca atuais, sem alterar o layout do header.
- Ações por linha (lado direito):
  - **Botão "Ver pedido"** (ícone `Info`/`Eye`) → abre `PedidoDetalhesSheet` com o pedido completo.
  - Botão "Responder pesquisa" mantido (desabilitado se já respondido).

### 2. Integração com `PedidoDetalhesSheet`

- `PedidoDetalhesSheet` espera um objeto pedido com join de `vendas`. Ao clicar em "Ver pedido", buscar o pedido completo via `supabase.from('pedidos_producao').select('*, vendas(*)').eq('id', pedidoId).maybeSingle()` (sob demanda, com `useState` para o pedido selecionado + loading inline).
- Renderizar `<PedidoDetalhesSheet pedido={pedidoSelecionadoFull} open={!!pedidoSelecionadoFull} onOpenChange={...} />` no final da página.
- Estado da pesquisa (`pedidoSelecionado` para `PesquisaSatisfacaoForm`) permanece separado.

## Fora de escopo

- Nenhuma alteração na lógica de pesquisa de satisfação, no arquivamento ou no `PedidoDetalhesSheet`.
- Sem mudanças de banco de dados.
