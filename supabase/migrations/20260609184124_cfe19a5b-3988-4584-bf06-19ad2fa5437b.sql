INSERT INTO app_routes (key, path, label, icon, interface, parent_key, sort_order, active)
VALUES ('fabrica_controle_fornadas', '/fabrica/controle-fornadas', 'Controle de Fornadas', 'Flame', 'fabrica', 'fabrica_hub', 30, true)
ON CONFLICT (key) DO NOTHING;