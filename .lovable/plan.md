## Problema
PATCH em `despesas_padrao` falha com 400 ao trocar o setor para "Afastados" porque o enum `setor_type` do Postgres não contém o valor `'afastados'`.

## Mudanças

1. **Migração SQL** — `ALTER TYPE public.setor_type ADD VALUE IF NOT EXISTS 'afastados';`

2. **`src/hooks/useAuth.tsx`** — Incluir `'afastados'` na união de tipos de `AdminUser.setor`.

3. **`src/pages/Users.tsx`** — Incluir `'afastados'` na união de tipos de `setor` no `AdminUser`.

Nenhuma alteração de UI/lógica é necessária — o botão "Afastados" já existe e envia o valor correto; apenas o enum do banco precisa aceitá-lo.