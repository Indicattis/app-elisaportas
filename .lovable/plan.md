# Seleção múltipla de pedidos em /direcao/gestao-fabrica

## Objetivo

Permitir selecionar vários pedidos dentro de cada aba de etapa e habilitar uma barra de ações (Lista de material, Imprimir pedidos) na mesma região onde hoje ficam os filtros (`PedidosFiltrosMinimalista`).

## Mudanças

### 1. Estado de seleção (`GestaoFabricaDirecao.tsx`)

- Novo state `selecionados: Set<string>` (ids de pedidos), resetado ao trocar de `etapaAtiva`.
- Helpers `toggleSelecionado(id)`, `selecionarTodos()`, `limparSelecao()`.
- Passar `selecionados`, `onToggleSelecionado` para `PedidosDraggableList`.

### 2. Checkbox no card de pedido

- Em `PedidosDraggableList` / `PedidoCardMinimalista`, adicionar um `<Checkbox>` à esquerda do card (visível só quando passada a prop `selectionEnabled`/handler).
- Borda azul e leve `bg-primary/5` quando selecionado.
- Não interfere no drag-and-drop (checkbox com `onClick` que faz `stopPropagation`).

### 3. Barra de ações ao lado dos filtros

Na linha do header (linhas ~993 e ~957) onde fica `PedidosFiltrosMinimalista`, criar um novo componente `PedidosSelecaoBar` que aparece **somente quando `selecionados.size > 0`**, exibindo:

- Texto "X selecionados" + botão "Limpar".
- Botão "Selecionar todos" (filtrados) quando selecionados < total.
- Botão `Lista de material` (ShoppingCart).
- Botão `Imprimir pedidos` (Printer).

Layout: barra fica à esquerda dos filtros existentes, no mesmo flex-row. Em mobile, empilha acima.

### 4. Ação "Lista de material" (em lote)

Reutilizar a lógica já existente em `handleGerarListaCompras` extraindo o miolo para uma função `gerarListaParaPedidos(pedidoIds: string[], etapaLabel: string)` em `src/utils/listaComprasPDF.ts` (ou helper local). A nova ação chama com `Array.from(selecionados)` e `ETAPAS_CONFIG[etapaAtiva].label + " (seleção)"`.

### 5. Ação "Imprimir pedidos" (em lote)

- Para cada pedido selecionado, chamar o gerador existente `pedidoProducaoPDFGenerator` (usado hoje em outras telas — precisa confirmar a função pública exportada; se não houver, usar `pedidoPDFGenerator`).
- Estratégia: gerar **um único PDF** com todos os pedidos concatenados (`doc.addPage()` entre pedidos) para imprimir de uma vez. Buscar dados em paralelo com `Promise.all` reaproveitando a mesma query do gerador atual (centralizar em uma função `buscarDadosPedidoParaPDF(id)` já que hoje cada gerador busca seus próprios dados).
- Ao final, `doc.save()` ou abrir em nova aba para impressão (`window.open(doc.output('bloburl'))`).
- Toast de sucesso/erro; loading state `imprimindoSelecionados`.

### 6. Escopo das abas

Aplicar a seleção **apenas nas abas de etapa** (`ORDEM_ETAPAS.map`). Não habilitar em `pendente_pedido`, `arquivo_morto`, nem nas listas Neo (instalações/correções) — fora do pedido do usuário.

## Fora de escopo

- Mobile (`GestaoFabricaMobile`) não recebe a barra nesta etapa, salvo se trivial.
- Nenhuma alteração de banco, RLS ou hook de dados.
- Nenhuma mudança nos PDFs em si — apenas chamadas em lote.

## Arquivos afetados

- `src/pages/direcao/GestaoFabricaDirecao.tsx` — state, barra, handlers.
- `src/components/pedidos/PedidosDraggableList.tsx` (e card filho) — checkbox de seleção.
- `src/components/pedidos/PedidosSelecaoBar.tsx` — novo componente.
- `src/utils/listaComprasPDF.ts` — opcional: aceitar `pedidoIds` direto.
- `src/utils/pedidoProducaoPDFGenerator.ts` — opcional: expor função para múltiplos pedidos em um doc.
