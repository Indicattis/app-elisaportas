## Objetivo

Fazer a coluna "Total" de cada colaborador na Folha Salarial refletir o mesmo cálculo usado no "Total da folha" agregado, de modo que a soma das linhas bata exatamente com o total exibido no rodapé.

## Diagnóstico

Em `src/pages/direcao/estrategia/EstrategiaDespesasConfiguracoes.tsx`:

- **Linha 476–487 (agregado `totalFolha`)** passa para `calcTotalFolha`: `bonificacao`, `previsao_13_valor` e `ferias_valor` (armazenado no item).
- **Linha 720 (coluna Total por linha `FolhaRowCells`)** chama `calcTotalFolha` **sem** `bonificacao` e força `ferias_valor: null`, ignorando o valor manual salvo.

Consequência: quando um colaborador tem `bonificacao > 0` ou `ferias_valor` ajustado manualmente, o total mostrado na linha é menor que a parcela real que entra no somatório da folha.

## Alteração

Arquivo único: `src/pages/direcao/estrategia/EstrategiaDespesasConfiguracoes.tsx`

1. Em `FolhaRowCells` (por volta da linha 710–720), ler também `bonificacao`, `previsao_13_valor` e `ferias_valor` do `item`.
2. Ajustar a chamada de `calcTotalFolha` na linha 720 para passar esses três campos, exatamente como o agregado faz:

```ts
const bonificacao   = Number(item.bonificacao) || 0;
const previsao_13_valor = Number(item.previsao_13_valor) || 0;
const ferias_valor  = item.ferias_valor; // pode ser null

const total = calcTotalFolha({
  salario, salario_minimo, aux_combustivel,
  bonificacao,
  hora_extra,
  insalubridade_pct, fgts_pct,
  previsao_13_valor,
  em_folha: item.em_folha,
  ferias_valor,
});
```

3. Nenhuma alteração no agregado, em `calcTotalFolha`, no banco, em RLS ou em edge functions.

## Verificação

- Abrir `/direcao/estrategia/despesas/2026-06`.
- Conferir um colaborador com `bonificacao > 0`: o valor da coluna Total deve subir na mesma proporção.
- Conferir um colaborador com férias manual: a coluna Total deve refletir o valor manual, não mais o default `base/3/12`.
- Somar mentalmente as linhas visíveis (excluindo simulados) e comparar com "Total da folha" no rodapé — devem ser iguais.
