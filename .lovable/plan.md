## Auditoria de mudanças de status (4ª seção)

Registrar toda alteração de status (mês + linhas de folha/fixas/variáveis) e exibir um histórico abaixo dos 3 blocos atuais.

### 1. Nova tabela `despesas_status_historico`

Migration cria a tabela com:
- `mes_referencia date` — mês ao qual o registro pertence (sempre dia 01, padrão T12:00)
- `escopo text` — `'mes' | 'folha' | 'lanc'`
- `ref_id uuid` (nullable) — id da linha de folha/lançamento, ou null quando escopo='mes'
- `ref_nome text` — nome do colaborador ou da despesa (ou "Mês" para escopo='mes'); facilita exibição sem JOIN
- `status_anterior text` / `status_novo text` — `'pendente' | 'alana' | 'luan'`
- `changed_by uuid` (nullable) — auth.uid()
- `changed_by_nome text` — nome do usuário capturado no momento (resiliente a renomeações)
- `created_at timestamptz default now()`

GRANTs: `SELECT, INSERT` para `authenticated`; `ALL` para `service_role`. RLS habilitado com policies:
- `SELECT` para authenticated (todos enxergam histórico do mês na tela)
- `INSERT` para authenticated com `changed_by = auth.uid()`

### 2. Gravação dos eventos (frontend)

**`DespesasResumoTopo.tsx` → `toggleConfirmado`:**
após o `UPDATE` bem-sucedido, inserir em `despesas_status_historico` com:
- `escopo`: `'folha'` ou `'lanc'`
- `ref_id`, `ref_nome` (colaborador ou despesa), `status_anterior` (`atual || 'alana'`), `status_novo` (`novo`)
- `mes_referencia`: do row alterado
- `changed_by` / `changed_by_nome`: via `supabase.auth.getUser()` + lookup curto em `admin_users` (cache no componente)

**`EstrategiaDespesasMes.tsx` → `toggleStatus`:**
mesma lógica, com `escopo='mes'`, `ref_id=null`, `ref_nome='Mês'`, `mes_referencia = ${mesValido}-01`.

Ambos seguem a regra de cores existente (vermelho/amarelo/verde) e usam `T12:00:00.000Z` ao formar datas (regra global do projeto).

### 3. Quarta seção: `BlocoHistoricoStatus`

Novo componente em `src/components/direcao/estrategia/HistoricoStatusBloco.tsx`, renderizado após os 3 blocos dentro de `DespesasResumoTopo` (mesmo glassmorphism: `bg-white/5`, `backdrop-blur-xl`, `border-white/10`).

Conteúdo:
- Título "Histórico de Status" com ícone `History` (lucide).
- Tabela com colunas: **Data/Hora**, **Escopo** (Mês / Folha / Despesa), **Item** (`ref_nome`), **De → Para** (bolinhas tricolores + label), **Usuário**.
- Query: `select * from despesas_status_historico where mes_referencia = $mesStart order by created_at desc limit 200`.
- Re-fetch acoplado ao mesmo `reloadV` já existente para atualizar quando `toggleConfirmado` rodar.
- Estado vazio: "Nenhuma alteração de status ainda neste mês."

A seção aparece somente quando há `mes` selecionado (mesmo gate dos demais blocos).

### Detalhes técnicos

- Sem mudança nas tabelas existentes (`despesas_manuais_folha`, `despesas_manuais_lancamentos`, `despesas_mes_status`).
- Tipos TS: após a migration, `src/integrations/supabase/types.ts` é regenerado automaticamente; uso de `as any` nas queries do histórico se necessário durante interim.
- Reuso do componente `StatusDot` (modo readonly) para renderizar "De → Para" no histórico.
- Para `changed_by_nome`, preferir cache local — um `select id, nome from admin_users where id = auth.uid()` único por sessão do componente.

### Arquivos tocados
- **Migration nova** criando `despesas_status_historico` + grants + RLS.
- `src/components/direcao/estrategia/DespesasResumoTopo.tsx` — gravar log no toggle + montar 4ª seção (ou importar novo componente).
- `src/components/direcao/estrategia/HistoricoStatusBloco.tsx` — novo.
- `src/pages/direcao/estrategia/EstrategiaDespesasMes.tsx` — gravar log no `toggleStatus`.
