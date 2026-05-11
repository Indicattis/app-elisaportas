BEGIN;
UPDATE public.vendas SET tipo_entrega='entrega' WHERE id='ffad3c1b-e514-4e0b-988c-d42746b519d2';
DELETE FROM public.instalacoes WHERE id='d609f9dd-e8cb-4819-861d-37ef5392057b';
DELETE FROM public.pedidos_etapas WHERE pedido_id='b4a53909-0072-480e-86cb-191762ddda34' AND etapa='instalacoes' AND data_saida IS NULL;
INSERT INTO public.pedidos_etapas (pedido_id, etapa, data_entrada, data_saida)
VALUES ('b4a53909-0072-480e-86cb-191762ddda34', 'aguardando_coleta', now(), NULL)
ON CONFLICT (pedido_id, etapa) DO UPDATE SET data_entrada=EXCLUDED.data_entrada, data_saida=NULL;
COMMIT;