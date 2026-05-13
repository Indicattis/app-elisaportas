CREATE OR REPLACE FUNCTION public.update_user_avatar(_target_user_id uuid, _new_url text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller uuid := auth.uid();
  _updated int := 0;
  _can_update_others boolean := false;
BEGIN
  IF _caller IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  SELECT (
    public.can_view_all_admin_users()
    OR public.has_route_access(_caller, 'users')
    OR public.can_manage_permissions(_caller)
  ) INTO _can_update_others;

  IF _caller <> _target_user_id AND COALESCE(_can_update_others, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'Sem permissão para alterar a foto do usuário';
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