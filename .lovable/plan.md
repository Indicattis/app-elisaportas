# Reordenar colunas de valores em /direcao/estrategia/itens

## Objetivo
Permitir que o usuário reordene as 7 colunas de valores da tabela arrastando-as horizontalmente, com a ordem persistida localmente.

## Colunas afetadas
Custo, Lucro, Imposto, Desc. Gerente, Cartão, Valor de Venda, Preço Objetivo.

Colunas fixas (não reordenáveis): handle de arrastar linha, Item, Unidade, e a coluna de ações (lixeira).

## Comportamento
- Cada `<TableHead>` das 7 colunas vira sortable horizontal usando `@dnd-kit` (já instalado no arquivo).
- Um ícone `GripVertical` aparece no header (sutil, visível no hover) como handle de arrasto.
- Ao soltar, a ordem é atualizada e todas as `<TableRow>` reordenam suas células correspondentes na mesma sequência.
- A ordem é persistida em `localStorage` (chave `estrategia-itens-column-order-v1`), análogo ao padrão já usado para cores (`estrategia-itens-column-colors-v1`).
- Se a chave não existir, usa-se a ordem padrão atual.
- Validação: ao carregar do storage, mesclar com a lista padrão para tolerar adição/remoção futura de colunas.

## Implementação técnica
Arquivo único: `src/pages/direcao/estrategia/EstrategiaItens.tsx`.

1. Novo estado `columnOrder: ColumnKey[]` com hidratação do localStorage e efeito de persistência (espelha o padrão de `columnColors`).
2. Novo `DndContext` horizontal (sensor `PointerSensor`, `closestCenter`, sem o modifier vertical) envolvendo apenas a linha de headers das 7 colunas e, em paralelo, o mapeamento das células de cada linha.
3. `SortableContext` com `horizontalListSortingStrategy` (trocar import de `verticalListSortingStrategy`, mantendo o existente para as linhas) recebendo `columnOrder`.
4. Refatorar a renderização atual (que hoje declara cada `TableHead`/`TableCell` inline) para mapas indexados por `ColumnKey`:
   - `headerRenderers: Record<ColumnKey, ReactNode>` para os headers (mantendo sort buttons, popover de cor, etc.).
   - `cellRenderers: Record<ColumnKey, (item) => ReactNode>` para o conteúdo de cada célula (mantendo `EditableCell`, lógica de `custo_ok` no objetivo, formatação, `getColumnBg`).
5. Componentes auxiliares `SortableHeadCell` e `SortableBodyCell` (usam `useSortable` com o mesmo `id = ColumnKey`) renderizando `<TableHead>` / `<TableCell>` com `transform`/`transition` aplicados via style.
6. Handle `GripVertical` no header com `cursor-grab`, `opacity-0 group-hover:opacity-100`, sem interferir nos botões de ordenação e popover existentes.
7. Nenhuma mudança em hooks, banco ou export PDF/Excel (a ordem visual é apenas no preview da tabela).

## Não incluído
- Persistência por usuário no banco (fica em localStorage).
- Reordenar colunas fixas (Item/Unidade/Ações).
- Aplicar a nova ordem nos exports PDF/Excel.
