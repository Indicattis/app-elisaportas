# Latas de tinta por cor no PDF da lista de material

## O que muda
Na página "Tinta necessária", abaixo da tabela por pedido, entra uma segunda tabela **"Compra por cor"**:

| COR | PORTAS | M² | TINTA (KG) | LATAS (25 KG) |

- Uma linha por cor, somando todas as portas com pintura daquela cor nos pedidos selecionados.
- Kg por cor com o mesmo arredondamento (sobe a partir de 0,4); latas = kg arredondado ÷ 25, sempre para cima.
- Linha final **TOTAL** com a soma das latas de todas as cores (pode ser maior que as latas do total geral, pois cada cor compra latas separadas).
- Pintura sem cor cadastrada aparece como "Sem cor definida".
- A tabela por pedido ganha uma coluna **COR** (cores do pedido separadas por vírgula).

## Detalhes técnicos
- `GestaoFabricaDirecao.tsx`: incluir `cor_id, cor:catalogo_cores(nome)` no select de `produtos_vendas`; enviar ao PDF também a lista `{cor, portas, m2}` agrupada.
- `TintaPedido` ganha `cores: string`; `gerarListaComprasPDF` recebe parâmetro opcional `tintaPorCor`.
- Segunda `autoTable` usando `lastAutoTable.finalY + 10`.
- Teste: latas por cor somam corretamente (ex.: 26 kg cinza + 10 kg preto = 2 + 1 = 3 latas).
