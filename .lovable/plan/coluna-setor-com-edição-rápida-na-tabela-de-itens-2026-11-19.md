# Coluna "Setor" com edição rápida na tabela de itens

## O que muda
- Nova coluna **Setor** na tabela de /direcao/estoque/configuracoes/produtos/fabrica (e onde a mesma tabela aparece, como /fabrica/produtos), logo após "Produto/SKU".
- Cada célula mostra o setor como etiqueta colorida: Perfiladeira, Soldagem, Separação, Pintura, ou "Sem setor" em cinza.
- Ao clicar na célula abre uma lista com os 4 setores + "Sem setor"; ao escolher, salva na hora, mostra aviso "Setor atualizado" e a tabela atualiza sem recarregar.
- O clique na célula não abre a edição completa do item.

## Detalhes técnicos
- `src/pages/direcao/estoque/ProdutosFabrica.tsx`: novo TableHead/TableCell com `Select` compacto (mesmas opções do formulário), `onClick` com `stopPropagation`.
- Mutação: `supabase.from('estoque').update({ setor_responsavel_producao: valor | null }).eq('id', item.id)`, depois `invalidateQueries` da lista.
- Sem mudança no banco (coluna já existe).
