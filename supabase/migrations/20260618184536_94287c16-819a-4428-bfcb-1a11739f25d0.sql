
-- 1. Tabela snapshot de instalações finalizadas
CREATE TABLE public.instalacoes_finalizadas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id uuid NOT NULL UNIQUE REFERENCES public.pedidos_producao(id) ON DELETE CASCADE,
  venda_id uuid REFERENCES public.vendas(id) ON DELETE SET NULL,
  numero_pedido text,
  numero_mes integer,
  mes_vigencia text,
  cliente_nome text,
  valor_instalacao numeric NOT NULL DEFAULT 0,
  equipe_instalacao_id uuid,
  equipe_instalacao_nome text,
  autorizado_correcao_id uuid,
  autorizado_correcao_nome text,
  responsavel_carregamento_id uuid,
  responsavel_carregamento_nome text,
  estado text,
  cidade text,
  finalizado_em timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_instalacoes_finalizadas_finalizado_em ON public.instalacoes_finalizadas(finalizado_em DESC);
CREATE INDEX idx_instalacoes_finalizadas_venda_id ON public.instalacoes_finalizadas(venda_id);

GRANT SELECT ON public.instalacoes_finalizadas TO authenticated;
GRANT ALL ON public.instalacoes_finalizadas TO service_role;

ALTER TABLE public.instalacoes_finalizadas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read instalacoes_finalizadas"
  ON public.instalacoes_finalizadas FOR SELECT TO authenticated USING (true);

-- 2. Função que gera o snapshot
CREATE OR REPLACE FUNCTION public.gerar_instalacao_finalizada(p_pedido_id uuid, p_finalizado_em timestamptz DEFAULT now())
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pedido record;
  v_venda record;
  v_valor numeric := 0;
  v_inst record;
  v_corr record;
  v_carr record;
BEGIN
  SELECT id, numero_pedido, numero_mes, mes_vigencia, cliente_nome, venda_id
    INTO v_pedido FROM public.pedidos_producao WHERE id = p_pedido_id;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT id, cliente_nome, estado, cidade
    INTO v_venda FROM public.vendas WHERE id = v_pedido.venda_id;

  -- Valor: soma de produtos_vendas tipo instalacao (valor_total já contém desconto da linha)
  IF v_pedido.venda_id IS NOT NULL THEN
    SELECT COALESCE(SUM(valor_total), 0) INTO v_valor
      FROM public.produtos_vendas
      WHERE venda_id = v_pedido.venda_id AND tipo_produto = 'instalacao';

    -- Fallback legado: se nenhum produto de instalação foi cadastrado, usa vendas.valor_instalacao
    IF v_valor = 0 THEN
      SELECT COALESCE(valor_instalacao, 0) INTO v_valor FROM public.vendas WHERE id = v_pedido.venda_id;
    END IF;
  END IF;

  -- Snapshot da ordem de instalação principal (mais recente)
  SELECT responsavel_instalacao_id AS eid, responsavel_instalacao_nome AS enome
    INTO v_inst
    FROM public.instalacoes
    WHERE pedido_id = p_pedido_id
    ORDER BY data_instalacao DESC NULLS LAST, created_at DESC
    LIMIT 1;

  -- Snapshot da correção (mais recente, se houver)
  SELECT responsavel_correcao_id AS aid, responsavel_correcao_nome AS anome
    INTO v_corr
    FROM public.correcoes
    WHERE pedido_id = p_pedido_id
    ORDER BY data_correcao DESC NULLS LAST, created_at DESC
    LIMIT 1;

  -- Snapshot do carregamento (mais recente concluído)
  SELECT responsavel_carregamento_id AS cid, responsavel_carregamento_nome AS cnome
    INTO v_carr
    FROM public.ordens_carregamento
    WHERE pedido_id = p_pedido_id
    ORDER BY carregamento_concluido_em DESC NULLS LAST, created_at DESC
    LIMIT 1;

  INSERT INTO public.instalacoes_finalizadas (
    pedido_id, venda_id, numero_pedido, numero_mes, mes_vigencia, cliente_nome,
    valor_instalacao,
    equipe_instalacao_id, equipe_instalacao_nome,
    autorizado_correcao_id, autorizado_correcao_nome,
    responsavel_carregamento_id, responsavel_carregamento_nome,
    estado, cidade, finalizado_em
  ) VALUES (
    p_pedido_id, v_pedido.venda_id, v_pedido.numero_pedido, v_pedido.numero_mes, v_pedido.mes_vigencia,
    COALESCE(v_venda.cliente_nome, v_pedido.cliente_nome),
    v_valor,
    v_inst.eid, v_inst.enome,
    v_corr.aid, v_corr.anome,
    v_carr.cid, v_carr.cnome,
    v_venda.estado, v_venda.cidade,
    p_finalizado_em
  )
  ON CONFLICT (pedido_id) DO NOTHING;
END;
$$;

-- 3. Trigger em pedidos_etapas quando entra em "finalizado"
CREATE OR REPLACE FUNCTION public.trg_pedidos_etapas_finalizado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.etapa = 'finalizado' THEN
    PERFORM public.gerar_instalacao_finalizada(NEW.pedido_id, COALESCE(NEW.data_entrada, now()));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pedidos_etapas_finalizado_snapshot ON public.pedidos_etapas;
CREATE TRIGGER pedidos_etapas_finalizado_snapshot
  AFTER INSERT OR UPDATE ON public.pedidos_etapas
  FOR EACH ROW EXECUTE FUNCTION public.trg_pedidos_etapas_finalizado();

-- Trigger updated_at
CREATE TRIGGER instalacoes_finalizadas_updated_at
  BEFORE UPDATE ON public.instalacoes_finalizadas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Backfill: pedidos atualmente em finalizado OU arquivados, usando data_entrada da etapa finalizado
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT pp.id AS pedido_id,
           COALESCE(
             (SELECT pe.data_entrada FROM public.pedidos_etapas pe
                WHERE pe.pedido_id = pp.id AND pe.etapa = 'finalizado'
                ORDER BY pe.data_entrada DESC LIMIT 1),
             pp.data_arquivamento,
             pp.updated_at
           ) AS finalizado_em
    FROM public.pedidos_producao pp
    WHERE pp.etapa_atual = 'finalizado' OR pp.arquivado = true
  LOOP
    PERFORM public.gerar_instalacao_finalizada(r.pedido_id, r.finalizado_em);
  END LOOP;
END $$;
