## Objetivo
Aumentar a altura dos cards de dia e dos chips de visita dentro do calendário em `/vendas/visitas-tecnicas` para melhorar legibilidade e usabilidade.

## Alterações

### 1. Card do dia (`DroppableDayCell`)
- Aumentar `min-h-[90px]` para `min-h-[140px]`
- Aumentar padding interno de `p-1.5` para `p-2.5`

### 2. Card vazio do grid
- Aumentar `min-h-[90px]` para `min-h-[140px]` (linha 587)

### 3. Chip da visita (`DraggableVisitaChip`)
- Aumentar padding de `px-1.5 py-0.5` para `px-2 py-1.5`
- Aumentar fonte de `text-[11px]` para `text-xs`

### 4. DragOverlay
- Ajustar padding e fonte para combinar com o chip aumentado

## Arquivo
- `src/pages/vendas/VisitasTecnicasCalendario.tsx`

Nenhuma alteração de banco de dados ou backend necessária.