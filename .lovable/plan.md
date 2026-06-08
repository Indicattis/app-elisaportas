## Objetivo

Em `/direcao/estrategia/dre/[mes]`, a última seção (tabela "Resumo Final" no rodapé) atualmente mostra colunas fixas de despesas. Vamos passar a exibir, dentre as colunas de despesas, apenas aquelas cujas seções estão marcadas para aparecer no DRE em `/direcao/estrategia/despesas/configuracoes` (toggle `debita_dre` da tabela `despesas_categoria_dre_config`).

## Escopo

Apenas frontend, em `src/pages/direcao/DREMesDirecao.tsx`, no bloco `showResumoFinal` (~linhas 1859–1901).

## Comportamento

A tabela continuará mostrando sempre:
- Faturamento Bruto, % Bruto, Fat. Líquido (Lucro Bruto)
- Lucro Líquido e % Lucro Líquido (no final)

As colunas de despesas passam a ser geradas dinamicamente a partir de uma lista completa de seções, cada uma exibida apenas se `debitaCat(categoria) === true`:

| Coluna na tabela        | categoria (config) |
|--------------------------|---------------------|
| Folha Salarial           | `salario`           |
| Despesas Fixas           | `fixa`              |
| Despesas Variáveis       | `variavel`          |
| Despesas de Imposto      | `imposto`           |
| Investimentos            | `investimento`      |
| Fornecedores             | `fornecedor`        |
| Financiamentos           | `financiamento`     |
| Fretes e Logística       | `frete`             |
| Autorizados              | `autorizado`        |
| Salários (extra)         | (já existe a seção "Salários" usando `tiposCustosSalarios`; manter mapeada como `salario` também — se a chave for igual à Folha, mantemos apenas uma das duas para evitar duplicidade — ver nota abaixo)

Observação: hoje a Folha sempre debita do lucro independentemente do toggle. Vamos manter esse comportamento de cálculo (não alteramos o `lucroLiquidoFinal`), apenas a visibilidade das colunas no resumo.

Cálculo e estilo das células permanecem iguais (vermelho para despesas).

## Detalhes técnicos

- Já existe o hook `useCategoriaDreConfig` em uso (variável `debitaCat`).
- Reescrever o array `items` da seção `showResumoFinal` para:
  1. Iniciar com `Faturamento Bruto`, `% Bruto`, `Fat. Líquido`.
  2. Concatenar `despesaCols.filter(c => debitaCat(c.categoria)).map(...)`.
  3. Terminar com `Lucro Líquido` e `% Lucro Líquido`.
- `despesaCols` é um array local com `{ label, categoria, total }` para todas as 9 seções de despesa existentes.
- Nada muda no PDF nem nas demais tabelas (apenas o resumo final na tela).
