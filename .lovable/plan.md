## Mudança

A coluna **"Férias + 1/3 + FGTS"** vira **"Férias + 1/3"**, calculada como `salário / 3` (sem a parcela de FGTS).

## Arquivos

### `src/pages/direcao/estrategia/EstrategiaDespesasConfiguracoes.tsx`
- `calcFeriasDefault` (linha 85): retornar apenas `salario / 3`.
- `calcTotalFolha` (linha 88): manter mesma estrutura — usa o valor de `ferias` que agora é só `salario/3`.
- Cabeçalho da tabela (linha 163): renomear para "Férias + 1/3".
- Linha de adição (linha 194): exibir `formatCurrency(salario / 3)`.
- Coluna `FolhaRow` continua usando `feriasDefault` (que já passa a ser `salario/3`).

### `src/components/direcao/estrategia/DespesasResumoTopo.tsx`
- `calcTotalFolha` (~linha 102): trocar `const ferias = f.salario / 3 + fgts` por `const ferias = f.salario / 3`.

### `src/pages/direcao/DREMesDirecao.tsx`
- `calcTotalFolha` interno: trocar `const ferias = salario / 3 + fgts` por `const ferias = salario / 3`.

## Fora do escopo

- Sem migrations; coluna `ferias_valor` continua existindo (override manual permanece válido).
- Outras colunas/comportamentos intactos.
