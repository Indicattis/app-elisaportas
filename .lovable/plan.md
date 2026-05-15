## Objetivo

1. Adicionar coluna **SKU** editável inline em `/fabrica/produtos` (e na cópia).
2. Criar uma cópia independente da página em `/administrativo/compras/itens`.
3. Adicionar botão "Gerenciar itens" no topo de `/administrativo/compras/requisicoes/nova` que leva para a nova rota.

## Mudanças

### 1. Coluna SKU editável em `ProdutosFabrica.tsx`
- Adicionar `<TableHead>SKU</TableHead>` logo após "Produto" no header (linha ~1019).
- Adicionar `<TableCell>` correspondente em `SortableProductRow` usando `EditableCell` com `onSave={(v) => onUpdateField(produto.id, { sku: String(v) || null })}`.
- Atualizar `colSpan` dos estados vazios (de 14 para 15) e completar `<TableCell />` no `TableFooter`.

### 2. Cópia da página: `src/pages/administrativo/ItensAdministrativo.tsx`
- Duplicar `ProdutosFabrica.tsx` (arquivo independente, sem compartilhar componente — atendendo ao pedido).
- Ajustar título/subtítulo para "Itens" / contexto Administrativo/Compras e atualizar o `breadcrumb`/`backPath` para `/administrativo/compras`.
- Manter exatamente o mesmo comportamento (mesma fonte de dados `useEstoque`, mesmas edições inline incluindo SKU).

### 3. Rota e link
- `src/App.tsx`: registrar `<Route path="/administrativo/compras/itens" element={...}>` apontando para o novo componente, com `ProtectedRoute` apropriado (provavelmente `routeKey="administrativo_compras"` — confirmar com as chaves existentes).
- `src/pages/administrativo/NovaRequisicaoCompra.tsx`: adicionar botão "Gerenciar itens" no `headerActions` (ou ao lado do título da seção "Inserção rápida") com `Link` para `/administrativo/compras/itens`, ícone `Package` ou `Settings`, estilo glassmorphism consistente.

## Observações técnicas

- O componente `EditableCell` já existe e suporta texto livre — o SKU encaixa direto.
- O hook `useEstoque` (e seu mutation de update) já aceita `sku` no patch, pois o filtro de busca em `searchTerm` (linha 506) já lê `p.sku`.
- Sem alterações de banco de dados.

## Itens fora do escopo

- Não mexer em validação de unicidade do SKU (não foi pedido).
- Não alterar o componente original — a cópia é independente conforme escolha.
