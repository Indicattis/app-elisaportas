## Diagnóstico

O modal `AutorizacaoDescontoModal` consulta diretamente `admin_users` para exibir o nome do Diretor/Gerente autorizador:

```ts
supabase.from('admin_users')
  .select('user_id, nome, role, ativo')
  .eq('user_id', autorizadorUserId)
  .maybeSingle();
```

As policies de SELECT em `admin_users` só liberam a leitura para:
- o próprio usuário (`user_id = auth.uid()`),
- admins (`is_admin()`),
- lideranças (`can_view_all_admin_users()`),
- quem tem acesso às rotas `admin_financeiro` / `administrativo_hub`,
- atendentes ativos (registros públicos com `role = 'atendente'`).

Você é admin, então enxerga a linha do Diretor e o modal funciona. A maioria dos vendedores/atendentes **não** enxerga o registro do Diretor/Gerente — o retorno é `null`, e o modal mostra "Nenhum Diretor configurado em Regras de Vendas". As senhas e IDs no banco estão corretos (`configuracoes_vendas` preenchida).

## Correção

1. Nova RPC `public.get_autorizador_vendas(p_tipo text)` — `SECURITY DEFINER`, `STABLE`, `SET search_path = public`:
   - `p_tipo IN ('responsavel','master')`
   - Retorna `user_id`, `nome`, `role`, `ativo` do usuário referenciado em `configuracoes_vendas.responsavel_senha_responsavel_id` (para `responsavel`) ou `responsavel_senha_master_id` (para `master`), fazendo JOIN interno com `admin_users`.
   - Guarda `auth.uid() IS NOT NULL` no início e retorna vazio caso contrário.
   - `GRANT EXECUTE ... TO authenticated`.

2. `src/components/vendas/AutorizacaoDescontoModal.tsx`:
   - Substituir o `useQuery` que lê `admin_users` diretamente por uma chamada `supabase.rpc('get_autorizador_vendas', { p_tipo: tipoAutorizacao === 'master' ? 'master' : 'responsavel' })`.
   - Manter o mesmo shape (`user_id`, `nome`, `role`, `ativo`) para não mexer no restante do componente.
   - `enabled` continua condicionado a modal aberto.

## Fora do escopo

- Não altero as policies de `admin_users` (evita ampliar exposição de dados sensíveis do quadro administrativo).
- Não mudo a RPC `verificar_senha_vendas` nem o fluxo de auditoria.
