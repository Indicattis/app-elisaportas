## Objetivo

Reformular `/vendas/visitas-tecnicas` em um calendário mensal para agendar novas visitas técnicas (com título, endereço completo via CEP, data, hora, responsável, telefone e observações) e mover o conteúdo atual (fichas de visita de pedidos existentes) para uma nova rota `/vendas/visitas-tecnicas/realizadas`.

## 1. Banco de dados

Criar nova tabela `public.visitas_tecnicas_agendadas` (separada da `visitas_tecnicas` existente, que é vinculada a leads e tem outra finalidade):

- `titulo` text
- `data_visita` date
- `hora_inicio` time
- `responsavel_id` uuid (ref. `admin_users`)
- `telefone_contato` text
- `cep` text
- `endereco`, `numero`, `complemento`, `bairro`, `cidade`, `estado` text
- `observacoes` text
- `status` text default `'agendada'` (`agendada` | `realizada` | `cancelada`)
- `created_by` uuid, `created_at`, `updated_at`

Padrões já estabelecidos no projeto:
- Datas gravadas com sufixo `T12:00:00.000Z` (regra global).
- RLS + GRANTs para `authenticated` e `service_role`.
- Trigger de `updated_at`.
- Política: usuários autenticados podem ver/criar/editar/excluir (acesso já filtrado por `routeKey` na rota).

## 2. Rotas (`src/App.tsx`)

- Manter `routeKey="vendas_visitas_tecnicas"` na rota `/vendas/visitas-tecnicas` → novo componente `VisitasTecnicasCalendario`.
- Adicionar `/vendas/visitas-tecnicas/realizadas` reaproveitando o mesmo `routeKey` → componente atual renomeado para `VisitasTecnicasRealizadas`.

## 3. Página nova: calendário (`VisitasTecnicasCalendario.tsx`)

Layout no padrão glassmorphism (bg-white/5, backdrop-blur-xl, blue/white) já usado no projeto:

- Header com breadcrumb, botão voltar para `/vendas`, título "Visitas Técnicas".
- Botão secundário "Visitas realizadas" → navega para `/vendas/visitas-tecnicas/realizadas`.
- Botão primário "Agendar visita" → abre dialog.
- Grid mensal (seg–dom) com navegação `< mês >`, hoje destacado, cada célula mostra até 3 visitas com horário + título; clique na visita abre dialog de detalhes/edição; clique em dia vazio pré-preenche a data no dialog de criação.
- Dialog de criação/edição:
  - Título
  - Data (date picker) + Hora (input time)
  - Responsável (Select de `admin_users` ativos)
  - Telefone de contato (máscara BR)
  - CEP com auto-lookup (ViaCEP, `https://viacep.com.br/ws/<cep>/json/`) preenchendo endereço, bairro, cidade, estado; campos número e complemento manuais
  - Observações (textarea)
  - Botões: Cancelar, Salvar; em edição também Excluir e Marcar como realizada/cancelada
- Query via React Query (`['visitas-agendadas', mes]`) filtrando pelo mês visível.

## 4. Página realocada: `VisitasTecnicasRealizadas.tsx`

Conteúdo idêntico ao atual `VisitasTecnicas.tsx` (lista agrupada por venda das fichas em `pedidos_producao.ficha_visita_url`), apenas:
- Breadcrumb passa a ser `Home › Vendas › Visitas Técnicas › Realizadas`.
- Botão voltar leva a `/vendas/visitas-tecnicas` (calendário), não a `/vendas`.
- Título: "Visitas realizadas para pedidos existentes".

O arquivo antigo `VisitasTecnicas.tsx` é excluído; seu conteúdo migra para `VisitasTecnicasRealizadas.tsx`.

## 5. Hub de Vendas

Sem mudança: `VendasHub.tsx` continua linkando para `/vendas/visitas-tecnicas` (agora o calendário). A página "Realizadas" é acessada via botão dentro do calendário.

## Detalhes técnicos

- Lookup de CEP: fetch direto ao ViaCEP (público, sem chave), com debounce de 400 ms ao digitar 8 dígitos; mostra spinner no campo enquanto carrega; trata erro `erro: true`.
- Data persistida como string `YYYY-MM-DDT12:00:00.000Z`; exibida com `T12:00:00` local.
- Hora persistida como `HH:MM` (`time without time zone`).
- Reuso de componentes shadcn: `Dialog`, `Input`, `Select`, `Textarea`, `Button`, `Popover` (datepicker conforme padrão do projeto, com `pointer-events-auto`).
- Sem nova permissão de rota: `/realizadas` herda o mesmo `routeKey` do hub.
