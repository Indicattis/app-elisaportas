## Objetivo

Nos itens da aba "Respondidos" em `/pos-vendas/pedidos`, exibir um botão **"Ver resposta"** que abre uma nova página com o resumo da pesquisa de satisfação daquele pedido.

## Mudanças

### 1. Nova página `src/pages/pos-vendas/PosVendasRespostaPesquisa.tsx`
Rota: `/pos-vendas/pedidos/:pedidoId/resposta`

Layout minimalista glassmorphism (mesmo padrão do módulo). Ao carregar:
- Busca a pesquisa em `pesquisas_satisfacao` pelo `pedido_id` (`.maybeSingle()`).
- Busca dados básicos do pedido (número, cliente, telefone) via `pedidos_producao` + venda (atendente).
- Mostra:
  - Header com botão voltar (→ `/pos-vendas/pedidos`) e breadcrumb, incluindo nome do cliente e número do pedido.
  - Cartão "Avaliações" com 3 notas (Atendimento, Produto, Instalação) exibidas com estrelas 1–5.
  - Cartão "Perguntas": Recomendaria? / Quis comprar avulsos? / Avaliou no Google? (cada um com Sim/Não colorido).
  - Cartão "Comentário" (só se houver texto).
  - Cartão "Itens avulsos" listando o array `itens_avulsos` (só se `quis_comprar_avulsos` e array não vazio).
  - Cartão "Anexos" com miniaturas/thumbnails e link para abrir cada anexo (`anexos` é jsonb com URLs).
  - Data da resposta (`created_at`) e nome do respondente (join com `admin_users` por `respondido_por`).
- Se não houver pesquisa para o pedido, mostra estado vazio ("Nenhuma resposta encontrada").

### 2. `src/pages/pos-vendas/PosVendasPedidos.tsx`
- Nos cards dos pedidos respondidos (quando `respondeu === true`), trocar o botão desabilitado "Já respondido" por um botão **"Ver resposta"** com ícone `FileText` que navega para `/pos-vendas/pedidos/{id}/resposta`.
- Pendentes continuam com "Responder pesquisa" como está.

### 3. `src/App.tsx`
- Registrar a rota `/pos-vendas/pedidos/:pedidoId/resposta` protegida pela mesma `routeKey` usada pelo `/pos-vendas/pedidos` atual, apontando para `PosVendasRespostaPesquisa`.

## Fora de escopo

- Não altera o formulário de envio da pesquisa nem regras de arquivamento.
- Não permite editar ou excluir a resposta na nova página (somente leitura).
