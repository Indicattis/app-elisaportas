
DROP TABLE IF EXISTS public.frete_transportadoras CASCADE;

CREATE TABLE public.frete_regioes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transportadora_id uuid NOT NULL REFERENCES public.transportadoras(id) ON DELETE CASCADE,
  nome text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (transportadora_id, nome)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.frete_regioes TO authenticated;
GRANT ALL ON public.frete_regioes TO service_role;
ALTER TABLE public.frete_regioes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth full access frete_regioes" ON public.frete_regioes FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.frete_regiao_estados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  regiao_id uuid NOT NULL REFERENCES public.frete_regioes(id) ON DELETE CASCADE,
  estado text NOT NULL CHECK (char_length(estado) = 2),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (regiao_id, estado)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.frete_regiao_estados TO authenticated;
GRANT ALL ON public.frete_regiao_estados TO service_role;
ALTER TABLE public.frete_regiao_estados ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth full access frete_regiao_estados" ON public.frete_regiao_estados FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.check_estado_unico_por_transportadora()
RETURNS TRIGGER AS $$
DECLARE
  v_transportadora_id uuid;
BEGIN
  SELECT transportadora_id INTO v_transportadora_id FROM public.frete_regioes WHERE id = NEW.regiao_id;
  IF EXISTS (
    SELECT 1 FROM public.frete_regiao_estados fre
    JOIN public.frete_regioes fr ON fr.id = fre.regiao_id
    WHERE fr.transportadora_id = v_transportadora_id
      AND fre.estado = NEW.estado
      AND fre.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) THEN
    RAISE EXCEPTION 'Estado % já pertence a outra região desta transportadora', NEW.estado;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_estado_unico_transportadora
BEFORE INSERT OR UPDATE ON public.frete_regiao_estados
FOR EACH ROW EXECUTE FUNCTION public.check_estado_unico_por_transportadora();

CREATE TABLE public.frete_regiao_larguras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  regiao_id uuid NOT NULL REFERENCES public.frete_regioes(id) ON DELETE CASCADE,
  largura numeric NOT NULL,
  valor numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (regiao_id, largura)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.frete_regiao_larguras TO authenticated;
GRANT ALL ON public.frete_regiao_larguras TO service_role;
ALTER TABLE public.frete_regiao_larguras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth full access frete_regiao_larguras" ON public.frete_regiao_larguras FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_frete_regioes_updated BEFORE UPDATE ON public.frete_regioes FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER trg_frete_regiao_larguras_updated BEFORE UPDATE ON public.frete_regiao_larguras FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
