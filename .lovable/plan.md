# Adicionar coluna "Preço Objetivo" em Itens

## Objetivo
Na tela `/direcao/estrategia/itens`, adicionar uma coluna "Preço Objetivo" editável manualmente ao lado das demais colunas financeiras.

## Passos

### 1. Migration do banco de dados
Criar migration para adicionar a coluna `preco_objetivo` (tipo `numeric`, nullable) na tabela `custos_itens`.

### 2. Atualizar hook `useCustosItens.ts`
- Adicionar `preco_objetivo: number | null` no tipo `CustoItem`
- Adicionar `preco_objetivo?: number | null` no tipo `NewCustoItem`
- Incluir o campo no payload do `createItem.mutateAsync`

### 3. Atualizar página `EstrategiaItens.tsx`
- Adicionar `"objetivo"` ao tipo `ColumnKey`
- Adicionar entrada em `COLUMN_LABELS` e `DEFAULT_COLUMN_COLORS`
- No header da tabela (`<TableHead>`), inserir a nova coluna entre "Cartão" e "Valor de Venda" (ou ao lado do "Valor de Venda" — posicionar como coluna editável financeira)
- No `SortableItemRow`, adicionar `<EditableCell>` para `preco_objetivo` com tipo `currency`, alinhado à direita
- No diálogo de "Novo item", adicionar campo de input para `preco_objetivo`
- Adicionar `preco_objetivo` no estado `newItem` e no `handleCreate`

## Arquivos envolvidos
- Migration Supabase (`custos_itens.preco_objetivo`)
- `src/hooks/useCustosItens.ts`
- `src/pages/direcao/estrategia/EstrategiaItens.tsx`

## Notas
- A coluna será editável manualmente via `EditableCell` (mesmo componente usado em Custo, Valor de Venda, etc.)
- Não envolve cálculo automático — o usuário digita o valor desejado
- O campo é nullable no banco para itens existentes