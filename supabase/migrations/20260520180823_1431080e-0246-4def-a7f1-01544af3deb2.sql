INSERT INTO app_routes (key, path, label, parent_key, sort_order, interface, active) VALUES
  ('direcao_estrategia', '/direcao/estrategia', 'Estratégia', 'direcao_hub', 300, 'padrao', true),
  ('direcao_estrategia_itens', '/direcao/estrategia/itens', 'Itens', 'direcao_estrategia', 301, 'padrao', true),
  ('direcao_estrategia_kits', '/direcao/estrategia/kits', 'Tabela de Kits', 'direcao_estrategia', 302, 'padrao', true),
  ('direcao_estrategia_precos', '/direcao/estrategia/precos', 'Tabela de Preços', 'direcao_estrategia', 303, 'padrao', true),
  ('direcao_estrategia_despesas', '/direcao/estrategia/despesas', 'Despesas', 'direcao_estrategia', 304, 'padrao', true),
  ('direcao_estrategia_resultados', '/direcao/estrategia/resultados', 'Resultados', 'direcao_estrategia', 305, 'padrao', true)
ON CONFLICT (key) DO UPDATE SET
  path = EXCLUDED.path,
  label = EXCLUDED.label,
  parent_key = EXCLUDED.parent_key,
  sort_order = EXCLUDED.sort_order,
  interface = EXCLUDED.interface,
  active = EXCLUDED.active;