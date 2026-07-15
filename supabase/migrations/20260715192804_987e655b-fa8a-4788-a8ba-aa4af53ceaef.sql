
CREATE OR REPLACE FUNCTION public.marcar_parcelas_pagas_pedido_finalizado()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.venda_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.etapa_atual IN ('finalizado','pos_vendas')
     AND NEW.etapa_atual IS DISTINCT FROM OLD.etapa_atual THEN
    UPDATE public.contas_receber
       SET status = 'pago',
           valor_pago = valor_parcela,
           data_pagamento = CURRENT_DATE,
           updated_at = now()
     WHERE venda_id = NEW.venda_id
       AND status = 'pendente';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_marcar_parcelas_pagas_pedido_finalizado ON public.pedidos_producao;

CREATE TRIGGER trg_marcar_parcelas_pagas_pedido_finalizado
AFTER UPDATE OF etapa_atual ON public.pedidos_producao
FOR EACH ROW
EXECUTE FUNCTION public.marcar_parcelas_pagas_pedido_finalizado();

-- Backfill
UPDATE public.contas_receber cr
   SET status = 'pago',
       valor_pago = cr.valor_parcela,
       data_pagamento = CURRENT_DATE,
       updated_at = now()
  FROM public.pedidos_producao pp
 WHERE pp.venda_id = cr.venda_id
   AND pp.etapa_atual IN ('finalizado','pos_vendas')
   AND cr.status = 'pendente';
