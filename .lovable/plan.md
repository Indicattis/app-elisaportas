## Objetivo

Em `/direcao/estrategia/itens`, permitir arrastar e soltar (drag-and-drop) os itens dentro de cada categoria para reordená-los. A ordem é persistida no campo `ordem` da tabela `custos_itens` (que já existe). Categorias continuam ordenadas pelo diálogo existente — o D&D só reordena itens dentro do mesmo grupo.

## Escopo

- Apenas o arquivo `src/pages/direcao/estrategia/EstrategiaItens.tsx`.
- Adicionar uma mutação utilitária no hook `src/hooks/useCustosItens.ts` para salvar a ordem em lote (`reordenarItens`).
- Sem mudanças de schema (coluna `ordem` já existe e o select já ordena por ela).

## UX

- Aparece um handle de "grip" (ícone `GripVertical`) à esquerda em cada linha da tabela.
- Cursor `grab` no handle; ao arrastar a linha fica com opacidade reduzida e leve sombra.
- Drag restrito ao eixo vertical e ao container da categoria (modifier `restrictToVerticalAxis` + `restrictToParentElement`).
- Soltar fora da categoria não move entre grupos (somente dentro da própria categoria, conforme o pedido).
- Busca ativa desabilita o D&D (o grip fica escondido) para evitar reordenar com lista filtrada.

## Implementação técnica

1. **Hook `useCustosItens.ts`**: adicionar `reordenarItens` (useMutation) que recebe `Array<{ id: string; ordem: number }>` e faz `upsert` em lote na tabela `custos_itens` apenas com `{ id, ordem }` usando `onConflict: "id"`. Invalida a query `custos_itens`.

2. **`EstrategiaItens.tsx`**:
   - Importar de `@dnd-kit/core`: `DndContext`, `closestCenter`, `PointerSensor`, `useSensor`, `useSensors`. De `@dnd-kit/sortable`: `SortableContext`, `verticalListSortingStrategy`, `useSortable`, `arrayMove`. De `@dnd-kit/modifiers`: `restrictToVerticalAxis`, `restrictToParentElement`. De `@dnd-kit/utilities`: `CSS`. Ícone `GripVertical` do `lucide-react`.
   - Adicionar nova coluna à esquerda (`TableHead` vazio com `w-8`) no header.
   - Extrair o `<TableRow>` de cada item em um componente `SortableItemRow` que usa `useSortable({ id: item.id })` e aplica `transform`/`transition` no `style` do `TableRow`. A primeira `TableCell` contém o handle com `{...attributes} {...listeners}`.
   - Envolver cada `<TableBody>` em `<DndContext>` + `<SortableContext items={rows.map(r => r.id)} strategy={verticalListSortingStrategy}>`. Cada categoria tem seu próprio contexto (isolando grupos).
   - `onDragEnd`: calcula `arrayMove`, atualiza estado local otimista por categoria e chama `reordenarItens.mutateAsync` com novos índices `0..n-1`.
   - Manter ordenação reativa: ao receber `items` novos do servidor, eles já vêm ordenados por `categoria, ordem` (select existente), portanto `groupedByCategoria` reflete a nova ordem sem estado paralelo persistente — usa-se apenas update otimista temporário enquanto a mutação roda (via `queryClient.setQueryData`) ou simplesmente confia no refetch após `invalidateQueries`. Optar pelo update otimista para evitar flicker.

## Fora de escopo

- Mover itens entre categorias via D&D (não foi pedido; manter a edição de categoria pelo `EditableCell` existente).
- Alterar a ordenação de categorias (já existe diálogo dedicado).
