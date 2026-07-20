CREATE OR REPLACE FUNCTION public.propagar_alteracao_cliente()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.nome IS DISTINCT FROM NEW.nome OR OLD.telefone IS DISTINCT FROM NEW.telefone THEN
    UPDATE public.vendas
    SET 
      cliente_nome = COALESCE(NEW.nome, cliente_nome),
      cliente_telefone = COALESCE(NEW.telefone, cliente_telefone)
    WHERE cliente_id = NEW.id;

    UPDATE public.pedidos_producao pp
    SET
      cliente_nome = COALESCE(NEW.nome, pp.cliente_nome),
      cliente_telefone = COALESCE(NEW.telefone, pp.cliente_telefone)
    FROM public.vendas v
    WHERE pp.venda_id = v.id AND v.cliente_id = NEW.id;

    UPDATE public.instalacoes ic
    SET
      nome_cliente = COALESCE(NEW.nome, ic.nome_cliente),
      telefone_cliente = COALESCE(NEW.telefone, ic.telefone_cliente)
    FROM public.vendas v
    WHERE ic.venda_id = v.id AND v.cliente_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$function$;