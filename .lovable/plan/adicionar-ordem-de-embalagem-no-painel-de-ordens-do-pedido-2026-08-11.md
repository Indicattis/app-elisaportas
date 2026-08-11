# Adicionar Ordem de Embalagem no painel de ordens do pedido

## Objetivo
No detalhe do pedido em /direcao/gestao-fabrica, a seção "Ordens de Produção" hoje lista apenas Soldagem, Perfiladeira, Separação, Qualidade e Pintura. A ordem de Embalagem existe no banco (`ordens_embalagem`) mas não aparece nessa lista, então não é possível abrir/gerenciar suas linhas por ali.

## O que muda
- A seção passa a listar também a ordem de **Embalagem** (número, status, responsável, pausa), no final da sequência, depois de Pintura.
- Clicar no card de Embalagem abre o mesmo painel de linhas usado nas demais ordens — que já suporta embalagem — permitindo marcar linhas, gerar etiquetas e usar as ações existentes.
- Ícone e cor próprios para Embalagem, seguindo o padrão visual atual dos demais tipos.

## Detalhes técnicos
Arquivo: `src/components/pedidos/PedidoDetalhesSheet.tsx`
- Em `fetchOrdens`, adicionar consulta a `ordens_embalagem` (`id, numero_ordem, status, responsavel_id, pausada, justificativa_pausa, pausada_em`) filtrada por `pedido_id`, com `maybeSingle()`, seguindo o mesmo padrão da consulta de pintura, e adicionar o registro em `ordensData` com `tipo: "embalagem"` e `tipoLabel: "Embalagem"`.
- Em `getOrdemIcon`, adicionar case `"embalagem"`.

Sem mudanças de banco: o tipo `TipoOrdem` (em `useOrdensPorPedido`) e o `TABLE_MAP` do `OrdemLinhasSheet` já incluem `embalagem`.