# Botão "Dashboard" na Home com painel de pedidos

## O que será feito

### 1. Novo botão "Dashboard" em /home
- Adicionar item "Dashboard" (ícone `LayoutDashboard`) na lista de botões da Home (`src/pages/Home.tsx`), levando a uma nova página `/home/dashboard`.
- Seguir o mesmo padrão de acesso das rotas `/home/pedidos-producao` e `/home/calendario-expedicao` (sem trava de permissão por módulo, igual ao Acesso Rápido).

### 2. Nova página `/home/dashboard`
Página no estilo glassmorphism escuro da Home, com breadcrumb Home > Dashboard e três seções:

**Seção A — Saíram de "Em Produção"**
- Pedidos cuja etapa `em_producao` foi concluída (registro em `pedidos_etapas` com `etapa = 'em_producao'` e `data_saida` preenchida).
- Exibir: número do pedido, cliente, data/hora de saída e para qual etapa avançou (etapa atual do pedido).
- Ordenado pelas saídas mais recentes.

**Seção B — Etapas logísticas com agendamento**
- Pedidos nas etapas `aguardando_coleta`, `instalacoes` e `correcoes` que tenham `data_carregamento` preenchida.
- Exibir: número do pedido, cliente, etapa atual (com cor) e data agendada.
- Ordenado pela data de agendamento mais próxima.

**Seção C — Ordem atual dos pedidos "Em Produção"**
- Pedidos com `etapa_atual = 'em_producao'`, numerados por posição na fila (ordenados pela data de entrada na etapa, do mais antigo ao mais recente).
- Exibir: posição (1º, 2º, 3º...), número do pedido, cliente e há quanto tempo está em produção.

## Detalhes técnicos
- Novo arquivo `src/pages/home/DashboardHome.tsx` (ou similar) usando `useQuery` do TanStack Query contra `pedidos_producao` e `pedidos_etapas` (RLS já existente cobre leitura).
- Rota registrada em `src/App.tsx` como `/home/dashboard` com `ProtectedRoute`.
- Sem alterações no banco de dados — apenas leitura das tabelas existentes.
- Datas exibidas no padrão do projeto (T12:00:00 para datas de dia).
