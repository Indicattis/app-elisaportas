ALTER TABLE public.tipos_custos DROP CONSTRAINT IF EXISTS tipos_custos_tipo_check;
ALTER TABLE public.tipos_custos ADD CONSTRAINT tipos_custos_tipo_check
  CHECK (tipo = ANY (ARRAY['fixa'::text, 'variavel'::text, 'imposto'::text]));