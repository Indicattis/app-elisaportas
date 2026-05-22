## Mudança

Em `src/pages/direcao/estrategia/EstrategiaItens.tsx`, no `handleCreate` (criação de novo item), passar as porcentagens definidas em "Padrões" (`padroes.taxa_impostos`, `padroes.taxa_descontos`, `padroes.taxa_cartao`) ao `createItem.mutateAsync`. Assim, qualquer item novo já nasce com as taxas globais e — assim que o Valor de Venda é digitado — as colunas Imposto, Desc. Gerente e Cartão exibem os valores calculados automaticamente.

Itens existentes continuam com suas taxas individuais (sem alteração).

## Arquivo

- `src/pages/direcao/estrategia/EstrategiaItens.tsx`
