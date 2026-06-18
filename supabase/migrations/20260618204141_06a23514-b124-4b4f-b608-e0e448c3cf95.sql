
CREATE OR REPLACE FUNCTION public.sync_carregamento_finalizada_responsavel()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.pedido_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF (TG_OP = 'UPDATE' AND
      NEW.responsavel_carregamento_id IS NOT DISTINCT FROM OLD.responsavel_carregamento_id AND
      NEW.responsavel_carregamento_nome IS NOT DISTINCT FROM OLD.responsavel_carregamento_nome) THEN
    RETURN NEW;
  END IF;

  UPDATE public.instalacoes_finalizadas
     SET responsavel_carregamento_id = NEW.responsavel_carregamento_id,
         responsavel_carregamento_nome = NEW.responsavel_carregamento_nome
   WHERE pedido_id = NEW.pedido_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_carregamento_finalizada_responsavel ON public.ordens_carregamento;
CREATE TRIGGER trg_sync_carregamento_finalizada_responsavel
AFTER INSERT OR UPDATE OF responsavel_carregamento_id, responsavel_carregamento_nome
ON public.ordens_carregamento
FOR EACH ROW
EXECUTE FUNCTION public.sync_carregamento_finalizada_responsavel();
