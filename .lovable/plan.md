## Objetivo

Permitir adicionar, editar e excluir despesas (catálogo `tipos_custos`) diretamente dos blocos "Despesas Fixas" e "Despesas Variáveis" em `/direcao/estrategia/despesas`, mantendo a visualização atual.

## Banco

Sem alterações de schema — usa `tipos_custos` existente (`nome`, `tipo`, `valor_maximo_mensal`, `ativo`, `aparece_no_dre`). Hook `useTiposCustos` já cobre CRUD.

## UI em `DespesasResumoTopo.tsx`

Apenas quando `mes === null` (modo configuração), o bloco "Despesas Fixas" e "Despesas Variáveis" ganha:

- **Edição inline do valor mensal**: cada linha existente troca o número estático por input numérico (`bg-white/5`, glassmorphism) que salva em `valor_maximo_mensal` no blur.
- **Edição inline do nome**: clique no nome abre input de texto que salva no blur.
- **Botão excluir** (ícone `Trash2`, aparece no hover da linha) — confirma via `AlertDialog` e chama `deleteTipoCusto`.
- **Linha de "Adicionar despesa"** no fim de cada bloco: input nome + input valor + botão `+`. Cria com `tipo='fixa'` ou `'variavel'` conforme o bloco e `aparece_no_dre=true`, `ativo=true`.

Quando `mes` está selecionado (visão histórica de `gastos`), mantém somente leitura — sem botões de edição/exclusão, sem criação. O CRUD afeta o catálogo, não o histórico.

A "Folha Salarial" não muda.

## Detalhes técnicos

- Reutiliza `useTiposCustos` (`saveTipoCusto`, `updateTipoCusto`, `deleteTipoCusto`).
- Após qualquer mutação, dispara `refetch` local do bloco recarregando `tipos_custos` (mesma query do `useEffect` atual em modo config).
- Componente `NumInput` já existe no arquivo; criar `TextInput` similar para o nome.
- Confirmação de exclusão via `AlertDialog` do shadcn já disponível no projeto.
- Toda a área editável só renderiza com `!mes` para preservar histórico.
