# Mostrar correções reagendadas no calendário de expedição

## Problema confirmado

O pedido #0152 está em etapa `correcoes` e foi reagendado: a tabela `correcoes` tem `data_carregamento = 2026-04-30` corretamente gravado, com responsável "Equipe 3" e status `agendada`. Porém o card não aparece em `/logistica/expedicao`.

**Causa raiz:** o hook `useOrdensCarregamentoCalendario` (que alimenta o calendário) só consulta as tabelas `ordens_carregamento` e `instalacoes`. **Nunca lê a tabela `correcoes`.** Já existe um `useCorrecoes` paralelo na página, mas esse outro hook filtra por `data_correcao` (data da visita do correcionista), não por `data_carregamento` (data de saída da fábrica). Resultado: correções reagendadas pela expedição caem em um buraco e não aparecem em lugar algum do calendário.

## Solução

Adicionar uma terceira fonte ao `useOrdensCarregamentoCalendario`: buscar correções com `data_carregamento` no período e normalizá-las no formato `OrdemCarregamento` com `fonte: 'correcoes'`. Assim aparecem como cards normais (estilo entrega/instalação) ao lado das ordens e instalações já existentes.

## Detalhes técnicos

Arquivo: `src/hooks/useOrdensCarregamentoCalendario.ts`

1. Após o bloco que busca `instalacoes` (linha ~147), adicionar uma nova query em `correcoes`:
   - `select` dos campos de carregamento + join com `pedidos_producao` (numero_pedido, etapa_atual) e `vendas` (cliente, endereço, produtos com cores)
   - Filtros: `data_carregamento` não-nulo, dentro do intervalo `[inicio, fim]`, e `carregamento_concluido = false`

2. Mapear o resultado para o formato `OrdemCarregamento` com `fonte: 'correcoes' as const`, espelhando a normalização feita para `instalacoes`.

3. Concatenar no `return` final: `[...ordensComFonte, ...instalacoesNormalizadas, ...correcoesNormalizadas]`.

Subscription em tempo real: adicionar também um `.on('postgres_changes', { table: 'correcoes' }, ...)` (linha ~414) para invalidar a query quando uma correção mudar.

A `updateOrdemMutation` já trata `fonte === 'correcoes'` corretamente (linha 236) — nada a alterar lá.

Componentes que renderizam os cards (`OrdemCarregamentoCard`, `DiaCardExpedicao`) já recebem `OrdemCarregamento` genérico, então cards de correção aparecerão automaticamente. O botão de remover do calendário (`handleRemoverDoCalendario` na página) já passa `fonte` baseado no `ordem.fonte`, então remover/reagendar a partir do card também funcionará.

## Resultado esperado

Pedido #0152 (e qualquer outra correção reagendada) passa a aparecer como card no dia 30/04/2026 do calendário de expedição, podendo ser editado, concluído ou removido normalmente.
