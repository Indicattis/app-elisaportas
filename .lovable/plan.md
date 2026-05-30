## Mudança

Em `/direcao/estrategia/despesas/configuracoes` → tabela "Folha Salarial padrão", quando `em_folha === false` para um colaborador:

- **Permanecem editáveis/visíveis normalmente:** Colaborador, Em folha, Setor, Salário, Total.
- **Demais colunas** (Combustível, Insalub %, Insalub valor, FGTS %, FGTS valor, Previsão 13°, FGTS 13°, Férias + 1/3 + FGTS) exibem apenas `0` em cinza claro (`text-white/30`), **sem inputs nem botões** — substituir o conteúdo da célula por um simples `formatCurrency(0)` ou `0%` cinza.

## Arquivo

`src/pages/direcao/estrategia/EstrategiaDespesasConfiguracoes.tsx` → componente `FolhaRow`:

- Adicionar `const desativado = item.em_folha === false;`.
- Para cada `<td>` das 8 colunas afetadas, renderizar condicionalmente:
  - Se `desativado`: `<td className="px-2 text-right text-white/30 text-xs">{formatCurrency(0)}</td>` (ou `0%` para colunas de percentual).
  - Senão: manter o conteúdo atual (InlineNum, valor calculado, botão auto, etc).

Linha do Total continua usando `calcTotalFolha`, que já devolve apenas o salário quando `em_folha === false`.

## Fora do escopo

- Sem alteração no banco.
- Linha de adição (input de novo colaborador) permanece como está — só linhas existentes mudam.
- Outras telas (despesas/mês, DRE) não são afetadas.
