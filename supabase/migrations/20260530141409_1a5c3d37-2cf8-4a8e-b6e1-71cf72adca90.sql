-- 1. Tabela
CREATE TABLE public.system_setores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  ordem integer NOT NULL DEFAULT 999,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. GRANTs
GRANT SELECT ON public.system_setores TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_setores TO authenticated;
GRANT ALL ON public.system_setores TO service_role;

-- 3. RLS
ALTER TABLE public.system_setores ENABLE ROW LEVEL SECURITY;

-- 4. Policies
CREATE POLICY "system_setores_select_authenticated"
  ON public.system_setores FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "system_setores_select_anon"
  ON public.system_setores FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "system_setores_admins_insert"
  ON public.system_setores FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "system_setores_admins_update"
  ON public.system_setores FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "system_setores_admins_delete"
  ON public.system_setores FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- 5. Trigger updated_at
CREATE TRIGGER update_system_setores_updated_at
  BEFORE UPDATE ON public.system_setores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Seed dos 5 setores atuais
INSERT INTO public.system_setores (key, label, ordem) VALUES
  ('vendas',         'Vendas',         10),
  ('marketing',      'Marketing',      20),
  ('instalacoes',    'Instalações',    30),
  ('fabrica',        'Fábrica',        40),
  ('administrativo', 'Administrativo', 50);