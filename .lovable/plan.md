## Diagnóstico

A modal `SelecionarResponsavelEtapaModal` (usada em `/direcao/gestao-fabrica` ao atribuir responsável por etapa) faz:

```ts
supabase.from("admin_users").select(...).eq("ativo", true)
```

sem nenhum filtro por papel. O problema está nas **políticas RLS** da tabela `admin_users`:

- `Users see own admin row, admins see all` → exige `is_admin()`, que só retorna `true` para `role = 'administrador'`.
- `Public can view attendants` → libera apenas `role = 'atendente'` (vendedores).

Como o usuário logado em `/direcao` normalmente é `diretor` / `ceo` / `gerente_*` (não `administrador`), o RLS só devolve a própria linha + os atendentes — daí a sensação de que "só vendedores aparecem" no seletor.

## Plano

### 1. Migração SQL — liberar leitura para liderança

Criar função `SECURITY DEFINER` e nova policy de SELECT em `admin_users`:

```sql
create or replace function public.can_view_all_admin_users()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users
    where user_id = auth.uid()
      and ativo = true
      and role in (
        'administrador','ceo','diretor','pcp',
        'gerente_comercial','gerente_marketing',
        'gerente_instalacoes','analista_rh','analista_administrativo'
      )
  );
$$;

create policy "Leadership can view all admin_users"
on public.admin_users
for select
to authenticated
using (public.can_view_all_admin_users());
```

Resultado: qualquer usuário de liderança consegue ver todos os colaboradores ativos no seletor de responsável (e em qualquer outra tela que liste `admin_users`). RLS para inserir/editar/excluir continua restrito a `is_admin()`.

### 2. Código

Nenhuma mudança de código necessária — `SelecionarResponsavelEtapaModal.tsx` e `useEtapaResponsaveis.ts` já buscam todos os `admin_users` ativos; com a policy nova, o retorno passa a incluir todos os papéis.

### Notas

- A lista de `roles` da liderança foi escolhida com base nos papéis ativos hoje (`administrador`, `ceo`, `diretor`, `pcp`, `gerente_comercial`, `gerente_marketing`, `gerente_instalacoes`, `analista_rh`, `analista_administrativo`). Se quiser incluir/excluir algum, ajustamos antes de aplicar.
- A policy "Public can view attendants" continua existindo (não é removida), preservando o comportamento atual de telas públicas.
