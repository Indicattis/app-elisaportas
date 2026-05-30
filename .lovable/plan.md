## Objetivo

1. Em `/direcao/estrategia/despesas/configuracoes`, adicionar coluna **"Setor"** por colaborador na Folha Salarial padrão.
2. Em todos os cálculos de total da folha (Configurações + tela mensal), quando `em_folha = false` o total deve ser igual ao salário (sem somar combustível, insalubridade, FGTS, previsão 13°, férias).

## Mudanças

### 1. Banco — `despesas_padrao`
Migração (schema):
- Adicionar coluna `setor public.setor_type NULL` em `public.despesas_padrao`. Sem default, nullable para não impor escolha em registros antigos.

### 2. Hook `src/hooks/useDespesasPadrao.ts`
- Adicionar `setor: string | null` ao tipo `DespesaPadrao` (string para evitar dependência forte do enum gerado).
- Mapear `setor: x.setor ?? null` no `fetchAll`.
- Repassar `setor: payload.setor ?? null` no `insert`.

### 3. UI Configurações — `src/pages/direcao/estrategia/EstrategiaDespesasConfiguracoes.tsx`
- `calcTotalFolha`: aceitar novo argumento opcional `em_folha`. Quando `em_folha === false`, retornar apenas `salario`.
- `FolhaBlock`:
  - Novo estado `setor` no formulário de inserção (default `null`).
  - Novo `<th>` "Setor" logo após "Em folha".
  - Nova célula com `<Select>` (shadcn) listando: `vendas`, `marketing`, `instalacoes`, `fabrica`, `administrativo` (rótulos com primeira letra maiúscula).
  - `reset()` zera `setor`. Inserção envia `setor`.
  - `totalSalarios` e `totalFolha` agora consideram `em_folha` (passar a flag no `calcTotalFolha`).
- `FolhaRow`:
  - Nova célula `<Select>` com o setor atual, salvando via `update(item.id, { setor: v })`.
  - `total` calculado com `em_folha = item.em_folha`.
  - Quando `em_folha=false`, manter as células informativas (insalub valor, fgts valor, etc.) — apenas o **total** muda; o usuário ainda consegue visualizar os campos.

### 4. UI Mensal — `src/components/direcao/estrategia/DespesasResumoTopo.tsx`
- `calcTotalFolha`: mesma alteração (assinatura aceita `em_folha?`); quando `false`, retorna salário.
- Atualizar todos os call sites para passar `em_folha`:
  - `totalExibido` (linha ~141): `calcTotalFolha({ ...p, em_folha: p.em_folha })`.
  - `handlePatchFolha` / `handleInsertFolha` (linhas ~281, ~300): passar `em_folha` do colab/padrão correspondente.
  - `BlocoFolha` total (linha ~545) e total por linha (linha ~653): passar `colab.em_folha`.
- Não exibir Setor nessa tela (escopo é só configurações).

## Fora de escopo
- Edição/uso do setor em outras telas; nenhum filtro, agrupamento ou regra por setor é adicionado agora.
- Tabela `colaboradores` não é alterada.
- Pode haver colaboradores marcados como "Não" em Em folha cujos valores acessórios (FGTS, insalub) continuarão aparecendo nas linhas; apenas a soma final ignora esses valores.
