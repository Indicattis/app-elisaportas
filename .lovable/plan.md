## Mudança

Em `src/pages/administrativo/NovaRequisicaoCompra.tsx`, adicionar uma coluna dedicada **SKU** na tabela de itens da requisição (logo após "Produto"):

- Novo `<TableHead>` com largura `w-28`, label "SKU".
- Nova `<TableCell>` exibindo `item.produto_sku` (ou "-" se vazio), em `text-xs text-white/60`.
- Remover o subtítulo "SKU ..." que hoje aparece embaixo do nome do produto, para não duplicar a informação.

## Fora de escopo

- Sem mudanças no fluxo de adicionar/remover itens.
- Sem mudanças no banco.
