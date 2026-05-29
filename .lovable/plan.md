# Remover Catálogo de Itens legado

Migrar 100% para `custos_itens` removendo a interface, a coluna FK em `produtos_vendas` e a tabela `vendas_catalogo` (e a tabela auxiliar `vendas_catalogo_categorias_ordem`).

## Atenção — escopo maior do que parece

Além da página `/direcao/estrategia/itens`, o sistema ainda tem **outras rotas que dependem de `vendas_catalogo`**:

- `/marketing/catalogo` (lista), `/marketing/catalogo/new`, `/marketing/catalogo/editar/:id`
- Rotas legadas `VendasCatalogo` / `VendasCatalogoNovo`
- Hooks `useVendasCatalogo`, `useVendasCatalogoCategoriasOrdem`
- Fallbacks de leitura em vendas, faturamento, orçamentos e aprovações

Como você quer dropar a tabela, **todas essas rotas e fallbacks precisam sair junto**, senão quebram. O plano abaixo já cobre tudo.

## 1. Frontend — remover UI e referências

### Rotas e páginas a deletar
- `src/pages/direcao/estrategia/EstrategiaItens.tsx`
- `src/utils/estrategiaItensExport.ts`
- `src/pages/vendas/Catalogo.tsx`, `CatalogoNovoMinimalista.tsx`, `CatalogoEditMinimalista.tsx`
- `src/pages/VendasCatalogo.tsx`, `src/pages/VendasCatalogoNovo.tsx`
- Hooks `src/hooks/useVendasCatalogo.ts` e `src/hooks/useVendasCatalogoCategorias.ts`

### Editar
- `src/App.tsx` — remover imports e `<Route>` de `estrategia/itens`, `marketing/catalogo*`, `VendasCatalogo*`
- `src/pages/direcao/estrategia/EstrategiaHub.tsx` — remover item "Tabela de Custos Elisa"
- `src/pages/direcao/estrategia/EstrategiaMateriasPrimas.tsx` — trocar `backPath`/breadcrumb para a nova âncora (ex.: `/direcao/estrategia`)
- Limpar campo `vendas_catalogo_id` e leituras `vendas_catalogo(...)` em:
  - `src/hooks/useProdutosVenda.ts` (select e fallback de unidade)
  - `src/hooks/useProdutosVendidosMes.ts` (passar a usar `custos_itens_id`)
  - `src/hooks/useVendas.ts`, `src/hooks/usePedidosAprovacaoDiretor.ts`
  - `src/types/produto.ts`
  - `src/pages/VendaNova.tsx`, `src/pages/vendas/MinhasVendasEditar.tsx`
  - `src/components/vendas/ProdutoVendaForm.tsx`, `src/components/vendas/LucroItemModal.tsx`
  - `src/components/orcamentos/NovoOrcamentoForm.tsx`
  - `src/components/pedidos/VendaPendenteDetalhesSheet.tsx`
  - `src/pages/direcao/aprovacoes/AprovacoesPedidos.tsx`
  - `src/pages/administrativo/FaturamentoVendaMinimalista.tsx` (bloco "lucroProdutoMap" via `vendas_catalogo` — já há fallback via `custos_itens`, basta remover o ramo legado)

Critério: nenhum `vendas_catalogo` deve restar em `src/` ao final.

## 2. Banco — migration única

```sql
ALTER TABLE public.produtos_vendas DROP COLUMN IF EXISTS vendas_catalogo_id;
DROP TABLE IF EXISTS public.vendas_catalogo_categorias_ordem;
DROP TABLE IF EXISTS public.vendas_catalogo CASCADE;
```

`CASCADE` cobre views/policies remanescentes. Como você confirmou que os relatórios já leem corretamente de `custos_itens`, está seguro.

## 3. Verificação pós-mudança

- `rg "vendas_catalogo" src/` deve retornar vazio (exceto `types.ts`, que é regenerado).
- Abrir manualmente: nova venda, edição de venda antiga, faturamento de venda antiga, aprovação do diretor, orçamento — todos os itens devem exibir nome/custo via `custos_itens`.

## Fora de escopo

- Remoção da memória `mem://features/sales/catalogo-management-v4-sanitized` (atualizo o índice depois).
- Qualquer ajuste em `custos_itens` em si.
