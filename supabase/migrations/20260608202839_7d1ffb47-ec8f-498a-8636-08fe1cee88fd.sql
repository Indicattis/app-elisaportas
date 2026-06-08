INSERT INTO public.app_routes (key, path, label, "group", interface, active) VALUES
  ('passos_evolucao', '/passos-evolucao', 'Passos para R$5 Milhões', 'Direção', 'padrao', true),
  ('regras_hub', '/regras', 'Regras', 'Vendas', 'padrao', true),
  ('vendas_visitas_tecnicas_realizadas', '/vendas/visitas-tecnicas/realizadas', 'Visitas Realizadas', 'Vendas', 'padrao', true),
  ('marketing_videos_ideias', '/marketing/videos-ideias', 'Vídeos & Ideias', 'Marketing', 'padrao', true)
ON CONFLICT (key) DO UPDATE SET path = EXCLUDED.path, label = EXCLUDED.label, "group" = EXCLUDED."group", active = true;