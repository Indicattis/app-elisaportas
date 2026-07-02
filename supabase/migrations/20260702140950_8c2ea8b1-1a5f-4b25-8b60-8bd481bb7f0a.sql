
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS numero_pedido text;
CREATE INDEX IF NOT EXISTS idx_vendas_numero_pedido ON public.vendas(numero_pedido);

UPDATE public.vendas v
SET numero_pedido = p.numero_pedido
FROM public.pedidos_producao p
WHERE p.venda_id = v.id AND v.numero_pedido IS NULL AND p.numero_pedido IS NOT NULL;

CREATE OR REPLACE FUNCTION public.sync_numero_pedido_from_producao()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.venda_id IS NOT NULL AND NEW.numero_pedido IS NOT NULL THEN
    UPDATE public.vendas
       SET numero_pedido = NEW.numero_pedido
     WHERE id = NEW.venda_id
       AND (numero_pedido IS DISTINCT FROM NEW.numero_pedido);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_numero_pedido_from_producao ON public.pedidos_producao;
CREATE TRIGGER trg_sync_numero_pedido_from_producao
AFTER INSERT OR UPDATE OF numero_pedido, venda_id ON public.pedidos_producao
FOR EACH ROW EXECUTE FUNCTION public.sync_numero_pedido_from_producao();

CREATE OR REPLACE FUNCTION public.sync_numero_pedido_to_producao()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_num text;
BEGIN
  IF NEW.venda_id IS NOT NULL AND (NEW.numero_pedido IS NULL OR NEW.numero_pedido = '') THEN
    SELECT numero_pedido INTO v_num FROM public.vendas WHERE id = NEW.venda_id;
    IF v_num IS NOT NULL THEN
      NEW.numero_pedido := v_num;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_numero_pedido_to_producao ON public.pedidos_producao;
CREATE TRIGGER trg_sync_numero_pedido_to_producao
BEFORE INSERT ON public.pedidos_producao
FOR EACH ROW EXECUTE FUNCTION public.sync_numero_pedido_to_producao();
