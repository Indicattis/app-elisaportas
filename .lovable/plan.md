## Objetivo
Trocar o nome exibido da categoria de usuário "Metamorfo" para "Geral" em todas as telas administrativas.

## Escopo
- Apenas **labels de exibição** — o valor no banco (`tipo_usuario = 'metamorfo'`) permanece inalterado para preservar compatibilidade com filtros, políticas RLS e dados existentes.

## Arquivos a modificar

### 1. AdminUsersMinimalista.tsx
- Contador: `metamorfosCount` → renomear variável e lógica de filtro
- Label da aba: `"Metamorfos (...count...)"` → `"Geral (...count...)"`
- Plural/singular no footer: `"metamorfo(s)"` → `"geral"`
- Texto de empty state: `"metamorfo"` → `"geral"`
- `TabsContent value="metamorfo"` permanece (valor do banco não muda)

### 2. AdminUserEdit.tsx
- `<SelectItem value="metamorfo">Metamorfo</SelectItem>` → `<SelectItem value="metamorfo">Geral</SelectItem>`

### 3. AddUserDialog.tsx
- `<SelectItem value="metamorfo">Metamorfo</SelectItem>` → `<SelectItem value="metamorfo">Geral</SelectItem>`

### 4. UserDetailsModal.tsx
- Ternário de exibição: `"Metamorfo"` → `"Geral"`

## Fora do escopo (não alterar)
- Filtros de hooks (`useClientes.ts`, `useAllUsers.ts`, `SelecionarUsuarioVagaDialog.tsx`): continuam usando `"metamorfo"` pois é o valor no banco.
- Migrations SQL existentes: valores internos `tipo_usuario` não mudam.

## Resultado esperado
Todas as telas passam a mostrar "Geral" no lugar de "Metamorfo", sem quebrar consultas ao banco.