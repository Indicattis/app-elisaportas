CREATE TABLE public.regras_vendas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  limite_desconto_avista numeric NOT NULL DEFAULT 3,
  limite_desconto_fria numeric NOT NULL DEFAULT 5,
  limite_adicional_responsavel numeric NOT NULL DEFAULT 5,

  acrescimo_permite_com_desconto boolean NOT NULL DEFAULT false,
  acrescimo_descricao text NOT NULL DEFAULT 'O acréscimo (crédito) adiciona valor ao total da venda, aumentando a margem. Usado para adicionar margem extra ou cobrar por serviços adicionais.',

  boleto_intervalos_dias integer[] NOT NULL DEFAULT '{7,15,21,28,30,45,60}',

  cartao_parcelas_min integer NOT NULL DEFAULT 1,
  cartao_parcelas_max integer NOT NULL DEFAULT 12,
  cartao_habilita_desconto_avista boolean NOT NULL DEFAULT false,

  avista_exige_comprovante boolean NOT NULL DEFAULT true,

  obrigatorio_nome boolean NOT NULL DEFAULT true,
  obrigatorio_telefone boolean NOT NULL DEFAULT true,
  obrigatorio_estado boolean NOT NULL DEFAULT true,
  obrigatorio_cidade boolean NOT NULL DEFAULT true,
  obrigatorio_cep boolean NOT NULL DEFAULT true,
  obrigatorio_bairro_min_chars integer NOT NULL DEFAULT 2,
  obrigatorio_endereco_min_chars integer NOT NULL DEFAULT 2,
  produto_minimo_quantidade integer NOT NULL DEFAULT 1,
  cpf_digitos integer NOT NULL DEFAULT 11,
  cnpj_digitos integer NOT NULL DEFAULT 14,

  max_formas_pagamento integer NOT NULL DEFAULT 2,
  pagamento_imediato_exige_comprovante boolean NOT NULL DEFAULT true,
  bloqueia_desconto_com_credito boolean NOT NULL DEFAULT true,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.regras_vendas TO authenticated;
GRANT ALL ON public.regras_vendas TO service_role;

ALTER TABLE public.regras_vendas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados podem ler regras de vendas"
  ON public.regras_vendas FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins podem inserir regras de vendas"
  ON public.regras_vendas FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins podem atualizar regras de vendas"
  ON public.regras_vendas FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admins podem deletar regras de vendas"
  ON public.regras_vendas FOR DELETE TO authenticated
  USING (public.is_admin());

CREATE TRIGGER update_regras_vendas_updated_at
  BEFORE UPDATE ON public.regras_vendas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DO $$
DECLARE
  v_avista numeric;
  v_fria numeric;
  v_resp numeric;
BEGIN
  SELECT
    COALESCE(limite_desconto_avista, 3),
    COALESCE(limite_desconto_presencial, 5),
    COALESCE(limite_adicional_responsavel, 5)
  INTO v_avista, v_fria, v_resp
  FROM public.configuracoes_vendas
  ORDER BY created_at ASC
  LIMIT 1;

  INSERT INTO public.regras_vendas (
    limite_desconto_avista,
    limite_desconto_fria,
    limite_adicional_responsavel
  ) VALUES (
    COALESCE(v_avista, 3),
    COALESCE(v_fria, 5),
    COALESCE(v_resp, 5)
  );
END $$;