ALTER TABLE public.vendas
ADD COLUMN rastreio_token uuid NOT NULL DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX vendas_rastreio_token_key
ON public.vendas (rastreio_token);

CREATE OR REPLACE FUNCTION public.get_rastreio_venda(p_token uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'venda', jsonb_build_object(
      'id', v.id,
      'numero', COALESCE(v.numero_pedido, RIGHT(v.id::text, 8)),
      'cliente_nome', v.cliente_nome,
      'data_venda', v.data_venda,
      'tipo_entrega', v.tipo_entrega
    ),
    'produtos', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', pv.id,
          'descricao', pv.descricao,
          'tipo_produto', pv.tipo_produto,
          'quantidade', pv.quantidade,
          'largura', pv.largura,
          'altura', pv.altura,
          'tamanho', pv.tamanho,
          'cor', cc.nome
        ) ORDER BY pv.created_at, pv.id
      )
      FROM public.produtos_vendas pv
      LEFT JOIN public.catalogo_cores cc ON cc.id = pv.cor_id
      WHERE pv.venda_id = v.id
    ), '[]'::jsonb),
    'pedido', CASE WHEN pp.id IS NULL THEN NULL ELSE jsonb_build_object(
      'numero', pp.numero_pedido,
      'etapa_atual', pp.etapa_atual,
      'status', pp.status,
      'data_entrega', pp.data_entrega,
      'created_at', pp.created_at,
      'arquivado', pp.arquivado
    ) END,
    'etapas', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'etapa', pe.etapa,
          'data_entrada', pe.data_entrada,
          'data_saida', pe.data_saida
        ) ORDER BY pe.data_entrada NULLS LAST, pe.created_at
      )
      FROM public.pedidos_etapas pe
      WHERE pe.pedido_id = pp.id
    ), '[]'::jsonb)
  )
  FROM public.vendas v
  LEFT JOIN LATERAL (
    SELECT p.*
    FROM public.pedidos_producao p
    WHERE p.venda_id = v.id
      AND p.arquivado = false
    ORDER BY p.created_at DESC
    LIMIT 1
  ) pp ON true
  WHERE v.rastreio_token = p_token
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_rastreio_venda(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_rastreio_venda(uuid) TO anon, authenticated;