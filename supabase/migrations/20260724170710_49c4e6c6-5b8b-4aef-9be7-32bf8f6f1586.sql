-- Destravar pedido #0437: embalagem já concluída, avançar para aguardando_coleta
DO $$
DECLARE
  v_pedido_id uuid := '5f6f48df-0012-4226-b664-25791ced73d0';
BEGIN
  -- Fechar etapa embalagem
  UPDATE public.pedidos_etapas
  SET data_saida = now(),
      updated_at = now()
  WHERE pedido_id = v_pedido_id
    AND etapa = 'embalagem'
    AND data_saida IS NULL;

  -- Abrir/atualizar etapa aguardando_coleta via UPSERT
  INSERT INTO public.pedidos_etapas (pedido_id, etapa, data_entrada, updated_at)
  VALUES (v_pedido_id, 'aguardando_coleta', now(), now())
  ON CONFLICT (pedido_id, etapa) DO UPDATE
  SET data_entrada = now(),
      data_saida = NULL,
      updated_at = now();

  -- Atualizar etapa_atual do pedido
  UPDATE public.pedidos_producao
  SET etapa_atual = 'aguardando_coleta',
      updated_at = now()
  WHERE id = v_pedido_id;
END $$;