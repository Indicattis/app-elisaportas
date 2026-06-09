## Objetivo

Remover o custo fixo por fornada e passar a calculá-lo a partir do valor das trocas de gás, rateando o valor de cada troca entre as fornadas afiliadas a ela.

## Regras de afiliação

- Cada fornada é afiliada à troca de gás mais recente cuja data seja **anterior ou igual** à data da fornada.
- Fornadas anteriores à 1ª troca registrada são afiliadas à **1ª troca** (decisão do usuário).
- A última troca (mais recente) fica "em aberto" até existir uma troca posterior.

## Cálculo de custo

- Para trocas **fechadas** (têm troca posterior):
  - `custo_por_fornada = valor_troca / qtd_fornadas_no_periodo`
  - Se `qtd_fornadas_no_periodo = 0`, custo da troca não é distribuído.
- Para a troca **em aberto** (a mais recente):
  - Fornadas afiliadas aparecem com status **"Em apuração"** (custo não exibido / placeholder), pois o valor unitário só se consolida quando uma próxima troca delimitar o período.
- Fornadas sem nenhuma troca registrada no sistema: aparecem com **R$ 0,00**.

## Mudanças no frontend

### Hook `useFornadasResumo`
- Buscar também `pintura_trocas_gas` (registrado_em, valor) ordenadas por data.
- Para cada fornada, determinar a troca afiliada (regra acima) e marcar `em_apuracao = true` quando for da troca mais recente.
- Calcular `custo_fornada` para cada fornada conforme regra. Expor por linha: `troca_id`, `troca_valor`, `qtd_fornadas_troca`, `custo_fornada`, `em_apuracao`.

### Página `ControleFornadas.tsx` — aba Resumo
- **Remover** o card editável "Custo por fornada" e toda a UI/estado de edição (`editandoCusto`, `custoInput`, `salvarCusto`).
- **Remover** os imports/uso de `usePinturaFornadaCusto`.
- Substituir o card por **"Custo médio por fornada"** = soma dos custos calculados / nº de fornadas com custo consolidado (ignorando "em apuração").
- O card "Custo total acumulado" passa a somar os custos consolidados das fornadas (equivalente à soma das trocas fechadas com pelo menos 1 fornada).
- Na tabela de fornadas:
  - Coluna "Custo" exibe o valor calculado da linha; quando `em_apuracao`, exibe badge **"Em apuração"** em vez de valor.
  - Adicionar coluna "Troca de gás" mostrando data da troca afiliada (ou "—" se não houver).

### Página `ControleFornadas.tsx` — aba Fornadas
- Mesma exibição de custo/status "Em apuração" por linha (consistente com Resumo).

### Hook `usePinturaFornadaCusto`
- Deixa de ser usado pela página. Pode permanecer no projeto sem alterações (não vamos remover arquivo nem tabela `pintura_fornada_config` neste plano — apenas paramos de usar).

## Mudanças no backend

Nenhuma migração necessária. Toda a lógica é derivada em tempo de leitura a partir de `pintura_inicios` e `pintura_trocas_gas` já existentes.

## Detalhes técnicos

- A determinação da troca afiliada é feita em memória após buscar ambas as listas (volumes pequenos, ordenadas por data).
- Pseudocódigo:
  ```text
  trocas asc por registrado_em
  para cada fornada (asc por iniciado_em):
    troca = última troca com registrado_em <= fornada.iniciado_em
    se nenhuma e existe ao menos uma troca: troca = primeira troca
    fornada.troca_id = troca?.id
  agrupar fornadas por troca_id → qtd_fornadas_troca
  para cada fornada:
    em_apuracao = (troca == última troca registrada)
    custo = em_apuracao ? null : troca.valor / qtd_fornadas_troca
  ```
- `invalidateQueries` de `fornadas-resumo` já é disparado ao criar/excluir troca ou fornada, então o recálculo é automático.
