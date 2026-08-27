# Drag and Drop na lista de Processos Justiça

Permitir reordenar os processos em `/direcao/processos-justica` arrastando as linhas da tabela, com a ordem persistida no banco.

## Alterações

1. **Migração** — adicionar coluna `ordem integer` em `processos_justica`, backfill dos registros existentes por `created_at` e índice simples.
2. **Hook `useProcessosJustica.ts`**:
   - incluir `ordem` no tipo e ordenar a query por `ordem asc, created_at desc`;
   - nova mutação `reordenar` que recebe a lista na nova ordem e faz update em lote dos campos `ordem` (update otimista no cache do React Query).
3. **Página `ProcessosJusticaDirecao.tsx`**:
   - envolver o `tbody` em `DndContext` + `SortableContext` (padrão já usado no projeto com `@dnd-kit`);
   - extrair a linha do processo para um componente `SortableRow` com `useSortable`, adicionando uma alça de arraste (ícone `GripVertical`) na primeira coluna;
   - ao soltar (`handleDragEnd` com `arrayMove`), chamar `reordenar`;
   - a linha de cadastro rápido inline permanece fixa no final, fora da área ordenável.
4. **Comportamento**: clique na linha continua abrindo o painel de detalhes (o drag só inicia pela alça, com constraint de distância para não conflitar com o clique).

## Detalhes técnicos
- Coluna nova em tabela existente não exige GRANTs adicionais (já concedidos à tabela).
- Sem novas rotas ou permissões.
