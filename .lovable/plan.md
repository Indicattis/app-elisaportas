
## Objetivo

- Mover a página **Contratos** (gerencial, vê todas as vendas) para **Home > Direção > Vendas**.
- Criar **Meus Contratos** em **Home > Vendas**, com a mesma UI/fluxo, mas listando apenas as vendas do vendedor logado.

## Mudanças

### 1. Mover Contratos para Direção > Vendas
- Atualizar rota em `src/App.tsx`: `/vendas/contratos` → `/direcao/vendas/contratos` (mesmo componente `ContratosVendas`, sob `ProtectedRoute` com `routeKey="direcao_vendas"`).
- Adicionar item no menu `src/pages/direcao/VendasHubDirecao.tsx`: "Contratos" → `/direcao/vendas/contratos`.
- Em `ContratosVendas.tsx`, atualizar breadcrumb para `Home > Direção > Vendas > Contratos` e o botão "voltar" para `/direcao/vendas`.

### 2. Refatorar `ContratosVendas` para aceitar escopo
- Adicionar prop opcional `scope?: 'all' | 'meus'` (default `'all'`).
- Quando `scope === 'meus'`, filtrar a query de `vendas` por `atendente_id = user.id` (ou `user_id` correspondente no `admin_users`, seguindo o mesmo mapeamento já usado para vendedores).
- Ajustar título/breadcrumb conforme o scope ("Contratos" vs "Meus Contratos").
- Esconder coluna "Vendedor" quando `scope === 'meus'` (opcional, mas reduz ruído).

### 3. Nova página Meus Contratos
- Criar `src/pages/vendas/MeusContratos.tsx` que apenas renderiza `<ContratosVendas scope="meus" />`.
- Registrar rota `/vendas/contratos` apontando para `MeusContratos` (mantém URL antiga para vendedores).
- Atualizar o item do menu em `src/pages/vendas/VendasHub.tsx`: rótulo "Contratos" → **"Meus Contratos"** (mesmo path).

### 4. Funcionalidade preservada
- Abas Pendente / Gerado / Assinado, ações de gerar, anexar, dispensar, retornar e liberar para Pend. Faturamento permanecem iguais — apenas a lista é filtrada quando `scope='meus'`.

## Fora de escopo
- Sem alterações no banco, RLS ou hooks de Pend. Faturamento.
- Sem mudar permissões (`useBulkRouteAccess`); se desejar restringir o item Direção a perfis específicos depois, fazemos em separado.
