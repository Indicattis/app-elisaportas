CREATE TABLE public.geocode_cidades (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 cidade_normalizada text NOT NULL,
 estado text NOT NULL,
 latitude double precision,
 longitude double precision,
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (cidade_normalizada, estado)
);
GRANT SELECT, INSERT, UPDATE ON public.geocode_cidades TO authenticated;
GRANT ALL ON public.geocode_cidades TO service_role;
ALTER TABLE public.geocode_cidades ENABLE ROW LEVEL SECURITY;
CREATE POLICY gc_sel ON public.geocode_cidades FOR SELECT TO authenticated USING (true);
CREATE POLICY gc_ins ON public.geocode_cidades FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY gc_upd ON public.geocode_cidades FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);