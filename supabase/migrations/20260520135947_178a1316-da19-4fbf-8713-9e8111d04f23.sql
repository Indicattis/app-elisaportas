CREATE OR REPLACE FUNCTION public.validar_produto_venda_servicos()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Pintura epoxi: bloquear duplicacao de valor_produto com valor_pintura
  IF NEW.tipo_produto = 'pintura_epoxi' THEN
    IF COALESCE(NEW.valor_produto, 0) > 0 AND COALESCE(NEW.valor_pintura, 0) > 0 THEN
      RAISE EXCEPTION 'Item pintura_epoxi nao pode ter valor_produto e valor_pintura preenchidos simultaneamente (use apenas valor_pintura)';
    END IF;
  -- Instalacao: bloquear duplicacao de valor_produto com valor_instalacao
  ELSIF NEW.tipo_produto = 'instalacao' THEN
    IF COALESCE(NEW.valor_produto, 0) > 0 AND COALESCE(NEW.valor_instalacao, 0) > 0 THEN
      RAISE EXCEPTION 'Item instalacao nao pode ter valor_produto e valor_instalacao preenchidos simultaneamente';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;