## Objetivo

Em `/direcao/aprovacoes/representantes`, mostrar apenas representantes pendentes de aprovação (inativos e ainda não reprovados), permitindo ao diretor **Aprovar** (ativa o representante) ou **Reprovar** (mantém inativo e remove da tela permanentemente).

## Mudanças

### 1. Banco — nova coluna `representantes.reprovado`
- Adicionar `reprovado BOOLEAN NOT NULL DEFAULT false` em `public.representantes`.
- Semântica: quando `reprovado = true`, o representante não aparece mais na tela de aprovações (mas continua inativo no banco, preservando histórico).

### 2. Página `AprovacoesRepresentantes.tsx`
- **Query**: buscar apenas `ativo = false AND reprovado = false`, ordenado por `created_at DESC`.
- **UI**: remover o filtro `todos/ativos/inativos` e o `Switch` de ativar/desativar. Em cada card, substituir por dois botões:
  - **Aprovar** (verde) → `UPDATE representantes SET ativo = true WHERE id = ?`
  - **Reprovar** (vermelho) → `UPDATE representantes SET reprovado = true WHERE id = ?` (com `AlertDialog` de confirmação, pois é ação definitiva nessa tela)
- Após qualquer ação, invalidar `representantes-list` e `aprovacoes-representantes-count` — o card desaparece da lista.
- Manter cabeçalho, busca por nome/email/telefone, estilo glassmorphism e contador.
- Estado vazio: "Nenhum representante pendente de aprovação."

### Fora do escopo
- Nenhuma mudança em outras telas que listam representantes (continuam funcionando normalmente, ignorando `reprovado` salvo se desejado depois).
- Sem alteração em RLS.