# Investigação: por que o usuário aparece como "representante"

## O que está acontecendo

O usuário `b26c65ad-006f-4f25-9d8a-02162d87d33a` (Marcionir da Silva Escobar) **realmente foi criado como colaborador**, mas existe um trigger no banco que insere TODOS os novos usuários do auth também na tabela `representantes` — o que duplica o cadastro.

### Evidências encontradas

1. Existe uma linha em `admin_users` para esse mesmo `user_id` (78b68a87-…) com nome **"Marcionir da SIlva Escobar (Arquivado)"** e email `deleted+...@archived.local`. Ou seja, ele foi criado como colaborador em `admin_users`, e depois arquivado pelo fluxo de exclusão (porque tinha histórico vinculado).
2. Existe também uma linha em `representantes` com o mesmo `user_id`, criada **no exato mesmo timestamp** (`2026-03-09 13:15:17`) — o que indica criação automática, não manual.
3. Existe um trigger ativo:

```
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION handle_new_representante();
```

A função `handle_new_representante()` insere incondicionalmente em `public.representantes` toda vez que QUALQUER usuário é criado no `auth.users`, independente de ele ser colaborador, admin, diretor, etc.

4. A edge function `create-user` (usada para cadastrar colaborador) chama `supabase.auth.admin.createUser(...)` — o que dispara esse trigger e gera o registro indevido em `representantes`.

### Resultado prático

- Marcionir foi criado como colaborador → entrou em `admin_users` (corretamente) **e** em `representantes` (indevidamente, pelo trigger).
- A exclusão arquivou o registro em `admin_users` (não removeu, por causa de FKs), mas a linha em `representantes` continuou ativa.
- A página `/admin/users` separa usuários por tabela: a aba "Representantes" lê de `representantes`, então ele aparece lá.

## Plano de correção

### 1. Remover o trigger automático
Dropar o trigger `on_auth_user_created` em `auth.users` e a função `handle_new_representante()`. A criação de representantes deve ser **explícita** (via formulário/edge function que insere em `representantes` quando o admin escolhe `tipo = representante`), nunca implícita a partir de qualquer criação no auth.

### 2. Limpar o registro órfão do Marcionir
Excluir a linha de `representantes` com `id = b26c65ad-006f-4f25-9d8a-02162d87d33a` (ele nunca deveria ter existido lá; o cadastro real está arquivado em `admin_users`).

### 3. Verificação
Após a migração, confirmar que:
- novos colaboradores criados pelo fluxo padrão não geram registro em `representantes`;
- a aba "Representantes" em `/admin/users` só lista quem foi cadastrado intencionalmente como representante.

### Detalhes técnicos (SQL da migração)

```sql
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_representante();

DELETE FROM public.representantes
WHERE id = 'b26c65ad-006f-4f25-9d8a-02162d87d33a';
```

Nenhuma alteração de UI é necessária — o bug é 100% backend/banco.
