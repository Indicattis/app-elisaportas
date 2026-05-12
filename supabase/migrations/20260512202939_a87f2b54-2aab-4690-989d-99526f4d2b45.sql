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