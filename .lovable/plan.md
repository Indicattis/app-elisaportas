## Objetivo

Refatorar o ranking de equipes em `/logistica/instalacoes/ranking` para se basear nos registros da tabela `instalacoes_finalizadas` (mesma fonte usada em `/logistica/instalacoes`), em vez de consultar diretamente `instalacoes` + `neo_instalacoes`.

## Mudanças

### 1. `src/hooks/useRankingEquipesInstalacao.ts` — refatorar fonte de dados

- Remover as duas queries atuais (`instalacoes` com `tipo_instalacao='elisa'` e `neo_instalacoes` com `tipo_responsavel='equipe_interna'`).
- Substituir por uma única query a `instalacoes_finalizadas`, filtrando por `finalizado_em` no intervalo do período selecionado (mês / ano / todos) e por `equipe_instalacao_id is not null`.
- Continuar buscando `equipes_instalacao` (ativas) para obter `cor` e garantir o nome canônico, mas usar `equipe_instalacao_id` / `equipe_instalacao_nome` da própria `instalacoes_finalizadas` como fallback quando a equipe não estiver mais ativa (evita sumir do ranking histórico).
- Agrupar por `equipe_instalacao_id` produzindo o mesmo shape `RankingEquipe[]`:
  - `quantidade_instalacoes` = nº de registros na `instalacoes_finalizadas`.
  - `ultima_instalacao` = maior `finalizado_em`.
  - `instalacoes_detalhes`: 1 item por registro com `id`, `nome_cliente` (vindo de `cliente_nome`), `data_conclusao = finalizado_em`, `metragem = null`, `origem` derivada (`pedido` quando há `pedido_id` mapeado a `pedidos_producao`, senão `neo` — ou simplesmente usar `pedido` como padrão já que `instalacoes_finalizadas` une as duas fontes).
- `metragem_total` deixa de existir como soma confiável (a tabela `instalacoes_finalizadas` não tem metragem). Opções:
  - **(escolhida)** zerar `metragem_total` e ocultar o m² no card quando 0 — a UI já só mostra `metragem_total` se `> 0`, então nada quebra visualmente.
- Manter `AjustePontuacaoSection` e o `refetch` funcionando.

### 2. UI (`src/pages/logistica/RankingEquipesInstalacao.tsx`)

- Sem mudança estrutural. Como `metragem` virá `null`, os badges P/G/GG e o "m²" simplesmente não aparecem (já condicionados a `> 0`).
- O badge "Pedido / Avulso" continuará funcionando se mantivermos a flag `origem`; caso simplifiquemos para sempre `pedido`, removo o ramo "Avulso" do badge — vou manter a flag derivada para preservar a distinção visual.

### 3. Tipos

- `InstalacaoDetalhe.metragem` continua `number | null`.
- Nenhuma migração de banco.

## Fora do escopo

- Mexer em `/logistica/instalacoes` ou em `useInstalacoesFinalizadas`.
- Recalcular metragem retroativa (exigiria join com `pedidos_producao` / `produtos_vendas` / `neo_instalacoes`).
