## Objetivo

Calcular, por venda, um "balanço de desconto":
- **Negativo**: desconto dado acima do limite permitido (sem senha).
- **Positivo**: margem de desconto que poderia ter sido dada e não foi.

Exibir o resultado em nova página acessível pelo MarketingHub.

## Regra de cálculo

Para cada venda (não rascunho, status_aprovacao = 'aprovada' ou null) com `valor_venda >= 500`:

1. `total = soma((valor_produto + valor_pintura + valor_instalacao) * quantidade)` em `produtos_vendas`.
2. `desconto_dado = soma(desconto_valor ou desconto_percentual aplicado)`.
3. `pct_dado = desconto_dado / total * 100`.
4. `limite_pct = regras_vendas.limite_desconto_avista + (venda_presencial ? limite_desconto_fria : 0)`. Se `forma_pagamento` = 'cartao_credito' ou vazio → limite_avista = 0.
5. `diff_pct = limite_pct - pct_dado`:
   - `diff_pct >= 0` → balanço **positivo** = `diff_pct/100 * total` (oportunidade não usada).
   - `diff_pct < 0` → balanço **negativo** = `diff_pct/100 * total` (excedeu).

## Schema (migração)

Nova tabela `vendas_balanco_desconto`:
- `id uuid PK`
- `venda_id uuid UNIQUE FK vendas(id) ON DELETE CASCADE`
- `total_venda numeric`
- `desconto_dado numeric`
- `pct_desconto_dado numeric`
- `pct_limite_permitido numeric`
- `valor_balanco numeric` (negativo ou positivo)
- `tipo text check in ('positivo','negativo','neutro')`
- `data_venda timestamptz`
- `created_at/updated_at`

RLS: SELECT para `authenticated`; INSERT/UPDATE/DELETE somente `service_role` (alimentada por função/edge).

Grants padrão (authenticated + service_role).

Função SQL `public.recalcular_balanco_desconto_vendas(p_inicio timestamptz, p_fim timestamptz)` SECURITY DEFINER:
- Lê `regras_vendas` (mais recente).
- Itera vendas no período (filtra `is_rascunho=false` e `valor_venda >= 500`).
- Faz UPSERT em `vendas_balanco_desconto`.

Trigger opcional (fica fora desta primeira versão para manter escopo simples) — recálculo será via função chamada manualmente / botão.

## Migração de dados do mês

Após criação da função, executar:
```sql
SELECT public.recalcular_balanco_desconto_vendas(
  date_trunc('month', now()),
  date_trunc('month', now()) + interval '1 month'
);
```

## Frontend

1. **Hook** `src/hooks/useBalancoDescontos.ts`: busca `vendas_balanco_desconto` joined com `vendas(cliente_nome, atendente_id)` por período (default mês atual). Retorna lista + totais (soma positivos, soma negativos, líquido).

2. **Página** `src/pages/marketing/BalancoDescontos.tsx`:
   - Seletor de mês.
   - 3 cards: Balanço Positivo (verde), Balanço Negativo (vermelho), Saldo Líquido.
   - Tabela: Data, Cliente, Total Venda, % Desconto Dado, % Limite, Valor Balanço (verde/vermelho), Tipo.
   - Botão "Recalcular mês" que invoca a função RPC.

3. **Rota**: registrar `/marketing/balanco-descontos` em `src/App.tsx`.

4. **MarketingHub**: adicionar item `{ label: "Balanço de Descontos", icon: Scale, path: "/marketing/balanco-descontos" }` no `menuItems`.

## Arquivos alterados

- Nova migração SQL (tabela + grants + RLS + função).
- Insert RPC para popular o mês atual.
- `src/hooks/useBalancoDescontos.ts` (novo).
- `src/pages/marketing/BalancoDescontos.tsx` (novo).
- `src/App.tsx` (rota).
- `src/pages/marketing/MarketingHub.tsx` (item de menu).

## Fora de escopo

- Atualização automática via trigger ao criar/editar venda (pode ser adicionado depois).
- Permissões granulares por rota — usa apenas autenticado por enquanto.
