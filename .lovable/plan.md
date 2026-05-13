## Objetivo

Em `/direcao/gestao-fabrica`, dentro de cada aba de etapa (`ORDEM_ETAPAS`), reorganizar o topo do card:

- A `PedidosSelecaoBar` fica no header, alinhada à direita (onde hoje convive com os filtros).
- A `PedidosFiltrosMinimalista` sai do header e vira uma nova seção própria, logo abaixo do header e acima do conteúdo da lista.

## Arquivo afetado

- `src/pages/direcao/GestaoFabricaDirecao.tsx` (bloco `ORDEM_ETAPAS.map` ~ linhas 1053-1190).

## Mudanças

1. No `<CardHeader>` da aba de etapa, manter o título à esquerda e, à direita, renderizar apenas a `PedidosSelecaoBar` (sem o wrapper que hoje agrupa seleção + filtros). Quando não houver seleção, o lado direito fica vazio (a barra já retorna `null`).

2. Criar uma nova seção entre `CardHeader` e `CardContent`: uma `<div>` com borda superior sutil (`border-t border-white/5`), padding horizontal/vertical compatível com o card (`px-4 py-3`), contendo a `PedidosFiltrosMinimalista` alinhada à esquerda e ocupando largura total. Em mobile mantém o wrap natural do componente.

3. Não alterar a aba `pendente_pedido` (já tem layout próprio sem seleção). Não mexer nas listas Neo nem no `GestaoFabricaMobile`.

4. Nenhuma mudança de lógica, props ou hooks — apenas reorganização de JSX.

## Layout resultante

```text
┌─────────────────────────────────────────────────────────────┐
│ Header: [Título + contadores + responsável + lista mat.]    │
│                                       [PedidosSelecaoBar →] │
├─────────────────────────────────────────────────────────────┤
│ Filtros: [busca] [entrega] [cor] ...                        │
├─────────────────────────────────────────────────────────────┤
│ CardContent (lista de pedidos)                              │
└─────────────────────────────────────────────────────────────┘
```

## Fora de escopo

- Estilos da `PedidosSelecaoBar` e `PedidosFiltrosMinimalista` em si.
- Mobile (`GestaoFabricaMobile.tsx`).
- Outras abas (faturamento, arquivo morto).
