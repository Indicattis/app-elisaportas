# Corrigir bloqueio "Informe a data de carregamento" no avanço de pedido

## Problema

No pedido **63 - Mar/2026 STAATS & CIA LTDA** (`46b56be5...`), a etapa atual é `instalacoes` e o registro em `instalacoes` está com:
- `carregamento_concluido = true` (concluído em 15/05/2026)
- `data_carregamento = NULL`

A validação em `src/hooks/usePedidosEtapas.ts` (linhas 626–657) exige **ambos**: `data_carregamento` preenchido **e** `carregamento_concluido = true`. Como a data está nula, o avanço é barrado mesmo com o carregamento já marcado como concluído.

A causa raiz é um fluxo onde o usuário concluiu o carregamento sem antes agendar uma data (ou a data foi limpa em algum reagendamento), deixando o registro inconsistente.

## Solução

### 1. Relaxar a validação (`src/hooks/usePedidosEtapas.ts`)

Tratar `carregamento_concluido = true` como prova suficiente de que o carregamento aconteceu. Se concluído mas sem `data_carregamento`, considerar a data de `carregamento_concluido_em` como fallback ao invés de bloquear.

Mudança no bloco em ~linha 647:

```ts
const fonteConcluida = todasFontes.find(f => f.carregamento_concluido);
const algumaComData = todasFontes.some(f => f.data_carregamento);

// Se já está concluído, aceita mesmo sem data (data será inferida do carregamento_concluido_em)
if (!fonteConcluida && !algumaComData) {
  throw new Error('Informe a data de carregamento antes de finalizar o pedido');
}

if (!fonteConcluida) {
  throw new Error('O carregamento deve ser concluído antes de finalizar o pedido');
}
```

Também remover os `console.log('[DEBUG carregamento] ...')` (linhas 635–649) que estão poluindo o console em produção.

### 2. Backfill no banco (migração)

Para manter consistência (calendários, relatórios e detecções futuras), atualizar registros já concluídos sem data:

```sql
UPDATE instalacoes
SET data_carregamento = (carregamento_concluido_em AT TIME ZONE 'UTC')::date
WHERE carregamento_concluido = true AND data_carregamento IS NULL;

UPDATE ordens_carregamento
SET data_carregamento = (carregamento_concluido_em AT TIME ZONE 'UTC')::date
WHERE carregamento_concluido = true AND data_carregamento IS NULL;

UPDATE correcoes
SET data_carregamento = (carregamento_concluido_em AT TIME ZONE 'UTC')::date
WHERE carregamento_concluido = true AND data_carregamento IS NULL;
```

Isso destrava o pedido atual e qualquer outro na mesma situação.

## Arquivos afetados

- `src/hooks/usePedidosEtapas.ts` — relaxar validação + remover debug logs
- Nova migração SQL — backfill de `data_carregamento`

## Fora do escopo

- Não altero a UI de agendamento/conclusão de carregamento
- Não mexo na lógica de calendários da expedição
