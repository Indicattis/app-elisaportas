## Vídeos de Marketing

Adicionar acesso em `/home` (após o card "Administrativo") para uma nova página `/marketing/videos-ideias` onde qualquer usuário com acesso pode cadastrar ideias de vídeo para o time de marketing, com fluxo de confirmação bem-humorado.

### 1. Banco de dados

Nova tabela `marketing_videos_ideias`:
- `id` (uuid)
- `titulo` (text, obrigatório)
- `descricao` (text, obrigatório, mínimo 60 caracteres — validado no client + check constraint)
- `criado_por` (uuid → auth.users)
- `criado_por_nome` (text, snapshot)
- `created_at`, `updated_at`

RLS:
- SELECT: usuários autenticados
- INSERT: usuários autenticados (criado_por = auth.uid())
- UPDATE/DELETE: apenas o autor ou admin (via `has_role`)

### 2. Acesso na Home

Em `src/pages/Home.tsx` (ou equivalente), adicionar novo card **"Vídeos de Marketing"** logo após o card "Administrativo", seguindo o mesmo padrão visual (ícone `Video` ou `Clapperboard` do lucide, gradiente coerente com glassmorphism do projeto).

Registrar `route_key` `marketing_videos_ideias` em `user_route_access` para controle de permissão (padrão do projeto), liberando por padrão para roles que já têm marketing.

### 3. Rota e página

Nova rota `/marketing/videos-ideias` em `src/App.tsx`.

Página `src/pages/marketing/VideosIdeias.tsx`:
- Header minimalista no padrão glassmorphism do projeto
- Botão **"Nova ideia"** abre formulário (Dialog)
- Lista das ideias cadastradas em cards (título, descrição, autor, data)

### 4. Formulário + fluxo de modais

Formulário (zod):
- `titulo`: string não vazia, máx 120 chars
- `descricao`: string com **mínimo 60 caracteres** (contador ao vivo visível)

Ao clicar em **Confirmar**:

**Modal 1 — Confirmação bem-humorada**
- Emoji triste grande (😢)
- Texto: *"Tem certeza que quer dar MAIS uma demanda para o time de marketing? Os meninos estão cheios de serviço"*
- Botões: **Sim** / **Cancelar**

**Modal 2 — Sucesso** (após clicar Sim, gravação no banco bem-sucedida)
- Emoji de comemoração
- Texto: *"sem monstro!"*
- Botão: **Fechar**

Após fechar, o formulário reseta e a lista é atualizada (React Query invalidate).

### Detalhes técnicos

- Hook `useVideosMarketingIdeias` (lista + create) seguindo padrão dos outros hooks (`useQuery` + `useMutation` + invalidate).
- Validação dupla (client zod + check constraint `char_length(descricao) >= 60`).
- Tokens semânticos do design system (sem cores hardcoded).
- Tipos do Supabase serão regenerados após a migration.
