## Objetivo

Tornar o layout dos blocos de despesas (Fixas, Variáveis, Impostos) em `/direcao/estrategia/despesas/configuracoes` mais enxuto, transformando cada categoria em uma linha colapsável que expande para mostrar seus tipos ao clicar.

## Mudanças

Arquivo único: `src/pages/direcao/estrategia/EstrategiaDespesasConfiguracoes.tsx`

### 1. Estado de expansão por categoria
- Adicionar `expandedCategorias: Set<string>` no `TiposCustoBlock` (chave = `categoria.id` ou `"__sem__"` para a pseudo-categoria "Sem categoria").
- Por padrão, todas colapsadas (mais slim). Persistir opcionalmente em `useState` apenas (sem localStorage).

### 2. Cabeçalho da categoria (linha slim, sempre visível)
Substituir o header atual por uma linha compacta com:
- Chevron (right/down) indicando estado
- Bolinha colorida da categoria
- Nome da categoria (clique = renomear inline, como hoje)
- Contador `(N)` de tipos
- Subtotal R$ à direita
- Ações à direita (drag handle, adicionar tipo nesta categoria, excluir categoria) — visíveis em hover para reduzir ruído visual

A linha inteira (área neutra) dispara o toggle expand/collapse. Clique nos controles internos (input de rename, botões, drag handle) faz `stopPropagation`.

### 3. Conteúdo expandido
- Lista de tipos da categoria + o form "Adicionar despesa" aparecem apenas quando `expanded === true`.
- Quando colapsada: nada além do header slim.

### 4. Densidade
- Reduzir padding vertical do header (`py-2` em vez de `py-3/4`).
- Manter o restante da UI (drag-and-drop de categorias, dialog de realocação ao excluir tipo, etc.) inalterado.

### 5. "Sem categoria"
- Mesmo tratamento: linha slim colapsável, sem drag handle nem botão de excluir categoria.

## Fora do escopo

- Nenhuma mudança em hooks, banco, ou lógica de negócio.
- Sem alteração nos blocos de Folha/Setores.
