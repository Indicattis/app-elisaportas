# Alinhar valores entre `/paineis/metas-vendas` e `/paineis/tv-dashboard`

## Diagnóstico

Os dois painéis usam fórmulas diferentes para somar vendas do mês — por isso os valores divergem.

| Painel | Fonte | Fórmula por venda | Filtra rascunho? |
|---|---|---|---|
| `/paineis/tv-dashboard` (FATURAMENTO + ranking) | `useSalesData`, `useSellersRanking` | `valor_venda − valor_frete + valor_credito` | ❌ |
| `/paineis/metas-vendas` (totais e progresso) | `useProgressoMetasVendas` | `valor_venda` (inclui frete, ignora crédito) | ✅ |

A regra canônica do projeto, definida em `src/utils/faturamentoCalc.ts` (`calcularFaturamentoLiquido`), é **`valor_venda + valor_credito − valor_frete`**, e é a que o TV Dashboard segue. Sua suspeita está correta: o painel de metas hoje está incluindo frete (e ignorando o crédito), por isso o número diverge.

Há também uma diferença secundária: o painel de metas exclui rascunhos (`is_rascunho = false`) e o TV Dashboard não filtra. Em geral rascunhos não deveriam contar como faturamento, então essa diferença é "a favor" do painel de metas.

## Mudanças propostas

### 1. Padronizar o cálculo de progresso de metas (corrige a divergência)

Em `src/hooks/useProgressoMetasVendas.ts`:

- Trocar todos os `select('atendente_id, valor_venda')` por `select('atendente_id, valor_venda, valor_frete, valor_credito')`.
- Substituir `Number(v.valor_venda || 0)` por `calcularFaturamentoLiquido(v)` (importando de `@/utils/faturamentoCalc`) nos três loops:
  - acumulação `vendasMes` → `porVendedorMes` / `totalGlobalMes`
  - acumulação `vendasSemana` → `porVendedorSemana` / `totalGlobalSemana`
  - acumulação por meta (`vendas` dentro do `for` das metas ativas)

Isso faz o painel de metas usar exatamente a mesma fórmula líquida do TV Dashboard.

### 2. Alinhar filtro de rascunhos no TV Dashboard

Em `src/hooks/useDashboardData.ts`, adicionar `.eq('is_rascunho', false)` em:
- `useSalesData` (FATURAMENTO do mês)
- `useSellersRanking` (ranking de vendedores)

Assim os dois painéis ignoram rascunhos da mesma forma.

### 3. (Opcional, mesma direção) Trimestre do TV Dashboard

Em `TvDashboard.tsx`, o bloco `vendas-trimestre` calcula `valor_venda − valor_frete` (sem somar crédito). Para consistência total, trocar por `calcularFaturamentoLiquido` e também adicionar `.eq('is_rascunho', false)`. Isso não afeta diretamente a tela que o usuário está comparando, mas evita reabrir o mesmo bug em outro card.

## Resultado esperado

Após o ajuste, o "Total no período" exibido em `/paineis/metas-vendas` para uma meta mensal global passará a bater exatamente com o valor de FATURAMENTO mostrado no slide 1 do `/paineis/tv-dashboard` (e com a soma do ranking de vendedores), porque ambos usarão `valor_venda + valor_credito − valor_frete` sobre vendas não-rascunho do mês corrente.

## Arquivos afetados

- `src/hooks/useProgressoMetasVendas.ts` — padronizar fórmula
- `src/hooks/useDashboardData.ts` — adicionar filtro `is_rascunho = false`
- `src/pages/TvDashboard.tsx` — (opcional) padronizar query do trimestre
