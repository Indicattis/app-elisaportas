
## Objetivo

Adicionar botão "Caixa Roboost" no hub `/direcao` que abre uma nova página onde se cadastram entradas (nome, valor e etiqueta colorida), exibidas em lista com total consolidado — replicando o layout do print.

## 1. Hub /direcao
- Em `DirecaoHub.tsx`, adicionar item no `menuItems`:
  - label: "Caixa Roboost", icon: `Wallet` (lucide), path: `/direcao/caixa-roboost`, routePrefix: `direcao_caixa_roboost`.

## 2. Nova página `CaixaRoboostDirecao.tsx`

Layout idêntico ao print, com glassmorphism padrão do projeto (`bg-white/5 backdrop-blur-xl border-white/10`):

```text
[Breadcrumb: Início › Direção › Caixa Roboost]

┌───────────────────────────────────────────────────────────┐
│ 💼 Caixa Roboost                        [+ Nova entrada] │
│    Cadastre valores e organize-os com etiquetas           │
└───────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────┐
│              MONTANTE TOTAL                               │
│              R$ 800.000,00                                │
│                 4 entradas                                │
└───────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────┐
│ ⋮⋮  Stone   [Vamos receber]            R$ 145.000,00 ✏ 🗑 │
│ ⋮⋮  Banco Sicredi [Em Caixa Hoje 18/05] R$ 105.000,00 ✏🗑│
│ ...                                                       │
└───────────────────────────────────────────────────────────┘
```

### Componentes
- Card de cabeçalho com botão azul "Nova entrada" (gradiente padrão).
- Card de total: soma de todas as entradas, formatada em BRL, com contador.
- Lista de entradas: cada item em card pílula com handle drag (`GripVertical`), nome em bold, badge colorido com o nome da etiqueta, valor à direita, ícones de editar (`Pencil`) e excluir (`Trash2`).
- Drag-and-drop para reordenar (`@dnd-kit/core` já presente no projeto; verificar e usar — se não houver, usar setas ↑↓ simples).

### Dialog "Nova entrada" / "Editar entrada"
- Campos: Nome (text), Valor (input monetário R$), Etiqueta (combobox: selecionar existente ou criar nova com nome + cor).
- Botões: Cancelar / Salvar.

### Dialog de exclusão
- Confirmação simples ("Excluir entrada?").

## 3. Persistência (Lovable Cloud / Supabase)

Migração nova criando duas tabelas:

**`caixa_roboost_etiquetas`**
- `id uuid pk default gen_random_uuid()`
- `nome text not null unique`
- `cor text not null` (hex ou nome do preset: amber, emerald, rose, sky, etc.)
- `created_at timestamptz default now()`

**`caixa_roboost_entradas`**
- `id uuid pk default gen_random_uuid()`
- `nome text not null`
- `valor numeric not null default 0`
- `etiqueta_id uuid references caixa_roboost_etiquetas(id) on delete set null`
- `ordem integer not null default 0`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

RLS: ambas com policies para `authenticated` SELECT/INSERT/UPDATE/DELETE usando `is_admin()` ou checagem por `has_route_access('direcao_caixa_roboost')` — seguir padrão das outras telas /direcao.

## 4. Rota

Em `src/App.tsx`:
- import `CaixaRoboostDirecao from "./pages/direcao/CaixaRoboostDirecao"`
- adicionar rota `/direcao/caixa-roboost` dentro do mesmo bloco protegido das demais rotas `direcao_*`.

## Fora do escopo
- Integração com DRE / contas a receber.
- Histórico de alterações.
- Filtros por etiqueta (pode ser adicionado depois se quiser).

## Confirmações
Posso assumir cores predefinidas para etiquetas (amber/emerald/rose/sky/violet/etc.) ou prefere color-picker livre? Se não responder, assumirei presets fixos para manter consistência visual.
