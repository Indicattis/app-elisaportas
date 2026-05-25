## Modal "Cálculo da bobina" em `/direcao/estrategia/itens`

Hoje o modal usa os valores fixos `230 kg ≡ 300 m` e divide o resultado por `300` para obter o "Preço por metro". Vamos manter `230 kg` (entrada do peso da bobina) fixo, mas substituir o `300` (e o rótulo `m`) pelo valor cadastrado na matéria-prima do item em `/direcao/estrategia/materias-primas`.

### Fonte do valor

- Para cada item, buscar as matérias-primas ativas via `useEstrategiaMateriasPrimas(item.id)`.
- Usar a soma de `quantidade_item` de todas as matérias-primas cadastradas para aquele item como o "rendimento" (substitui o `300`).
  - Justificativa: cada matéria-prima tem `quantidade_item = quantos [unidade do item] equivalem a 1 un da matéria-prima`. Como há apenas uma MP "bobina" por item de bobina típico, a soma cobre o caso geral sem complicar a UI.
- A unidade exibida (atualmente `m`) vira `item.unidade` (ex.: `m`, `m²`, `un`), usando `getUnidadeAbreviacao()` de `src/utils/unidadesMedida.ts` para normalizar o rótulo.

### Comportamento

- Linha "230 kg ≡ 300 m" passa a ser: `230 kg ≡ {rendimento} {unidadeItem}` (ex.: `230 kg ≡ 280 m`).
- "Preço por metro" passa a ser: `Preço por {unidadeItem}` = `resultado / rendimento`.
- Se o item não tiver matéria-prima cadastrada (ou rendimento `0`):
  - Mostrar um aviso curto no modal: "Cadastre uma matéria-prima em Estratégia › Matérias-primas para calcular o preço por unidade."
  - Ocultar a linha de "Preço por unidade" (evita divisão por zero).

### Arquivos afetados

- `src/pages/direcao/estrategia/EstrategiaItens.tsx`
  - `CalculoBobinaDialog`: receber `itemId` e `itemUnidade` como props (além de `itemDescricao`).
  - Dentro do dialog, consumir `useEstrategiaMateriasPrimas(itemId)` para obter o rendimento.
  - Substituir as ocorrências fixas de `300` e `"m"` pelos valores dinâmicos.
  - No `SortableItemRow`, passar `item.id` e `item.unidade` ao `CalculoBobinaDialog`.

Sem mudanças de schema, hooks novos ou rotas.
