## Problema

Em `/fabrica/montagem-pedidos/:id`, no seletor "Responsável pelas medidas" das Observações da visita técnica, apenas 3 usuários internos aparecem (além de todos os autorizados).

## Causa

A página faz `supabase.from('admin_users').select('id, nome').eq('ativo', true)`, mas a RLS de `admin_users` para SELECT é:

- `Users see own admin row, admins see all`: `user_id = auth.uid() OR is_admin()`
- `Public can view attendants`: `ativo = true AND role = 'atendente'`

Resultado para um usuário da fábrica (não admin): vê apenas a própria linha + os atendentes (~3 usuários). Autorizados aparecem todos porque vêm de outra tabela com RLS aberta.

## Solução

Expor uma lista mínima (`id`, `nome`) de todos os colaboradores internos ativos via função `SECURITY DEFINER`, sem afrouxar a RLS de `admin_users` (que contém PII como email/CPF/salário).

### 1. Migration — função RPC

Criar `public.get_responsaveis_internos()`:

```sql
CREATE OR REPLACE FUNCTION public.get_responsaveis_internos()
RETURNS TABLE (id uuid, nome text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, nome
  FROM public.admin_users
  WHERE ativo = true
    AND tipo_usuario IN ('colaborador', 'metamorfo', 'atendente')
  ORDER BY nome;
$$;

GRANT EXECUTE ON FUNCTION public.get_responsaveis_internos() TO authenticated;
```

Retorna apenas `id` e `nome` — nada sensível.

### 2. Frontend — `src/pages/administrativo/PedidoViewMinimalista.tsx`

Trocar a query atual:

```ts
const { data: usuarios = [] } = useQuery({
  queryKey: ['responsaveis-internos'],
  queryFn: async () => {
    const { data, error } = await supabase.rpc('get_responsaveis_internos');
    if (error) throw error;
    return data ?? [];
  },
});
```

Resto da página (props passadas para `ObservacoesPortaForm`, lookup `usuarios.find(...)` na linha 442 etc.) permanece igual — mesma forma `{id, nome}`.

## Fora de escopo

- Não altera RLS de `admin_users`.
- Não altera `ObservacoesPortaForm` nem a lista de autorizados.
- Não muda outros lugares que usam `admin_users` (que podem ter o mesmo problema, mas o pedido foi específico desta tela).