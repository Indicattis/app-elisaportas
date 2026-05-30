## Setores dinâmicos em /direcao/gestao-colaboradores

Permitir criar/editar/excluir setores diretamente da página, com botão **`+`** ao lado da lista de chips de setores no topo. Cada setor tem apenas **nome (label)** — a chave é gerada automaticamente (slug). Os setores cadastrados passam a aparecer em todas as telas que listam setores.

### Banco de dados

Nova tabela `public.system_setores`:

```text
id          uuid pk
key         text unique not null   -- slug (vendas, marketing, novo_setor_x)
label       text not null          -- nome exibido
ordem       int default 999
ativo       boolean default true
created_at, updated_at
```

- GRANTs: `SELECT` para `authenticated` e `anon` (já que setores são metadados de UI). `ALL` para `service_role`. `INSERT/UPDATE/DELETE` para `authenticated`.
- RLS: leitura liberada a qualquer usuário autenticado (já é o padrão para metadados como `system_roles`). Escrita restrita a admins via `is_admin()` (mesmo helper já usado).
- Seed dos 5 setores atuais (`vendas`, `marketing`, `instalacoes`, `fabrica`, `administrativo`) com a ordem atual, para garantir continuidade.
- Trigger `update_updated_at_column` padrão.

### Backend de leitura no app

Novo hook `src/hooks/useSetores.ts`:
- `useSetores()` → `{ setores: { key, label, ordem, ativo }[], labelMap: Record<string,string>, loading }`.
- Faz merge: começa pelos 5 hardcoded em `SETOR_LABELS` (fallback) e sobrescreve/adiciona com o que vier do banco. Garante que registros antigos com `setor='vendas'` etc. continuem resolvendo o label mesmo se o banco estiver indisponível.
- Mutations: `createSetor(label)`, `updateSetor(id, label)`, `deleteSetor(id)`, `reorderSetores(ids[])` (futuro, fora deste escopo).
- `createSetor` gera `key` a partir do label (slug ASCII lowercase, sem espaços; sufixo numérico em caso de colisão).

### UI — botão "+" e modal

Em `GestaoColaboradoresDirecao.tsx`, ao lado dos chips de setores (desktop e mobile):
- Botão circular `+` glassmorphism (`bg-white/5 hover:bg-white/10 border-white/10 rounded-full`) com ícone `Plus`.
- Abre `Dialog` "Gerenciar setores" listando todos os setores cadastrados com:
  - Input para criar novo (validação: label obrigatório, mínimo 2 chars, sem duplicata case-insensitive).
  - Linha por setor com edição inline do label (ícone lápis → input → salvar) e botão excluir (lixeira vermelha).
  - Excluir só é permitido se **nenhum cargo** em `system_roles` referenciar aquela `key` (fazer `SELECT count` antes; bloquear com toast explicativo se houver). Os 5 setores seed permanecem editáveis e excluíveis pela mesma regra.

### Telas que passam a usar setores dinâmicos

Substituir `Object.keys(SETOR_LABELS)` / `SETOR_LABELS[x]` pelo hook `useSetores()`:

1. `src/pages/direcao/GestaoColaboradoresDirecao.tsx` — chips desktop + mobile, lookups de label. Remover `SETOR_KEYS` const.
2. `src/pages/administrativo/VagasPage.tsx` — chips e labels.
3. `src/components/admin/EditRoleModal.tsx` e `CreateRoleModal.tsx` — dropdown de setor ao criar/editar cargo.
4. `src/components/admin/SetoresLideresManager.tsx` — lista de setores.
5. `src/pages/admin/AdminRolesMinimalista.tsx`, `AdminRoles.tsx`, `administrativo/FuncoesPage.tsx`, `direcao/PedidoViewDirecao.tsx`, `MeuPerfil.tsx`, `Todo.tsx`, `administrativo/rh-dp/PreencherVagaPage.tsx` — só lookups de label, passam a usar `labelMap` do hook (com fallback ao próprio key).
6. `src/components/vagas/SelecionarUsuarioVagaDialog.tsx` — lookup.
7. `src/pages/direcao/estrategia/EstrategiaDespesasConfiguracoes.tsx` — array `SETORES` (com cores) passa a ser derivado: cores aplicadas via paleta cíclica fixa (`emerald/pink/amber/blue/violet/cyan/rose/teal…`) por `ordem`, mantendo as cores atuais para os 5 seed.
8. `src/utils/folhaSalarialPDFGenerator.ts` — recebe a lista de setores como parâmetro ou consulta via cliente Supabase. Para simplicidade, a chamada em `FolhaBlock` passa `setores` (já carregados pelo hook na página).
9. `src/components/pedidos/CorrecaoDetalhesSheet.tsx` — dropdown de setor causador da correção.

**Fora do escopo deste passo:** mapeamento `SETOR_ROLES` (que associa cargos a setores) — esse mapeamento já está sendo desativado em favor do campo `system_roles.setor`, então os 2 últimos usos (`getSetorFromRole`, `getRolesFromSetor`, `useSetorInfo`) continuam funcionando para os 5 setores seed. Novos setores ganharão cargos via `system_roles.setor` apenas (já é assim que a tela lê hoje).

### Cores dos chips

Como o usuário pediu "só nome", as cores dos chips passam a vir de uma paleta cíclica fixa baseada na `ordem` do setor:

```text
['emerald','pink','amber','blue','violet','cyan','rose','teal','orange','sky']
```

Para os 5 seed mantemos a ordem que já produz as cores atuais. Novos setores recebem a próxima cor da paleta.

### Resumo do que muda

- Nova tabela `system_setores` com seed dos 5 atuais.
- Novo hook `useSetores` (fonte única de verdade para UI).
- Botão `+` na lista de setores em `gestao-colaboradores` abre modal de gerenciamento (criar / renomear / excluir, bloqueando exclusão se houver cargos vinculados).
- Refator de ~10 arquivos para consumir o hook em vez do dicionário estático, mantendo `SETOR_LABELS` como fallback no `setorMapping.ts`.
