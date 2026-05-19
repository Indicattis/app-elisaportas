# Vagas "preenchidas" duplicam colaborador no organograma

## Causa raiz

Em `GestaoColaboradoresDirecao.tsx`, cada `RoleGroup` renderiza três coisas:

1. `group.users` — colaboradores com aquela `role` em `admin_users` (já é a fonte de verdade do organograma).
2. `group.openVagasList` — vagas com status `aberta`/`em_analise` (cards tracejados amarelos).
3. `group.filledVagasList` — vagas com status `preenchida` (cards tracejados verdes).

O bloco (3) é redundante: assim que uma vaga é preenchida, o colaborador já aparece no grupo (1). Mantê-lo gera:

- "Vagas preenchidas" duplicadas que sobrevivem para sempre na tela.
- Aparição de pessoas erradas: o filtro atual (`!userIds.has(v.preenchida_por)`) só esconde a vaga se o `preenchida_por` ainda for um usuário **com aquele mesmo cargo**. Se o colaborador trocou de função depois (ex.: vaga PCP marcada como preenchida por alguém que hoje é `perfilador`), o card continua sob "PCP" mostrando o rosto errado.
- No caso atual de PCP no setor Administrativo: existem 2 registros `vagas.status='preenchida'` legados apontando para `f9de0071…` (Guiherme, hoje `perfilador`) + 1 vaga `em_analise` recém-criada → a UI mostra 1 aberta + 2 "preenchidas" pelo mesmo colaborador.

## Correção (somente front-end)

Arquivo único: `src/pages/direcao/GestaoColaboradoresDirecao.tsx`.

1. **Remover a renderização de `filledVagasList`** dentro de `SortableRoleGroup` (o bloco `group.filledVagasList.map(...)` em ~linha 311–340) — vagas preenchidas não devem aparecer como cards no organograma; o colaborador já está listado em `group.users`.
2. **Remover `filledVagasList` da interface `RoleGroup` e da prop**, e parar de calcular `filledVagasForRole` / passá-lo para o grupo (linhas ~429, 445).
3. Manter inalterado:
   - `group.users` (fonte do organograma).
   - `group.openVagasList` (vagas em aberto continuam visíveis e clicáveis para preencher).
   - O contador `users.length / total` continua usando apenas `openVagas` + usuários reais.

Nenhuma mudança em hooks (`useVagas`, `useAllUsers`), em RLS ou em outras telas. As vagas `preenchida` permanecem no banco para histórico/relatórios — só deixam de poluir o organograma.

## Fora de escopo

- Não vou apagar/limpar as vagas `preenchida` legadas no banco (ficam como histórico).
- Não vou mexer no fluxo de marcar vaga como `preenchida` (continua acontecendo via `SelecionarUsuarioVagaDialog`/`PreencherVagaDialog`).
- Não vou alterar a tela de "Vagas/Recrutamento" (se existir) que possa querer mostrar histórico de vagas preenchidas.
