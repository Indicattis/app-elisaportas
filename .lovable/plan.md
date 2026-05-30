## Objetivo

Em `/direcao/estrategia/despesas/configuracoes`, no bloco "Folha Salarial padrão", adicionar uma nova coluna **Salário Mínimo** por colaborador. A **% de Insalubridade** passa a ser calculada sobre esse valor (e não mais sobre o salário do colaborador).

## Mudanças

### 1. Banco de dados (migração)
- Adicionar coluna `salario_minimo numeric NOT NULL DEFAULT 1518` à tabela `despesas_padrao` (R$ 1.518,00 = salário mínimo brasileiro vigente em 2025/2026; valor editável por linha).
- Backfill: linhas existentes recebem 1518 automaticamente pelo default.

### 2. Hook `src/hooks/useDespesasPadrao.ts`
- Adicionar `salario_minimo: number` em `DespesaPadrao`.
- Mapear no `fetchAll` e aceitar em `insert` (default 1518).

### 3. Página `EstrategiaDespesasConfiguracoes.tsx`
- **Nova coluna "Salário Mínimo"** posicionada logo antes de "Insalub %" (editável via `InlineNum format="currency"`).
- Atualizar `FolhaTableHeader`, `FolhaColGroup` (mais um `<col>`, ajustar `min-w` da tabela), célula no `FolhaRowCells` e na linha de adicionar.
- Alterar `calcTotalFolha` para:
  - `insalub = salario_minimo * (insalubridade_pct / 100)` (antes: `salario × pct`).
- Atualizar a célula "Insalub valor" e os subtítulos do header ("salário mínimo × insalub%").
- No formulário de adicionar colaborador, novo estado `salarioMinimo` inicializado em `1518`.

### 4. PDF `src/utils/folhaSalarialPDFGenerator.ts`
- Acrescentar coluna "Salário Mínimo" ao head/body, usar `salario_minimo` como base de `insalubVal` e em `calcTotalFolha`.

## Observação
O default é o salário mínimo nacional (R$ 1.518). Caso algum colaborador tenha base diferente (ex.: piso da categoria), o valor pode ser editado inline na própria linha.