## Objetivo

Substituir a página em `/administrativo/compras/estoque` por uma cópia idêntica de `/administrativo/compras/itens` (mesmo comportamento, layout e edição inline incluindo SKU).

## Mudanças

### 1. Substituir o componente da rota `/administrativo/compras/estoque`
- Em `src/App.tsx` (linha 612), trocar `<EstoqueMinimalista />` por `<ItensAdministrativo />` na rota `/administrativo/compras/estoque`.
- Remover a rota `/administrativo/compras/estoque/editar-item/:id` (linha 613) e o import de `EstoqueEditMinimalista`, já que a nova página usa edição inline (sem rota de edição separada).
- Remover o import de `EstoqueMinimalista` em `App.tsx`.

### 2. Excluir os arquivos antigos
- Apagar `src/pages/administrativo/EstoqueMinimalista.tsx`.
- Apagar `src/pages/administrativo/EstoqueEditMinimalista.tsx`.

### 3. Ajustar `backPath` / breadcrumbs ao usar `ItensAdministrativo` em duas rotas
- O componente `ItensAdministrativo` hoje aponta `backPath="/administrativo/compras"` e título "Itens" — isso continua válido para ambas as rotas (`/itens` e `/estoque`), então **nenhuma alteração interna** é necessária.
- A rota `/administrativo/compras/itens` permanece como está (ponto de entrada principal usado pelo botão "Gerenciar itens" da Nova Requisição).
- A rota `/administrativo/compras/estoque` passa a renderizar exatamente a mesma página.

## Pontos fora do escopo

- Não alterar `ComprasHub.tsx` nem `ComprasHome.tsx` (continuam apontando para `/administrativo/compras/estoque`, que agora carrega a nova página).
- Não mexer em rotas legadas `/dashboard/administrativo/compras/estoque/...` (sub-rotas como `regras-etiquetas` e `gerenciamento` não pertencem a esta rota minimalista).
- Sem mudanças de banco de dados.

## Observações técnicas

- A rota `/administrativo/compras/estoque/editar-item/:id` deixa de existir; quaisquer links internos que ainda a referenciem ficarão órfãos. Verificação rápida confirmou que ela só é usada dentro do próprio `EstoqueMinimalista.tsx` (que será excluído).
- A `routeKey="administrativo_hub"` é mantida para preservar permissões.
