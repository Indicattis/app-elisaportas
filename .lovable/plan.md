# Reverter cronômetro dos pedidos para dias corridos

## Objetivo

Em `/direcao/gestao-fabrica`, o cronômetro das etapas dos pedidos atualmente conta apenas **horas comerciais** (07h-17h, seg-sex, sem feriados) mas exibe como dias de 24h — causando confusão (ex: 1 semana real aparece como "~2d"). Reverter para **tempo corrido** (tempo real decorrido), como era antes de jan/2026.

## Arquivos a alterar

### 1. `src/hooks/useCronometroEtapa.ts`
- Substituir `calcularTempoExpediente(inicio, agora)` por cálculo simples de tempo decorrido: `(agora.getTime() - inicio.getTime()) / 1000`
- Remover import de `calcularTempoExpediente` e `estaNoExpediente`
- `deveAnimar`: voltar para `!!dataEntrada` (sempre anima quando há data de entrada), em vez de checar horário comercial
- `LIMITE_DEFAULT`: converter de `5 * 10 * 3600` (5 dias comerciais) para `5 * 24 * 3600` (5 dias corridos)

### 2. `src/types/pedidoEtapa.ts` — `LIMITES_ETAPA_SEGUNDOS`
Converter limites baseados em dias comerciais (10h/dia) para dias corridos (24h/dia):

| Etapa | Antes (comercial) | Depois (corrido) |
|---|---|---|
| `em_producao` | 4 × 10 × 3600 = 40h | 4 × 24 × 3600 = 96h |
| `aguardando_pintura` | 4 × 10 × 3600 = 40h | 4 × 24 × 3600 = 96h |
| `aguardando_coleta` | 48 × 10 × 3600 = 480h | 48 × 24 × 3600 = 1152h |
| `instalacoes` | 3 × 10 × 3600 = 30h | 3 × 24 × 3600 = 72h |
| `correcoes` | 3 × 10 × 3600 = 30h | 3 × 24 × 3600 = 72h |

Limites em horas (`aprovacao_diretor`, `aberto`, `aprovacao_ceo`, `inspecao_qualidade`, `embalagem`) permanecem iguais — já são horas reais.

Atualizar comentário do objeto de "dia comercial = 10h" para "dia = 24h".

### 3. `src/hooks/usePedidosEtapas.ts` (linha ~815)
- Substituir `calcularTempoExpediente(new Date(etapaAtual.data_entrada), new Date())` por cálculo simples de tempo decorrido, garantindo que `tempo_permanencia_segundos` salvo no banco fique em tempo corrido (consistente com o cronômetro ao vivo)

### 4. `src/pages/direcao/GestaoFabricaDirecao.tsx` (linha ~2008)
- Atualizar nota da legenda: remover menção a "Horário comercial: 07:00 às 17:00, seg-sex." e manter apenas "Tempo total usa dias corridos."

## Impacto
- `CronometroEtapaBadge` (usado em `PedidoCard`, `GestaoFabricaMobile`, `NeoInstalacaoCardGestao`, `NeoCorrecaoCardGestao`, `PedidoDetalhesSheet`, `AprovacoesProducao`) passa a mostrar tempo real
- `formatCronometroExtended` já divide por 86400 (24h) — funcionará corretamente com tempo corrido
- Etapas históricas salvas com `tempo_permanencia_segundos` em horas comerciais continuam exibindo com `formatDuration` (formato "Xh Ymin") — sem quebra, apenas valores antigos ficam menores
- Cronômetros de ordens de produção (`useCronometroOrdem`) e suporte (`useCronometroChamado`) **não** são alterados
