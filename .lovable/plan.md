## Objetivo

Em `/direcao/estrategia/despesas/configuracoes`, simplificar o bloco de Folha Salarial padrão para conter apenas **Nome do colaborador** e **Salário**. Os demais campos (Combustível, Insalubridade %, FGTS %, Previsão 13°) saem da tela de configurações e passam a ser preenchidos somente em `/direcao/estrategia/despesas/{mes}`.

## Mudanças

**`src/pages/direcao/estrategia/EstrategiaDespesasConfiguracoes.tsx`**
- `FolhaBlock`: remover state `aux`, `insalub`, `fgts`, `prev13` e seus inputs da linha de adicionar. Inserir somente `salario` (com defaults 0/8 para os demais via hook).
- Reduzir a tabela para colunas: Colaborador, Salário, Ações. Remover colunas Combustível, Insalub %, FGTS %, Previsão 13°, Total.
- `FolhaRow`: manter só nome e salário inline-editáveis; remover demais células.
- Remover `calcTotalFolha` e o rodapé "Total mensal estimado" desse bloco (não faz sentido sem os outros componentes).

**Sem mudanças no banco**: a tabela `despesas_padrao` continua tendo as colunas `aux_combustivel`, `insalubridade_pct`, `fgts_pct`, `previsao_13_valor` com default 0/8. Eles continuarão sendo usados como base na tela do mês (que já permite editar inline).

## Comportamento em `/despesas/{mes}`

Nenhuma alteração: a sugestão "Padrão" da folha já aparece com os valores cadastrados (apenas salário > 0, demais zerados). O usuário edita inline qualquer campo (Combustível, Insalub, FGTS, 13°) e ao primeiro toque a linha vira lançamento real do mês — fluxo já existente.

## Arquivos afetados

- **edit** `src/pages/direcao/estrategia/EstrategiaDespesasConfiguracoes.tsx`
