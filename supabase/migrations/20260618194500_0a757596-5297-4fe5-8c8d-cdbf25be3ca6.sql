-- Sync triggers + corrected backfill for instalacoes_finalizadas responsáveis

CREATE OR REPLACE FUNCTION public.sync_instalacao_finalizada_responsavel()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_equipe boolean := false;
BEGIN
  IF NEW.pedido_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.responsavel_instalacao_id IS NOT NULL THEN
    SELECT EXISTS(SELECT 1 FROM public.equipes_instalacao WHERE id = NEW.responsavel_instalacao_id)
      INTO v_is_equipe;
  END IF;

  IF v_is_equipe THEN
    UPDATE public.instalacoes_finalizadas
      SET equipe_instalacao_id = NEW.responsavel_instalacao_id,
          equipe_instalacao_nome = NEW.responsavel_instalacao_nome,
          updated_at = now()
    WHERE pedido_id = NEW.pedido_id;
  ELSE
    UPDATE public.instalacoes_finalizadas
      SET autorizado_correcao_id = COALESCE(NEW.responsavel_instalacao_id, autorizado_correcao_id),
          autorizado_correcao_nome = COALESCE(NEW.responsavel_instalacao_nome, autorizado_correcao_nome),
          updated_at = now()
    WHERE pedido_id = NEW.pedido_id
      AND NEW.responsavel_instalacao_nome IS NOT NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_instalacao_finalizada_responsavel ON public.instalacoes;
CREATE TRIGGER trg_sync_instalacao_finalizada_responsavel
AFTER INSERT OR UPDATE OF responsavel_instalacao_id, responsavel_instalacao_nome
ON public.instalacoes
FOR EACH ROW
EXECUTE FUNCTION public.sync_instalacao_finalizada_responsavel();


CREATE OR REPLACE FUNCTION public.sync_correcao_finalizada_responsavel()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_equipe boolean := false;
BEGIN
  IF NEW.pedido_id IS NULL OR NEW.responsavel_correcao_nome IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.responsavel_correcao_id IS NOT NULL THEN
    SELECT EXISTS(SELECT 1 FROM public.equipes_instalacao WHERE id = NEW.responsavel_correcao_id)
      INTO v_is_equipe;
  END IF;

  IF v_is_equipe THEN
    UPDATE public.instalacoes_finalizadas
      SET equipe_instalacao_id = NEW.responsavel_correcao_id,
          equipe_instalacao_nome = NEW.responsavel_correcao_nome,
          updated_at = now()
    WHERE pedido_id = NEW.pedido_id;
  ELSE
    UPDATE public.instalacoes_finalizadas
      SET autorizado_correcao_id = NEW.responsavel_correcao_id,
          autorizado_correcao_nome = NEW.responsavel_correcao_nome,
          updated_at = now()
    WHERE pedido_id = NEW.pedido_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_correcao_finalizada_responsavel ON public.correcoes;
CREATE TRIGGER trg_sync_correcao_finalizada_responsavel
AFTER INSERT OR UPDATE OF responsavel_correcao_id, responsavel_correcao_nome
ON public.correcoes
FOR EACH ROW
EXECUTE FUNCTION public.sync_correcao_finalizada_responsavel();


-- Re-rodar backfill com classificação correta (equipe vs autorizado)
-- Limpa colunas para reaplicar
UPDATE public.instalacoes_finalizadas
   SET equipe_instalacao_id = NULL,
       equipe_instalacao_nome = NULL,
       autorizado_correcao_id = NULL,
       autorizado_correcao_nome = NULL;

-- Backfill instalações (classifica equipe ou autorizado)
WITH inst_resp AS (
  SELECT DISTINCT ON (i.pedido_id)
    i.pedido_id,
    i.responsavel_instalacao_id AS resp_id,
    i.responsavel_instalacao_nome AS resp_nome,
    EXISTS(SELECT 1 FROM public.equipes_instalacao e WHERE e.id = i.responsavel_instalacao_id) AS is_equipe
  FROM public.instalacoes i
  WHERE i.responsavel_instalacao_nome IS NOT NULL
  ORDER BY i.pedido_id, i.updated_at DESC NULLS LAST
)
UPDATE public.instalacoes_finalizadas f
   SET equipe_instalacao_id   = CASE WHEN r.is_equipe THEN r.resp_id   END,
       equipe_instalacao_nome = CASE WHEN r.is_equipe THEN r.resp_nome END,
       autorizado_correcao_id   = CASE WHEN NOT r.is_equipe THEN r.resp_id   END,
       autorizado_correcao_nome = CASE WHEN NOT r.is_equipe THEN r.resp_nome END,
       updated_at = now()
  FROM inst_resp r
 WHERE f.pedido_id = r.pedido_id;

-- Backfill correções (pode sobrescrever quando houver responsável de correção)
WITH cor_resp AS (
  SELECT DISTINCT ON (c.pedido_id)
    c.pedido_id,
    c.responsavel_correcao_id AS resp_id,
    c.responsavel_correcao_nome AS resp_nome,
    EXISTS(SELECT 1 FROM public.equipes_instalacao e WHERE e.id = c.responsavel_correcao_id) AS is_equipe
  FROM public.correcoes c
  WHERE c.responsavel_correcao_nome IS NOT NULL
  ORDER BY c.pedido_id, c.updated_at DESC NULLS LAST
)
UPDATE public.instalacoes_finalizadas f
   SET equipe_instalacao_id   = COALESCE(CASE WHEN r.is_equipe THEN r.resp_id   END, f.equipe_instalacao_id),
       equipe_instalacao_nome = COALESCE(CASE WHEN r.is_equipe THEN r.resp_nome END, f.equipe_instalacao_nome),
       autorizado_correcao_id   = COALESCE(CASE WHEN NOT r.is_equipe THEN r.resp_id   END, f.autorizado_correcao_id),
       autorizado_correcao_nome = COALESCE(CASE WHEN NOT r.is_equipe THEN r.resp_nome END, f.autorizado_correcao_nome),
       updated_at = now()
  FROM cor_resp r
 WHERE f.pedido_id = r.pedido_id;
