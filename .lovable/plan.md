# Custo em Folha — lançamento mensal por colaborador

## Resumo

Novo item no hub `/administrativo/financeiro` chamado **Custo em Folha** que abre uma tela enxuta: o usuário seleciona o mês e lança um único valor de custo para cada colaborador ativo. O total alimenta a linha "Folha Salarial" do DRE, substituindo a fonte atual (gastos com nome contendo "salário/folha").

## Banco de dados

Nova tabela `public.custos_folha_mensais`:

- `id uuid pk default gen_random_uuid()`
- `mes_referencia date not null` — sempre o 1º dia do mês (ex.: `2026-04-01`)
- `colaborador_id uuid not null` (referência lógica a `admin_users.id`, sem FK rígida)
- `colaborador_nome text not null` — snapshot do nome no momento do lançamento
- `valor numeric not null default 0`
- `created_by uuid`, `created_at`, `updated_at` com trigger `update_updated_at_column`
- `unique (mes_referencia, colaborador_id)` — evita duplicidade por colaborador/mês

RLS:
- Enable RLS.
- SELECT/INSERT/UPDATE/DELETE permitido apenas para admins (`public.is_admin(auth.uid())`), no mesmo padrão das demais tabelas financeiras.

## Frontend

### 1. Hub Financeiro (`src/pages/administrativo/FinanceiroHub.tsx`)

Adicionar novo item no array `menuItems`:
```
{ label: "Custo em Folha", icon: Users, path: "/administrativo/financeiro/custo-folha", ativo: true }
```
(ícone `Users` do lucide-react). Posicionar logo abaixo de "Gastos".

### 2. Rota (`src/App.tsx`)

```
<Route path="/administrativo/financeiro/custo-folha" element={<ProtectedRoute routeKey="administrativo_hub"><CustoFolhaMensal /></ProtectedRoute>} />
```

### 3. Nova página `src/pages/administrativo/CustoFolhaMensal.tsx`

Layout em `MinimalistLayout` (mesmo padrão glassmorphism: `bg-white/5`, `backdrop-blur-xl`, `border-white/10`), breadcrumb Home → Administrativo → Financeiro → Custo em Folha.

Elementos:
- **Seletor de mês**: Select com últimos 12 meses + atual + próximo, formato "abril/2026". Estado `mesReferencia: Date` (1º dia do mês). Datas sempre tratadas com `T12:00:00` (memória do projeto).
- **Lista de colaboradores**: query a `admin_users` filtrando `eh_colaborador=true` e `ativo=true`, ordenada por `nome`.
- **Por linha**: nome do colaborador + input numérico (R$) para o valor. Pré-preenchido a partir de `custos_folha_mensais` do mês selecionado.
- **Resumo no rodapé fixo**: total da folha do mês + botão "Salvar".
- **Salvar**: faz `upsert` em `custos_folha_mensais` (`onConflict: 'mes_referencia,colaborador_id'`) para cada colaborador com valor > 0; remove (DELETE) linhas existentes cujo input ficou em 0/vazio, para o usuário poder zerar.
- Toast de sucesso/erro com `sonner`.

Sem campos extras (horas, acréscimos, descontos) — esta tela é só "custo total no mês por colaborador".

### 4. DRE (`src/pages/direcao/DREMesDirecao.tsx`)

No `fetchDespesasFromGastos`:
- Continuar lendo `gastos` para Despesas Fixas e Variáveis, **excluindo** itens cujo nome bate `isFolha` (já é feito hoje para fixas/variáveis — manter).
- **Remover** o `setDespesasFolha(items.filter(i => isFolha(i.nome)))`.
- Em vez disso, fazer nova query em `custos_folha_mensais` filtrando por `mes_referencia = ${mes}-01`. Somar `valor` e setar:
  ```
  setDespesasFolha([{ id: 'folha-mensal', nome: 'Folha Salarial', valor_real: totalFolha, tipo: 'fixa' }])
  ```
- `totalDespFolha` continua sendo a soma → linha "Folha Salarial" do DRE passa a refletir o lançado na nova tela.
- A lista detalhada lateral em `PrintDespesaTable` (Folha Salarial) mostra cada colaborador como uma linha (`nome`/`valor`) — converter os registros de `custos_folha_mensais` em `DespesaAgrupada[]` para alimentar o detalhamento.

Lançamentos antigos em `gastos` com nome "Salário/Folha" deixam de ser somados; permanecem na tabela só por histórico (não removemos dados).

## Fora de escopo

- Não tocar na página existente `/administrativo/rh-dp/colaboradores/folha-pagamento` nem nas tabelas `folhas_pagamento`/`folha_pagamento_itens`.
- Sem geração automática de `contas_pagar` a partir do custo em folha.
- Sem migração dos lançamentos antigos de `gastos` (folha) para a nova tabela — o usuário pode relançar o mês quando quiser.
