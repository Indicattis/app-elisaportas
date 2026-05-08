INSERT INTO public.app_routes (key, path, label, parent_key, interface, sort_order, description)
VALUES ('fabrica_produtos', '/fabrica/produtos', 'Configurar Itens', 'fabrica_hub', 'padrao', 26, 'Configuração dos itens da fábrica')
ON CONFLICT (key) DO UPDATE SET
  path = EXCLUDED.path,
  label = EXCLUDED.label,
  parent_key = EXCLUDED.parent_key,
  interface = EXCLUDED.interface,
  sort_order = EXCLUDED.sort_order,
  description = EXCLUDED.description;