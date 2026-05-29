# Voltar fonte das despesas no DRE para `gastos`

Em `/direcao/estrategia/dre/:mes` (`src/pages/direcao/DREMesDirecao.tsx`), a busca de despesas hoje usa `despesas_manuais_lancamentos` e `despesas_manuais_folha`. Vou restaurar o comportamento antigo, que consulta diretamente a tabela `gastos` cruzada com `tipos_custos`, e a folha da tabela `custos_folha_mensais`.

## O que muda

Reescrever `fetchDespesasFromGastos` em `DREMesDirecao.tsx`:

1. **Fixas e Variáveis** — buscar de `gastos` no intervalo do mês (`data` entre o primeiro e o último dia), filtrar pelos `tipos_custos` com `aparece_no_dre = true`, agrupar por `tipo_custo_id` somando `valor`, e separar pelo campo `tipos_custos.tipo`:
   - `tipo = 'fixa'` e nome ≠ folha → **Despesas Fixas**
   - `tipo = 'variavel'` e nome ≠ folha → **Despesas Variáveis**
   - Filtro de folha mantém o helper já existente `isFolha(nome)` (regex `/sal[áa]rio|folha/i`).

2. **Folha salarial** — buscar de `custos_folha_mensais` filtrando por `mes_referencia = ${mes}-01`, mapeando `{ id, colaborador_nome, valor }` em `DespesaAgrupada`.

3. **Impostos** — a tabela `gastos`/`tipos_custos` não possui categoria de imposto, então o bucket de Impostos passará a ficar vazio (`setDespesasImpostos([])`). Os totais (`totalDespImpostos`) continuam zerados sem quebrar o cálculo do lucro líquido.

## Detalhes técnicos

- Manter a assinatura/estados atuais (`despesasFixas`, `despesasFolha`, `despesasVariaveis`, `despesasImpostos`) para não tocar nas seções de render nem no `PrintReport`.
- O modal `GastosDoTipoDialog` continua consultando `despesas_manuais_lancamentos`. Após reverter, ele não terá dados — vou ajustá-lo para consultar `gastos` filtrando por `tipo_custo_id` (passando o `id` do tipo, não mais `tipo_nome` + `categoria`) no mesmo intervalo do mês, exibindo `data`, `descricao` e `valor`.
- Para o modal, ajustar a chamada `onClickTipo` para passar o `tipo_custo_id` real (já é o `id` que vem agrupado a partir de `gastos`).
- Não alterar nada relacionado a faturamento, lucros, estoque, top acessórios/adicionais nem ao botão "Realizado".

## Arquivos

- `src/pages/direcao/DREMesDirecao.tsx` — única alteração.
