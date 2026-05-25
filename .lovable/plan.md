## Objetivo

Permitir edição rápida (inline) dos valores das células da tabela de Folha Salarial em `/direcao/estrategia/despesas/:mes`, incluindo o salário.

## Comportamento

- Clicar em uma célula (Salário, Combustível, Insalub %, FGTS %, Previsão 13°) transforma a célula em um `<input>` numérico já focado e com valor selecionado.
- `Enter` ou `blur` confirma → salva no banco (`update` em `despesas_manuais_folha`) e recalcula o `total` da linha. `Esc` cancela.
- Colunas derivadas (Insalub valor, FGTS valor, Previsão 13° + FGTS 13°, Férias + 1/3 + FGTS, Total) **não** são editáveis — recalculam automaticamente após salvar.
- Coluna "Colaborador" permanece não editável (chave do lançamento).
- Indicador visual de hover (cursor pointer + leve highlight) para mostrar que a célula é clicável; spinner discreto enquanto salva; toast de erro se falhar.
- Após salvar, dispara o `onDataChange` existente para atualizar o total do mês no header.

## Mudanças de código

- `src/components/direcao/estrategia/DespesasResumoTopo.tsx`:
  - Novo subcomponente `EditableCell` (numérico, com sufixo opcional `%` ou formatação `BRL`).
  - `BlocoFolha` passa a renderizar `EditableCell` nas colunas editáveis e chama um handler `onPatch(rowId, patch)`.
  - Handler de patch no componente pai: faz `update` parcial, recalcula `total` com a `calcTotalFolha` já existente, atualiza estado local otimisticamente e chama `reload()` em caso de erro.

## Fora de escopo

- Sem mudanças no schema do banco, RLS, ou nas tabelas de Despesas Fixas/Variáveis (apenas Folha, conforme o pedido).
- Sem mudanças no diálogo de criação de folha.
