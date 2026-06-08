## Objetivo

Fazer o DRE de `/direcao/estrategia/dre/:mes` consumir exatamente as mesmas fontes e fórmulas usadas em `/direcao/estrategia/despesas/:mes`, garantindo que os totais de Folha, Despesas Fixas, Variáveis e Impostos batam linha a linha entre as duas telas.

## Diagnóstico (DREMesDirecao.tsx vs EstrategiaDespesasConfiguracoes.tsx)

Hoje o DRE diverge em 5 pontos:

1. **Fórmula da folha desatualizada** — usa `salario + aux + insalub + fgts + prev13 + fgts13 + ferias`. Não considera `hora_extra`, `bonificacao`, `multa_fgts (40%)`, `salario_minimo` como base da insalubridade, nem o override de `ferias_valor`.
2. **Fonte da folha errada** — lê `despesas_manuais_folha` (tabela legada), enquanto a tela de Despesas usa `despesas_padrao` + `despesas_mes_folha_override`.
3. **Impostos zerados** — `despesasImpostos` é sempre `[]`. A tabela `tipos_custos` já tem `tipo='imposto'`, mas o DRE não consulta.
4. **Projetado mensal ignora overrides** — coluna "Projetado" usa `tipos_custos.valor_maximo_mensal` sem aplicar `despesas_mes_tipo_custo_override`.
5. **Linhas sem gasto somem** — DRE só lista tipos que tiveram lançamento em `gastos`; a tela de Despesas mostra todos os tipos ativos (com valor real 0 quando não há gasto).

## Alterações

### 1. `src/pages/direcao/DREMesDirecao.tsx`

- Substituir a função local `calcTotalFolha` por uma versão idêntica à de `EstrategiaDespesasConfiguracoes.tsx`:
  - `base = salario + hora_extra`
  - `insalub = (salario_minimo ?? salario) * insalubridade_pct / 100`
  - `fgts = base * fgts_pct / 100`
  - `ferias = ferias_valor ?? base / 3 / 12`
  - `prev13 = base / 12`, `fgts13 = fgts / 12`, `multaFgts = fgts * 0.4`
  - `total = base + aux_combustivel + bonificacao + insalub + fgts + prev13 + fgts13 + ferias + multaFgts`
  - Se `em_folha === false`: retorna `salario + hora_extra + bonificacao`.
- Trocar a fonte da folha: remover `despesas_manuais_folha`; ler `despesas_padrao` (tipo='folha') + `despesas_mes_folha_override` (por `mes_referencia`) e aplicar override campo-a-campo (mesma lógica de `useDespesasPadraoMes`).
- Em `fetchDespesasFromGastos`:
  - Buscar `tipos_custos` com `aparece_no_dre = true AND ativo = true`, incluindo `tipo` ∈ {`fixa`, `variavel`, `imposto`}.
  - Buscar `despesas_mes_tipo_custo_override` do mês para sobrescrever `valor_maximo_mensal` (projetado).
  - Listar **todos** os tipos ativos (mesmo sem gastos no mês), com `valor_real = 0` quando não houver lançamento.
  - Popular `despesasImpostos` a partir de `tipo='imposto'`.
- Atualizar `tiposCustosFixos` / `tiposCustosVariaveis` para refletir os valores projetados após override (usados nas colunas "Projetado" do componente `DespesaSectionReadOnly` e do `PrintReport`).
- Adicionar `tiposCustosImpostos` e passar ao `PrintReport` para que a seção "Despesas de Imposto" exiba projetado + ano (hoje vai sem projetado).
- O cálculo de `lucroLiquidoFinal` já subtrai `totalDespImpostos`, então passa a refletir corretamente os impostos.

### 2. Verificação de concordância

Após implementação, abrir `/direcao/estrategia/despesas/2026-06` e `/direcao/estrategia/dre/2026-06` e conferir:

- Total da Folha (DRE seção 3) == subtotal da tabela Folha em Despesas (somando todos os setores).
- Total Despesas Fixas (DRE seção 4) == subtotal dos tipos `fixa` em Despesas (coluna Total Gastos do mês).
- Total Despesas Variáveis (DRE seção 5) == subtotal dos tipos `variavel`.
- Total Impostos (DRE seção 6) == subtotal dos tipos `imposto`.

Qualquer divergência só pode vir de tipos com `aparece_no_dre = false` (intencional). O plano não altera dados, apenas leitura.

## Fora de escopo

- Não alterar schema do banco; tabelas e colunas necessárias (`hora_extra`, `bonificacao`, `ferias_valor`, `salario_minimo`, overrides mensais) já existem.
- Não tocar em DREDirecao.tsx (lista de meses) nem no PDF além de propagar os novos arrays — layout do PDF permanece igual.
- Não alterar a aba "Faturamento" do DRE, apenas a integração de despesas.
