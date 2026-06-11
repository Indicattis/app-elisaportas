## Problema

Em `/direcao/estrategia/itens`, ao alterar `custo_unitario`/`preco_venda` (e taxas) de um item de custo, a página `/direcao/estrategia/kits/:id/montagem` continua mostrando o lucro/custo/venda total antigos. Além disso, o `valor_porta` salvo no kit também fica desatualizado.

Causas:
1. `useCustosItens.updateItem` só invalida a query `["custos_itens"]`. As queries `["kit-montagem", kitId]` e `["kits-montagem-resumo"]` (que selecionam joined `custo_item`) permanecem em cache.
2. Nenhum recálculo de `tabela_precos_portas.valor_porta` é disparado quando o `preco_venda` do item muda — hoje só acontece via `recalcKitValorPorta` em add/update/remove na montagem.

## Solução

### 1. Invalidar queries dependentes ao atualizar item de custo
Em `src/hooks/useCustosItens.ts`, no `onSuccess` de `updateItem` (e por simetria em `createItem`/`deleteItem`), invalidar também:
- `["kit-montagem"]` (todas as chaves que começam com isso)
- `["kits-montagem-resumo"]`
- `["tabela-precos"]` e `["tabela-precos-kit"]` (pois `valor_porta` será recalculado)
- `["montagem-template"]`

### 2. Recalcular `valor_porta` dos kits afetados
No `mutationFn` de `updateItem`, quando o `patch` contiver campos que afetam o preço de venda do kit (`preco_venda`, ou — se decidirmos — `custo_unitario`/taxas que afetam lucro), após o `update`:
- Buscar `tabela_precos_portas_montagem` filtrando `custo_item_id = id` para descobrir os `kit_id`s impactados (distinct).
- Para cada `kit_id`, chamar `recalcKitValorPorta(kitId)` (já existe em `useKitMontagem.ts`).

Observação: `recalcKitValorPorta` só depende de `preco_venda`, então só precisa rodar quando `patch.preco_venda` mudou. Para mudanças apenas em `custo_unitario`/taxas, basta invalidar as queries (lucro/custo derivados são calculados no client em `computeLucroUnit`).

### Arquivos alterados
- `src/hooks/useCustosItens.ts` — expandir `updateItem` (e create/delete) para invalidar as queries de montagem e recalcular `valor_porta` dos kits afetados quando `preco_venda` mudar.

Sem mudanças de schema, sem mudanças visuais.
