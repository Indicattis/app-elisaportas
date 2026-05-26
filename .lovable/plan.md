## Objetivo

Substituir a edição inline + modal de detalhes por uma página dedicada `/admin/users/:id` que reúne, em um só lugar, todas as informações do usuário (colaborador, representante ou metamorfo) e permite editar tudo a partir dali.

## Mudanças

### 1. Nova página `src/pages/admin/AdminUserEdit.tsx`
- Rota: `/admin/users/:id` (param identifica registro em `admin_users` ou `representantes`).
- Layout `MinimalistLayout` com `backPath="/admin/users"`, mesmo padrão visual (glassmorphism, `bg-white/5`, `border-white/10`) usado em `/direcao/estrategia/kits` e em `AdminCompanyEditMinimalista`.
- Carrega o usuário com base no `id` e no `tipo_usuario` (query string `?tipo=representante` para diferenciar, ou tenta `admin_users` primeiro e cai em `representantes`).
- Seções organizadas em `Card`s:
  1. **Cabeçalho** — `AvatarUpload`, nome, email, badges de status (ativo/inativo) e tipo de usuário, com ações principais à direita: Salvar, Resetar senha, Ativar/Desativar, Excluir.
  2. **Dados pessoais** — nome, CPF (com máscara), data de nascimento, email (somente leitura).
  3. **Função e setor** — `role` (do `system_roles`), `setor`, `tipo_usuario` (colaborador / representante / metamorfo), `eh_colaborador`, `visivel_organograma`, `salario` (quando colaborador).
  4. **Sistema** — datas de criação/atualização (somente leitura).
- Todos os campos editáveis em um único form controlado; botão "Salvar alterações" persiste em `admin_users` (ou `representantes`, com os campos suportados).
- Reutiliza `ResetPasswordModal` e o `AlertDialog` de exclusão (mesma lógica já existente em `AdminUsersMinimalista`, incluindo `delete-user` edge function e filtro `@archived.local`).

### 2. Ajustes em `src/pages/admin/AdminUsersMinimalista.tsx`
- Remove a edição inline (`editingUser`, `editForm`, `handleEdit`, `handleSave`, `handleCancel`, inputs/selects inline na lista) e o `UserDetailsModal`.
- Clicar em um item da lista (ou no botão de editar) navega para `/admin/users/:id?tipo=<tipo_usuario>` via `useNavigate`.
- Mantém: filtros, tabs, busca, contadores, PDF, "Adicionar usuário", toggle ativo rápido e exclusão da listagem (opcional manter — mover apenas para a página de edição se preferir; por padrão manter no item da lista).

### 3. Rota em `src/App.tsx`
- Importa `AdminUserEdit` e registra `<Route path="/admin/users/:id" element={<ProtectedRoute><AdminUserEdit /></ProtectedRoute>} />` no mesmo grupo de `/admin/users`, com a mesma proteção/role já aplicada à rota atual.

### 4. (Opcional) Limpeza
- `src/components/admin/UserDetailsModal.tsx` deixa de ser usado em `/admin/users`. Mantemos o arquivo caso outras telas o consumam (verificar usos antes de remover).

## Detalhes técnicos

- `representantes` não possui `role`, `setor`, `cpf`, `data_nascimento`, `salario`, `tipo_usuario`, `eh_colaborador`, `visivel_organograma` — esses campos ficam ocultos/disabled quando o registro é de representante; o save só envia colunas existentes na tabela correspondente.
- CPF salvo apenas com dígitos (mesma regra atual em `handleSave`).
- Após salvar, mostra toast e mantém o usuário na página (não navega de volta automaticamente); botão "Voltar" usa o `MinimalistLayout` back.
- Após excluir, navega para `/admin/users`.

## Arquivos

- Criar: `src/pages/admin/AdminUserEdit.tsx`
- Editar: `src/pages/admin/AdminUsersMinimalista.tsx`, `src/App.tsx`
