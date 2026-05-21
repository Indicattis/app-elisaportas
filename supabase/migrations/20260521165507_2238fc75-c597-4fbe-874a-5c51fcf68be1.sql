
-- 1. Renomear Caixa Elisa
UPDATE public.app_routes SET label = 'Capital de Giro Elisa' WHERE key = 'direcao_caixa_elisa';

-- 2. Criar hub Financeiro
INSERT INTO public.app_routes (key, path, label, parent_key, sort_order, interface)
VALUES ('direcao_financeiro', '/direcao/financeiro', 'Financeiro', 'direcao_hub', 5, 'padrao')
ON CONFLICT (key) DO UPDATE SET path = EXCLUDED.path, label = EXCLUDED.label, parent_key = EXCLUDED.parent_key, sort_order = EXCLUDED.sort_order;

-- 3. Reparent Faturamento e Metas
UPDATE public.app_routes SET parent_key = 'direcao_financeiro', sort_order = 1 WHERE key = 'direcao_faturamento';
UPDATE public.app_routes SET parent_key = 'direcao_financeiro', sort_order = 2 WHERE key = 'direcao_metas';

-- 4. Reparent Autorizados sob Aprovações
UPDATE public.app_routes SET parent_key = 'direcao_aprovacoes' WHERE key = 'direcao_autorizados';

-- 5. DRE agora vive dentro de Estratégia
UPDATE public.app_routes SET parent_key = 'direcao_estrategia', sort_order = 305 WHERE key = 'direcao_dre';

-- 6. Remover item antigo "Resultados" (substituído pelo DRE da Direção)
DELETE FROM public.app_routes WHERE key = 'direcao_estrategia_resultados';

-- 7. Cadastrar sub-rotas faltantes de Aprovações
INSERT INTO public.app_routes (key, path, label, parent_key, sort_order, interface) VALUES
  ('direcao_aprovacoes_fabrica', '/direcao/aprovacoes/fabrica', 'Aprovações Fábrica', 'direcao_aprovacoes', 2, 'padrao'),
  ('direcao_aprovacoes_compras', '/direcao/aprovacoes/compras', 'Aprovações Compras', 'direcao_aprovacoes', 3, 'padrao'),
  ('direcao_aprovacoes_autorizados', '/direcao/aprovacoes/autorizados', 'Aprovações Autorizados', 'direcao_aprovacoes', 4, 'padrao')
ON CONFLICT (key) DO UPDATE SET path = EXCLUDED.path, label = EXCLUDED.label, parent_key = EXCLUDED.parent_key, sort_order = EXCLUDED.sort_order;
