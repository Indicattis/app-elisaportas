## Mudanças

### 1. `src/pages/logistica/OrdensInstalacoesLogistica.tsx`
Adicionar filtro fixo para mostrar **apenas registros com `tipo_entrega === 'instalacao'`** (filtra junto com a busca em `filtrados`). Os KPIs e a tabela passam a refletir só instalações.

### 2. Nova página `src/pages/logistica/OrdensEntregasLogistica.tsx`
Duplicata da página acima, com:
- Título: "Entregas Finalizadas"
- Subtítulo: "Acompanhe as entregas concluídas e seus indicadores"
- Filtro fixo: `tipo_entrega === 'entrega'`
- `backPath="/logistica"`
- Sem `InstalacoesHeaderActions` no header (esse menu é específico do hub de instalações: equipes, cronograma, rankings — não se aplica a entregas)
- Demais comportamentos (busca, navegação por mês, abertura do `PedidoDetalhesSheet`, edição de equipe/veículo, KPIs incluindo Tempo Médio de Entrega) mantidos idênticos

### 3. `src/App.tsx`
Adicionar rota:
```
/logistica/entregas → OrdensEntregasLogistica
```
(dentro do `ProtectedRoute` com `routeKey="logistica_hub"`, espelhando a rota de instalações)

### 4. `src/pages/logistica/LogisticaHub.tsx`
Adicionar novo item no `menuItems`, logo após "Instalações":
```ts
{ label: "Entregas", icon: Truck, path: "/logistica/entregas" }
```
(usando ícone `Truck` ou `PackageCheck` — sugiro `PackageCheck` para diferenciar do "Calendário" que já usa Truck)

## Pontos fora do escopo
- O menu `InstalacoesHeaderActions` (Ordens / Equipes / Cronograma / Rankings) continua exclusivo do fluxo de instalações. Se quiser um header equivalente para entregas no futuro, peça em uma próxima iteração.
- Permissões: a nova rota reaproveita `routeKey="logistica_hub"` (mesmo nível de acesso de `/logistica/instalacoes`).
