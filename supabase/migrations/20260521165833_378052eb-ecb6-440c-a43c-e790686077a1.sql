
-- 1. Insere a nova chave
INSERT INTO public.app_routes (key, path, label, parent_key, sort_order, interface)
VALUES ('administrativo_multas', '/administrativo/multas', 'Multas', 'administrativo_hub', 6, 'padrao')
ON CONFLICT (key) DO NOTHING;

-- 2. Migra permissões
UPDATE public.user_route_access SET route_key = 'administrativo_multas' WHERE route_key = 'admin_multas';

-- 3. Remove a chave antiga
DELETE FROM public.app_routes WHERE key = 'admin_multas';
