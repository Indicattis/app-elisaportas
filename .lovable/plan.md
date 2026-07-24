## Objetivo

Em `/logistica/frete/internos`, permitir gerar em massa todos os fretes de um estado: selecionar UF → sistema cria/atualiza automaticamente uma linha de frete para cada município do IBGE, com o **km** calculado (capital → cidade) e o **valor** preenchido pela regra vigente (`km × 6`).

## Fluxo (UX)

1. Novo botão **"Gerar por Estado"** no header de `FreteMinimalista.tsx` (aba Internos), ao lado dos botões já existentes.
2. Ao clicar, abre um Dialog com:
   - Select de UF (mesma lista `ESTADOS_BR`).
   - Toggle **"Sobrescrever km/valor de cidades já cadastradas"** (padrão: desligado — mantém as existentes intactas).
   - Botão **Gerar**.
3. Após confirmar, reaproveita o **modal de progresso** já existente (barra + contador + cidade atual + ok/fail), pois o processamento é longo (Nominatim/OSRM têm rate-limit e são chamados um por vez).
4. Ao final, toast com resumo (X criadas, Y atualizadas, Z falhas) e lista recarregada.

## Backend

Criar uma nova Edge Function `gerar-fretes-estado`:

- Input: `{ estado: "UF", sobrescrever: boolean }`.
- Busca a lista oficial de municípios em `https://servicodosdados.ibge.gov.br/api/v1/localidades/estados/{UF}/municipios` (não requer chave, dados públicos).
- Retorna a lista de cidades para o cliente processar (streaming iterativo) **ou** processa server-side em lote e retorna o resumo.
- Recomendação: **retornar apenas a lista de cidades**; o cliente reutiliza a Edge Function `recalcular-km-frete` já existente para cada cidade (mantém o mesmo padrão de progresso do "Recalcular Km" atual, com rate-limit no cliente).

Para cada cidade retornada, o cliente:
- Verifica se já existe em `frete_cidades` (por `cidade` + `estado`).
  - Se não existe: `insert` com `km`, `valor = km × 6`, tipo padrão.
  - Se existe e `sobrescrever = true`: `update` de `km` e `valor`.
  - Se existe e `sobrescrever = false`: pula (conta como "mantido").

## Detalhes técnicos

- **Sem alterações de schema.** A tabela `frete_cidades` já suporta os campos necessários.
- Reaproveitar helpers já existentes: hook `useFretesCidades` (`addFrete`, `updateFrete`) e Edge Function `recalcular-km-frete` (geocode + OSRM + Haversine fallback).
- Delay entre chamadas (`~1s`) para respeitar o rate-limit do Nominatim, igual ao usado hoje no "Recalcular Km".
- Se `cidade === capital`, `km = 0` e `valor = 0` (comportamento já existente na função).
- Falhas de geocodificação são registradas no contador `fail` e não interrompem o lote.

## Arquivos

- `supabase/functions/gerar-fretes-estado/index.ts` (novo): lista municípios do IBGE por UF.
- `src/pages/logistica/FreteMinimalista.tsx`: botão "Gerar por Estado", Dialog de seleção de UF/sobrescrever, loop de processamento reutilizando o modal de progresso existente.
- (Opcional) `src/hooks/useFretesCidades.ts`: helper `upsertFreteByCidadeEstado` para evitar duplicar a checagem de existência no componente.

## Fora do escopo

- Não altera a página de "Frete por Porta" nem "Transportadoras".
- Não muda a fórmula de cálculo do valor (`km × 6` continua igual).
