
CREATE OR REPLACE FUNCTION public.requisicoes_venda_calc()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.comissao_valor := round(
    GREATEST(COALESCE(NEW.valor_total, 0) - COALESCE(NEW.valor_frete, 0), 0)
    * COALESCE(NEW.comissao_pct, 0) / 100.0,
    2
  );
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;
