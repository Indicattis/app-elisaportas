
-- 1) Criar item "Manutenção"
INSERT INTO public.custos_itens (descricao, categoria, unidade, preco_venda)
SELECT 'Manutenção', 'Itens Avulsos', 'Un', 100
WHERE NOT EXISTS (SELECT 1 FROM public.custos_itens WHERE descricao = 'Manutenção');

-- 2) Reapontar produtos_vendas para custos_itens conforme mapeamento aprovado
UPDATE public.produtos_vendas pv
SET custos_itens_id = m.ci_id::uuid
FROM (VALUES
  ('c4cb98a9-ad10-4189-b1ac-71da94577838','f6c7b9ca-46ea-42df-bc26-ba73a979a4c6'), -- Alçapão -> Alçapão Porta de Enrolar
  ('06af28b0-200b-4f43-b10e-d914b603671d','ac6b6895-0d64-4ee6-b566-76fb3a92fd78'), -- Antiesmagamento até 4,00m
  ('157e00d6-1dfa-4d13-978f-94c33db67403','7cf055f1-6bbd-417e-8b49-7d28182d2e30'), -- Antiesmagamento até 6,00m
  ('f2f9c801-ebed-489e-9167-88c6cbfc2d79','c57044d8-65e0-4967-9c73-a7e55cbb8393'), -- Antiesmagamento até 10,00m
  ('fb67ce24-433c-4ff7-8dc0-20c2b2901ca9','82849f1e-7849-406f-9fdd-3743ee2808d2'), -- Antiqueda
  ('f66a11cc-c46f-4c82-8b09-264bf6e098de','20a5529a-96c2-477b-b407-9d1632b91f70'), -- Barra anti vento
  ('f7df229f-14f2-424d-8cd9-179c9f9f500f','bbf9683a-9c86-4954-a142-73fe69d3f56c'), -- Caixa fechamento 1-3
  ('856625f1-891d-4faf-9d86-7cf3270597ff','b8434057-0370-4f54-9631-139d23347f29'), -- Caixa fechamento 3-6
  ('7ccf0d91-ab79-4aaf-b547-0bc10cfe392a','a3e1d140-d02d-42d7-b7ee-a83819188910'), -- Caixa fechamento 6-8
  ('9a567af3-e60e-4b7a-9c7d-b521ba7f6cfd','3b1f3495-5863-4b7f-a32f-2d3f8064046f'), -- Caixa fechamento (motor) -> Caixa motor ((Avulsa)
  ('0555df7f-21a4-45ec-aa19-c8123a2fa00e','d2be254c-38a8-4ff8-8062-1b645eba9262'), -- Cantoneira
  ('8e79f972-0ce5-452a-af8f-559dc88cf8a6','af5bcc96-6e7a-481f-a8df-a71b7239dde9'), -- Central -> Central c/ 2 Controles
  ('f982f195-bb53-4050-a968-307073f29088','15484a58-ca27-4d1f-8956-d89f097a731f'), -- Central BLUETOOH
  ('8492294d-3418-430e-9838-3d97e9358bdb','cda96b00-2547-4fa2-8c52-e3890710ffb8'), -- Central WI-FI
  ('fec7f032-5461-4713-b734-70b0b178d12d','4e4e4c9f-5ba9-486d-bc2c-14d5971fdbb1'), -- Controle Avulso
  ('68c619c9-fb3a-4e54-bcef-d6b0ada1fdbe','b2d282c8-2715-47e0-bf77-25241282cf85'), -- Controle Multi Frequência
  ('11dce454-c150-4b05-af56-21f2bc5cb446','d700b11f-d3a9-4ff2-af82-d48a08ec86f2'), -- Eixo 6 polegadas -> 6" 1/2 3,00mm
  ('5ed68539-ca15-42f0-8313-a20fb579799a','9a40a11c-47ea-4d0e-acb3-7d5d82c0759c'), -- Guia G 200MM -> Guia U 90mm Médio
  ('02e74192-5629-486e-a661-8ca1034ac095','59348523-887d-4d5a-9856-aecbbcc4834c'), -- Guia M 135mm -> Guia U 120mm Grande
  ('174e09c5-a93f-4716-8aaf-686ab4ac258c','4e1b47a5-ad8d-44e5-a01b-5a922df5a040'), -- Meia cana lisa 0,70
  ('410b7a1c-72aa-4793-a4e5-1f4bb6347489','33ae1ed0-1686-4d97-89fe-08b90ec5951c'), -- Meia cana lisa 0,80
  ('3c70f444-a9bc-414c-b9b7-801d3afcfbdb','1cc7cb16-21ab-4400-9baf-b8c25c48828f'), -- Meia cana micro 0,80 -> Meia Cana Micro 0,70
  ('c13784fe-c4ea-400c-b3db-14bbe2d50507','5e57413a-b619-4fbb-a615-51e2cea98b57'), -- Motor 1000kg
  ('d12cb154-fa9a-4843-bf6e-87cae1957520','5e57413a-b619-4fbb-a615-51e2cea98b57'), -- Motor AC 1000 Kg
  ('bc6c456d-b8b0-43ab-a57b-e6de8776aa18','4bca430d-18e3-4585-a410-bce920c6c6a7'), -- Motor AC 200 kg
  ('0d670061-99b3-4850-9045-69ec07cc8d7c','4bca430d-18e3-4585-a410-bce920c6c6a7'), -- Motor AC 200 Kg
  ('cd3ca176-4b6d-41e2-9efb-3a3ca6f6aefc','afb338c2-23c5-4f06-bf4c-fa56dc343a98'), -- Motor AC 300 Kg
  ('b3436ee2-c1c8-4bcd-8cd9-820845bda065','2fb0572e-b35c-4803-abaa-ba783bcb87ed'), -- MOTOR AC 500KG
  ('523f7f83-ff09-4416-86c8-f4b58300507d','9c01b06b-9be8-4d20-8fe4-27877adc8298'), -- Motor AC 600 Kg
  ('eea9ce3b-2784-43ce-9a1f-d8ae00c38677','c40c2eb8-86e8-481d-a24e-284152e3ee1e'), -- Motor AC 800 Kg
  ('ef12dc77-565b-47b6-a7cc-1da54a8a0ce7','db57ca77-5b6e-48bb-9c64-3e23c6b7bdbc'), -- Motor AC/DC 500 Kg
  ('84117604-1f97-4878-857f-e44875c59aea','727b50ec-6918-4dc9-970a-3d12fa7167f8'), -- Motor AC/DC 800 Kg
  ('ff1fdb1d-c43a-464a-9c49-96eb81186742','362194bd-1594-412f-b9e7-21aa4ef57101'), -- Motor DC 300 Kg
  ('d6f435d4-f5ca-44f1-b1cd-afd1e190c3e7','e5e065d3-2c9c-4dde-9388-8a36c08c78ad'), -- Nobreak
  ('9904fc22-6447-4c13-bbca-aefdae3c6d8a','880e3b77-44c0-430a-84a9-9545558232df'), -- Soleira 30x50
  ('010b9de2-f152-4ed9-8773-059cef66b387','a756006e-af82-4518-8ee4-f9673056ff9d'), -- Soleira 60x40
  ('ef8e9fdb-4271-4c65-8a94-edc43854b134','a756006e-af82-4518-8ee4-f9673056ff9d'), -- Soleira 60x40 + 30x30
  ('9286fef8-2c33-4eba-8e02-c448f74d1706','b33694a3-dfea-4040-aa69-aab38c183566'), -- Trava Lâminas
  ('fb02cfde-0cdb-4a0e-bd89-8113e0127bec','2b32c9a4-d112-45d2-8119-44319c7d5efc'), -- Tubo 80x80
  ('71756d49-b7c4-44ef-b9cf-f186ca0e8c5f','41cc5d7f-f974-4038-a22c-ff118c0c33f2'), -- Tubo de afastamento
  ('0b035b1e-2e99-48c6-917a-c71db8e23692','eba926f0-14c7-4980-af60-79fd5068b49f')  -- TUBO PARA FIXAR TIRAS FRONTAIS
) AS m(vc_id, ci_id)
WHERE pv.vendas_catalogo_id::text = m.vc_id
  AND pv.custos_itens_id IS NULL;

-- 3) Para "RETIRADA DO PORTÃO EXISTENTE", apontar para o item "Manutenção" recém-criado
UPDATE public.produtos_vendas pv
SET custos_itens_id = (SELECT id FROM public.custos_itens WHERE descricao = 'Manutenção' LIMIT 1)
WHERE pv.vendas_catalogo_id = '3e3c7dac-87dc-4968-89f8-8999fc3595d9'::uuid
  AND pv.custos_itens_id IS NULL;
