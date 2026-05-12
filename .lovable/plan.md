## Problema

Na rota `/direcao/vendas/regras-vendas`, ao tentar salvar senhas ou limites, nada acontece (ou aparece erro de "Configurações não encontradas" / "Sem permissão").

## Causa raiz

As políticas de RLS da tabela `configuracoes_vendas` no banco estão restritas demais:

- **SELECT**: usa `is_admin()`, que só retorna `true` para `role = 'administrador'`. Usuários com role `ceo` ou `diretor` não conseguem nem ler o registro (vira `null`), o que já bloqueia o update no hook `useConfiguracoesVendas` (`if (!configuracoes?.id) throw "Configurações não encontradas"`).
- **UPDATE / INSERT**: só permitem `role IN ('admin','administrador','diretor')`. O usuário logado é `ceo`, então mesmo que conseguisse ler, o update retornaria 0 linhas e cairia no erro "Você não tem permissão...".

A página é "Direção", então `ceo` (e diretor) precisam acessar.

## Plano de correção

### 1. Migration SQL — ajustar RLS de `configuracoes_vendas`

Substituir as três políticas existentes por novas que incluam os papéis de liderança (`administrador`, `admin`, `diretor`, `ceo`) e `bypass_permissions = true`:

- **SELECT**: permitir leitura para usuários ativos com role em `('administrador','admin','diretor','ceo')` ou `bypass_permissions`.
- **UPDATE**: mesma checagem em `USING` e `WITH CHECK`.
- **INSERT**: mesma checagem em `WITH CHECK`.

Manter `TO authenticated` explicitamente.

### 2. Sem alterações de frontend

O hook `useConfiguracoesVendas` já trata o retorno corretamente — basta as policies passarem a permitir leitura/escrita para o CEO.

## Detalhes técnicos

Arquivos:
- Nova migration em `supabase/migrations/` ajustando políticas de `public.configuracoes_vendas`.

Validação após aplicar:
- Logar como `metall.ltda@gmail.com` (role `ceo`) e confirmar que `Salvar Alterações` (senhas) e `Salvar Limites` retornam sucesso.
