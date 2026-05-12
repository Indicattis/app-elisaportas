-- Função SECURITY DEFINER para validar senha do responsável ou master
CREATE OR REPLACE FUNCTION public.verificar_senha_vendas(p_senha text, p_tipo text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_senha_correta text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  IF p_tipo = 'master' THEN
    SELECT senha_master INTO v_senha_correta
    FROM public.configuracoes_vendas
    LIMIT 1;
  ELSIF p_tipo = 'responsavel' THEN
    SELECT senha_responsavel INTO v_senha_correta
    FROM public.configuracoes_vendas
    LIMIT 1;
  ELSE
    RETURN false;
  END IF;

  IF v_senha_correta IS NULL OR p_senha IS NULL THEN
    RETURN false;
  END IF;

  RETURN p_senha = v_senha_correta;
END;
$$;

-- Função para obter dados públicos de configurações (sem senhas)
CREATE OR REPLACE FUNCTION public.get_configuracoes_vendas_publicas()
RETURNS TABLE(
  id uuid,
  responsavel_senha_responsavel_id uuid,
  responsavel_senha_master_id uuid,
  limite_desconto_avista numeric,
  limite_desconto_presencial numeric,
  limite_adicional_responsavel numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    cv.id,
    cv.responsavel_senha_responsavel_id,
    cv.responsavel_senha_master_id,
    cv.limite_desconto_avista,
    cv.limite_desconto_presencial,
    cv.limite_adicional_responsavel
  FROM public.configuracoes_vendas cv
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.verificar_senha_vendas(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_configuracoes_vendas_publicas() TO authenticated;