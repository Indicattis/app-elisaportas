# Reforçar a exclusão de representantes

## O que descobri auditando o fluxo

1. **A edge function `delete-user` não sabe de qual aba veio a exclusão.**
   O frontend (`AdminUsersMinimalista.handleDeleteUser`) envia apenas `user_id`.
   Dentro da função, ela consulta `admin_users` e `representantes` pelo `user_id` e, se achar nas duas, **prefere `admin_users`** (`if (targetAdminUser) { delete admin_users ... }`). Foi exatamente assim que o Marcionir, listado na aba "Representantes", acabou tendo o cadastro de **colaborador** arquivado.

2. **Erro 23502 (NOT NULL) não é tratado como motivo para arquivar.**
   O log mais recente mostra:
   ```
   code: 23502 — null value in column "atendente_id" of relation "vendas" violates not-null constraint
   ```
   O código só ramifica para arquivar quando o erro é `23503` (FK). Com `23502`, a função retorna 500 e o cadastro fica num estado inconsistente.

3. **Mesmo após a remoção do trigger automático, ainda existem usuários com linhas em ambas as tabelas** (cadastros antigos). Então o risco continua até a função saber explicitamente qual perfil apagar.

## Plano de correção (somente backend + 1 linha no frontend)

### 1. `supabase/functions/delete-user/index.ts`
- Aceitar um novo campo opcional no body: `source: 'admin_users' | 'representantes'`.
- Quando `source` vier preenchido, **operar exclusivamente na tabela indicada** (lookup, delete e archive). Ignorar a outra tabela completamente, mesmo que tenha linha com o mesmo `user_id`.
- Quando `source` não vier (compatibilidade), manter o comportamento atual (admin_users primeiro), mas se a outra tabela também tiver linha, registrar log de aviso.
- Tratar `23502` (NOT NULL) igual a `23503` (FK): arquivar em vez de retornar erro 500. Isso cobre o caso de `vendas.atendente_id NOT NULL` apontando para um colaborador com vendas.
- No ramo "arquivar representante", **não** mexer em `admin_users` desse mesmo user_id.

### 2. `src/pages/admin/AdminUsersMinimalista.tsx`
- Em `handleDeleteUser`, enviar `source: user.tipo_usuario === 'representante' ? 'representantes' : 'admin_users'` no body da chamada `supabase.functions.invoke('delete-user', ...)`.

### 3. `src/pages/admin/AdminUserEdit.tsx`
- A mesma página de edição (que agora também tem botão de excluir, se aplicável) deve enviar `source: source === 'representantes' ? 'representantes' : 'admin_users'` ao chamar delete-user. Verificarei e ajustarei se houver chamada lá.

## Verificação após implementar
- Testar exclusão de um representante de teste e conferir nos logs que: (a) a função filtra por `representantes`; (b) não toca em `admin_users` do mesmo user_id; (c) se houver FK/NOT NULL, arquiva em `representantes`.
- Testar exclusão de um colaborador comum (sem vínculos) e confirmar deleção real.
- Testar exclusão de um colaborador com vendas vinculadas e confirmar que o resultado agora é "arquivado" em vez de erro 500.

Nenhuma alteração de UI/visual.
