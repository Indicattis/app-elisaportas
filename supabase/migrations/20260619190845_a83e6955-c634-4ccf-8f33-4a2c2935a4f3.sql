CREATE TABLE public.pesquisas_satisfacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id uuid NOT NULL UNIQUE REFERENCES public.pedidos_producao(id) ON DELETE CASCADE,
  respondido_por uuid,
  nota_atendimento int CHECK (nota_atendimento BETWEEN 1 AND 5),
  nota_produto int CHECK (nota_produto BETWEEN 1 AND 5),
  nota_instalacao int CHECK (nota_instalacao BETWEEN 1 AND 5),
  recomendaria boolean DEFAULT false,
  comentario text,
  quis_comprar_avulsos boolean NOT NULL DEFAULT false,
  itens_avulsos jsonb NOT NULL DEFAULT '[]'::jsonb,
  avaliou_no_google boolean NOT NULL DEFAULT false,
  anexos jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pesquisas_satisfacao TO authenticated;
GRANT ALL ON public.pesquisas_satisfacao TO service_role;

ALTER TABLE public.pesquisas_satisfacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view satisfaction surveys"
  ON public.pesquisas_satisfacao FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert satisfaction surveys"
  ON public.pesquisas_satisfacao FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update satisfaction surveys"
  ON public.pesquisas_satisfacao FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins can delete satisfaction surveys"
  ON public.pesquisas_satisfacao FOR DELETE TO authenticated USING (public.is_admin());

CREATE TRIGGER trg_pesquisas_satisfacao_updated_at
  BEFORE UPDATE ON public.pesquisas_satisfacao
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Authenticated can read pesquisas-satisfacao"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'pesquisas-satisfacao');
CREATE POLICY "Authenticated can upload pesquisas-satisfacao"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'pesquisas-satisfacao');
CREATE POLICY "Authenticated can update pesquisas-satisfacao"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'pesquisas-satisfacao');
CREATE POLICY "Authenticated can delete pesquisas-satisfacao"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'pesquisas-satisfacao');

INSERT INTO public.app_routes (key, path, label, description, icon, interface, parent_key, sort_order, active)
VALUES
  ('pos_vendas_hub', '/pos-vendas', 'Pós-Vendas (Hub)', 'Hub de pós-vendas', 'Headset', 'admin', NULL, 65, true),
  ('pos_vendas_pedidos', '/pos-vendas/pedidos', 'Pedidos em Pós-Vendas', 'Lista de pedidos para pesquisa de satisfação', 'Headset', 'admin', 'pos_vendas_hub', 1, true)
ON CONFLICT (key) DO NOTHING;