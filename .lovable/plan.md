## Causa

A tabela `despesas_padrao` tem um CHECK constraint em `tipo` que aceita apenas `'folha'`, `'fixa'` e `'variavel'`. Ao salvar uma despesa de imposto padrão (`tipo='imposto'`), o Postgres rejeita com 400:

> new row for relation "despesas_padrao" violates check constraint "despesas_padrao_tipo_check"

## Correção

Migration para recriar o constraint incluindo `'imposto'`:

```sql
ALTER TABLE public.despesas_padrao DROP CONSTRAINT despesas_padrao_tipo_check;
ALTER TABLE public.despesas_padrao ADD CONSTRAINT despesas_padrao_tipo_check
  CHECK (tipo = ANY (ARRAY['folha','fixa','variavel','imposto']));
```

Sem alterações de código frontend — o formulário já envia `tipo: 'imposto'` corretamente.
