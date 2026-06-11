## Objetivo

Em `/vendas/visitas-tecnicas`, ao clicar em **Concluir** numa visita agendada, abrir um formulário detalhado onde o usuário preenche, para cada porta de enrolar levantada na visita, todas as especificações técnicas + fotos. Visita avulsa (sem vínculo com venda). Resultado: registro consultável.

## Fluxo do usuário

1. No calendário de visitas, em cada visita agendada surge o botão **Concluir visita**.
2. Abre um dialog/página com:
   - Cabeçalho da visita (cliente, endereço, responsável — já existem).
   - Lista de **Portas** (começa vazia, botão **+ Adicionar porta**).
   - Cada porta é um cartão expansível com todos os campos abaixo.
   - Campo geral de **Observações da visita** (texto livre).
3. Só permite concluir se houver pelo menos 1 porta com largura/altura preenchidas.
4. Ao concluir: salva tudo, marca a visita como `concluida`, e a visita passa a aparecer em `/vendas/visitas-tecnicas/realizadas` com link para visualizar a ficha.

## Campos por porta

**Medidas (numérico, metros, 2 casas):** largura_vao, altura_vao, largura_total, altura_total.

**Meia cana:** tipo (`lisa` | `perfurada`) + textarea `especificacoes`.

**Pintura:** seleção 1+ cores via `catalogo_cores` (mesma UI já usada em vendas).

**Tiras frontais:** switch sim/não; se sim, campo `quantidade` (inteiro).

**Controle adicional:** switch sim/não; se sim, `quantidade`.

**Caixa do motor:** select (`total` | `sem_caixa`). _(esclarecimento: o enunciado lista "Caixa total ou sem caixa" como detalhe do mesmo campo)_

**Guia:** select tamanho (`M` | `G`).

**Acessórios inclusos:** multi-select de `custos_itens` filtrado por categoria/subcategoria "Acessórios"; cada acessório selecionado tem campo `quantidade`.

**Tipo de serviço:** select (`instalacao` | `entrega`).

**Posicionamento da porta:** select (`interno` | `externo`).

**Posicionamento do motor:** select (`direito` | `esquerdo`).

**Tubo de afastamento:** switch sim/não; se sim, `distancia_cm`.

**Posicionamento do guia:** select (`dentro_vao` | `fora_vao`).

**Posicionamento da testeira:** select (`fora` | `dentro` | `entre`).

**Tipo do guia:** select (`aparente` | `escondido` | `misto`).

**Dificuldade da instalação:** select (`simples` | `erguer_no_rolo`).

**Tubo para tiras frontais:** switch sim/não.

**Retirar portão existente no local:** switch sim/não.

**Observações da porta:** textarea.

**Fotos:** upload múltiplo (até 10) no bucket `visitas-tecnicas-fotos`, com legenda opcional por foto.

## Banco de dados (nova migration)

**Tabela `visitas_tecnicas_conclusoes`** (1 por visita):
- `id`, `visita_id` (FK `visitas_tecnicas_agendadas`, UNIQUE), `observacoes_gerais`, `concluido_por`, `concluido_em`, `created_at`, `updated_at`.

**Tabela `visitas_tecnicas_portas`** (N por conclusão):
- `id`, `conclusao_id` (FK), `ordem` (int),
- `largura_vao`, `altura_vao`, `largura_total`, `altura_total` (numeric),
- `meia_cana_tipo` (text), `meia_cana_especificacoes` (text),
- `cores` (jsonb — array de `{id, nome, codigo_hex}` snapshot),
- `tem_tiras_frontais` (bool), `qtd_tiras_frontais` (int),
- `tem_controle_adicional` (bool), `qtd_controle_adicional` (int),
- `caixa_motor` (text), `guia_tamanho` (text),
- `acessorios` (jsonb — `[{custo_item_id, nome, quantidade}]`),
- `tipo_servico` (text: instalacao/entrega),
- `posicao_porta`, `posicao_motor`, `posicao_guia`, `posicao_testeira`, `tipo_guia`, `dificuldade_instalacao` (todos text com check),
- `tem_tubo_afastamento` (bool), `distancia_tubo_cm` (numeric),
- `tem_tubo_tiras_frontais` (bool),
- `retirar_portao_local` (bool),
- `observacoes` (text),
- `created_at`, `updated_at`.

**Tabela `visitas_tecnicas_portas_fotos`**:
- `id`, `porta_id` (FK CASCADE), `url`, `legenda`, `ordem`, `created_at`.

**Storage bucket** `visitas-tecnicas-fotos` (público, criado via `supabase--storage_create_bucket`).

**GRANTs + RLS:** seguindo padrão do projeto — `GRANT SELECT/INSERT/UPDATE/DELETE ... TO authenticated`, `GRANT ALL ... TO service_role`, RLS habilitado com policies abertas para `authenticated` (mesmo padrão de `visitas_tecnicas_agendadas`).

Coluna nova em `visitas_tecnicas_agendadas`: nada — o status `concluida` já é text livre.

## Frontend

Novos arquivos:
- `src/pages/vendas/VisitaTecnicaConclusao.tsx` — página/rota `/vendas/visitas-tecnicas/:visitaId/concluir`.
- `src/components/visitas/PortaVisitaCard.tsx` — cartão de uma porta com todos os campos.
- `src/components/visitas/FotosPortaUpload.tsx` — uploader múltiplo.
- `src/hooks/useVisitaConclusao.ts` — fetch/save (mutation única que persiste conclusão + portas + fotos em transação via RPC ou sequencial com rollback manual).
- `src/hooks/useAcessoriosCustosItens.ts` — lista `custos_itens` da categoria Acessórios.

Alterações:
- `VisitasTecnicasCalendario.tsx`: adicionar botão **Concluir** em cada visita pendente; quando `status === 'concluida'` mostrar **Ver ficha** levando à mesma página em modo somente-leitura.
- `VisitasTecnicasRealizadas.tsx`: além das fichas PDF antigas, listar conclusões da nova tabela (visitas avulsas), com link para a ficha.
- `App.tsx`: adicionar rota protegida `/vendas/visitas-tecnicas/:visitaId/concluir`.
- `app_routes`: inserir nova entrada para a rota (migration de seed).

## Validações

- Largura/altura do vão obrigatórias por porta.
- Se `tem_*` true, quantidade > 0 obrigatória.
- Pelo menos 1 cor selecionada para pintura.
- Pelo menos 1 porta para concluir.
- Validação via zod no client + checks no Postgres onde aplicável.

## Out of scope

- Geração automática de PDF (apenas registrar — pode ser adicionado depois).
- Vínculo com vendas/pedidos existentes.
- Edição da visita após concluída (a primeira versão será apenas visualização; edição pode vir depois).
