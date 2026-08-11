CREATE TABLE public.despesas_tipos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chave text NOT NULL UNIQUE,
  nome text NOT NULL,
  debita_dre boolean NOT NULL DEFAULT true,
  ordem integer NOT NULL DEFAULT 0,
  sistema boolean NOT NULL DEFAULT false,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.despesas_tipos TO authenticated;
GRANT ALL ON public.despesas_tipos TO service_role;

ALTER TABLE public.despesas_tipos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated pode ver tipos de despesa"
ON public.despesas_tipos FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated pode gerenciar tipos de despesa"
ON public.despesas_tipos FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_despesas_tipos_updated_at
BEFORE UPDATE ON public.despesas_tipos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.despesas_tipos (chave, nome, ordem, sistema, debita_dre)
VALUES
  ('folha', 'Folha Salarial', 1, true, true),
  ('projetada', 'Despesa projetada', 2, false, true),
  ('fixa', 'Fixas', 3, false, true),
  ('variavel', 'Variáveis', 4, false, true),
  ('autorizado', 'Autorizados', 5, false, true),
  ('imposto', 'Impostos', 6, false, true),
  ('investimento', 'Investimentos', 7, false, true),
  ('fornecedor', 'Fornecedores', 8, false, true),
  ('financiamento', 'Financiamentos', 9, false, true),
  ('frete', 'Fretes e Logística', 10, false, true),
  ('salario', 'Salários', 11, false, true)
ON CONFLICT (chave) DO NOTHING;

UPDATE public.despesas_tipos t
SET debita_dre = c.debita_dre
FROM public.despesas_categoria_dre_config c
WHERE c.categoria = t.chave;

CREATE OR REPLACE FUNCTION public.excluir_tipo_despesa(_origem text, _destino text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sistema boolean;
  v_count integer;
BEGIN
  SELECT sistema INTO v_sistema FROM public.despesas_tipos WHERE chave = _origem;
  IF v_sistema IS NULL THEN
    RAISE EXCEPTION 'Tipo de despesa % não encontrado', _origem;
  END IF;
  IF v_sistema THEN
    RAISE EXCEPTION 'Tipo de despesa do sistema não pode ser excluído';
  END IF;

  SELECT count(*) INTO v_count FROM public.tipos_custos WHERE tipo = _origem;

  IF v_count > 0 THEN
    IF _destino IS NULL OR _destino = _origem THEN
      RAISE EXCEPTION 'Informe um tipo de destino para os % custos existentes', v_count;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.despesas_tipos WHERE chave = _destino) THEN
      RAISE EXCEPTION 'Tipo de destino % não encontrado', _destino;
    END IF;
    UPDATE public.tipos_custos SET tipo = _destino WHERE tipo = _origem;
  END IF;

  DELETE FROM public.despesas_tipos WHERE chave = _origem;
  DELETE FROM public.despesas_categoria_dre_config WHERE categoria = _origem;
END;
$$;

GRANT EXECUTE ON FUNCTION public.excluir_tipo_despesa(text, text) TO authenticated;