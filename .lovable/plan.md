## Histórico de acordos com autorizados

Hoje a tabela `acordos_instalacao_autorizados` guarda apenas o estado atual (quem criou, quem aprovou, quem pagou). Não há rastro de alterações de status, edições de valor, reprovações, desmarcações de pagamento, etc. Vou adicionar um registro completo de auditoria + um botão na tela `/autorizados/acordos/:ano/:mes` (e também na versão direção) para visualizar todo o histórico de cada acordo.

### 1. Banco de dados (migração)

Criar tabela `acordos_autorizados_historico`:

- `acordo_id` (FK para `acordos_instalacao_autorizados`, ON DELETE CASCADE)
- `evento` (text): `criado`, `editado`, `status_alterado`, `aprovado`, `reprovado`, `pago`, `desmarcado_pago`
- `usuario_id` (uuid) e `usuario_nome` (text, snapshot, para sobreviver a exclusões de usuário)
- `valor_anterior` (jsonb) / `valor_novo` (jsonb): snapshot dos campos relevantes
- `descricao` (text): texto pronto para exibição (ex.: "Alterou status de Pendente → Concluído")
- `created_at` timestamp

GRANTs + RLS:
- `SELECT` para `authenticated` (qualquer usuário logado pode ler o histórico dos acordos que já enxerga)
- `INSERT` para `authenticated` e `service_role` (registrado via trigger, mas trigger precisa de permissão)

Trigger `BEFORE INSERT/UPDATE` em `acordos_instalacao_autorizados` que:
- No INSERT: grava evento `criado` com snapshot inicial
- No UPDATE: compara campos relevantes (`status`, `valor_acordado`, `observacoes`, `data_acordo`, `aprovado_direcao`, `reprovado_direcao`, `pago`) e gera um evento por mudança, capturando `auth.uid()` e nome via JOIN com `admin_users`

### 2. Hook

`src/hooks/useAcordoHistorico.ts`:
- `useAcordoHistorico(acordoId)` retorna `{ historico, loading }` ordenado por `created_at desc`

### 3. UI

Em `src/pages/direcao/AcordosMesAutorizados.tsx`:
- Adicionar ícone `History` (lucide-react) em cada linha da tabela, ao lado das demais ações (em todos os contextos: home, logistica, direcao)
- Ao clicar, abre `HistoricoAcordoDialog` (novo componente em `src/components/autorizados/HistoricoAcordoDialog.tsx`)

`HistoricoAcordoDialog`:
- Lista vertical no estilo timeline com glassmorphism (`bg-white/5 backdrop-blur-xl border-white/10`)
- Cada item mostra: ícone do evento, descrição, usuário (nome), data/hora formatada (`dd/MM/yyyy HH:mm`)
- Cores por tipo de evento (verde = aprovado/pago, vermelho = reprovado/desmarcado, azul = criado, amarelo = editado)
- Estado vazio amigável e loading spinner

### 4. Detalhes técnicos

- Trigger usa `SECURITY DEFINER` e `SET search_path = public` para respeitar RLS no INSERT
- O nome do usuário é resolvido no trigger via `(SELECT nome FROM admin_users WHERE user_id = auth.uid())` e gravado como snapshot
- Frontend continua usando `useAcordosAutorizados` sem mudanças — a auditoria é totalmente server-side
- O dialog não recarrega ao trocar de acordo: chave do componente baseada em `acordoId`

### Arquivos

- (novo) migração SQL: criar tabela + grants + RLS + trigger
- (novo) `src/hooks/useAcordoHistorico.ts`
- (novo) `src/components/autorizados/HistoricoAcordoDialog.tsx`
- (edit) `src/pages/direcao/AcordosMesAutorizados.tsx`: botão de histórico + estado do dialog
