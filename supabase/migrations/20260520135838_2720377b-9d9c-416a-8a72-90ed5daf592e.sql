-- 1. Fix pontual da venda em análise (não faturada)
UPDATE produtos_vendas
SET valor_produto = 0
WHERE venda_id = '33af14d6-5fe4-4746-9b7c-a95aa9731449'
  AND tipo_produto = 'pintura_epoxi'
  AND valor_produto > 0
  AND valor_produto = valor_pintura;

-- 2. Trigger de validação (apenas em INSERT para preservar legados faturados)
CREATE OR REPLACE FUNCTION public.validar_produto_venda_servicos()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.tipo_produto = 'pintura_epoxi' THEN
    IF COALESCE(NEW.valor_produto, 0) <> 0 OR COALESCE(NEW.valor_instalacao, 0) <> 0 THEN
      RAISE EXCEPTION 'Itens de pintura_epoxi devem ter valor_produto=0 e valor_instalacao=0 (use apenas valor_pintura)';
    END IF;
  ELSIF NEW.tipo_produto = 'instalacao' THEN
    IF COALESCE(NEW.valor_produto, 0) <> 0 OR COALESCE(NEW.valor_pintura, 0) <> 0 THEN
      RAISE EXCEPTION 'Itens de instalacao devem ter valor_produto=0 e valor_pintura=0 (use apenas valor_instalacao)';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validar_produto_venda_servicos ON public.produtos_vendas;
CREATE TRIGGER trg_validar_produto_venda_servicos
BEFORE INSERT ON public.produtos_vendas
FOR EACH ROW
EXECUTE FUNCTION public.validar_produto_venda_servicos();