
-- 1. Criar pastas raiz que faltam
INSERT INTO public.app_routes (key, path, label, "group", sort_order, active, "interface", parent_key)
VALUES
  ('autorizados_hub', '/autorizados', 'Autorizados', NULL, 2, true, 'padrao', NULL),
  ('financeiro_hub', '/financeiro', 'Financeiro', NULL, 8, true, 'padrao', NULL)
ON CONFLICT (key) DO UPDATE SET
  path = EXCLUDED.path,
  label = EXCLUDED.label,
  sort_order = EXCLUDED.sort_order,
  parent_key = EXCLUDED.parent_key,
  active = true,
  "interface" = EXCLUDED."interface";

-- 2. Re-parent rotas de Autorizados
UPDATE public.app_routes SET parent_key = 'autorizados_hub'
  WHERE key IN ('logistica_autorizados', 'direcao_autorizados');

-- 3. Re-parent rotas de Financeiro (admin_financeiro mantém seus filhos: faturamento, custos, caixa, cobrancas)
UPDATE public.app_routes SET parent_key = 'financeiro_hub'
  WHERE key IN ('admin_financeiro', 'admin_gastos', 'admin_entradas', 'admin_bancos');

-- 4. Reordenar pastas raiz da interface padrão conforme botões da Home
UPDATE public.app_routes SET sort_order = 1  WHERE key = 'direcao_hub';
UPDATE public.app_routes SET sort_order = 2  WHERE key = 'autorizados_hub';
UPDATE public.app_routes SET sort_order = 3  WHERE key = 'marketing_hub';
UPDATE public.app_routes SET sort_order = 4  WHERE key = 'vendas_hub';
UPDATE public.app_routes SET sort_order = 5  WHERE key = 'fabrica_hub';
UPDATE public.app_routes SET sort_order = 6  WHERE key = 'logistica_hub';
UPDATE public.app_routes SET sort_order = 7  WHERE key = 'pos_vendas_hub';
UPDATE public.app_routes SET sort_order = 8  WHERE key = 'financeiro_hub';
UPDATE public.app_routes SET sort_order = 9  WHERE key = 'administrativo_hub';
UPDATE public.app_routes SET sort_order = 10 WHERE key = 'passos_evolucao';
UPDATE public.app_routes SET sort_order = 11 WHERE key = 'regras_hub';
UPDATE public.app_routes SET sort_order = 12 WHERE key = 'estoque_hub';
