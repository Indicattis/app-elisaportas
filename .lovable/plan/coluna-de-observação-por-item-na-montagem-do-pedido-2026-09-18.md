# Coluna de observação por item na montagem do pedido

## Objetivo
Exibir, na lista “Produtos da Venda” da montagem do pedido, a observação individual já cadastrada em cada produto.

## Alterações
- Adicionar a coluna “Observação” à tabela de produtos no computador, lendo o campo `observacao_item` de cada produto.
- Exibir a mesma informação nos cartões da versão para celular.
- Mostrar “—” quando o item não tiver observação, sem alterar o cadastro ou as demais ações existentes.

## Detalhes técnicos
- A informação já existe em `produtos_vendas.observacao_item` e a consulta atual já carrega o registro completo; não será necessária alteração no banco.
- A mudança ficará restrita à tela de montagem de pedidos selecionada.
