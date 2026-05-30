## Objetivo

Excluir todos os 472 registros da tabela `public.gastos`.

## Execução

Rodar uma migration única:

```sql
DELETE FROM public.gastos;
```

Sem alterações de schema, código ou UI.

## Observações

- Ação irreversível, confirmada pelo usuário.
- Tabelas relacionadas (`tipos_custos`, `colaboradores`, etc.) não são afetadas.
