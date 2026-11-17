# Tinta necessária no PDF da Lista de Material

## O que muda
No PDF da lista de material gerado em /direcao/gestao-fabrica, entra uma página nova, "Tinta necessária", com uma tabela sobre os pedidos selecionados:

| Pedido | Cliente | Portas com pintura | m² | Tinta (kg) |
|---|---|---|---|---|

- Só entram as portas que têm pintura na venda. Pedidos sem pintura ficam fora da tabela.
- m² = largura × altura de cada porta pintada, somados por pedido.
- Tinta = m² × 1,25 kg.
- A última linha mostra o **total de kg para compra**, com o arredondamento:
  - parte decimal de 0,4 ou mais: arredonda para cima (ex.: 12,4 → 13);
  - parte decimal abaixo de 0,4: arredonda para baixo (ex.: 12,3 → 12).
- Na tabela, cada pedido mostra o valor exato (2 casas). O arredondamento vale só para o total.
- Se nenhum pedido selecionado tiver pintura, a página mostra "Nenhuma porta com pintura nos pedidos selecionados".

## Detalhes técnicos
- Em `gerarListaParaPedidos` (GestaoFabricaDirecao.tsx), buscar `pedidos_producao` (numero_pedido, cliente, venda_id) e, depois, `produtos_vendas` das vendas, filtrando portas com pintura (valor_pintura > 0 ou cor de pintura definida), e usando largura, altura e quantidade.
- Passar um novo parâmetro opcional `tinta: { pedido, cliente, portas, m2 }[]` para `gerarListaComprasPDF`, que adiciona a página com jspdf-autotable no mesmo estilo do PDF atual.
- Função pura `arredondarKgTinta(kg)` em `src/lib`, com teste: 12,4 → 13; 12,39 → 12; 12,0 → 12; e 1 m² → 1,25 kg.
- Constante 1,25 kg/m² salva na memória do projeto como regra de negócio.
