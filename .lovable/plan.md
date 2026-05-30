Adicionar drag-and-drop em `/direcao/estrategia/despesas/configurações` para reordenar setores e colaboradores dentro de cada setor, usando `@dnd-kit` (já no projeto).

## Backend

Persistência via campo `ordem` já existente nas duas tabelas:
- `system_setores.ordem` (já usado em `useSetores`)
- `despesas_padrao.ordem` (já existe no schema/hook)

Nenhuma migration necessária.

## Frontend

### `src/hooks/useSetores.ts`
- Adicionar mutation `reorderSetores(ids: string[])` que recalcula `ordem` (10, 20, 30…) e faz `update` em batch via múltiplos `update().eq('id', …)` em paralelo.

### `src/hooks/useDespesasPadrao.ts`
- Adicionar `reorderItems(ids: string[])` que atualiza `ordem` em batch nas linhas alvo.

### `src/pages/direcao/estrategia/EstrategiaDespesasConfiguracoes.tsx`
- Envolver a lista de grupos de setor da `FolhaBlock` em `DndContext` + `SortableContext` (vertical) para reordenar **setores**. Cada `FolhaSetorGroup` vira `useSortable` com handle (ícone GripVertical à esquerda do título do setor).
- Dentro de cada `FolhaSetorGroup`, envolver as `<tr>` em outro `DndContext` + `SortableContext` para reordenar **colaboradores**; handle (GripVertical) numa nova coluna à esquerda do nome.
- Ordenar `items` por `ordem` ao agrupar (já vem ordenado do hook).
- Linha "Sem setor" permanece fixa no fim e não é arrastável (nem como grupo, nem itens dela — ou permitir reordenar só dentro dela; vou permitir só dentro dela e manter o grupo fixo no fim).

Ao soltar:
- Setores: chamar `reorderSetores` com nova ordem dos `setor.id` e atualizar cache otimisticamente.
- Colaboradores: chamar `reorderItems` com IDs do grupo reordenado.

## Detalhes técnicos

- Usar `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` (verificar instalação; instalar se faltar).
- `restrictToVerticalAxis` para ambos.
- Handle dedicado (`<GripVertical>`) para não conflitar com inputs/selects existentes.