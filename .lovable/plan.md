## Causa

`PosVendasPedidos` filtra `arquivado=false` na query principal (`pedidos_producao`). Quando a pesquisa é enviada, `PesquisaSatisfacaoForm` **arquiva o pedido** (`arquivado=true`). Como a query descarta arquivados, o pedido some das duas abas — inclusive de "Respondidos".

## Correção

### `src/pages/pos-vendas/PosVendasPedidos.tsx`
1. **Remover** o filtro `.eq('arquivado', false)` da query `pos-vendas-pedidos` para trazer também os arquivados que estão em `etapa_atual='pos_vendas'`.
2. Ajustar a filtragem client-side em `listaFiltrada`:
   - `pendentes` → `!p.arquivado && !respondeu` (mantém pendentes visíveis apenas para não-arquivados).
   - `respondidos` → `respondeu` (independente de arquivado).
   - `todos` → tudo (inclui arquivados respondidos).
3. `pendentesCount` passa a considerar `!p.arquivado && !respondidosSet.has(p.id)` (evita contagem inflada por arquivados sem pesquisa).
4. Incluir `arquivado` no `select` da query.

Isso preserva o comportamento atual (pedido some da lista de pendentes ao arquivar) e volta a mostrar os respondidos na aba correspondente.

## Fora de escopo

- Não altera o fluxo de submissão da pesquisa nem a decisão de arquivar.
- Não mexe em RLS.
