CREATE OR REPLACE FUNCTION public.update_user_avatar(_target_user_id uuid, _new_url text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller uuid := auth.uid();
  _caller_role text;
  _updated int := 0;
BEGIN
  IF _caller IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  SELECT role INTO _caller_role FROM public.admin_users WHERE user_id = _caller AND ativo = true LIMIT 1;

  IF _caller <> _target_user_id
     AND COALESCE(_caller_role, '') NOT IN ('administrador', 'ceo', 'diretor', 'gerente') THEN
    RAISE EXCEPTION 'Sem permissão para alterar a foto de outro usuário';
  END IF;

  UPDATE public.admin_users
     SET foto_perfil_url = _new_url
   WHERE user_id = _target_user_id;
  GET DIAGNOSTICS _updated = ROW_COUNT;

  IF _updated = 0 THEN
    UPDATE public.representantes
       SET foto_perfil_url = _new_url
     WHERE user_id = _target_user_id;
    GET DIAGNOSTICS _updated = ROW_COUNT;
  END IF;

  RETURN _updated > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_user_avatar(uuid, text) TO authenticated;