CREATE OR REPLACE FUNCTION public.encerrar_negociacao_ao_agendar_carregamento()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.data_carregamento IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.data_carregamento IS DISTINCT FROM OLD.data_carregamento)
     AND NEW.pedido_id IS NOT NULL THEN
    UPDATE public.pedidos_producao
    SET negociacao_tempo_acumulado_segundos = negociacao_tempo_acumulado_segundos
          + CASE
              WHEN negociacao_iniciada_em IS NOT NULL
              THEN GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (now() - negociacao_iniciada_em)))::BIGINT)
              ELSE 0
            END,
        negociacao_iniciada_em = NULL,
        updated_at = now()
    WHERE id = NEW.pedido_id
      AND negociacao_iniciada_em IS NOT NULL;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.encerrar_negociacao_ao_agendar_carregamento() FROM PUBLIC, anon, authenticated;

DROP TRIGGER encerrar_negociacao_ordem_carregamento ON public.ordens_carregamento;
CREATE TRIGGER encerrar_negociacao_ordem_carregamento
AFTER INSERT OR UPDATE OF data_carregamento ON public.ordens_carregamento
FOR EACH ROW EXECUTE FUNCTION public.encerrar_negociacao_ao_agendar_carregamento();

DROP TRIGGER encerrar_negociacao_instalacao ON public.instalacoes;
CREATE TRIGGER encerrar_negociacao_instalacao
AFTER INSERT OR UPDATE OF data_carregamento ON public.instalacoes
FOR EACH ROW EXECUTE FUNCTION public.encerrar_negociacao_ao_agendar_carregamento();

DROP TRIGGER encerrar_negociacao_correcao ON public.correcoes;
CREATE TRIGGER encerrar_negociacao_correcao
AFTER INSERT OR UPDATE OF data_carregamento ON public.correcoes
FOR EACH ROW EXECUTE FUNCTION public.encerrar_negociacao_ao_agendar_carregamento();