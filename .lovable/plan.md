## Objetivo

Separar visualmente os cards de estados em `/autorizados` por região do Brasil (Norte, Nordeste, Centro-Oeste, Sudeste, Sul), mantendo o comportamento atual (drag-and-drop, indicadores, navegação).

## Como será

Em vez de uma única grade com todos os estados, a seção "Estados Cadastrados" passará a exibir **5 sub-seções colapsáveis**, uma por região:

```text
Estados Cadastrados  [4/27]

Sul                                                    [3 estados]
[RS] [SC] [PR]

Sudeste                                                [1 estado]
[SP]

Nordeste                                               [0 estados]
(vazio — oculto por padrão)

...
```

Regras:
- Cada região mostra apenas os estados cadastrados naquele grupo, usando o mesmo `SortableEstadoCard`.
- Regiões sem nenhum estado cadastrado ficam ocultas (ou com um placeholder discreto — ver pergunta abaixo).
- Cabeçalho de cada região tem título + contador de estados.
- Ordenação (drag-and-drop) continua funcionando, mas restrita a dentro da mesma região (arrastar entre regiões não faz sentido pois a região é derivada da sigla).

## Detalhes técnicos

- Novo utilitário `src/utils/regioesBrasil.ts` com mapa `sigla → região` (constante fixa, 27 UFs) e ordem canônica das regiões.
- `src/pages/direcao/AutorizadosPrecosDirecao.tsx`: substituir a grade única por um `map` das regiões, agrupando `estados` por `regiao`. Cada região tem seu próprio `DndContext` + `SortableContext` para preservar a reordenação por região.
- `reordenarEstados` em `useEstadosCidades.ts` já grava `ordem` global — vamos ajustá-lo para receber a lista completa reordenada (região reordenada + demais estados na ordem atual) e persistir o `ordem` de todos, para que a ordem visual dentro da região seja respeitada.
- Nenhuma mudança de schema no banco.

## Pergunta

Regiões sem estados cadastrados devem ficar **ocultas** (padrão limpo) ou aparecer com um placeholder tipo "Nenhum estado nesta região"?
