ALTER TABLE public.vendas
  ADD COLUMN IF NOT EXISTS autorizado_instalacao_id uuid REFERENCES public.autorizados(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS valor_acordado_autorizado numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS observacao_autorizado text;

CREATE OR REPLACE FUNCTION public.validar_venda_autorizado()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.tipo_entrega = 'autorizado' AND COALESCE(NEW.is_rascunho, false) = false THEN
    IF NEW.autorizado_instalacao_id IS NULL THEN
      RAISE EXCEPTION 'Selecione o autorizado responsável pela instalação';
    END IF;
    IF COALESCE(NEW.valor_acordado_autorizado, 0) <= 0 THEN
      RAISE EXCEPTION 'Informe o valor acordado com o autorizado';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_validar_venda_autorizado ON public.vendas;
CREATE TRIGGER trg_validar_venda_autorizado BEFORE INSERT OR UPDATE ON public.vendas
FOR EACH ROW EXECUTE FUNCTION public.validar_venda_autorizado();