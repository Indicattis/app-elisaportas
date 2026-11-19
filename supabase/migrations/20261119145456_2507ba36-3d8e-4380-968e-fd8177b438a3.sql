CREATE OR REPLACE FUNCTION public.sync_pedido_linha_para_ordem()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_setor text;
  v_ordem_id uuid;
  v_status text;
BEGIN
  SELECT e.setor_responsavel_producao::text INTO v_setor FROM estoque e WHERE e.id = NEW.estoque_id;
  IF v_setor IS NULL THEN
    v_setor := CASE NEW.categoria_linha WHEN 'solda' THEN 'soldagem' WHEN 'perfiladeira' THEN 'perfiladeira' WHEN 'separacao' THEN 'separacao' ELSE NULL END;
  END IF;
  IF v_setor NOT IN ('soldagem','perfiladeira','separacao') THEN RETURN NEW; END IF;

  IF v_setor = 'soldagem' THEN
    SELECT id, status INTO v_ordem_id, v_status FROM ordens_soldagem WHERE pedido_id = NEW.pedido_id ORDER BY created_at DESC LIMIT 1;
  ELSIF v_setor = 'perfiladeira' THEN
    SELECT id, status INTO v_ordem_id, v_status FROM ordens_perfiladeira WHERE pedido_id = NEW.pedido_id ORDER BY created_at DESC LIMIT 1;
  ELSE
    SELECT id, status INTO v_ordem_id, v_status FROM ordens_separacao WHERE pedido_id = NEW.pedido_id ORDER BY created_at DESC LIMIT 1;
  END IF;

  IF v_ordem_id IS NULL THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM linhas_ordens WHERE pedido_linha_id = NEW.id AND tipo_ordem = v_setor) THEN RETURN NEW; END IF;

  INSERT INTO linhas_ordens (ordem_id, pedido_id, tipo_ordem, item, quantidade, tamanho, concluida, produto_venda_id, largura, altura, pedido_linha_id, estoque_id, indice_porta)
  VALUES (v_ordem_id, NEW.pedido_id, v_setor, COALESCE(NEW.nome_produto, NEW.descricao_produto, 'Item'), COALESCE(NEW.quantidade,1), NEW.tamanho, false, NEW.produto_venda_id, NEW.largura, NEW.altura, NEW.id, NEW.estoque_id, NEW.indice_porta);

  IF v_setor = 'soldagem' THEN
    UPDATE ordens_soldagem SET projeto_alterado = true, projeto_alterado_em = now(), projeto_alterado_descricao = 'Item adicionado: ' || COALESCE(NEW.nome_produto,'Item') WHERE id = v_ordem_id;
  ELSIF v_setor = 'perfiladeira' THEN
    UPDATE ordens_perfiladeira SET projeto_alterado = true, projeto_alterado_em = now(), projeto_alterado_descricao = 'Item adicionado: ' || COALESCE(NEW.nome_produto,'Item') WHERE id = v_ordem_id;
  ELSE
    UPDATE ordens_separacao SET projeto_alterado = true, projeto_alterado_em = now(), projeto_alterado_descricao = 'Item adicionado: ' || COALESCE(NEW.nome_produto,'Item') WHERE id = v_ordem_id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sync_pedido_linha_para_ordem ON public.pedido_linhas;
CREATE TRIGGER trg_sync_pedido_linha_para_ordem AFTER INSERT ON public.pedido_linhas
FOR EACH ROW EXECUTE FUNCTION public.sync_pedido_linha_para_ordem();

-- Corrigir pedido #1350 reaplicando a sincronização nas duas linhas faltantes
UPDATE public.pedido_linhas SET updated_at = updated_at WHERE id IN ('0b942958-71f6-4c80-a52c-ddb9a5478b3b','abba7ab5-02cf-4326-ad91-6d2ee56f7c83');
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM pedido_linhas WHERE id IN ('0b942958-71f6-4c80-a52c-ddb9a5478b3b','abba7ab5-02cf-4326-ad91-6d2ee56f7c83') LOOP
    INSERT INTO linhas_ordens (ordem_id, pedido_id, tipo_ordem, item, quantidade, tamanho, concluida, produto_venda_id, pedido_linha_id, estoque_id, indice_porta)
    SELECT CASE WHEN r.id = '0b942958-71f6-4c80-a52c-ddb9a5478b3b' THEN 'c12cb9b5-4ea0-433c-8d66-6ecc6f0d86c9'::uuid ELSE '585e183c-7d45-4773-b903-40bd1849c4d9'::uuid END,
      r.pedido_id, CASE WHEN r.id = '0b942958-71f6-4c80-a52c-ddb9a5478b3b' THEN 'soldagem' ELSE 'separacao' END,
      r.nome_produto, COALESCE(r.quantidade,1), r.tamanho, false, r.produto_venda_id, r.id, r.estoque_id, r.indice_porta
    WHERE NOT EXISTS (SELECT 1 FROM linhas_ordens WHERE pedido_linha_id = r.id);
  END LOOP;
END $$;
UPDATE public.ordens_soldagem SET projeto_alterado = true, projeto_alterado_em = now(), projeto_alterado_descricao = 'Item adicionado: Caixa L - 36 (1,55)' WHERE id = 'c12cb9b5-4ea0-433c-8d66-6ecc6f0d86c9';
UPDATE public.ordens_separacao SET projeto_alterado = true, projeto_alterado_em = now(), projeto_alterado_descricao = 'Item adicionado: Caixa Motor - 36 (0,95)' WHERE id = '585e183c-7d45-4773-b903-40bd1849c4d9';