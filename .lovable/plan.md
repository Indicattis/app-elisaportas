## Objetivo
Mover a tela atualmente em `/administrativo/pedidos` para dentro do hub `/fabrica`, exibida como o primeiro botão chamado **"Montagem de Pedidos"**.

## Mudanças

### 1. Rotas (`src/App.tsx`)
- Adicionar novas rotas em `/fabrica`:
  - `/fabrica/montagem-pedidos` → `PedidosAdminMinimalista`
  - `/fabrica/montagem-pedidos/:id` → `PedidoViewMinimalista`
  - Usar `routeKey="fabrica_montagem_pedidos"` (nova chave de permissão).
- Manter as rotas antigas `/administrativo/pedidos` redirecionando para as novas (`<Navigate to="/fabrica/montagem-pedidos" replace />`) para não quebrar links existentes.

### 2. Hub da Fábrica (`src/pages/fabrica/FabricaHub.tsx`)
- Adicionar como **primeiro item** do `menuItems`:
  ```
  { label: 'Montagem de Pedidos', icon: PackageCheck, path: '/fabrica/montagem-pedidos' }
  ```
- Adicionar entrada correspondente em `routeKeyMap`: `'/fabrica/montagem-pedidos': 'fabrica_montagem_pedidos'`.

### 3. Hub Administrativo (`src/pages/administrativo/AdministrativoHub.tsx`)
- Remover o item `Pedidos` do `menuItems`.

### 4. Permissões
- Cadastrar a nova chave `fabrica_montagem_pedidos` no sistema de permissões (migration em `system_routes` se houver tabela equivalente — confirmar antes de gerar). Conceder acesso aos perfis que hoje têm `administrativo_hub` para não perder visibilidade.

## Pontos a confirmar
- Voltar (back button) dentro de `PedidosAdminMinimalista`/`PedidoViewMinimalista` provavelmente aponta para `/administrativo`. Deve ser ajustado para `/fabrica`. Vou verificar e ajustar os `navigate(...)` e breadcrumbs nesses componentes.
- Se preferir, posso **não** manter o redirect legado de `/administrativo/pedidos` — me avise.
