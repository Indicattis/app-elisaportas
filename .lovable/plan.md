## Objetivo

Adicionar um novo botão "Atividades de Marketing" na segunda posição do menu em `/marketing` que leva a uma nova página onde o usuário cadastra atividades realizadas (Stories / Post / Vídeo) em formato de tabela.

## Mudanças

### 1. Banco de dados (nova migration)

Criar tabela `marketing_atividades`:
- `id` uuid PK
- `tipo` text — restrito a `'stories' | 'post' | 'video'`
- `descricao` text not null
- `link` text nullable
- `duracao_minutos` integer not null (minutos inteiros)
- `data` date not null default `current_date`
- `created_by` uuid (admin_users)
- `created_at` / `updated_at` timestamptz

GRANTs para `authenticated` e `service_role`. RLS habilitado com policies permitindo SELECT/INSERT/UPDATE/DELETE a qualquer usuário autenticado (mesmo nível de acesso da página /marketing).

### 2. Hub de Marketing (`src/pages/marketing/MarketingHub.tsx`)

Inserir na 2ª posição do array `menuItems`:
```
{ label: "Atividades de Marketing", icon: Activity, path: "/marketing/atividades" }
```

### 3. Nova página `src/pages/marketing/AtividadesMarketing.tsx`

Layout: minimalista glassmorphism (bg-white/5, backdrop-blur-xl, border-white/10, paleta azul/branco) consistente com o restante do projeto.

Conteúdo:
- Cabeçalho com título "Atividades de Marketing" e botão voltar para `/marketing`
- Botão "Nova Atividade" abrindo Dialog com formulário:
  - Tipo (Select: Stories / Post / Vídeo) — obrigatório
  - Descrição (Textarea) — obrigatória
  - Link (Input URL) — opcional
  - Duração em minutos (Input number) — obrigatória
  - Data (Input date, default hoje, usando padrão `T12:00:00.000Z` para gravação)
- Tabela listando atividades (mais recentes primeiro): colunas Data, Tipo (badge), Descrição, Link (ícone abrindo em nova aba), Duração (min), Ações (editar / excluir)
- Edição via mesmo Dialog reutilizando o formulário
- Exclusão com confirmação (AlertDialog)

### 4. Rota

Registrar `/marketing/atividades` em `src/App.tsx` (mesma proteção de rota usada por `/marketing/investimentos` ou similar do hub).

## Detalhes técnicos

- Datas gravadas com `T12:00:00.000Z` (regra do projeto)
- Hook `useAtividadesMarketing` com React Query (queryKey `['marketing-atividades']`) para listar/criar/atualizar/excluir
- Ícone do botão: `Activity` do lucide-react
- Sem mudanças em lógica de negócio existente
