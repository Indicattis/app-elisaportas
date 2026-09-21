ALTER TABLE public.pedidos_producao
  ADD COLUMN negociacao_iniciada_em TIMESTAMPTZ,
  ADD COLUMN negociacao_tempo_acumulado_segundos BIGINT NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.iniciar_negociacao_carregamento(p_pedido_id UUID)
RETURNS public.pedidos_producao
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_pedido public.pedidos_producao;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  UPDATE public.pedidos_producao
  SET negociacao_iniciada_em = COALESCE(negociacao_iniciada_em, now()),
      updated_at = now()
  WHERE id = p_pedido_id
    AND etapa_atual IN ('aguardando_coleta', 'instalacoes', 'correcoes')
  RETURNING * INTO v_pedido;

  IF v_pedido.id IS NULL THEN
    RAISE EXCEPTION 'Pedido não encontrado ou fora das etapas de negociação';
  END IF;

  RETURN v_pedido;
END;
$$;

CREATE OR REPLACE FUNCTION public.encerrar_negociacao_carregamento(p_pedido_id UUID)
RETURNS public.pedidos_producao
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_pedido public.pedidos_producao;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  UPDATE public.pedidos_producao
  SET negociacao_tempo_acumulado_segundos = negociacao_tempo_acumulado_segundos
        + CASE
            WHEN negociacao_iniciada_em IS NOT NULL
            THEN GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (now() - negociacao_iniciada_em)))::BIGINT)
            ELSE 0
          END,
      negociacao_iniciada_em = NULL,
      updated_at = now()
  WHERE id = p_pedido_id
  RETURNING * INTO v_pedido;

  IF v_pedido.id IS NULL THEN
    RAISE EXCEPTION 'Pedido não encontrado';
  END IF;

  RETURN v_pedido;
END;
$$;

REVOKE ALL ON FUNCTION public.iniciar_negociacao_carregamento(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.encerrar_negociacao_carregamento(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.iniciar_negociacao_carregamento(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.encerrar_negociacao_carregamento(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.encerrar_negociacao_ao_agendar_carregamento()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.data_carregamento IS NOT NULL
     AND NEW.data_carregamento IS DISTINCT FROM OLD.data_carregamento
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

CREATE TRIGGER encerrar_negociacao_ordem_carregamento
AFTER UPDATE OF data_carregamento ON public.ordens_carregamento
FOR EACH ROW EXECUTE FUNCTION public.encerrar_negociacao_ao_agendar_carregamento();

CREATE TRIGGER encerrar_negociacao_instalacao
AFTER UPDATE OF data_carregamento ON public.instalacoes
FOR EACH ROW EXECUTE FUNCTION public.encerrar_negociacao_ao_agendar_carregamento();

CREATE TRIGGER encerrar_negociacao_correcao
AFTER UPDATE OF data_carregamento ON public.correcoes
FOR EACH ROW EXECUTE FUNCTION public.encerrar_negociacao_ao_agendar_carregamento();