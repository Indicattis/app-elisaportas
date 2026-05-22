## Objetivo

Permitir reordenar os kits em `/direcao/estrategia/kits` via drag-and-drop, persistindo a ordem no banco.

## Mudanças

### 1. Banco (migration)
- Adicionar coluna `ordem int` em `tabela_precos_portas` (default 0, nullable).
- Backfill: `ordem = row_number()` ordenado por `largura, altura` para manter a ordem atual.
- Criar índice em `ordem`.

### 2. Hook `useTabelaPrecos`
- Trocar `.order('largura').order('altura')` por `.order('ordem', { ascending: true, nullsFirst: false }).order('largura').order('altura')`.
- Adicionar mutation `reordenarItens(ids: string[])` que faz `update` em lote (uma chamada por id setando `ordem = index`) e invalida `['tabela-precos']`.

### 3. `TabelaPrecos.tsx`
- Nova prop `enableReorder?: boolean` (default `false`).
- Quando `true`:
  - Usar `@dnd-kit/core` + `@dnd-kit/sortable` (já presentes no projeto — confirmar; se faltar, instalar).
  - Envolver `<TableBody>` em `DndContext` + `SortableContext` (vertical).
  - Cada `<TableRow>` vira `SortableRow` com handle (ícone `GripVertical`) numa nova primeira coluna estreita.
  - `onDragEnd` reordena array local (estado otimista) e chama `reordenarItens(novaOrdem)`.
  - Drag desabilitado quando `searchTerm` está ativo (ordem só faz sentido no conjunto completo) — mostrar handle desabilitado com tooltip.

### 4. `EstrategiaKits.tsx`
- Passar `enableReorder` para `TabelaPrecos`. A tela `/tabela-precos` continua sem reordenação.

## Arquivos
- `supabase/migrations/<novo>.sql` (novo)
- `src/hooks/useTabelaPrecos.ts`
- `src/pages/TabelaPrecos.tsx`
- `src/pages/direcao/estrategia/EstrategiaKits.tsx`
