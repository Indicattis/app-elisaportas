## Problema

Em `/direcao/vendas/regras-vendas`, o usuário consegue acessar a página, mas não consegue salvar as senhas.

## Causa raiz

A permissão da rota e a permissão do banco estão desalinhadas:

- O usuário logado (`joao.staehler@gmail.com`) tem acesso à rota `direcao_regras_vendas` via `has_route_access(...)`.
- Porém as políticas da tabela `configuracoes_vendas` só permitem alterar para `admin`, `administrador`, `diretor`, `ceo` ou `bypass_permissions`.
- Como o usuário é `gerente_marketing`, a página abre, mas o banco bloqueia a gravação.

## Plano de correção

### 1. Ajustar RLS de `configuracoes_vendas`

Criar uma migration para atualizar as políticas da tabela e permitir leitura/edição/criação quando o usuário estiver ativo e atender a pelo menos uma condição:

- Tem acesso à rota `direcao_regras_vendas` via `public.has_route_access(auth.uid(), 'direcao_regras_vendas')`;
- Ou tem role de liderança (`administrador`, `admin`, `diretor`, `ceo`);
- Ou possui `bypass_permissions = true`.

### 2. Manter segurança

A tabela continuará protegida por autenticação e RLS. A liberação será baseada na permissão granular já existente para a rota, não em acesso público.

### 3. Sem alteração de frontend

O hook `useConfiguracoesVendas` e a página já enviam o update corretamente. O bloqueio está no banco.

## Validação

Depois da migration aprovada/aplicada:

- Entrar com o mesmo usuário que acessa `/direcao/vendas/regras-vendas`.
- Alterar a senha do responsável ou master.
- Clicar em `Salvar Alterações`.
- Confirmar toast de sucesso e persistência no banco.