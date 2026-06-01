
-- Recalcular total da venda já descontando o excedente master do lucro
CREATE OR REPLACE FUNCTION public.recalcular_totais_venda()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  venda_uuid uuid;
  total_produtos numeric;
  total_frete numeric;
  total_bruto numeric;
  soma_lucros numeric;
  pct_desconto_aut numeric;
  limite_master numeric;
  excedente_pct numeric;
  debito_lucro numeric;
BEGIN
  venda_uuid := COALESCE(NEW.venda_id, OLD.venda_id);

  SELECT COALESCE(SUM(valor_total), 0) INTO total_produtos
  FROM produtos_vendas
  WHERE venda_id = venda_uuid;

  SELECT COALESCE(valor_frete, 0) INTO total_frete
  FROM vendas
  WHERE id = venda_uuid;

  -- Base bruta (antes de descontos) para o cálculo do excedente
  SELECT COALESCE(SUM((COALESCE(valor_produto,0) + COALESCE(valor_pintura,0) + COALESCE(valor_instalacao,0)) * COALESCE(quantidade,1)), 0)
    INTO total_bruto
  FROM produtos_vendas
  WHERE venda_id = venda_uuid;

  SELECT COALESCE(SUM(lucro_item), 0) INTO soma_lucros
  FROM produtos_vendas
  WHERE venda_id = venda_uuid;

  -- Maior % de autorização master para a venda (NULL se não houver)
  SELECT MAX(percentual_desconto) INTO pct_desconto_aut
  FROM vendas_autorizacoes_desconto
  WHERE venda_id = venda_uuid
    AND tipo_autorizacao = 'master';

  SELECT COALESCE(limite_desconto_master_lucro, 15) INTO limite_master
  FROM regras_vendas
  ORDER BY created_at ASC
  LIMIT 1;

  IF pct_desconto_aut IS NOT NULL AND total_bruto > 0 THEN
    excedente_pct := GREATEST(0, pct_desconto_aut - COALESCE(limite_master, 15));
    debito_lucro := total_bruto * (excedente_pct / 100.0);
  ELSE
    debito_lucro := 0;
  END IF;

  UPDATE vendas
  SET
    valor_venda = total_produtos + total_frete,
    lucro_total = soma_lucros - debito_lucro,
    valor_instalacao = COALESCE((
      SELECT SUM(valor_instalacao)
      FROM produtos_vendas
      WHERE venda_id = venda_uuid
    ), 0)
  WHERE id = venda_uuid;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Recalcula a venda quando uma autorização master é criada/alterada/removida
CREATE OR REPLACE FUNCTION public.recalcular_lucro_apos_autorizacao()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  venda_uuid uuid;
  total_produtos numeric;
  total_frete numeric;
  total_bruto numeric;
  soma_lucros numeric;
  pct_desconto_aut numeric;
  limite_master numeric;
  excedente_pct numeric;
  debito_lucro numeric;
BEGIN
  venda_uuid := COALESCE(NEW.venda_id, OLD.venda_id);

  SELECT COALESCE(SUM(valor_total), 0) INTO total_produtos
  FROM produtos_vendas
  WHERE venda_id = venda_uuid;

  SELECT COALESCE(valor_frete, 0) INTO total_frete
  FROM vendas
  WHERE id = venda_uuid;

  SELECT COALESCE(SUM((COALESCE(valor_produto,0) + COALESCE(valor_pintura,0) + COALESCE(valor_instalacao,0)) * COALESCE(quantidade,1)), 0)
    INTO total_bruto
  FROM produtos_vendas
  WHERE venda_id = venda_uuid;

  SELECT COALESCE(SUM(lucro_item), 0) INTO soma_lucros
  FROM produtos_vendas
  WHERE venda_id = venda_uuid;

  SELECT MAX(percentual_desconto) INTO pct_desconto_aut
  FROM vendas_autorizacoes_desconto
  WHERE venda_id = venda_uuid
    AND tipo_autorizacao = 'master';

  SELECT COALESCE(limite_desconto_master_lucro, 15) INTO limite_master
  FROM regras_vendas
  ORDER BY created_at ASC
  LIMIT 1;

  IF pct_desconto_aut IS NOT NULL AND total_bruto > 0 THEN
    excedente_pct := GREATEST(0, pct_desconto_aut - COALESCE(limite_master, 15));
    debito_lucro := total_bruto * (excedente_pct / 100.0);
  ELSE
    debito_lucro := 0;
  END IF;

  UPDATE vendas
  SET lucro_total = soma_lucros - debito_lucro
  WHERE id = venda_uuid;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

DROP TRIGGER IF EXISTS trigger_autorizacao_recalcula_lucro ON public.vendas_autorizacoes_desconto;
CREATE TRIGGER trigger_autorizacao_recalcula_lucro
AFTER INSERT OR UPDATE OR DELETE ON public.vendas_autorizacoes_desconto
FOR EACH ROW EXECUTE FUNCTION public.recalcular_lucro_apos_autorizacao();
