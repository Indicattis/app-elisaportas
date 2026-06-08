
CREATE TABLE IF NOT EXISTS public.vendas_balanco_desconto (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venda_id uuid NOT NULL UNIQUE REFERENCES public.vendas(id) ON DELETE CASCADE,
  total_venda numeric NOT NULL DEFAULT 0,
  desconto_dado numeric NOT NULL DEFAULT 0,
  pct_desconto_dado numeric NOT NULL DEFAULT 0,
  pct_limite_permitido numeric NOT NULL DEFAULT 0,
  valor_balanco numeric NOT NULL DEFAULT 0,
  tipo text NOT NULL CHECK (tipo IN ('positivo','negativo','neutro')),
  data_venda timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.vendas_balanco_desconto TO authenticated;
GRANT ALL ON public.vendas_balanco_desconto TO service_role;

ALTER TABLE public.vendas_balanco_desconto ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read balanco desconto"
  ON public.vendas_balanco_desconto FOR SELECT
  TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_vendas_balanco_data ON public.vendas_balanco_desconto(data_venda);

CREATE OR REPLACE FUNCTION public.recalcular_balanco_desconto_vendas(p_inicio timestamptz, p_fim timestamptz)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_regras RECORD;
  v_venda RECORD;
  v_total numeric;
  v_desc numeric;
  v_pct_dado numeric;
  v_limite numeric;
  v_balanco numeric;
  v_tipo text;
  v_count integer := 0;
BEGIN
  SELECT limite_desconto_avista, limite_desconto_fria
    INTO v_regras
  FROM public.regras_vendas
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_regras IS NULL THEN
    v_regras.limite_desconto_avista := 3;
    v_regras.limite_desconto_fria := 5;
  END IF;

  FOR v_venda IN
    SELECT v.id, v.data_venda, v.venda_presencial, v.forma_pagamento, v.valor_venda
    FROM public.vendas v
    WHERE COALESCE(v.is_rascunho,false) = false
      AND COALESCE(v.valor_venda,0) >= 500
      AND v.data_venda >= p_inicio AND v.data_venda < p_fim
  LOOP
    SELECT
      COALESCE(SUM((COALESCE(pv.valor_produto,0) + COALESCE(pv.valor_pintura,0) + COALESCE(pv.valor_instalacao,0)) * COALESCE(pv.quantidade,1)),0),
      COALESCE(SUM(
        CASE
          WHEN pv.tipo_desconto = 'valor' THEN COALESCE(pv.desconto_valor,0)
          ELSE (COALESCE(pv.valor_produto,0) + COALESCE(pv.valor_pintura,0) + COALESCE(pv.valor_instalacao,0)) * COALESCE(pv.quantidade,1) * COALESCE(pv.desconto_percentual,0) / 100
        END
      ),0)
    INTO v_total, v_desc
    FROM public.produtos_vendas pv
    WHERE pv.venda_id = v_venda.id;

    IF v_total <= 0 THEN
      CONTINUE;
    END IF;

    v_pct_dado := v_desc / v_total * 100;

    v_limite := CASE
      WHEN COALESCE(v_venda.forma_pagamento,'') = '' OR v_venda.forma_pagamento = 'cartao_credito' THEN 0
      ELSE COALESCE(v_regras.limite_desconto_avista,0)
    END;
    IF COALESCE(v_venda.venda_presencial,false) THEN
      v_limite := v_limite + COALESCE(v_regras.limite_desconto_fria,0);
    END IF;

    v_balanco := (v_limite - v_pct_dado) / 100 * v_total;

    v_tipo := CASE
      WHEN v_balanco > 0.01 THEN 'positivo'
      WHEN v_balanco < -0.01 THEN 'negativo'
      ELSE 'neutro'
    END;

    INSERT INTO public.vendas_balanco_desconto(
      venda_id, total_venda, desconto_dado, pct_desconto_dado, pct_limite_permitido,
      valor_balanco, tipo, data_venda
    ) VALUES (
      v_venda.id, v_total, v_desc, v_pct_dado, v_limite, v_balanco, v_tipo, v_venda.data_venda
    )
    ON CONFLICT (venda_id) DO UPDATE SET
      total_venda = EXCLUDED.total_venda,
      desconto_dado = EXCLUDED.desconto_dado,
      pct_desconto_dado = EXCLUDED.pct_desconto_dado,
      pct_limite_permitido = EXCLUDED.pct_limite_permitido,
      valor_balanco = EXCLUDED.valor_balanco,
      tipo = EXCLUDED.tipo,
      data_venda = EXCLUDED.data_venda,
      updated_at = now();

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.recalcular_balanco_desconto_vendas(timestamptz, timestamptz) TO authenticated;
