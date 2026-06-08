## Objetivo

Adicionar uma nova categoria de despesa chamada **Investimentos** que se comporta exatamente como Fixas/Variáveis/Impostos/Projetadas — com seção própria de cadastro de tipos, lançamento de gastos, resumo do mês e aparição no DRE.

## Mudanças

### 1. Banco de dados (migração)
- Atualizar `CHECK` da coluna `tipos_custos.tipo` para incluir `'investimento'`:
  - `ARRAY['fixa','variavel','imposto','projetada','investimento']`
- Verificar/ajustar qualquer outro `CHECK` correlato em tabelas que referenciam o tipo (ex.: `gastos.categoria` se existir constraint similar, `despesas_mes_tipo_custo_override`).

### 2. Tipos TypeScript
Adicionar `'investimento'` ao union em todos os pontos:
- `src/hooks/useTiposCustos.ts` → campo `tipo` de `TipoCusto`.
- `src/components/direcao/estrategia/DespesasResumoTopo.tsx` (≈10 ocorrências).
- `src/components/financeiro/GastoFormDialog.tsx` → `defaultCategoria`.
- `src/pages/direcao/estrategia/EstrategiaDespesasConfiguracoes.tsx` (linhas 973, 1697 e outras).

### 3. Tela de Configurações (`EstrategiaDespesasConfiguracoes.tsx`)
- Adicionar bloco `<TiposCustoBlock tipo="investimento" titulo="Tipos de Custos — Investimentos" icon={<TrendingUp/>}>` (ou ícone `PiggyBank`/`Briefcase`) abaixo de Impostos.
- Filtrar `tiposCustos.filter(t => t.tipo === 'investimento')`.

### 4. Resumo do mês (`DespesasResumoTopo.tsx`)
- Adicionar `'investimento'` em `tiposMap`, `agruparPor`, paleta de cores e cards do resumo.
- Adicionar coluna/card "Investimentos" no topo.

### 5. Lançamento de gastos (`GastoFormDialog.tsx`)
- Incluir "Investimentos" no seletor de categoria.

### 6. DRE (`DREMesDirecao.tsx` / `useDRE.ts`)
- Somar gastos da categoria `investimento` e exibir linha "Investimentos" nas seções relevantes (resumo, custos por categoria), respeitando `aparece_no_dre`.

### 7. UX
- Ícone sugerido: `Briefcase` ou `PiggyBank` (lucide-react).
- Paleta consistente com as demais (ex.: cyan/teal para diferenciar).

## Detalhes técnicos

- O CHECK constraint existente é nominal (`tipos_custos_tipo_check`) — basta `DROP` e `ADD` com o novo array.
- Nenhum dado existente é afetado; tipos novos começam vazios.
- Hook `useTiposCustosMes` é genérico (lê todos de `useTiposCustos`), então só precisa da atualização do union em `TipoCusto`.

## Fora de escopo

- Regras especiais de cálculo para investimentos (ex.: amortização, vida útil) — fica como categoria simples de despesa por enquanto.