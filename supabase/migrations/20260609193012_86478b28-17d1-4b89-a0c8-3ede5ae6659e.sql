
CREATE TABLE public.pintura_fornada_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  custo_por_fornada numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT SELECT, INSERT, UPDATE ON public.pintura_fornada_config TO authenticated;
GRANT ALL ON public.pintura_fornada_config TO service_role;

ALTER TABLE public.pintura_fornada_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated can read pintura_fornada_config"
  ON public.pintura_fornada_config FOR SELECT TO authenticated USING (true);

CREATE POLICY "admins can update pintura_fornada_config"
  ON public.pintura_fornada_config FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "admins can insert pintura_fornada_config"
  ON public.pintura_fornada_config FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

INSERT INTO public.pintura_fornada_config (custo_por_fornada) VALUES (0);
