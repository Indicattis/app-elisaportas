ALTER TABLE public.despesas_padrao DROP CONSTRAINT despesas_padrao_tipo_check;
ALTER TABLE public.despesas_padrao ADD CONSTRAINT despesas_padrao_tipo_check
  CHECK (tipo = ANY (ARRAY['folha'::text, 'fixa'::text, 'variavel'::text, 'imposto'::text]));