
-- 1. Backfill nome em instalacoes e correcoes
UPDATE public.instalacoes i
SET responsavel_instalacao_nome = ei.nome
FROM public.equipes_instalacao ei
WHERE i.responsavel_instalacao_id = ei.id
  AND i.responsavel_instalacao_nome IS NULL;

UPDATE public.correcoes c
SET responsavel_correcao_nome = ei.nome
FROM public.equipes_instalacao ei
WHERE c.responsavel_correcao_id = ei.id
  AND c.responsavel_correcao_nome IS NULL;

-- 2. Reescreve gerar_instalacao_finalizada com resolução via equipes_instalacao
CREATE OR REPLACE FUNCTION public.gerar_instalacao_finalizada(p_pedido_id uuid, p_finalizado_em timestamp with time zone DEFAULT now())
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_pedido record;
  v_venda record;
  v_valor numeric := 0;
  v_inst_id uuid;
  v_inst_nome text;
  v_inst_is_equipe boolean := false;
  v_corr_id uuid;
  v_corr_nome text;
  v_corr_is_equipe boolean := false;
  v_carr record;
  v_equipe_id uuid;
  v_equipe_nome text;
  v_autorizado_id uuid;
  v_autorizado_nome text;
BEGIN
  SELECT id, numero_pedido, numero_mes, mes_vigencia, cliente_nome, venda_id
    INTO v_pedido FROM public.pedidos_producao WHERE id = p_pedido_id;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT id, cliente_nome, estado, cidade
    INTO v_venda FROM public.vendas WHERE id = v_pedido.venda_id;

  IF v_pedido.venda_id IS NOT NULL THEN
    SELECT COALESCE(SUM(valor_total), 0) INTO v_valor
      FROM public.produtos_vendas
      WHERE venda_id = v_pedido.venda_id AND tipo_produto = 'instalacao';
    IF v_valor = 0 THEN
      SELECT COALESCE(valor_instalacao, 0) INTO v_valor FROM public.vendas WHERE id = v_pedido.venda_id;
    END IF;
  END IF;

  -- Snapshot da instalação mais recente (resolve nome via equipes_instalacao se necessário)
  SELECT
    i.responsavel_instalacao_id,
    COALESCE(i.responsavel_instalacao_nome, ei.nome),
    (ei.id IS NOT NULL)
    INTO v_inst_id, v_inst_nome, v_inst_is_equipe
    FROM public.instalacoes i
    LEFT JOIN public.equipes_instalacao ei ON ei.id = i.responsavel_instalacao_id
    WHERE i.pedido_id = p_pedido_id
    ORDER BY i.data_instalacao DESC NULLS LAST, i.created_at DESC
    LIMIT 1;

  -- Snapshot da correção mais recente
  SELECT
    c.responsavel_correcao_id,
    COALESCE(c.responsavel_correcao_nome, ei.nome),
    (ei.id IS NOT NULL)
    INTO v_corr_id, v_corr_nome, v_corr_is_equipe
    FROM public.correcoes c
    LEFT JOIN public.equipes_instalacao ei ON ei.id = c.responsavel_correcao_id
    WHERE c.pedido_id = p_pedido_id
    ORDER BY c.data_correcao DESC NULLS LAST, c.created_at DESC
    LIMIT 1;

  -- Roteia para equipe ou autorizado: prefere instalacao, cai para correcao
  IF v_inst_is_equipe THEN
    v_equipe_id := v_inst_id; v_equipe_nome := v_inst_nome;
  ELSIF v_corr_is_equipe THEN
    v_equipe_id := v_corr_id; v_equipe_nome := v_corr_nome;
  END IF;

  IF NOT v_inst_is_equipe AND v_inst_id IS NOT NULL THEN
    v_autorizado_id := v_inst_id; v_autorizado_nome := v_inst_nome;
  ELSIF NOT v_corr_is_equipe AND v_corr_id IS NOT NULL THEN
    v_autorizado_id := v_corr_id; v_autorizado_nome := v_corr_nome;
  END IF;

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
    v_equipe_id, v_equipe_nome,
    v_autorizado_id, v_autorizado_nome,
    v_carr.cid, v_carr.cnome,
    v_venda.estado, v_venda.cidade,
    p_finalizado_em
  )
  ON CONFLICT (pedido_id) DO NOTHING;
END;
$function$;

-- 3. Atualiza triggers de sync para resolver nome via equipes_instalacao
CREATE OR REPLACE FUNCTION public.sync_instalacao_finalizada_responsavel()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_is_equipe boolean := false;
  v_equipe_nome text;
  v_nome text;
BEGIN
  IF NEW.pedido_id IS NULL OR NEW.responsavel_instalacao_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT nome INTO v_equipe_nome FROM public.equipes_instalacao WHERE id = NEW.responsavel_instalacao_id;
  v_is_equipe := v_equipe_nome IS NOT NULL;
  v_nome := COALESCE(NEW.responsavel_instalacao_nome, v_equipe_nome);

  IF v_is_equipe THEN
    UPDATE public.instalacoes_finalizadas
      SET equipe_instalacao_id = NEW.responsavel_instalacao_id,
          equipe_instalacao_nome = v_nome,
          updated_at = now()
    WHERE pedido_id = NEW.pedido_id;
  ELSE
    UPDATE public.instalacoes_finalizadas
      SET autorizado_correcao_id = NEW.responsavel_instalacao_id,
          autorizado_correcao_nome = v_nome,
          updated_at = now()
    WHERE pedido_id = NEW.pedido_id;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_correcao_finalizada_responsavel()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_is_equipe boolean := false;
  v_equipe_nome text;
  v_nome text;
BEGIN
  IF NEW.pedido_id IS NULL OR NEW.responsavel_correcao_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT nome INTO v_equipe_nome FROM public.equipes_instalacao WHERE id = NEW.responsavel_correcao_id;
  v_is_equipe := v_equipe_nome IS NOT NULL;
  v_nome := COALESCE(NEW.responsavel_correcao_nome, v_equipe_nome);

  IF v_is_equipe THEN
    UPDATE public.instalacoes_finalizadas
      SET equipe_instalacao_id = NEW.responsavel_correcao_id,
          equipe_instalacao_nome = v_nome,
          updated_at = now()
    WHERE pedido_id = NEW.pedido_id;
  ELSE
    UPDATE public.instalacoes_finalizadas
      SET autorizado_correcao_id = NEW.responsavel_correcao_id,
          autorizado_correcao_nome = v_nome,
          updated_at = now()
    WHERE pedido_id = NEW.pedido_id;
  END IF;

  RETURN NEW;
END;
$function$;

-- 4. Re-backfill instalacoes_finalizadas com JOIN em equipes_instalacao
WITH inst_latest AS (
  SELECT DISTINCT ON (i.pedido_id)
    i.pedido_id,
    i.responsavel_instalacao_id AS id,
    COALESCE(i.responsavel_instalacao_nome, ei.nome) AS nome,
    (ei.id IS NOT NULL) AS is_equipe
  FROM public.instalacoes i
  LEFT JOIN public.equipes_instalacao ei ON ei.id = i.responsavel_instalacao_id
  WHERE i.pedido_id IS NOT NULL
  ORDER BY i.pedido_id, i.data_instalacao DESC NULLS LAST, i.created_at DESC
),
corr_latest AS (
  SELECT DISTINCT ON (c.pedido_id)
    c.pedido_id,
    c.responsavel_correcao_id AS id,
    COALESCE(c.responsavel_correcao_nome, ei.nome) AS nome,
    (ei.id IS NOT NULL) AS is_equipe
  FROM public.correcoes c
  LEFT JOIN public.equipes_instalacao ei ON ei.id = c.responsavel_correcao_id
  WHERE c.pedido_id IS NOT NULL
  ORDER BY c.pedido_id, c.data_correcao DESC NULLS LAST, c.created_at DESC
)
UPDATE public.instalacoes_finalizadas f
SET
  equipe_instalacao_id = CASE
    WHEN il.is_equipe THEN il.id
    WHEN cl.is_equipe THEN cl.id
    ELSE NULL
  END,
  equipe_instalacao_nome = CASE
    WHEN il.is_equipe THEN il.nome
    WHEN cl.is_equipe THEN cl.nome
    ELSE NULL
  END,
  autorizado_correcao_id = CASE
    WHEN il.id IS NOT NULL AND NOT il.is_equipe THEN il.id
    WHEN cl.id IS NOT NULL AND NOT cl.is_equipe THEN cl.id
    ELSE NULL
  END,
  autorizado_correcao_nome = CASE
    WHEN il.id IS NOT NULL AND NOT il.is_equipe THEN il.nome
    WHEN cl.id IS NOT NULL AND NOT cl.is_equipe THEN cl.nome
    ELSE NULL
  END,
  updated_at = now()
FROM inst_latest il
FULL OUTER JOIN corr_latest cl ON cl.pedido_id = il.pedido_id
WHERE f.pedido_id = COALESCE(il.pedido_id, cl.pedido_id);
