# Gerenciar Categorias (criar/excluir/renomear/ordenar)

## Mudanças

### Botão
- Renomear "Ordenar categorias" → "Gerenciar categorias" em `EstrategiaItens.tsx` (label + título do diálogo).

### Modal "Gerenciar categorias"
Manter as funções atuais (renomear, mover para cima/baixo) e adicionar:

**Criar categoria:**
- Campo de input + botão "Adicionar" no topo do diálogo.
- Valida nome não vazio e não duplicado.
- Persiste em `custos_itens_categorias_ordem` (upsert com `ordem = max+1`). A categoria aparece como vazia (sem itens) até receber itens via "Mover de categoria" ou edição.

**Excluir categoria:**
- Botão de lixeira em cada linha de `CategoriaOrdemRow`.
- **Bloqueio**: se a categoria tiver itens em `custos_itens`, exibe toast de erro pedindo para mover/excluir os itens antes. A categoria "Sem categoria" não pode ser excluída.
- Se vazia, confirma e remove de `custos_itens_categorias_ordem`, remove do `ordemDraft` local.

### Hook `useCustosItens.ts`
Adicionar duas mutations em `useCustosItensCategoriasOrdem` (ou hook separado):
- `criarCategoria(nome)` → insert em `custos_itens_categorias_ordem` com `ordem` = próxima posição.
- `excluirCategoria(nome)` → verifica `count` em `custos_itens` onde `categoria = nome`; se > 0 lança erro; senão delete em `custos_itens_categorias_ordem`.

## Arquivos
- `src/hooks/useCustosItens.ts`
- `src/pages/direcao/estrategia/EstrategiaItens.tsx`