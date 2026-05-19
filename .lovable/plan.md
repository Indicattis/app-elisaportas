# Preencher vaga com colaborador existente não atualiza `admin_users`

## Causa raiz

Mesma causa do bug anterior, em outro fluxo. Em `src/components/vagas/SelecionarUsuarioVagaDialog.tsx`, ao escolher um colaborador para preencher a vaga, o código faz:

```ts
supabase.from("admin_users")
  .update({ role: vagaCargo, visivel_organograma: true })
  .eq("id", user.id);
```

A policy de UPDATE de `admin_users` (`Admins update all, users update own (no role escalation)`) só permite admin (`is_admin()`) ou o próprio usuário atualizar a linha. Diretor/líder → 0 linhas atualizadas, **sem erro**. A vaga é marcada como `preenchida` (RLS de `vagas` permite), mas o `admin_users` do colaborador escolhido continua com a `role` antiga (no caso atual: Guilherme segue `perfilador`, sem aparecer em PCP).

Dados confirmam: 4 vagas PCP marcadas `preenchida` com `preenchida_por=Guilherme`, mas `admin_users` dele continua `role='perfilador'`. E o grupo PCP segue vazio porque o único PCP real (Henrique) está com `visivel_organograma=false`.

## Correção

Criar uma única RPC `SECURITY DEFINER` que faz as duas operações atomicamente, e usá-la no diálogo.

### 1. Migração SQL

Criar `public.preencher_vaga_com_usuario(p_vaga_id uuid, p_admin_user_id uuid)`:

- `SECURITY DEFINER`, `SET search_path = public`.
- Valida `is_admin() OR can_view_all_admin_users()`; senão `RAISE EXCEPTION`.
- Lê `cargo` da vaga (erro se não existir ou se já estiver `preenchida`/`fechada`).
- `UPDATE admin_users SET role = vaga.cargo, visivel_organograma = true WHERE id = p_admin_user_id`. Erro se 0 linhas.
- `UPDATE vagas SET status='preenchida', preenchida_por = p_admin_user_id, updated_at = now() WHERE id = p_vaga_id`.
- `GRANT EXECUTE ... TO authenticated`.

### 2. Front-end — `src/components/vagas/SelecionarUsuarioVagaDialog.tsx`

Em `handleSelect`:

- Substituir o `supabase.from("admin_users").update(...)` por `supabase.rpc('preencher_vaga_com_usuario', { p_vaga_id: vagaId, p_admin_user_id: user.id })`.
- Tornar `vagaId` obrigatório na prop interface (hoje é opcional; o caller `GestaoColaboradoresDirecao` já passa o `vaga.id` quando abre o diálogo via `onFillVaga`).
- Em sucesso, invalidar também `['vagas']` (além das queries de users já invalidadas), e remover/não chamar separadamente `updateVagaStatus` no caller (a RPC já fecha o ciclo). Verificar `GestaoColaboradoresDirecao` para garantir que não está chamando `updateVagaStatus` em paralelo após `onSelectExisting`.
- Se `vagaId` não estiver presente (cenário de "reanexar usuário sem vaga", se existir), manter o caminho atual como fallback apenas para `admins`; caso contrário, exigir vaga.

### 3. Limpeza pontual (opcional, **fora desta migração**)

As 4 vagas PCP `preenchida` órfãs apontando para Guilherme ficam como histórico. Não vamos apagar — quando o usuário marcar essas vagas como `fechada` pela UI, somem das contagens.

## Fora de escopo

- Não vou ampliar a policy de UPDATE de `admin_users` (mantém superfície mínima de escalonamento).
- Não vou alterar `PreencherVagaDialog` (cadastro de novo colaborador): ele já usa a edge function `create-user` com service role, então funciona.
- Não vou mexer em `useVagas.updateVagaStatus` (continua útil para cancelar/fechar vagas).
