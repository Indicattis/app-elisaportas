## Objetivo

Em `/direcao/estrategia/despesas/{mes}`, os blocos **Despesas Fixas** e **Despesas Variáveis** voltam a ler diretamente da tabela `gastos` (mesma fonte de `/administrativo/financeiro/gastos`), em modo **somente leitura**. Folha, Impostos e o status do mês continuam como estão hoje.

## Escopo

Arquivo único alterado: `src/components/direcao/estrategia/DespesasResumoTopo.tsx`.

Nada muda em:
- `EstrategiaDespesasMes.tsx` (página em si).
- Blocos de Folha e Impostos (continuam usando `despesas_manuais_folha` e `despesas_manuais_lancamentos` categoria `imposto`, e os Padrões cadastrados).
- `GastosPage`, `useGastos`, `tipos_custos`, `despesas_padrao`.

## Comportamento novo de Fixas e Variáveis

1. Buscar `gastos` do mês (`data` entre `${mes}-01` e último dia do mês), em paralelo com a consulta atual de `despesas_manuais_folha`/`despesas_manuais_lancamentos`.
2. Buscar `tipos_custos` (id, nome, tipo, aparece_no_dre) referenciados pelos gastos retornados.
3. Filtrar apenas gastos cujo `tipo_custo.aparece_no_dre !== false` (mesma regra já usada no DRE) e separar:
   - `fixasRows`: `tipo_custo.tipo === 'fixa'`
   - `variaveisRows`: `tipo_custo.tipo === 'variavel'`
4. Agrupar por `tipo_custo_id` somando `valor`, gerando linhas exibidas com: nome do tipo, valor total do mês, quantidade de lançamentos.
5. Renderizar dois blocos em modo somente leitura:
   - Sem botão "Adicionar", sem ícone de lixeira, sem edição inline de valor/data/descrição, sem overlay de Padrões (padrões deixam de aparecer nesses dois blocos).
   - Linha de total no rodapé do bloco (soma dos valores).
   - Estado vazio: "Nenhum gasto registrado em /administrativo/financeiro/gastos neste mês."
6. O `totalExibido` (que alimenta `onMediaMensalChange` e o subtítulo "Total do mês") passa a usar `sum(fixasRows) + sum(variaveisRows)` em vez do mix atual com lançamentos manuais e padrões fixas/variáveis. Folha (lançamentos + padrões) e Impostos (lançamentos + padrões) continuam compondo o total como hoje.

## Detalhes técnicos

- Remover, dentro de `DespesasResumoTopo`, as referências a `padroesFixas`/`padroesVariaveis` no total e nos dois `<BlocoDespesa categoria="fixa"/"variavel">`; manter `padroesFolha` e `padroesImpostos`.
- Substituir o `BlocoDespesa` usado para Fixas e Variáveis por um novo componente local `BlocoGastosReadonly` (mesmo estilo glassmorphism, sem ações). O `BlocoDespesa` atual continua sendo usado pelo bloco de Impostos.
- A consulta dos gastos do mês fica isolada em um `useEffect` próprio dependente de `mes` (e do mesmo `reloadV` para acompanhar deletes/edições disparados pelos outros blocos). Reusar `T12:00:00.000Z` na montagem do `start`/`end` quando relevante (aqui basta strings `YYYY-MM-DD`, já que `gastos.data` é `date`).
- Tipos: `type GastoRow = { id: string; tipo_custo_id: string; valor: number; data: string }` e `type TipoCustoMin = { id: string; nome: string; tipo: 'fixa' | 'variavel' | 'imposto'; aparece_no_dre: boolean }`.
- Sem alterações de schema, sem migrations.

## Fora do escopo

- Permitir cadastro/edição de gastos a partir desta tela (decisão do usuário: somente leitura).
- Mexer no comportamento do bloco Folha e do bloco Impostos.
- Mexer em `/administrativo/financeiro/gastos` ou em `DREDespesasDirecao`.
