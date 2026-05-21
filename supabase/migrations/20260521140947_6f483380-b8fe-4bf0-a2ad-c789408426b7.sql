UPDATE vendas
SET pedido_dispensado = false
WHERE pedido_dispensado = true
  AND frete_aprovado = true
  AND id NOT IN (SELECT venda_id FROM pedidos_producao WHERE venda_id IS NOT NULL)
  AND EXISTS (
    SELECT 1 FROM produtos_vendas pv
    WHERE pv.venda_id = vendas.id
    GROUP BY pv.venda_id
    HAVING bool_and(pv.faturamento = true)
  );