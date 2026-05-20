
DO $$
DECLARE
  fix RECORD;
  exists_correct BOOLEAN;
BEGIN
  FOR fix IN
    SELECT * FROM (VALUES
      ('39947a8d-d3a2-47ad-9b52-69cb2dcdb21d'::uuid, 'PR', 'Capitão Leônidas Marques'),
      ('c34a0da9-90d7-4208-9539-2b89bbeb7f45'::uuid, 'PR', 'Goioerê'),
      ('74c3ee65-b42b-4bcb-ac9c-f2bc22b45a2f'::uuid, 'PR', 'Ivaiporã'),
      ('94a2858c-15c9-4fd2-bc10-2071939c3266'::uuid, 'PR', 'Lupionópolis'),
      ('9e329c8d-cf83-4f7c-a4d2-dbf1ded64a6a'::uuid, 'PR', 'Pinhão'),
      ('139f6b8c-d94c-4ad8-ac90-336cbb9a7f33'::uuid, 'PR', 'Porto Vitória'),
      ('751406fa-fb5f-4ed4-9fd3-d4896852e63f'::uuid, 'PR', 'Pérola d''Oeste'),
      ('7ad66910-c009-4394-b595-6771a3a002dd'::uuid, 'PR', 'Ribeirão do Pinhal'),
      ('1be32be0-ad8f-400e-8e3d-152fb62dfee0'::uuid, 'PR', 'Santana do Itararé'),
      ('3ba3881e-421a-4a95-a548-098cbacb3735'::uuid, 'PR', 'São Jorge d''Oeste'),
      ('d5e8bc51-da4d-4a60-9375-065cb508adac'::uuid, 'PR', 'Tunas do Paraná'),
      ('b8e2b46c-5e4e-426f-a30c-2dddd1753882'::uuid, 'RS', 'Barracão'),
      ('a65638b7-bae0-4823-afbd-02f4350d3dfc'::uuid, 'RS', 'Entre-Ijuís'),
      ('d217e36e-89e3-4f51-9eb1-8d27b930c865'::uuid, 'RS', 'Lagoa dos Três Cantos'),
      ('53ffad19-b101-4aac-9120-cdf605192543'::uuid, 'RS', 'Ilópolis'),
      ('aabacc95-0943-498d-8950-990ff9186aa5'::uuid, 'RS', 'Nova Araçá'),
      ('7910b800-8deb-441e-867d-ba0ab0cfeffd'::uuid, 'RS', 'Quatro Irmãos'),
      ('2103bf40-1e07-4b9d-a061-75f433c0c942'::uuid, 'RS', 'Salto do Jacuí'),
      ('240d8ff2-706c-475b-9acc-92e46cb69834'::uuid, 'RS', 'Serafina Corrêa'),
      ('0a83f539-096c-404a-9a7a-6d814d5e0fce'::uuid, 'RS', 'São Lourenço do Sul'),
      ('4529d279-e517-4198-926d-c81b5e4d8638'::uuid, 'SC', 'Apiúna'),
      ('eca98eeb-b53d-420f-a400-1efbddc33c97'::uuid, 'SC', 'Braço do Trombudo'),
      ('d9cff0df-f7d6-46f3-8718-247838c922e7'::uuid, 'SC', 'Chapadão do Lageado'),
      ('3e470821-7f34-4b88-8a7d-2e860fb72ca0'::uuid, 'SC', 'Grão-Pará'),
      ('57084bd9-1b23-437b-804c-adc26cc4b569'::uuid, 'SC', 'Ipuaçu'),
      ('09fef7c4-c339-4639-ad0a-f49f8313a1bc'::uuid, 'SC', 'São Cristóvão do Sul'),
      ('7aa1e083-def9-47d6-a833-652ed22e423d'::uuid, 'SC', 'São Domingos')
    ) AS t(id, uf, nome)
  LOOP
    SELECT EXISTS(
      SELECT 1 FROM public.frete_cidades
      WHERE estado = fix.uf AND lower(cidade) = lower(fix.nome) AND id <> fix.id
    ) INTO exists_correct;

    IF exists_correct THEN
      DELETE FROM public.frete_cidades WHERE id = fix.id;
    ELSE
      UPDATE public.frete_cidades SET cidade = fix.nome WHERE id = fix.id;
    END IF;
  END LOOP;
END $$;
