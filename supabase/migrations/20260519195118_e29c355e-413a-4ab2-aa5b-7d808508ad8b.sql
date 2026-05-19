INSERT INTO public.app_routes (key, path, label, parent_key, sort_order, interface, active)
SELECT 'direcao_caixa_elisa', '/direcao/caixa-elisa', 'Caixa Elisa', parent_key, sort_order, interface, active
FROM public.app_routes WHERE key = 'direcao_caixa_roboost'
ON CONFLICT (key) DO NOTHING;

UPDATE public.user_route_access SET route_key = 'direcao_caixa_elisa' WHERE route_key = 'direcao_caixa_roboost';

DELETE FROM public.app_routes WHERE key = 'direcao_caixa_roboost';