INSERT INTO public.app_routes (key, path, label, parent_key, sort_order, interface, active)
VALUES ('direcao_caixa_roboost', '/direcao/caixa-roboost', 'Caixa Roboost', 'direcao_hub', 0, 'padrao', true)
ON CONFLICT (key) DO UPDATE SET
  path = EXCLUDED.path,
  label = EXCLUDED.label,
  parent_key = EXCLUDED.parent_key,
  sort_order = EXCLUDED.sort_order,
  interface = EXCLUDED.interface,
  active = true;