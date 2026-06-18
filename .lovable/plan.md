## Diagnóstico

Investigando a tabela `instalacoes` (a equipe é definida em `/instalacoes` via menu "Responsável", não em `/logistica/expedicao` — esse só exibe):

| Métrica | Valor |
|---|---|
| Total de instalações | 450 |
| Com `responsavel_instalacao_id` preenchido | **256** |
| Com `responsavel_instalacao_nome` preenchido | **20** |
| IDs que pertencem a `equipes_instalacao` | 256 / 256 |

**Causa raiz:** O `id` da equipe é salvo, mas o `nome` cacheado na linha fica NULL em 236 registros. Como o backfill anterior e os triggers de sincronização usavam **o nome** como critério, esses 236 registros foram tratados como "sem equipe" — o que propaga para `instalacoes_finalizadas` (apenas 3 de 281 com equipe).

## O que fazer

1. **Backfill `instalacoes.responsavel_instalacao_nome`** para os 236 registros, copiando de `equipes_instalacao.nome` via `responsavel_instalacao_id`. Mesma coisa para `correcoes.responsavel_correcao_nome` quando o id existir.

2. **Corrigir `gerar_instalacao_finalizada()`** para resolver o nome diretamente de `equipes_instalacao` quando `responsavel_instalacao_nome` for NULL, garantindo que novos pedidos finalizados nunca entrem vazios.

3. **Corrigir os triggers `sync_instalacao_finalizada_responsavel` e `sync_correcao_finalizada_responsavel`** para também resolver nome via `equipes_instalacao` (hoje retornam cedo quando `nome IS NULL`).

4. **Re-rodar backfill de `instalacoes_finalizadas`**: para cada linha, recalcular `equipe_instalacao_*` / `autorizado_correcao_*` via JOIN em `equipes_instalacao` usando o `responsavel_instalacao_id` da `instalacoes` correspondente (e idem `correcoes`).

## Resultado esperado

- `instalacoes_finalizadas`: equipe preenchida para todos os pedidos cuja `instalacoes` original tinha id de equipe (estimativa: ~180 de 281, vs. 3 hoje).
- Página `/logistica/expedicao` passa a colorir a maioria das instalações pela cor da equipe.
- A tabela de OrdensInstalacoesLogistica exibe o nome da equipe nas linhas históricas.

## Limitações honestas

- Pedidos finalizados cuja linha em `instalacoes` foi deletada (99 registros sem match por `pedido_id`) continuarão sem equipe — não há fonte para recuperar.
- Registros realmente sem `responsavel_instalacao_id` (159 pendentes + 35 concluídos) continuarão vazios até alguém atribuir manualmente em `/instalacoes`.

## Arquivos / objetos afetados

- Migration nova: backfill em `instalacoes` e `correcoes`, reescrita de `gerar_instalacao_finalizada`, reescrita dos 2 triggers de sync, re-backfill de `instalacoes_finalizadas`.
- Nenhuma alteração de frontend necessária.
