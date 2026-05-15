## Contexto

Na página `/direcao/dre/:mes` (`src/pages/direcao/DREMesDirecao.tsx`) há três seções de despesas renderizadas pelo componente `DespesaSectionReadOnly`:

- **Despesas Fixas** — já recebe `tiposDisponiveis={tiposCustosFixos}` → mostra a coluna *Projetado*.
- **Despesas Variáveis** — já recebe `tiposDisponiveis={tiposCustosVariaveis}` → mostra a coluna *Projetado*.
- **Folha Salarial** — **não** recebe `tiposDisponiveis` → a coluna *Projetado* não aparece.

A seção *Folha Salarial* é um subconjunto dos tipos de custo `fixa` cujo nome contém "salário" ou "folha" (regra `isFolha` em `fetchDespesasFromGastos`).

## Mudança

Em `src/pages/direcao/DREMesDirecao.tsx`:

1. Derivar `tiposCustosFolha` filtrando `tiposCustosFixos` pela mesma regra `isFolha` usada em `fetchDespesasFromGastos` (extrair `isFolha` para escopo do componente para reaproveitar).
2. Ajustar `tiposCustosFixos` exibido em "Despesas Fixas" para excluir os de folha (mantendo paridade com a separação dos valores reais).
3. Passar `tiposDisponiveis={tiposCustosFolha}` para a seção `Folha Salarial`.

Resultado: a coluna *Projetado* passa a ser exibida nas três seções de despesas no card da página, mantendo o cálculo de totais e a coloração (vermelho/verde/branco) já implementados em `DespesaSectionReadOnly`.

## Fora de escopo

- Layout de impressão (`PrintReport`) já tem a seção "Despesas Projetadas do Ano" e não muda.
- Painel lateral "Despesas Projetadas do Ano" não muda.
- Sem alterações de banco.
