## Objetivo
Permitir definir/editar a porcentagem de comissão (`comissao_pct`) de cada representante diretamente em `/direcao/vendas/parceiros` (aba Representantes).

## Alteração

### `src/pages/direcao/ParceirosDirecao.tsx` → `RepresentantesList`
- Substituir o trecho que só exibe `Comissão: X%` por um controle inline editável:
  - Botão pequeno "Comissão: X%" (placeholder "Definir comissão" quando `null`) que abre um popover.
  - Popover com input numérico (step 0.1, min 0, max 100, sufixo `%`) + botão "Salvar".
- Mutation `updateComissaoMutation` chamando `supabase.from('representantes').update({ comissao_pct: valor }).eq('id', id)`.
- Toast de sucesso/erro e `invalidateQueries(['parceiros-representantes'])`.
- Manter estilo glassmorphism (bg-white/5, border-white/10, blue/white).

Sem mudanças de schema — coluna `comissao_pct` já existe em `representantes`.
