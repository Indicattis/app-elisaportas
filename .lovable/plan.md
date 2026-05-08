## Problema

Ao salvar as observações de visita técnica em `/fabrica/montagem-pedidos/:id`, o banco retorna:

```
violates foreign key constraint "pedido_porta_observacoes_produto_venda_id_fkey"
Key is not present in table "produtos_vendas".
```

A tabela `pedido_porta_observacoes` (e a irmã `pedido_porta_social_observacoes`) ainda tem uma FK em `produto_venda_id → produtos_vendas(id) ON DELETE CASCADE`. O hook `usePedidoPortaObservacoes.ts` já trazia o comentário "FK foi removida para permitir autorizados", mas a remoção nunca chegou ao banco — a constraint continua viva. Por isso, qualquer pedido cuja linha de produto não exista mais (ou foi recriada após edição da venda, correção/manutenção sem produtos_vendas correspondentes, autorizados etc.) quebra ao salvar.

## Causa direta

- `produto_venda_id` salvo vem de `porta._originalId` (id do `produtos_vendas` no momento do fetch).
- Se a venda foi reeditada (linhas recriadas), ou se o pedido aponta para uma venda cujos produtos foram removidos/recriados, a FK rejeita o INSERT/UPSERT.
- A FK não é necessária: o app já controla a associação por `pedido_id + produto_venda_id + indice_porta` (UNIQUE) e a limpeza acontece via `pedido_id` (CASCADE com `pedidos_producao`).

## O que vou fazer

### 1. Migration

Remover apenas as duas FKs em `produto_venda_id` (mantendo PK, UNIQUE, CHECKs e a FK de `pedido_id`):

```sql
ALTER TABLE public.pedido_porta_observacoes
  DROP CONSTRAINT IF EXISTS pedido_porta_observacoes_produto_venda_id_fkey;

ALTER TABLE public.pedido_porta_social_observacoes
  DROP CONSTRAINT IF EXISTS pedido_porta_social_observacoes_produto_venda_id_fkey;
```

Sem alteração de colunas, dados ou políticas RLS.

### 2. Frontend

Nenhuma mudança de código — o hook já está escrito assumindo a ausência da FK (sem JOIN para `produtos_vendas`). Apenas atualizar o comentário se precisar deixar explícito.

## Por que dropar a FK em vez de "consertar" o id

- O id de `produtos_vendas` é volátil: edições na venda recriam linhas, e queremos preservar as observações da visita técnica do pedido independentemente disso.
- A integridade real (não deixar observação órfã) já é garantida pelo `ON DELETE CASCADE` em `pedido_id`, que é o vínculo que importa para o ciclo de vida do pedido de produção.
- Alternativa (validar id no front) re-introduziria o mesmo bug toda vez que a venda for reeditada — não resolve.

## Riscos / impacto

- Nenhuma perda de dados.
- Nenhuma mudança em UI ou regra de negócio.
- Após a migration, o salvar deixa de quebrar mesmo quando o `produto_venda_id` referenciado não existir mais no `produtos_vendas`.
