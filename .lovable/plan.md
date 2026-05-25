## Objetivo

Reformular `/direcao/estrategia/despesas` para ser uma tela isolada de **registro manual** de despesas mensais (folha salarial, fixas e variáveis), sem impactar DRE nem outras telas. Os cards de meses passam a mostrar o total dos lançamentos manuais daquele mês.

## Fluxo da tela

1. Grade de 12 meses do ano (igual hoje), cada card mostrando o total lançado naquele mês.
2. Ao clicar num mês, abrem 3 blocos abaixo: **Folha Salarial**, **Despesas Fixas**, **Despesas Variáveis**.
3. Cada bloco lista os lançamentos do mês com editar/excluir inline e um botão **+ Adicionar**.

### Folha salarial — formulário de novo lançamento
- Selecionar colaborador (dropdown com `admin_users` ativos, tipo colaborador/metamorfo).
- Ao selecionar, puxa automaticamente do cadastro: salário, aux. combustível, insalubridade %, FGTS %, previsão 13º. Todos editáveis.
- Cálculos derivados visíveis: insalub R$, FGTS R$, férias+1/3+FGTS, total mensal.
- Botão **Salvar** grava na nova tabela vinculado ao mês.

### Despesas fixas / variáveis — formulário de novo lançamento
- Selecionar **tipo de custo** (dropdown de `tipos_custos` filtrado por `tipo='fixa'` ou `'variavel'`, ativos).
- Campos: valor pago, data (dentro do mês), descrição opcional.
- Botão **Salvar**.

## Tabelas novas (isoladas)

```text
despesas_manuais_folha
  - id, mes_referencia (date, dia 01)
  - admin_user_id (fk admin_users)
  - colaborador_nome (snapshot)
  - salario, aux_combustivel, insalubridade_pct, fgts_pct, previsao_13_valor (numeric)
  - total (numeric, calculado no client e salvo)
  - created_by, created_at, updated_at

despesas_manuais_lancamentos
  - id, mes_referencia (date, dia 01)
  - tipo_custo_id (fk tipos_custos)
  - categoria ('fixa' | 'variavel')  -- snapshot
  - tipo_nome (snapshot)
  - valor (numeric), data (date), descricao (text nullable)
  - created_by, created_at, updated_at
```

RLS: leitura/escrita para `authenticated` (mesmo padrão de `despesas_valor_pago_mensal`).

## Mudanças de código

- **Substituir** `src/components/direcao/estrategia/DespesasResumoTopo.tsx` por uma nova versão focada em lançamentos manuais (3 blocos, modais de adicionar, edição inline, exclusão).
- **`src/pages/direcao/estrategia/EstrategiaDespesas.tsx`**: trocar fonte dos totais por mês para somar `despesas_manuais_folha.total` + `despesas_manuais_lancamentos.valor` agrupado por `mes_referencia` do ano selecionado. Remover dependência de `gastos` e `custos_folha_mensais` nesta tela.
- Novos hooks:
  - `useDespesasManuaisFolha(mes)` — CRUD da folha do mês.
  - `useDespesasManuaisLancamentos(mes)` — CRUD de fixas/variáveis do mês.
  - `useTotaisDespesasManuaisAno(ano)` — totais por mês para os cards.
- Reaproveitar `NumInput` e estética glassmorphism atual.

## Fora de escopo

- DRE, página `/direcao/estrategia/dre/despesas` e tabela `tipos_custos` continuam intactas (são apenas referência de categorias para o dropdown).
- Nenhuma alteração em `gastos`, `custos_folha_mensais` ou `despesas_valor_pago_mensal`.
