## Objetivo

Reformular `/logistica/instalacoes`: a página passa a ser apenas uma listagem dos pedidos que chegaram à etapa **Finalizados**, alimentada por uma nova tabela de snapshot, com filtro de mês e indicadores de valor.

---

## 1. Nova tabela `instalacoes_finalizadas`

Snapshot imutável criado no momento em que o pedido entra em "Finalizados".

Campos de domínio:
- `pedido_id` (FK → `pedidos_producao.id`, UNIQUE — 1 registro por pedido)
- `venda_id` (FK → `vendas.id`)
- `numero_pedido`, `mes_vigencia`, `numero_mes` (denormalizados para listagem rápida)
- `cliente_nome`
- `valor_instalacao` (numeric) — soma de `produtos_vendas` onde `tipo_produto = 'instalacao'` da venda, com desconto da venda rateado proporcionalmente
- `equipe_instalacao_id` / `equipe_instalacao_nome` (snapshot da ordem de instalação principal)
- `autorizado_correcao_id` / `autorizado_correcao_nome` (snapshot, se houve correção)
- `responsavel_carregamento_id` / `responsavel_carregamento_nome` (quem confirmou o carregamento)
- `estado`, `cidade` (do cadastro do cliente da venda)
- `finalizado_em` (timestamp em que entrou na etapa Finalizados)

RLS: leitura para `authenticated`; escrita só via trigger/service_role. GRANTs explícitos.

## 2. Trigger de inserção automática

Trigger em `pedidos_etapas` (AFTER INSERT/UPDATE) que, quando o pedido entra em etapa "Finalizados", faz `INSERT ... ON CONFLICT (pedido_id) DO NOTHING` na nova tabela, calculando todos os campos via subqueries:
- Valor: `SUM(valor_total) FILTER tipo_produto='instalacao'` × `(1 - desconto_percentual)` da venda.
- Equipes/autorizados: lookup em `instalacoes`, `correcoes`, `ordens_carregamento` vinculadas ao pedido.
- Cidade/estado: do cliente da venda.

## 3. Backfill

Migração popula a tabela para todos os pedidos atualmente em etapa **Finalizados** OU **Arquivo Morto**, usando a mesma lógica do trigger e `finalizado_em` = timestamp da entrada em Finalizados em `pedidos_etapas`.

## 4. Substituição da página `/logistica/instalacoes`

`OrdensInstalacoesLogistica.tsx` é reescrito para conter apenas:

- **Cabeçalho** com título "Instalações Finalizadas" e filtro de mês (default: mês atual; navegação ◀ mês ▶ + opção "Todos").
- **Cards de indicadores** no topo do mês selecionado:
  - Total de instalações finalizadas (count)
  - Valor total (soma de `valor_instalacao`)
  - Ticket médio
- **Busca** por cliente / nº pedido.
- **Tabela/listagem** com colunas: Nº Pedido • Cliente • Cidade/UF • Equipe Instalação • Autorizado Correção • Carregamento • Valor • Data Finalizado.
  - Linha clicável abre o `PedidoDetalhesSheet` existente.

Rotas que apontam para a página antiga (cronograma, equipes, ranking, ordens-instalações, etc.) continuam funcionando — ficam acessíveis pelo `InstalacoesHeaderActions`/hub de logística. A página antiga de ordens vira `/logistica/instalacoes/ordens-instalacoes` (já existe esse path).

## 5. Hook novo

`useInstalacoesFinalizadas(mes)` — query Supabase com filtro por intervalo de mês em `finalizado_em`, ordenado desc.

## 6. Limpeza

Componentes/hooks usados só pela página antiga (`NeoFinalizadoRow`, grids de "Aguardando/Carregadas/Avulsas") permanecem no projeto pois ainda são usados pela rota `/logistica/instalacoes/ordens-instalacoes`. Nada é deletado.

---

## Detalhes técnicos

- Tabela criada com `CREATE TABLE` + `GRANT SELECT ON ... TO authenticated` + `GRANT ALL ... TO service_role` + `ENABLE RLS` + policy de SELECT para authenticated, na mesma migração.
- Trigger usa `SECURITY DEFINER` com `search_path = public`.
- Cálculo de valor preserva regra "instalação como produto separado" (memory) e a retrocompatibilidade não se aplica pois usuário escolheu apenas `tipo_produto='instalacao'`.
- Datas armazenadas em UTC; UI exibe em local com sufixo `T12:00:00` quando necessário (memory de datas).
- Após aprovação da migração e regeneração de types, implemento hook + página em um segundo passo.
