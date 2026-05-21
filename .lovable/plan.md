## Objetivo

Em `/direcao/estrategia/itens`, exibir e editar dados de uma nova tabela `custos_itens` (independente de `estoque`), mantendo o mesmo visual da página atual mas restrito aos campos visíveis: descrição, categoria, subcategoria, unidade, custo unitário, preço de venda e % markup (calculado).

## 1. Banco de dados

Criar tabela `public.custos_itens`:

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | default `gen_random_uuid()` |
| `descricao` | text not null | |
| `categoria` | text | reutiliza as mesmas categorias livres já usadas no app |
| `subcategoria` | text | |
| `unidade` | text | ex: "Un", "M", "Kg", "L" |
| `custo_unitario` | numeric(14,4) default 0 | |
| `preco_venda` | numeric(14,4) default 0 | |
| `ordem` | integer default 0 | usado para drag & drop |
| `created_at` / `updated_at` | timestamptz default now() | trigger de update padrão |

RLS:
- Enable RLS.
- SELECT/INSERT/UPDATE/DELETE permitido para usuários autenticados (mesmo padrão das outras telas de estratégia). Ajustar depois se quiser restringir só a admins.

Trigger:
- `update_updated_at_column` no UPDATE.

Seed inicial (cópia única):
- `INSERT INTO custos_itens (descricao, categoria, subcategoria, unidade, custo_unitario, preco_venda) SELECT descricao, categoria, subcategoria, unidade, COALESCE(custo_unitario,0), COALESCE(preco_venda,0) FROM estoque;`
- Executado uma única vez na própria migration. Depois disso `custos_itens` é independente.

## 2. Frontend

Em vez de tentar parametrizar a tabela de origem dentro do `ProdutosFabrica` (que está fortemente acoplado a `estoque`, `pedido_linhas`, fornecedores, matérias‑primas, etc.), criar uma página dedicada e mais simples:

**Nova página**: `src/pages/direcao/estrategia/EstrategiaItens.tsx` (substitui o wrapper atual).

Layout idêntico ao usado por `ProdutosFabrica` quando renderizado em `/direcao/estrategia/itens`:
- `MinimalistLayout` com título "Itens", subtítulo "Catálogo de itens", breadcrumb Direção › Estratégia › Itens.
- Cards por categoria (`bg-white/5 backdrop-blur-xl border border-white/10`) com a mesma estética glassmorphism.
- Mesmo input de busca no topo (`!h-[50px] w-[150px]`).
- Mesmas colunas EditableCell:
  1. Descrição
  2. Categoria (select com categorias existentes em `custos_itens`)
  3. Subcategoria
  4. Unidade (select: Un / M / Kg / L / …)
  5. Custo unitário (R$)
  6. Preço de venda (R$)
  7. % Markup (calculado: `(preco_venda - custo_unitario) / custo_unitario * 100`, read‑only)
- Botão "Adicionar item" com modal simples (descrição, categoria, subcategoria, unidade, custo, preço).
- Drag & drop entre linhas para reordenar (campo `ordem`).
- Card de "Total geral" no rodapé (soma de custo unitário e preço de venda).

Hook novo: `src/hooks/useCustosItens.ts` com `useQuery(["custos_itens"])` e mutations de insert/update/delete, escrevendo direto em `custos_itens` via Supabase client.

Sem acoplamento com `pedido_linhas`, fornecedores, matérias‑primas, conferência de estoque, etc. — esses recursos não fazem sentido nesta página segundo a opção "só campos visíveis na tela".

## 3. Roteamento

Manter rota `/direcao/estrategia/itens` apontando para o novo `EstrategiaItens`. `ProdutosFabrica` continua intacto, usado normalmente em `/direcao/estoque/...`.

## Pontos a confirmar

- A coluna `% Markup` é só exibição calculada (não editável). Confirma?
- "Categoria" e "Subcategoria" como texto livre selecionável a partir dos valores já cadastrados em `custos_itens` (não compartilhado com a tabela `categorias` do estoque). Confirma?
