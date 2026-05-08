## Objetivo

Tornar a nova rota `fabrica_produtos` gerenciável em `/admin/permissions`.

## Causa

O `UserRouteAccessManager` lista as rotas da tabela `app_routes` (Supabase). Hoje as rotas filhas de `fabrica_hub` incluem `fabrica_ordens_pedidos` e `fabrica_cronograma_producao`, mas `fabrica_produtos` ainda não existe lá.

## Mudança

Criar uma migration que insere a rota `fabrica_produtos` na tabela `app_routes`:

- key: `fabrica_produtos`
- label: `Configurar Itens`
- parent_key: `fabrica_hub`
- interface: `padrao`
- sort_order: `26` (logo após `fabrica_cronograma_producao`)
- description: `Configuração dos itens da fábrica`

Usar `INSERT ... ON CONFLICT (key) DO UPDATE` para ser idempotente.

Após a migration, a rota aparecerá automaticamente em `/admin/permissions` agrupada sob "Fábrica", podendo ser liberada por usuário.
