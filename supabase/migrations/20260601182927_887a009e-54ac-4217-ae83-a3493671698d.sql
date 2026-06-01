DO $$
DECLARE
  p_id uuid := '017d56fd-5966-4106-b4d4-53e5cd165eac';
BEGIN
  DELETE FROM linhas_ordens WHERE pedido_id = p_id;
  DELETE FROM ordens_soldagem WHERE pedido_id = p_id;
  DELETE FROM ordens_perfiladeira WHERE pedido_id = p_id;
  DELETE FROM ordens_pintura WHERE pedido_id = p_id;
  DELETE FROM ordens_qualidade WHERE pedido_id = p_id;
  DELETE FROM ordens_embalagem WHERE pedido_id = p_id;
  DELETE FROM ordens_separacao WHERE pedido_id = p_id;
  DELETE FROM ordens_carregamento WHERE pedido_id = p_id;
  DELETE FROM ordens_terceirizacao WHERE pedido_id = p_id;
  DELETE FROM ordens_porta_social WHERE pedido_id = p_id;
  DELETE FROM pedido_porta_observacoes WHERE pedido_id = p_id;
  DELETE FROM pedido_porta_social_observacoes WHERE pedido_id = p_id;
  DELETE FROM pedido_linhas WHERE pedido_id = p_id;
  DELETE FROM pedidos_etapas WHERE pedido_id = p_id;
  DELETE FROM pedidos_movimentacoes WHERE pedido_id = p_id;
  DELETE FROM pedidos_producao WHERE id = p_id;
END $$;