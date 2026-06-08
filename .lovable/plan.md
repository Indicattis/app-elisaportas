## Objetivo

Adicionar uma nova coluna **Fretes** na tabela "Faturamento por Categoria" em `/direcao/estrategia/dre/:mes`, posicionada antes da coluna **Total**, alimentada pela soma de `valor_frete` de todas as vendas do mês.

## Comportamento da coluna

| Linha       | Cálculo                                                                                     |
| ----------- | ------------------------------------------------------------------------------------------- |
| Faturamento | Soma de `vendas.valor_frete` de todas as vendas com `data_venda` dentro do mês              |
| Lucro       | `Total de fretes nas vendas − total de despesas da categoria "Fretes e Logística"` (`totalDespFretes`) |
| Margem %    | `lucro / faturamento * 100` (mesma fórmula das outras colunas)                              |

A coluna **Total** continua somando apenas Portas + Pintura + Instalações + Avulsos (não inclui Fretes), pois o frete já é tratado separadamente no DRE e descontado do `valor_venda` no cálculo das demais categorias — assim evita-se contagem dupla. (Caso o usuário prefira incluí-lo no Total, ajustamos.)

## Arquivos

- `src/pages/direcao/DREMesDirecao.tsx`

## Mudanças técnicas

1. **Estado novo:** `totalFretesVendas: number` no componente principal, populado durante o `useEffect` que carrega as vendas do mês (mesmo bloco que hoje já lê `valor_frete` para subtraí-lo de `valor_venda`). Adicionar acumulador ao iterar vendas para somar `v.valor_frete`.

2. **Interface `FaturamentoProduto`:** acrescentar campo opcional `fretes?: number`. Preencher `fat.fretes = totalFretesVendas` e `luc.fretes = totalFretesVendas − totalDespFretes`.

3. **`columns`:** inserir `{ key: 'fretes', label: 'Fretes' }` entre `'avulsos'` e `'total'`.

4. **Renderização das três linhas** (Faturamento / Lucro / Margem %) já mapeia `columns`, então a coluna aparece automaticamente. Adicionar tratamento para destacar a coluna Fretes em azul (consistente com o padrão visual de "Fretes e Logística" já em uso no PDF).

5. **PDF / `PrintReport`:** acrescentar a mesma coluna Fretes na tabela "1. Faturamento por Categoria" para manter paridade entre tela e PDF.

6. **Não alterar:** `lucroLiquidoFinal`, KPIs, blocos de despesas, nem o "Resumo Final" — o lucro de Fretes é informativo na tabela de categorias e a despesa "Fretes e Logística" continua sendo descontada normalmente no lucro líquido (já é hoje via `debitaCat('frete')`).

## Fonte dos dados

Já existe carregamento de `vendas.valor_frete` no `useEffect` por volta da linha 1305. Basta acumular no mesmo loop sem nova query.

## Critérios de aceitação

- A coluna "Fretes" aparece entre "Itens Avulsos" e "Total" na tabela de Faturamento por Categoria.
- Linha Faturamento mostra a soma de fretes das vendas do mês.
- Linha Lucro mostra `fretes − totalDespFretes` (positivo em verde, negativo em vermelho, igual às outras colunas).
- Linha Margem % mostra o percentual calculado.
- PDF reflete a mesma coluna.
- Nenhum outro KPI ou total da página muda de valor.