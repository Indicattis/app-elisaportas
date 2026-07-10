## Problema

Na lista de `/vendas/visitas-tecnicas`, tanto `created_by` (criador) quanto `concluido_por` (na tabela `visitas_tecnicas_conclusoes`) são gravados com o **auth user id** (`auth.uid()`), mas o `respMap` da tela é indexado por `admin_users.id` — que é um UUID diferente do `user_id`.

Consulta de amostra confirma:
- `concluido_por = e529664c-…` corresponde a `admin_users.user_id`, não `admin_users.id` (Magno Andrigo).
- Nenhum registro de `concluido_por` bate com `admin_users.id`.

Efeito visual: o lookup falha e o código cai no fallback `criadorNome = respNome` (nome do responsável). Como o responsável é normalmente quem também concluiu, foto e nome parecem "iguais por coincidência" — na verdade estão exibindo o responsável nos dois lugares, não o criador nem o concluinte reais.

## Correção

Em `src/pages/vendas/VisitasTecnicasCalendario.tsx`:

1. Ampliar o fetch de responsáveis (linha ~577) para trazer também `user_id`:
   ```
   .from('admin_users').select('id, user_id, nome, foto_perfil_url')
   ```
2. No `respMap` (linha ~287), indexar cada colaborador **por `id` e por `user_id`** apontando para o mesmo objeto `{ nome, foto }`. Assim `respMap.get(responsavel_id)` continua funcionando e `respMap.get(created_by)` / `respMap.get(concluido_por)` (que são auth uids) passam a resolver corretamente.
3. Ajustar tipo local dos responsáveis (onde `responsaveis` é tipado) para incluir `user_id?: string | null`.
4. Nenhuma mudança em banco, em `mapVisitasComConclusao`, nem no dialog de conclusão — a gravação em `concluido_por = auth.uid()` está correta.

## Validação

- Rodar `bun run build`.
- Conferir na tela `/vendas/visitas-tecnicas` (filtro Concluídas) que a foto/nome do criador correspondem a quem realmente criou, e o chip verde "Concluído por" mostra o nome do usuário que concluiu — mesmo quando diferente do responsável.
