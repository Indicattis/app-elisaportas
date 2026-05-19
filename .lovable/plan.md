# Remoção do organograma não funciona

## Causa raiz

Em `/direcao/gestao-colaboradores`, ao clicar em "Remover do organograma" o código faz:

```ts
supabase.from('admin_users').update({ visivel_organograma: false }).eq('id', userToDeactivate.id)
```

A policy de UPDATE em `admin_users` (`Admins update all, users update own (no role escalation)`) só permite que:
- um `administrador` (via `is_admin()`) atualize qualquer linha, ou
- o próprio usuário atualize a própria linha.

Diretores/gerentes podem **ler** todos os colaboradores (via `can_view_all_admin_users()`), mas **não podem atualizar a linha de outro colaborador**. O update então retorna 0 linhas afetadas, **sem erro**, e o front exibe o toast de sucesso e ainda cria a vaga (a tabela `vagas` tem RLS mais permissiva). Resultado: vaga criada, colaborador continua visível no organograma.

## Correção

Criar uma RPC `SECURITY DEFINER` que execute as duas operações de forma atômica e autorizada, e usá-la no front em vez do par update+createVaga.

### 1. Migração SQL

Criar `public.remover_colaborador_organograma(p_admin_user_id uuid, p_justificativa text default null)`:

- `SECURITY DEFINER`, `SET search_path = public`.
- Valida que o caller é `is_admin()` **ou** `can_view_all_admin_users()`. Caso contrário, `RAISE EXCEPTION 'Sem permissão...'`.
- Lê `role` e `nome` da linha alvo em `admin_users` (erro se não existir).
- `UPDATE admin_users SET visivel_organograma = false WHERE id = p_admin_user_id`.
- `INSERT INTO vagas (cargo, justificativa, created_by, status) VALUES (role_alvo, coalesce(p_justificativa, 'Vaga aberta pela remoção de '||nome_alvo||' do organograma'), auth.uid(), 'em_analise')`.
- Retorna o `id` da vaga criada.
- `GRANT EXECUTE ... TO authenticated`.

### 2. Front-end — `src/pages/direcao/GestaoColaboradoresDirecao.tsx`

No `onClick` do `AlertDialogAction` "Remover" (linhas ~864–890):

- Substituir o `supabase.from('admin_users').update(...)` + `createVaga(...)` por uma única chamada `supabase.rpc('remover_colaborador_organograma', { p_admin_user_id: userToDeactivate.id })`.
- Se `error`, mostrar `toast.error(error.message)` e **não** mostrar sucesso.
- Em sucesso, invalidar as queries `['all-users']`, `['all-users-including-hidden']` e `['vagas']`.

Nenhuma outra mudança de UI é necessária — o card desaparece automaticamente porque `useAllUsers` filtra por `visivel_organograma = true`.

## Fora de escopo

- Não alterar a policy de UPDATE genérica de `admin_users` (evita ampliar superfície de escalonamento de privilégios).
- Não mexer no fluxo de "Preencher vaga" / `SelecionarUsuarioVagaDialog`, que já funciona (admin atualiza role+visivel_organograma quando preenche).
