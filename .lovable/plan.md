## Mudanças em `/direcao/estrategia/itens`

### 1. Banco
- Migration: adicionar coluna `preco_venda numeric NOT NULL DEFAULT 0` em `public.estoque`.

### 2. Coluna "Preço de Venda" editável
- Em `ProdutosFabrica.tsx`, adicionar nova prop `showPrecoVenda?: boolean` (default `false`, para não impactar `/fabrica/produtos`).
- Quando `true`:
  - Adicionar `<TableHead>` "Preço de Venda" entre as colunas existentes (após "Custo Unit.").
  - Adicionar `<TableCell>` na `SortableProductRow` com `EditableCell` tipo `currency` salvando `preco_venda` via `onUpdateField`.
- Atualizar `useEstoque.ts` para incluir `preco_venda` no tipo `ProdutoEstoque` e nos SELECT/UPDATE.
- Em `EstrategiaItens.tsx`, passar `showPrecoVenda`.

### 3. Bloquear exclusão pela lixeira
- Adicionar nova prop `blockDelete?: boolean` em `ProdutosFabrica.tsx`.
- Quando `true`, o clique em `Trash2` abre um `AlertDialog` informativo:
  - Título: "Exclusão não permitida"
  - Descrição: "Para excluir este item, fale com o administrador."
  - Apenas botão "Entendi" (fecha o modal). Nenhuma chamada de delete.
- Em `EstrategiaItens.tsx`, passar `blockDelete`.

### Arquivos afetados
- `supabase/migrations/*_add_preco_venda_estoque.sql` (novo)
- `src/hooks/useEstoque.ts`
- `src/pages/direcao/estoque/ProdutosFabrica.tsx`
- `src/pages/direcao/estrategia/EstrategiaItens.tsx`
