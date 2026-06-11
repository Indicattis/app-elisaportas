
CREATE TABLE public.visitas_tecnicas_conclusoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visita_id uuid NOT NULL UNIQUE REFERENCES public.visitas_tecnicas_agendadas(id) ON DELETE CASCADE,
  observacoes_gerais text,
  concluido_por uuid,
  concluido_em timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.visitas_tecnicas_conclusoes TO authenticated;
GRANT ALL ON public.visitas_tecnicas_conclusoes TO service_role;
ALTER TABLE public.visitas_tecnicas_conclusoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vtc_sel" ON public.visitas_tecnicas_conclusoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "vtc_ins" ON public.visitas_tecnicas_conclusoes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "vtc_upd" ON public.visitas_tecnicas_conclusoes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "vtc_del" ON public.visitas_tecnicas_conclusoes FOR DELETE TO authenticated USING (true);

CREATE TABLE public.visitas_tecnicas_portas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conclusao_id uuid NOT NULL REFERENCES public.visitas_tecnicas_conclusoes(id) ON DELETE CASCADE,
  ordem int NOT NULL DEFAULT 0,
  largura_vao numeric(10,2),
  altura_vao numeric(10,2),
  largura_total numeric(10,2),
  altura_total numeric(10,2),
  meia_cana_tipo text,
  meia_cana_especificacoes text,
  cores jsonb NOT NULL DEFAULT '[]'::jsonb,
  tem_tiras_frontais boolean NOT NULL DEFAULT false,
  qtd_tiras_frontais int,
  tem_controle_adicional boolean NOT NULL DEFAULT false,
  qtd_controle_adicional int,
  caixa_motor text,
  guia_tamanho text,
  acessorios jsonb NOT NULL DEFAULT '[]'::jsonb,
  tipo_servico text,
  posicao_porta text,
  posicao_motor text,
  posicao_guia text,
  posicao_testeira text,
  tipo_guia text,
  dificuldade_instalacao text,
  tem_tubo_afastamento boolean NOT NULL DEFAULT false,
  distancia_tubo_cm numeric(10,2),
  tem_tubo_tiras_frontais boolean NOT NULL DEFAULT false,
  retirar_portao_local boolean NOT NULL DEFAULT false,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.visitas_tecnicas_portas TO authenticated;
GRANT ALL ON public.visitas_tecnicas_portas TO service_role;
ALTER TABLE public.visitas_tecnicas_portas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vtp_sel" ON public.visitas_tecnicas_portas FOR SELECT TO authenticated USING (true);
CREATE POLICY "vtp_ins" ON public.visitas_tecnicas_portas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "vtp_upd" ON public.visitas_tecnicas_portas FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "vtp_del" ON public.visitas_tecnicas_portas FOR DELETE TO authenticated USING (true);

CREATE TABLE public.visitas_tecnicas_portas_fotos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  porta_id uuid NOT NULL REFERENCES public.visitas_tecnicas_portas(id) ON DELETE CASCADE,
  url text NOT NULL,
  legenda text,
  ordem int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.visitas_tecnicas_portas_fotos TO authenticated;
GRANT ALL ON public.visitas_tecnicas_portas_fotos TO service_role;
ALTER TABLE public.visitas_tecnicas_portas_fotos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vtpf_sel" ON public.visitas_tecnicas_portas_fotos FOR SELECT TO authenticated USING (true);
CREATE POLICY "vtpf_ins" ON public.visitas_tecnicas_portas_fotos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "vtpf_upd" ON public.visitas_tecnicas_portas_fotos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "vtpf_del" ON public.visitas_tecnicas_portas_fotos FOR DELETE TO authenticated USING (true);

CREATE TRIGGER set_updated_at_vt_conclusoes BEFORE UPDATE ON public.visitas_tecnicas_conclusoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_updated_at_vt_portas BEFORE UPDATE ON public.visitas_tecnicas_portas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_vt_portas_conclusao ON public.visitas_tecnicas_portas(conclusao_id);
CREATE INDEX idx_vt_fotos_porta ON public.visitas_tecnicas_portas_fotos(porta_id);

INSERT INTO public.app_routes (key, path, label, "group", interface, active)
VALUES ('vendas_visitas_tecnicas_concluir', '/vendas/visitas-tecnicas/:visitaId/concluir', 'Concluir Visita', 'Vendas', 'padrao', true)
ON CONFLICT (key) DO NOTHING;
