## Problema

Na página `/direcao/dre/2026-04`, a linha **Total** da coluna **Projetado** soma o `valor_maximo_mensal` de **todos** os tipos de custo cadastrados na categoria, mesmo os que não têm gasto registrado no mês. Por isso aparece R$ 78.500 (variáveis) e R$ 60.120 (fixas, sem Folha) — valores do orçamento mensal completo, e não dos itens efetivamente exibidos.

## Mudança

Em `src/pages/direcao/DREMesDirecao.tsx`, no componente `PrintDespesaTable` (PDF) e no equivalente da tela interativa:

- Substituir a soma `tiposDisponiveis.reduce(...)` por uma soma que só considera os tipos cujo `nome` aparece em ao menos uma linha de `despesas`.
- Aplicar nas três seções (Despesas Fixas, Folha Salarial, Despesas Variáveis), tanto no PDF (`PrintDespesaTable`, ~linha 478) quanto na tela (componente em ~linha 38–102).

Resultado: o total da coluna *Projetado* passa a refletir apenas os tipos efetivamente listados, ficando consistente com o total de *Valor Real*.

## Fora de escopo

- Sem mudanças nas demais seções/colunas do DRE.
- Sem alterações de banco.
