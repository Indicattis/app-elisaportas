
-- Tabela de histórico de acordos com autorizados
CREATE TABLE public.acordos_autorizados_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  acordo_id uuid NOT NULL REFERENCES public.acordos_instalacao_autorizados(id) ON DELETE CASCADE,
  evento text NOT NULL,
  usuario_id uuid,
  usuario_nome text,
  valor_anterior jsonb,
  valor_novo jsonb,
  descricao text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.acordos_autorizados_historico TO authenticated;
GRANT ALL ON public.acordos_autorizados_historico TO service_role;

ALTER TABLE public.acordos_autorizados_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read historico acordos"
  ON public.acordos_autorizados_historico
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "auth insert historico acordos"
  ON public.acordos_autorizados_historico
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE INDEX idx_acordos_historico_acordo ON public.acordos_autorizados_historico(acordo_id, created_at DESC);

-- Função trigger
CREATE OR REPLACE FUNCTION public.log_acordo_autorizado_evento()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_nome text;
  v_status_label_old text;
  v_status_label_new text;
BEGIN
  IF v_user_id IS NOT NULL THEN
    SELECT nome INTO v_user_nome FROM public.admin_users WHERE user_id = v_user_id LIMIT 1;
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.acordos_autorizados_historico (acordo_id, evento, usuario_id, usuario_nome, valor_novo, descricao)
    VALUES (
      NEW.id, 'criado', v_user_id, v_user_nome,
      jsonb_build_object(
        'cliente_nome', NEW.cliente_nome,
        'valor_acordado', NEW.valor_acordado,
        'status', NEW.status,
        'data_acordo', NEW.data_acordo
      ),
      'Acordo criado com ' || NEW.cliente_nome || ' (' || to_char(NEW.valor_acordado, 'FM999G999G990D00') || ')'
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Status alterado
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.acordos_autorizados_historico (acordo_id, evento, usuario_id, usuario_nome, valor_anterior, valor_novo, descricao)
      VALUES (NEW.id, 'status_alterado', v_user_id, v_user_nome,
        jsonb_build_object('status', OLD.status),
        jsonb_build_object('status', NEW.status),
        'Status alterado: ' || COALESCE(OLD.status,'-') || ' → ' || COALESCE(NEW.status,'-'));
    END IF;

    -- Valor alterado
    IF NEW.valor_acordado IS DISTINCT FROM OLD.valor_acordado THEN
      INSERT INTO public.acordos_autorizados_historico (acordo_id, evento, usuario_id, usuario_nome, valor_anterior, valor_novo, descricao)
      VALUES (NEW.id, 'editado', v_user_id, v_user_nome,
        jsonb_build_object('valor_acordado', OLD.valor_acordado),
        jsonb_build_object('valor_acordado', NEW.valor_acordado),
        'Valor alterado: ' || to_char(OLD.valor_acordado, 'FM999G999G990D00') || ' → ' || to_char(NEW.valor_acordado, 'FM999G999G990D00'));
    END IF;

    -- Data alterada
    IF NEW.data_acordo IS DISTINCT FROM OLD.data_acordo THEN
      INSERT INTO public.acordos_autorizados_historico (acordo_id, evento, usuario_id, usuario_nome, valor_anterior, valor_novo, descricao)
      VALUES (NEW.id, 'editado', v_user_id, v_user_nome,
        jsonb_build_object('data_acordo', OLD.data_acordo),
        jsonb_build_object('data_acordo', NEW.data_acordo),
        'Data do acordo alterada: ' || to_char(OLD.data_acordo, 'DD/MM/YYYY') || ' → ' || to_char(NEW.data_acordo, 'DD/MM/YYYY'));
    END IF;

    -- Observações alteradas
    IF COALESCE(NEW.observacoes,'') IS DISTINCT FROM COALESCE(OLD.observacoes,'') THEN
      INSERT INTO public.acordos_autorizados_historico (acordo_id, evento, usuario_id, usuario_nome, valor_anterior, valor_novo, descricao)
      VALUES (NEW.id, 'editado', v_user_id, v_user_nome,
        jsonb_build_object('observacoes', OLD.observacoes),
        jsonb_build_object('observacoes', NEW.observacoes),
        'Observações atualizadas');
    END IF;

    -- Aprovação
    IF NEW.aprovado_direcao IS DISTINCT FROM OLD.aprovado_direcao AND NEW.aprovado_direcao = true THEN
      INSERT INTO public.acordos_autorizados_historico (acordo_id, evento, usuario_id, usuario_nome, descricao)
      VALUES (NEW.id, 'aprovado', v_user_id, v_user_nome, 'Acordo aprovado pela Direção');
    END IF;

    -- Reprovação
    IF NEW.reprovado_direcao IS DISTINCT FROM OLD.reprovado_direcao AND NEW.reprovado_direcao = true THEN
      INSERT INTO public.acordos_autorizados_historico (acordo_id, evento, usuario_id, usuario_nome, descricao)
      VALUES (NEW.id, 'reprovado', v_user_id, v_user_nome, 'Acordo reprovado pela Direção');
    END IF;

    -- Pagamento
    IF NEW.pago IS DISTINCT FROM OLD.pago THEN
      IF NEW.pago = true THEN
        INSERT INTO public.acordos_autorizados_historico (acordo_id, evento, usuario_id, usuario_nome, valor_novo, descricao)
        VALUES (NEW.id, 'pago', v_user_id, v_user_nome,
          jsonb_build_object('valor_acordado', NEW.valor_acordado),
          'Marcado como pago (' || to_char(NEW.valor_acordado, 'FM999G999G990D00') || ')');
      ELSE
        INSERT INTO public.acordos_autorizados_historico (acordo_id, evento, usuario_id, usuario_nome, descricao)
        VALUES (NEW.id, 'desmarcado_pago', v_user_id, v_user_nome, 'Pagamento desmarcado');
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_acordo_autorizado_evento
AFTER INSERT OR UPDATE ON public.acordos_instalacao_autorizados
FOR EACH ROW EXECUTE FUNCTION public.log_acordo_autorizado_evento();
