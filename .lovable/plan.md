## Objetivo

Aplicar em `/admin/users` (`src/pages/admin/AdminUsersMinimalista.tsx`) a mesma estética visual de `/direcao/estrategia/kits` (página `TabelaPrecos`), mantendo todo o comportamento atual (busca, filtros, edição inline, abas, ações, modais).

Mudanças apenas de UI/estilo — sem alterar lógica, queries, mutations ou modais.

## Mudanças visuais

1. **Abas (TabsList / TabsTrigger)**
   - Trocar o estado ativo cinza atual (`data-[state=active]:bg-white/10`) pelo padrão azul de kits: `data-[state=active]:bg-blue-600 data-[state=active]:text-white text-white/70`.
   - Manter `bg-white/5 border border-white/10` na TabsList.

2. **Bloco de filtros**
   - Envolver os filtros (busca + selects + botão limpar) em `<Card className="bg-white/5 border-white/10">` com `CardHeader` (título "Filtros") e `CardContent`, no mesmo padrão visual da CardHeader usada em kits.
   - Manter o contador `{n} colaborador(es)` como `CardDescription`.

3. **Lista de usuários → Card + lista estilizada**
   - Envolver `renderUserList` em `<Card className="bg-white/5 border-white/10">` com `CardHeader` contendo:
     - `CardTitle` "Usuários Cadastrados"
     - `CardDescription` com a contagem filtrada
   - Substituir o wrapper externo `bg-primary/5 border-primary/10` por `CardContent` com `divide-y divide-white/10` (alinhando aos tokens usados em kits: `border-white/10` em vez de `border-primary/10`).
   - Linhas individuais: trocar `hover:bg-white/5` por `hover:bg-white/[0.03]` e adicionar zebra sutil `even:bg-white/[0.02]` (espelhando o padrão zebrado da `Table` de kits via `index % 2 === 1 && "bg-muted/20"`).

4. **Header actions (PDF + Adicionar)**
   - Padronizar o botão "PDF" para `variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10"` (idêntico ao "Upload em Massa" de kits).
   - Botão primário (Adicionar via `AddUserDialog`) deve renderizar como `bg-blue-600 hover:bg-blue-700 text-white` `size="sm"`. Se o componente já encapsular o estilo, passar props/classe via `className` quando suportado; caso contrário envolver num wrapper sem alterar comportamento.

5. **Badges e cores semânticas**
   - Manter cores funcionais (verde ativo / vermelho excluir), mas trocar `text-white/40` por `text-white/50` (token usado em kits para CardDescription) e `border-white/20` para outlines, mantendo consistência.

6. **Tokens**
   - Trocar usos remanescentes de `primary/5` e `primary/10` por `white/5` e `white/10` para alinhar à paleta usada em kits.
   - Nenhum novo token em `index.css` é necessário — o estilo de kits já usa as classes glass existentes.

## Fora de escopo

- Não alterar lógica de busca/filtros/edição.
- Não alterar `UserDetailsModal`, `ResetPasswordModal`, `AddUserDialog`, `AvatarUpload`, AlertDialogs.
- Não tocar em outras rotas além de `src/pages/admin/AdminUsersMinimalista.tsx`.

## Arquivos afetados

- `src/pages/admin/AdminUsersMinimalista.tsx` (somente JSX/classes)
