## Diagnóstico

Pedido **Sidinei Carrão da Silva** (`b2130df9-797b-43d1-bc01-20ea51a96211`, etapa `aprovacao_ceo`) tem uma única linha em `produtos_vendas` (venda `fd43d904-ac7b-4677-b8b8-f5f986fb5483`):

- `Caixa de fechamento (3m-6m)` (tipo_produto = `adicional`)
- `cor_id = NULL` → o sistema exibe como "Aço galvanizado" (cor padrão quando sem cor).
- `observacao_item = "MEDIDA 3,34 - COR BRANCO"` → confirma que o correto é **Branco**.

A cor exibida no card do pedido vem de `produtos_vendas.cor_id` → `catalogo_cores.nome`.

## Correção (data fix via migração)

`UPDATE produtos_vendas SET cor_id = '<id_branco>' WHERE id = '8dcf13f9-c982-4bab-8137-f6f343053e72';`

Onde `<id_branco>` = `cc180842-8fcd-4a9f-a98b-946f15928293` (cor "Branco" no catálogo).

Não alterar `valor_pintura`, `tipo_pintura` nem outros campos — o pedido segue sem cobrança de pintura, apenas a cor referenciada vira "Branco".