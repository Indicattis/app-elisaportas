# Coluna "Pintura" na tabela de itens da fábrica

## O que muda
Em /direcao/estoque/configuracoes/produtos/fabrica, a tabela ganha a coluna **Pintura**, logo depois de **Setor**.

- Item pintado: aparece a etiqueta "Pintado" em destaque.
- Item não pintado: aparece "Não", em cinza.
- Clique na célula para trocar entre pintado e não pintado. A mudança salva na hora e mostra o aviso "Pintura atualizada", igual à coluna Setor.

## Detalhes técnicos
- Usa o campo `requer_pintura` que já existe no cadastro do item (o mesmo do formulário).
- Em `ProdutosFabrica.tsx`: nova célula ao lado do seletor de setor, cabeçalho "Pintura" e colspan das linhas de grupo/vazias +1. A troca reaproveita `onUpdateField(produto.id, { requer_pintura })`, e o toast passa a dizer "Pintura atualizada" para esse campo.
