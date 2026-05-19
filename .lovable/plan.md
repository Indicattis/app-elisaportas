## Objetivo

Em `/administrativo/financeiro/custos`, os valores reais de cada tipo de custo (por mês) passam a vir agregados automaticamente da tabela `gastos` (mesma fonte de `/administrativo/financeiro/gastos`). A tela do mês deixa de ser editável — vira só leitura.

## Mudanças

### 1. `src/hooks/useCustosMensais.ts`

- `fetchCustosMes(mesDate)`:
  - Trocar a consulta a `despesas_mensais` por uma consulta em `gastos` filtrando pelo intervalo do mês (`data >= primeiro dia` e `data <= último dia`).
  - Agrupar `SUM(valor)` por `tipo_custo_id`.
  - Para cada `tipo_custo` ativo, retornar 1 item `CustoMensal` com `valor_real = soma dos gastos` e `observacoes = null`.
- `fetchTotaisPorMes(ano)`:
  - Trocar consulta a `despesas_mensais` por consulta a `gastos` no intervalo do ano (`data` entre `ano-01-01` e `ano-12-31`).
  - Agrupar por mês (`new Date(data).getMonth()+1`) e somar `valor`.
  - Manter o cálculo de `total_limite` a partir de `tipos_custos` ativos.
- `saveCustosMensaisBatch`: marcar como deprecated/no-op (mantém assinatura mas retorna `true` sem gravar). Não é mais usado.

### 2. `src/pages/administrativo/CustosMesMinimalista.tsx`

- Remover botão **Salvar Custos** e o estado `saving`.
- Remover os `<Input>` editáveis: substituir por valor exibido em texto (`formatCurrency(vals.valor_real)`).
- Remover input de observações (vem dos gastos individuais agora).
- Adicionar um botão/link "Ver gastos do mês" que navega para `/administrativo/financeiro/gastos?mes=YYYY-MM` (filtro por mês).
- Subtítulo: trocar "Lance os valores reais…" por "Valores agregados automaticamente dos lançamentos em Gastos".

### 3. `src/pages/administrativo/GastosPage.tsx` (opcional, pequeno)

- Ler `mes` da query string ao montar e pré-selecionar `mesFiltro`, para que o link da tela de Custos funcione.

## Fora de escopo

- DRE (`DREMesDirecao.tsx`) e `despesas_mensais` permanecem como estão. Os dados antigos de `despesas_mensais` continuam intactos, apenas deixam de aparecer em `/financeiro/custos`.
- Estrutura/CRUD de `tipos_custos` permanece igual (cadastro, limites, ativo, etc.).
- Tabela `gastos` não é alterada.
