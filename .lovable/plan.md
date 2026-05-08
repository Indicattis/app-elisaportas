## Objetivo

Adicionar um novo botão no hub `/fabrica` que leva à mesma tela de configuração de itens da fábrica (`ProdutosFabrica`) atualmente acessível em `/direcao/estoque/configuracoes/produtos/fabrica`.

## Mudanças

### 1. `src/App.tsx`
Adicionar duas novas rotas reutilizando os mesmos componentes (`ProdutosFabrica` e `ProdutosFabricaEdit`), porém protegidas com uma nova `routeKey` própria do hub da fábrica (para não exigir acesso ao `direcao_hub`):

- `/fabrica/produtos` → `ProdutosFabrica` (routeKey: `fabrica_produtos`)
- `/fabrica/produtos/editar/:id` → `ProdutosFabricaEdit` (routeKey: `fabrica_produtos`)

### 2. `src/pages/fabrica/FabricaHub.tsx`
- Adicionar novo item ao `menuItems` com label "Configurar Itens", ícone `Package` (ou `Settings2`) do lucide-react, path `/fabrica/produtos`.
- Adicionar entrada correspondente em `routeKeyMap`: `'/fabrica/produtos': 'fabrica_produtos'`.

### 3. Permissões granulares
Registrar a nova `route_key` `fabrica_produtos` no sistema de permissões (mesma forma que `fabrica_ordens_pedidos` está registrada — verificar onde as routeKeys são listadas, p.ex. `useBulkRouteAccess` / catálogo de permissões), para que admins possam liberar o acesso aos colaboradores da fábrica.

## Observações

- Nenhuma mudança de lógica/negócio: o componente `ProdutosFabrica` é reutilizado tal como está; apenas ganha um segundo ponto de entrada.
- Usuários com `hasBypassPermissions` continuam vendo todos os botões.
- Os botões internos de "Editar" dentro de `ProdutosFabrica` provavelmente navegam para `/direcao/estoque/configuracoes/produtos/fabrica/editar/:id`. Antes de implementar, vou confirmar isso e, se for o caso, ajustar a navegação para usar caminho relativo ou condicional ao prefixo da rota atual, garantindo que usuários da fábrica permaneçam dentro de `/fabrica/produtos/...`.
