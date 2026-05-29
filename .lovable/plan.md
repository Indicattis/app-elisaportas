## Objetivo

Adicionar um botão **"Metas"** no hub `/vendas` que abre uma nova página `/vendas/metas` com o **histórico de resultados por período** de cada meta de vendas cadastrada (somente leitura, visível para qualquer vendedor com acesso ao hub).

## Mudanças

### 1. `src/pages/vendas/VendasHub.tsx`
Adicionar item ao `menuItems`:
```
{ label: 'Metas', icon: Target, path: '/vendas/metas' }
```
(ícone `Target` do lucide-react). Sem outras mudanças.

### 2. Nova rota em `src/App.tsx`
```
<Route path="/vendas/metas" element={
  <ProtectedRoute routeKey="vendas_hub"><MetasHistoricoVendas /></ProtectedRoute>
} />
```
Import de `./pages/vendas/MetasHistoricoVendas`.

### 3. Novo hook `src/hooks/useHistoricoMetasVendas.ts`
- Recebe `metas` de `useMetasVendas()`.
- Para cada meta, gera a lista de períodos passados dentro da vigência:
  - Início = `meta.data_inicio_vigencia`.
  - Fim = `min(meta.data_fim_vigencia ?? hoje, hoje)`.
  - Itera por `semana` ou `mes` (conforme `meta.periodo`) gerando intervalos `(inicio, fim)`; mantém apenas períodos **já encerrados** (`fim < hoje`).
- Em **uma única query** por meta, busca `vendas` no intervalo total `[primeiroInicio, ultimoFim]` filtrando por `atendente_id` (se `escopo='individual'`) ou todos (se `global`), traz `atendente_id, data_venda, valor_venda, valor_frete, valor_credito, is_rascunho=false`.
- Em memória, agrupa por período e por `atendente_id`, calculando `total_vendido` via `calcularFaturamentoLiquido`, `tier_atingido` e `bonificacao_calculada` reutilizando as helpers `calcularTier`/`calcularBonificacao` (extraídas para `src/lib/metasVendasCalc.ts` para reuso entre o hook live e este hook histórico).
- Retorna estrutura:
```
{ meta, periodos: [{ inicio, fim, label, totalGlobal, vendedores: VendedorProgresso[], tier_atingido_global }] }[]
```
- Carrega `admin_users` (mesma query do hook live) para resolver nome/foto.

### 4. Refator pequeno em `src/hooks/useProgressoMetasVendas.ts`
Mover `calcularTier` e `calcularBonificacao` para `src/lib/metasVendasCalc.ts` e importar em ambos os hooks (sem mudança de comportamento).

### 5. Nova página `src/pages/vendas/MetasHistoricoVendas.tsx`
- Layout `MinimalistLayout` com:
  - `title="Histórico de Metas"`, `subtitle="Resultados passados das metas do setor de vendas"`.
  - `backPath="/vendas"`, breadcrumb `Home → Vendas → Metas`.
- Estado de loading/empty consistentes (skeleton glassmorphism `bg-white/5`).
- Para cada meta retornada pelo hook, renderiza um card (mesmo estilo glass de `MetasVendasDirecao`):
  - Cabeçalho: nome da meta, badges (`periodo`, `escopo`, `Inativa` se aplicável), vigência.
  - Lista vertical de **períodos encerrados** (mais recentes primeiro):
    - Label do período (ex.: "Semana de 12/05 a 18/05" ou "Maio 2025") usando `formatarPeriodo` adaptada.
    - Para `escopo='global'`: total vendido, tier atingido (chip colorido) e bonificação calculada.
    - Para `escopo='individual'` sem `vendedor_id`: ranking de todos os vendedores no período (nome + foto + total + tier + bonificação), ordenado por total desc.
    - Para `escopo='individual'` com `vendedor_id`: linha única daquele vendedor.
  - Empty state por meta ("Sem períodos encerrados ainda").
- Sem ações de criar/editar/excluir.

### Permissões
Reaproveita `routeKey="vendas_hub"` (mesma do restante do hub `/vendas`). Sem mudanças de RLS — `metas_vendas`, `metas_vendas_tiers`, `vendas` e `admin_users` já são lidos pelos hubs de vendas existentes.

## Detalhes técnicos

- Datas seguem a regra do projeto: limites de período são serializados via helpers existentes em `src/lib/periodoMeta.ts` (sufixo `T12:00:00.000Z`).
- Iteração de períodos:
  - Semanal: avança `+7 dias` a partir do domingo da semana de `data_inicio_vigencia`.
  - Mensal: avança 1 mês a partir do primeiro dia do mês de `data_inicio_vigencia`.
- Limite defensivo: máximo de 104 períodos por meta (≈ 2 anos semanal / 8 anos mensal) para evitar loops.
- Performance: 1 query de `vendas` por meta cobrindo todo o intervalo histórico + 1 query única de `admin_users`. React Query com `staleTime` de 5 min.

## Fora de escopo

- Sem mudanças no banco, RLS, edge functions ou no fluxo de configuração de metas em `/direcao/metas/vendas`.
- Sem exportação PDF/Excel nesta versão.
- Sem filtros por vendedor/meta nesta versão (podem ser adicionados depois).

## Verificação

- Build limpa.
- `/vendas` mostra o novo botão "Metas" abaixo de "Visitas Técnicas".
- `/vendas/metas` lista todas as metas com seus períodos encerrados, valores e tiers, sem 404 e sem quebras quando uma meta não tem nenhum período encerrado.
- Cálculo de tier/bonificação por período idêntico ao do painel ao vivo (mesmas helpers).
