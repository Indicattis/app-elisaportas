-- Replace frete_regiao_estados (UF-based) with frete_regiao_cidades (city-based)
DROP TABLE IF EXISTS public.frete_regiao_estados CASCADE;

CREATE TABLE public.frete_regiao_cidades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  regiao_id uuid NOT NULL REFERENCES public.frete_regioes(id) ON DELETE CASCADE,
  cidade_id uuid NOT NULL REFERENCES public.frete_cidades(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (regiao_id, cidade_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.frete_regiao_cidades TO authenticated;
GRANT ALL ON public.frete_regiao_cidades TO service_role;

ALTER TABLE public.frete_regiao_cidades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated manage frete_regiao_cidades"
  ON public.frete_regiao_cidades FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE INDEX idx_frete_regiao_cidades_regiao ON public.frete_regiao_cidades(regiao_id);
CREATE INDEX idx_frete_regiao_cidades_cidade ON public.frete_regiao_cidades(cidade_id);

-- Trigger: cidade exclusiva por transportadora
CREATE OR REPLACE FUNCTION public.check_cidade_unica_por_transportadora()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transportadora uuid;
  v_conflito text;
BEGIN
  SELECT transportadora_id INTO v_transportadora FROM public.frete_regioes WHERE id = NEW.regiao_id;
  SELECT r.nome INTO v_conflito
  FROM public.frete_regiao_cidades rc
  JOIN public.frete_regioes r ON r.id = rc.regiao_id
  WHERE rc.cidade_id = NEW.cidade_id
    AND r.transportadora_id = v_transportadora
    AND rc.regiao_id <> NEW.regiao_id
  LIMIT 1;
  IF v_conflito IS NOT NULL THEN
    RAISE EXCEPTION 'Cidade já está na região "%" desta transportadora', v_conflito;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_cidade_unica ON public.frete_regiao_cidades;
CREATE TRIGGER trg_check_cidade_unica
  BEFORE INSERT OR UPDATE ON public.frete_regiao_cidades
  FOR EACH ROW EXECUTE FUNCTION public.check_cidade_unica_por_transportadora();