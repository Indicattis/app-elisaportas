# Trocar fonte de Folha e Despesas no DRE para os lançamentos manuais

Substituir, na tela `/direcao/estrategia/dre/:mes`, as fontes atuais das seções **Folha Salarial**, **Despesas Fixas** e **Despesas Variáveis** pelos dados registrados em `/direcao/estrategia/despesas`. Acrescentar também a nova seção **Despesas de Imposto** (criada recentemente naquela tela), para que o DRE espelhe exatamente as despesas do mês.

## Fontes — antes e depois

| Seção | Hoje | Passa a usar |
|---|---|---|
| Folha Salarial | `custos_folha_mensais` | `despesas_manuais_folha` (campo `total`) |
| Despesas Fixas | `gastos` + `tipos_custos` (tipo=fixa, não-folha) | `despesas_manuais_lancamentos` `categoria='fixa'` |
| Despesas Variáveis | `gastos` + `tipos_custos` (tipo=variavel) | `despesas_manuais_lancamentos` `categoria='variavel'` |
| Despesas de Imposto (nova) | — | `despesas_manuais_lancamentos` `categoria='imposto'` |

Critério de seleção em todos os casos: `mes_referencia = '${mes}-01'`. **Apenas valores efetivamente lançados** entram (sem somar sugestões/padrões não materializados — DRE representa realizado).

## Alterações em `src/pages/direcao/DREMesDirecao.tsx`

1. **`fetchDespesasFromGastos`** → renomear para `fetchDespesasManuais` e reescrever:
   - Query única em `despesas_manuais_lancamentos` filtrando por `mes_referencia`.
   - Agrupar por `tipo_nome` para gerar `DespesaAgrupada` (id = tipo_nome normalizado; `valor_real` = soma; `gastos` = lista dos lançamentos individuais, mapeando `data`, `descricao`, `valor`).
   - Separar em `despesasFixas`, `despesasVariaveis`, `despesasImpostos` por `categoria`.
   - Folha: query em `despesas_manuais_folha`, mapear cada linha (`colaborador_nome`, `total`).
   - Remover dependência de `tipos_custos` para alimentar as seções; manter `fetchTiposCustosAtivos` apenas se ainda for usado para "Despesas Projetadas do Ano" (mantém o painel lateral como está, é informativo independente).

2. **Estado e totais**:
   - Adicionar `despesasImpostos`/`totalDespImpostos` análogos aos demais.
   - Incluir `totalDespImpostos` no cálculo de `lucroLiquidoFinal`, em todo lugar que soma despesas (linhas 1394, 1604, e snapshot do `dre_realizados`).

3. **Tela (`screenContent`)** — adicionar `<DespesaSectionReadOnly title="Despesas de Imposto" ... />` após Variáveis. Remover o `onClickTipo` que abre `GastosDoTipoDialog` (substituído abaixo) — ou reaproveitar para mostrar os lançamentos manuais.

4. **Drill-down do tipo** (`GastosDoTipoDialog`):
   - Reescrever para consultar `despesas_manuais_lancamentos` filtrando por `mes_referencia` + `tipo_nome` (passa a receber `tipoNome` em vez de `tipoCustoId`).
   - Remover joins com `admin_users` e `bancos` (não existem nessa fonte). Manter colunas: Data, Descrição, Valor.
   - Remover botão "Abrir em Gastos" e substituir por link para `/direcao/estrategia/despesas/${mes}` ("Abrir em Despesas").
   - Habilitar drill-down também para Folha (lista linhas de `despesas_manuais_folha` com salário + adicionais) e para Imposto.

5. **PDF (`PrintReport`)**:
   - Acrescentar seção "6. Despesas de Imposto" entre Variáveis e Estoque (renumerar Estoque para 7 e Vendas do Mês para 8).
   - Incluir linha "(–) Despesas de Imposto" no "Resumo Final".

6. **Snapshot `dre_realizados`**:
   - O schema atual tem `total_despesas_fixas/folha/variaveis`. Adicionar coluna `total_despesas_imposto numeric` via migration e gravar no upsert. Linha "Despesas imposto" também aparece no diálogo de confirmação.

## Migration (banco)

```sql
ALTER TABLE public.dre_realizados
  ADD COLUMN IF NOT EXISTS total_despesas_imposto numeric NOT NULL DEFAULT 0;
```

## Painel "Despesas Projetadas do Ano"

Mantém-se como está (usa `tipos_custos.valor_maximo_mensal`), apenas como referência informativa. Não conflita com a nova fonte de despesas reais. Caso queira no futuro, pode-se trocar essa projeção pelos `despesas_padrao`.

## Itens fora de escopo (confirmação implícita)

- DRE consolidado anual / outras telas (`DREDirecao`, `DREDespesasDirecao`) continuam como estão neste passo.
- "Despesas Projetadas do Ano" segue da fonte antiga.