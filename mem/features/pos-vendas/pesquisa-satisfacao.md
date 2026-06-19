---
name: Pós-Vendas - Pesquisa de Satisfação
description: Módulo /pos-vendas com hub e formulário de satisfação. Ao enviar, pedido é arquivado automaticamente.
type: feature
---
Rota `/pos-vendas` (hub) → `/pos-vendas/pedidos` lista pedidos com `etapa_atual='pos_vendas'` e `arquivado=false`.

Tabela `pesquisas_satisfacao` (unique por `pedido_id`) guarda notas (1-5), recomendaria, comentário, `quis_comprar_avulsos` + `itens_avulsos` (jsonb snapshot de `custos_itens` com `vendavel_avulso=true`), `avaliou_no_google` e `anexos` (jsonb).

Anexos vão para bucket privado `pesquisas-satisfacao` (criado lazy pela edge function `init-pesquisas-satisfacao-bucket`). Path: `${pedido_id}/${uuid}-${nome}`. Limite 10 MB/arquivo.

Ao enviar o formulário: insere em `pesquisas_satisfacao`, marca `pedidos_producao.arquivado=true` (sem filtrar etapa), registra `pedidos_movimentacoes` com etapa pos_vendas. Substitui a necessidade do botão Arquivar manual nessa etapa.

Route keys: `pos_vendas_hub`, `pos_vendas_pedidos`.