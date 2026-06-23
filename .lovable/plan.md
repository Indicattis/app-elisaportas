## Objetivo

Na página **Autorizados** (`/autorizados`, `/direcao/autorizados`, `/logistica/autorizados`), adicionar uma nova seção abaixo das seções existentes mostrando o **registro de cadastro de autorizados**: nome do autorizado, data em que foi cadastrado e por quem.

## Mudanças

### 1. Banco de dados (migration)

Adicionar à tabela `autorizados` uma coluna para rastrear o autor do cadastro:

- `created_by uuid null` — referencia `admin_users(id)`, sem `ON DELETE` para não perder histórico se o usuário for arquivado.

Registros já existentes ficarão com `created_by = null` (mostrados como "—" na UI, já que não temos como recuperar essa informação retroativamente).

Atualizar o ponto único de criação de autorizados (hook/serviço de cadastro de autorizados) para preencher `created_by` com o `user.id` do usuário logado.

### 2. Frontend — `src/pages/direcao/AutorizadosPrecosDirecao.tsx`

Adicionar uma nova seção "Histórico de Cadastros" no final do conteúdo (após as seções existentes de Estados e Acordos):

- Card com mesmo estilo glassmorphism do restante da página (`bg-white/5`, `backdrop-blur-xl`, `border-white/10`).
- Tabela com colunas:
  - **Autorizado** (nome + cidade/UF como subtítulo)
  - **Data de cadastro** (`created_at` formatado `dd/MM/yyyy HH:mm`)
  - **Cadastrado por** (nome do admin via join com `admin_users`; "—" quando null)
- Ordenação: mais recente primeiro.
- Busca por nome do autorizado (input simples) e seletor de ano, reaproveitando o mesmo padrão visual da seção de acordos.
- Paginação simples (ex.: 20 por página) para não carregar todos de uma vez se a lista crescer.

### 3. Detalhes técnicos

- Query: `supabase.from('autorizados').select('id, nome, cidade, estado, created_at, created_by, admin_users:created_by(nome)').order('created_at', { ascending: false })`.
- Não alteramos lógica de negócio nem outras telas — apenas registro do autor no cadastro novo e exibição.
- Sem mudanças de RLS necessárias (a tabela `autorizados` já tem políticas de leitura).
