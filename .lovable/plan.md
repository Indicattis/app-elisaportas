# Adicionar "Gestão de Empresas" no /administrativo

## Objetivo
Disponibilizar a mesma página `AdminCompaniesMinimalista` (hoje em `/admin/companies`) também a partir do hub `/administrativo`, com um novo botão "Gestão de Empresas" e rotas próprias dentro de `/administrativo`.

## Abordagem
Clonar as duas páginas (lista e edição) para `src/pages/administrativo/`, ajustando apenas paths/breadcrumbs para o novo escopo. As rotas antigas em `/admin/companies` permanecem intactas.

## Passos

### 1. Clonar páginas
- `src/pages/administrativo/GestaoEmpresasMinimalista.tsx` — cópia de `AdminCompaniesMinimalista.tsx` com:
  - `backPath="/administrativo"`
  - breadcrumb: Home → Administrativo → Empresas
  - navegação para criar/editar: `/administrativo/empresas/nova` e `/administrativo/empresas/:id`
- `src/pages/administrativo/GestaoEmpresaEditMinimalista.tsx` — cópia de `AdminCompanyEditMinimalista.tsx` com:
  - `backPath="/administrativo/empresas"`
  - breadcrumb: Home → Administrativo → Empresas → Nova/Editar
  - redireciona pós-salvar para `/administrativo/empresas`

### 2. Registrar rotas em `src/App.tsx`
Adicionar duas novas rotas protegidas (reutilizando o `routeKey="admin_companies"` para não exigir nova permissão):
- `/administrativo/empresas` → `GestaoEmpresasMinimalista`
- `/administrativo/empresas/:id` → `GestaoEmpresaEditMinimalista`

### 3. Adicionar botão no hub
Em `src/pages/administrativo/AdministrativoHub.tsx`, incluir novo item:
```
{ label: "Gestão de Empresas", icon: Building2, path: "/administrativo/empresas", ativo: true }
```
posicionado junto aos demais botões (ex.: após "Multas").

## Detalhes técnicos
- Mantemos o hook compartilhado `useEmpresasEmissoras` (sem duplicar lógica de dados).
- Sem mudanças de banco ou RLS.
- Permissão: usa `admin_companies` existente; se quiser controle independente futuramente, basta criar nova chave.

## Arquivos alterados
- `src/pages/administrativo/GestaoEmpresasMinimalista.tsx` (novo)
- `src/pages/administrativo/GestaoEmpresaEditMinimalista.tsx` (novo)
- `src/App.tsx` (2 rotas novas)
- `src/pages/administrativo/AdministrativoHub.tsx` (novo item no menu)
