## Problema

Na lista de material, alguns grupos aparecem como UUIDs (ex: `3923529c-56df-...`) em vez do nome da categoria.

Causa: a coluna `estoque.categoria` armazena dois formatos misturados:
- UUIDs que referenciam `estoque_categorias.id` (ex: `3923529c-...` → "Acessório")
- Strings legadas com o próprio nome (ex: `"motor"`, `"geral"`)

O PDF apenas lê `estoque.categoria` cru, então UUIDs vazam para a tela.

## Correção

Editar `src/pages/direcao/GestaoFabricaDirecao.tsx` no `handleGerarListaCompras`:

1. Buscar uma vez `estoque_categorias` (`id`, `nome`).
2. Montar um `Map<id, nome>`.
3. Ao agregar materiais, resolver `categoria`:
   - Se o valor bate em algum `id` do map → usar `nome` correspondente.
   - Senão → usar a string como está (com primeira letra maiúscula para uniformizar nomes legados como "motor" → "Motor").
   - Vazio/null → "Sem categoria".

Sem mudanças de DB, sem alteração no `listaComprasPDF.ts`.
