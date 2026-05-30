## Objetivo

Permitir excluir um tipo de despesa em `/direcao/estrategia/despesas/configuracoes` mesmo quando existem `gastos` vinculados, deixando esses gastos órfãos (sem `tipo_custo_id`) em vez de obrigar realocação.

## Mudanças

### 1. Banco de dados (migration)

A tabela `public.gastos` tem hoje `tipo_custo_id UUID NOT NULL REFERENCES tipos_custos(id)`. Para permitir órfãos:

- `ALTER TABLE public.gastos ALTER COLUMN tipo_custo_id DROP NOT NULL;`
- Substituir a FK por `ON DELETE SET NULL`, para que ao excluir o tipo os gastos fiquem com `tipo_custo_id = NULL` automaticamente.

### 2. Hook `useTiposCustos.ts`

Adicionar `forcarExclusaoTipoCusto(id)` — chama `delete` direto em `tipos_custos` (FK `SET NULL` orfaniza os gastos). Toast: "Tipo excluído. N gasto(s) ficaram órfãos."

### 3. UI `EstrategiaDespesasConfiguracoes.tsx`

No diálogo "Realocar gastos antes de excluir" (que aparece quando `count > 0`):

- Manter botão atual **"Realocar e excluir"** (vermelho, desabilitado sem destino).
- Adicionar terceiro botão **"Excluir mesmo assim (deixar órfãos)"** — variant `ghost` com texto laranja/aviso, sempre habilitado, com `AlertTriangle` ao lado.
- Ao clicar, mostra confirmação inline ("Tem certeza? Os N gastos não serão removidos, apenas ficarão sem tipo vinculado e somem do agrupamento.") e então chama `forcarExclusaoTipoCusto`.

### 4. Visibilidade dos órfãos

Sem mudanças em outras telas — gastos órfãos continuam existindo na tabela `gastos` mas não aparecem nos agrupamentos por tipo. Fica fora deste escopo criar uma seção "Sem tipo" no resumo mensal (pode ser feito depois se necessário).

## Fora do escopo

- Não altera o fluxo de remoção quando `count === 0` (continua direto).
- Não mexe na Folha Salarial nem nos PDFs.
- Não cria UI para reatribuir gastos órfãos.
