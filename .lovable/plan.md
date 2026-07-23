## Causa raiz

Em `src/hooks/useDashboardData.ts` (`useAutorizadosPorAtendente`), a query faz:

```ts
supabase.from('autorizados').select('vendedor_id, admin_users!inner(nome)')
```

A tabela `autorizados` tem **três** foreign keys para `admin_users` (`created_by`, `vendedor_id`, `vendedor_responsavel_id`). Sem hint explícito, o PostgREST não sabe qual relação usar — o embed resolve de forma ambígua (na prática, pela primeira FK, `created_by`, que na maior parte dos registros é nula), então `admin_users!inner` filtra fora quase todo autorizado e o `reduce` devolve um mapa vazio. Resultado: cada linha do ranking mostra `0 autorizados`.

Confirmado no banco: as 41 linhas ativas de `autorizados` têm `vendedor_id` preenchido e resolvem corretamente para nomes (William 11, Daiane 10, Magno 10, Suelen 5, Vitoria 4, Victor 1), que batem com os nomes retornados pelo ranking (`admin_users.nome`).

## Correção

Editar `src/hooks/useDashboardData.ts`, hook `useAutorizadosPorAtendente`:

- Trocar o embed para usar a FK explícita:
  ```ts
  .select('vendedor_id, admin_users!autorizados_vendedor_id_fkey(nome)')
  ```
- Manter o `.eq('ativo', true)` e o agrupamento por `admin_users.nome`.

Nenhuma outra mudança necessária — as chaves do mapa continuam batendo com `vendedor.nome` do slide 2.

## Verificação

Após o build, abrir `/paineis/tv-dashboard`, ir ao slide 2 e confirmar que a pill "N autorizados" mostra o número certo para cada vendedor (William 11, Daiane 10, Magno 10, Suelen 5, Vitoria 4).
