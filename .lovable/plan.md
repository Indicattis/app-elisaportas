## Objetivo

Adicionar drag-and-drop para reordenar ideias na página `/marketing/videos-ideias`, persistindo a ordem no banco.

## Mudanças

### 1. Banco
- Migration: adicionar coluna `posicao INTEGER` em `marketing_videos_ideias`.
- Backfill com a ordem atual (mais recentes primeiro, igual ao listing atual).
- Index em `posicao`.

### 2. `src/pages/marketing/VideosIdeias.tsx`
- Ordenar query por `posicao ASC` (fallback `created_at DESC`).
- Envolver o grid de cards com `DndContext` + `SortableContext` (`@dnd-kit/core` + `@dnd-kit/sortable`), padrão usado em `VendasPendenteDraggableList.tsx`.
- Cada card vira um item sortable com handle de arrasto (ícone `GripVertical` no canto, estilo glassmorphism consistente).
- Ao soltar (`onDragEnd`): reordenar estado local otimisticamente e disparar mutation `reordenar` que faz `upsert` em lote das novas `posicao` de todas as ideias afetadas.
- Invalidar `marketing-videos-ideias` ao concluir; toast de erro com rollback em falha.

### 3. UX
- Cursor `grab`/`grabbing` no handle, leve `opacity` no item em arraste, sem alterar layout responsivo (grid md:grid-cols-2 mantido).
- Sem mudanças no modal de criação nem na lógica de cadastro.

## Detalhes técnicos
- Sensores: `PointerSensor` com `activationConstraint: { distance: 8 }`.
- Estratégia: `rectSortingStrategy` (grid 2 colunas).
- Persistência: `supabase.from('marketing_videos_ideias').upsert(items.map((it,i)=>({ id: it.id, posicao: i })))`.
