
CREATE TABLE public.caixa_roboost_etiquetas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  cor text NOT NULL DEFAULT 'sky',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.caixa_roboost_entradas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  valor numeric NOT NULL DEFAULT 0,
  etiqueta_id uuid REFERENCES public.caixa_roboost_etiquetas(id) ON DELETE SET NULL,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.caixa_roboost_etiquetas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caixa_roboost_entradas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage caixa roboost etiquetas"
  ON public.caixa_roboost_etiquetas
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins manage caixa roboost entradas"
  ON public.caixa_roboost_entradas
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE TRIGGER update_caixa_roboost_entradas_updated_at
  BEFORE UPDATE ON public.caixa_roboost_entradas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
