## Objetivo

Adicionar uma nova página **Entradas** em Financeiro, espelhando exatamente o layout e o design de **Gastos** (`/financeiro/gastos`), mas para registrar valores recebidos. Sem impacto no DRE — apenas registro.

## Mudanças

### 1. Banco de dados (migration)

Nova tabela `public.entradas` espelhando `gastos`, mas com **categoria como texto livre** (sem FK para tipos):

```
id uuid PK
categoria text         -- texto livre digitado pelo usuário
descricao text null
valor numeric not null
data date not null
responsavel_id uuid null -> admin_users(id)
banco_id uuid null      -> bancos(id)
status text default 'recebido'  -- 'recebido' | 'previsto'
observacoes text null
created_by uuid null
created_at / updated_at timestamps
```

- `GRANT` para `authenticated` e `service_role`.
- RLS espelhando a tabela `gastos` (políticas equivalentes às existentes).
- Trigger `updated_at` reutilizando `public.update_updated_at_column`.

### 2. Hub Financeiro — `src/pages/administrativo/FinanceiroHub.tsx`

Adicionar novo item de menu logo abaixo de "Gastos":

```
{ label: "Entradas", icon: TrendingUp, path: "/financeiro/entradas", ativo: true, cor: "green" }
```

Adicionar suporte ao gradiente verde no botão (espelhando o tratamento `cor: 'orange'` usado em Gastos), com tons `from-emerald-500 to-emerald-700`.

### 3. Hook — `src/hooks/useEntradas.ts`

Clone do `useGastos.ts`:

- Sem fetch de `tipos_custos` (categoria é string).
- Mantém joins para `admin_users` (responsável) e `bancos`.
- Mesmas funções: `saveEntrada`, `updateEntrada`, `deleteEntrada`.
- Mesmos parâmetros: `mesFiltro`, `ordenarPor` (`'cadastro' | 'pagamento'`).

### 4. Página — `src/pages/administrativo/EntradasPage.tsx`

Clone visual de `GastosPage.tsx`:

- Mesmo cabeçalho, filtros (mês, responsável, banco, categoria), busca, totalizador.
- Remove filtro "DRE" (não se aplica).
- Coluna "Tipo" vira "Categoria" com `Input` livre (com `<datalist>` sugerindo categorias já usadas).
- Botão principal "Nova Entrada" em verde no mesmo estilo do "Novo Gasto".
- Exportação PDF/CSV preservada, ajustando títulos e colunas.
- Reaproveita o mesmo dialog de cadastro (clone) com os campos: categoria (texto livre + sugestões), descrição, valor, data, responsável, banco, status (`recebido` / `previsto`), observações.

### 5. Componente de form — `src/components/financeiro/EntradaFormDialog.tsx`

Clone de `GastoFormDialog.tsx` adaptado (sem seletor de tipo_custo; categoria virá como input livre).

### 6. Roteamento — `src/App.tsx`

Adicionar rota `/financeiro/entradas` → `EntradasPage` (lazy import no mesmo padrão das demais).

### 7. Detalhes técnicos

- Idêntico padrão de cores e glassmorphism do restante (tema escuro, `bg-white/5`, `backdrop-blur-xl`, `border-white/10`).
- Mesma paleta dos botões, mesmo modal, mesma estrutura de tabela.
- Datas seguem o padrão do projeto (`T12:00:00.000Z` na escrita).
- Sem alteração no DRE / fluxo de gastos atual.
