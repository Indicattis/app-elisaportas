# Observação individual por item da venda

Adicionar um campo de observação livre por item da venda, que será capturado na criação/edição, persistido no banco, e exibido nas telas de detalhes da venda (Direção) e do pedido.

## Banco de dados

Migration nova adicionando coluna em `produtos_vendas`:

- `observacao_item TEXT NULL` (default null).

Não mexe em `descricao` (que já é usado como rótulo do tipo do produto: "Porta de Enrolar", "Instalação", etc.) — observação é um campo separado, livre, digitado pelo vendedor.

Sem mudanças de RLS (a tabela já tem políticas).

## Tipos e hooks

- `src/hooks/useVendas.ts` → `ProdutoVenda`: adicionar `observacao_item?: string | null`.
- `src/hooks/useVendas.ts`: nos dois pontos onde produtos são inseridos (criação e edição de venda), repassar `observacao_item: produto.observacao_item ?? null`.
- `src/hooks/useProdutosVenda.ts`: incluir `observacao_item` no `produtoLimpo` do `addProdutoMutation` e permitir `observacao_item` no `updateProdutoMutation`.

## Criação/edição de venda (`/vendas/minhas-vendas/nova`)

- `src/components/vendas/ProdutosVendaTable.tsx`:
  - Adicionar uma coluna "Observação" exibindo `produto.observacao_item` (truncado, com tooltip do texto completo).
  - Ao lado, botão/ícone "lápis" abrindo um pequeno popover/modal com `Textarea` para editar a observação daquele item. Confirmar chama um novo callback `onUpdateObservacao(index, texto)` recebido por props.
  - Pintura "avulsa" e instalação também aceitam observação (mesma coluna, mesmo controle).
- `src/pages/vendas/VendaNovaMinimalista.tsx`:
  - Implementar `handleUpdateObservacao(index, texto)` que faz `setPortas(prev => prev.map((p,i) => i===index ? {...p, observacao_item: texto} : p))`.
  - Passar para `ProdutosVendaTable`.
  - Garantir que `observacao_item` é preservado quando portas são carregadas via `produtosConvertidos` (edição de rascunho) e quando passadas para `createVenda` / `produtosComDesconto`.

## Detalhes da venda (`/direcao/vendas/:id`)

- `src/pages/direcao/VendaDetalhesDirecao.tsx`:
  - Acrescentar `observacao_item` ao `select` de `produtos:produtos_vendas(...)` e ao tipo `Produto` local.
  - Na lista de produtos (loop `agruparItensCatalogo(...).map`), adicionar uma linha/coluna "Observação" abaixo (ou à direita) da descrição quando `produto.observacao_item` tiver valor, usando o estilo glassmorphism existente (texto `text-white/70 text-xs`).

## Página do pedido

A "página do pedido" referenciada é o detalhe do pedido (`PedidoDetails` → `PedidoLinhasEditor`), onde os itens da venda aparecem agrupados como "pastas" por porta.

- `src/components/pedidos/PedidoLinhasEditor.tsx`:
  - No cabeçalho de cada pasta de porta (onde hoje aparece `label` + `dimensoes`), adicionar uma nova coluna/área "Observação" mostrando a `observacao_item` da porta correspondente (`porta.observacao_item`).
  - Quando vazio, exibir "—" discreto.
  - Read-only (sem edição aqui — a edição acontece na tela da venda).
- `src/hooks/usePedidoLinhas.ts` / tipos locais: se necessário, expor `observacao_item` ao buscar `portas` a partir de `produtos_vendas`.

## Fora de escopo

- Modais de edição de venda já faturada (a coluna ficará visível, mas sem edição extra além do que já existe).
- Impressão em PDFs do pedido/venda.
- Filtros/buscas pela observação.
- Triggers, regras de negócio, financeiro.

## Detalhes técnicos

```text
produtos_vendas
  + observacao_item TEXT NULL
```

Fluxo do dado:
```text
ProdutosVendaTable (editar) → setPortas → createVenda/updateVenda
  → produtos_vendas.observacao_item
       ↳ VendaDetalhesDirecao (leitura, mesma seção dos produtos)
       ↳ PedidoLinhasEditor (leitura, header da pasta da porta)
```
