## Objetivo
Adicionar em `/direcao/aprovacoes` um novo botão "Aprovações Representantes" que abre uma página listando todos os usuários do tipo `representante` em `admin_users`, com toggle para ativar/desativar (`ativo`).

## Mudanças

### 1. Hub `/direcao/aprovacoes`
Arquivo: `src/pages/direcao/aprovacoes/DirecaoAprovacoesHub.tsx`
- Adicionar item de menu "Aprovações Representantes" (ícone `UserCheck` da lucide) com path `/direcao/aprovacoes/representantes`, posicionado logo após "Aprovações Autorizados".
- Adicionar query `useQuery` que conta `admin_users` onde `tipo_usuario = 'representante'` AND `ativo = false` (pendentes), exibindo o badge no botão.

### 2. Nova página `AprovacoesRepresentantes`
Arquivo novo: `src/pages/direcao/aprovacoes/AprovacoesRepresentantes.tsx`
- Mesma estética glassmorphism dos outros hubs (bg-black, partículas, AnimatedBreadcrumb, botão voltar).
- Lista cards com: foto, nome, email, CPF, data de cadastro, status (Ativo/Inativo).
- Toggle/Switch para alternar `ativo` via `UPDATE admin_users SET ativo = !ativo WHERE id = ...` com invalidação de query.
- Filtros simples: busca por nome/email e filtro Todos / Ativos / Inativos.
- Estado vazio amigável quando não há representantes cadastrados (atualmente 0 no banco).

### 3. Rota
Arquivo: `src/App.tsx`
- Registrar `<Route path="/direcao/aprovacoes/representantes" element={<ProtectedRoute routeKey="direcao_aprovacoes"><AprovacoesRepresentantes /></ProtectedRoute>} />` logo após a rota de autorizados.

## Sem migrations
A coluna `ativo` e o valor `tipo_usuario = 'representante'` já existem. Nada novo no banco.

## Observação
Hoje não há nenhum registro com `tipo_usuario = 'representante'` no banco — a criação desses usuários acontece em outro fluxo (AddUserDialog). Esta tela apenas gerencia ativação dos que existirem.
