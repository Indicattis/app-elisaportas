## Problema

O hook `useRequisicoesCompra` faz um embed PostgREST:

```
admin_users!requisicoes_compra_solicitante_id_fkey(nome)
```

Mas a FK `requisicoes_compra_solicitante_id_fkey` aponta para `auth.users(id)`, não para `admin_users`. Por isso o PostgREST devolve 400.

## Correção

Em `src/hooks/useRequisicoesCompra.ts`:

1. Remover o embed `admin_users!...` da query principal de `requisicoes_compra`.
2. Após buscar as requisições, coletar os `solicitante_id` distintos e fazer uma busca paralela em `admin_users` por `user_id IN (...)` selecionando `user_id, nome`.
3. Mapear `solicitante_nome` no resultado final usando esse dicionário (mantendo o restante intacto: fornecedor, itens, etc.).

Sem alterações de schema/RLS — só ajuste no hook de leitura.
