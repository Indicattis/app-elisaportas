CREATE TABLE IF NOT EXISTS public.vendas_catalogo_categorias_ordem (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  categoria TEXT NOT NULL UNIQUE,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.vendas_catalogo_categorias_ordem ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage vendas_catalogo_categorias_ordem"
ON public.vendas_catalogo_categorias_ordem
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Authenticated can view vendas_catalogo_categorias_ordem"
ON public.vendas_catalogo_categorias_ordem
FOR SELECT
TO authenticated
USING (true);

CREATE TRIGGER update_vendas_catalogo_categorias_ordem_updated_at
BEFORE UPDATE ON public.vendas_catalogo_categorias_ordem
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();