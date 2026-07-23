## Objetivo
Fazer os índices/cronômetros de etapa (badges como "3sem 5d" em `CronometroEtapaBadge`) contarem apenas dias úteis brasileiros — pulando sábados, domingos **e feriados nacionais**.

## Situação atual
- `src/utils/calcularTempoExpediente.ts` já ignora sábado e domingo (07:00–17:00, TZ São Paulo), mas **não considera feriados**.
- Não existe utilitário nem tabela de feriados no projeto (`rg` por "feriad|holiday" não retorna nada).
- O hook `useCronometroEtapa` e o badge consomem esse cálculo, então basta ajustar a fonte.

## Passos

1. **Criar `src/utils/feriadosBR.ts`**
   - Função `isFeriadoBR(date: Date): boolean` (comparação por `YYYY-MM-DD` no fuso `America/Sao_Paulo`).
   - Feriados nacionais fixos: 01/01, 21/04, 01/05, 07/09, 12/10, 02/11, 15/11, 20/11 (Consciência Negra, nacional desde 2024), 25/12.
   - Feriados móveis calculados a partir da Páscoa (algoritmo de Gauss/Meeus): Sexta-feira Santa (-2), Carnaval segunda (-48) e terça (-47), Corpus Christi (+60).
   - Cache por ano para não recalcular.

2. **Integrar em `src/utils/calcularTempoExpediente.ts`**
   - Dentro do loop `while (diaAtual <= diaFinal)`, adicionar `if (isFeriadoBR(diaAtual)) { pular dia; continue; }` junto com a checagem de sábado/domingo.
   - Em `estaNoExpediente`, retornar `false` também quando o dia atual for feriado (afeta apenas a animação `pulse` do ícone, mantendo consistência).

3. **Sem mudanças de UI** — o badge e o hook continuam iguais; o efeito é apenas o tempo acumulado passar a excluir feriados.

## Escopo
- Não altera limites de etapa, cores, formatação nem outros consumidores além dos que já usam `calcularTempoExpediente`/`estaNoExpediente`.
- Cobertura: feriados **nacionais** brasileiros (sem feriados municipais/estaduais, para evitar suposições regionais).