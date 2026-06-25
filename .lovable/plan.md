## Objetivo

No PDF exportado de cada seção em **Direção → Estratégia → Despesas → maio/2026**, usar exatamente as colunas da tabela:

**Nome | Categoria | Gastos | Total gasto | Valor projetado**

E, abaixo de cada tipo de despesa, listar os gastos individuais registrados no mês.

## Mudanças

### 1. `src/utils/tiposCustosPDFGenerator.ts` — refatorar `exportTiposCustosPDF`

- Tornar a função `async`.
- Nova assinatura:
  ```ts
  exportTiposCustosPDF(
    titulo: string,
    items: TipoCusto[],
    categorias: CategoriaDespesa[],
    opts?: {
      contagemGastos?: Record<string, number>;
      totaisGastos?: Record<string, number>;
      mesReferencia?: string | null;
    }
  )
  ```
- Tabela com colunas: `Nome | Categoria | Gastos | Total gasto | Valor projetado`.
  - **Nome**: `r.nome`
  - **Categoria**: nome da categoria correspondente (`-` se nenhuma)
  - **Gastos**: `contagemGastos[r.id] ?? 0`
  - **Total gasto**: `fmtBRL(totaisGastos[r.id] ?? 0)`
  - **Valor projetado**: `fmtBRL(r.valor_maximo_mensal)`
- Manter o agrupamento por categoria como hoje (cabeçalho com nome da categoria e subtotal por categoria — somando Total gasto e Valor projetado).
- Quando `mesReferencia` está definido, para cada tipo buscar via Supabase os gastos do mês:
  ```ts
  supabase.from("gastos")
    .select("data, descricao, valor")
    .eq("tipo_custo_id", r.id)
    .gte("data", `${mes}-01`).lte("data", end)
    .order("data", { ascending: true });
  ```
  Inserir, logo abaixo da linha do tipo (na mesma `body`), uma linha por gasto formatada como:
  - col Nome: `↳ dd/MM/yyyy`
  - col Categoria + Gastos (colSpan 2): descrição (ou "-")
  - col Total gasto: `fmtBRL(valor)`
  - col Valor projetado: vazio
  Estilo discreto (fonte menor, itálico, fundo `#fafafa`, sem riscar layout).
- Totais gerais na rodapé passam a mostrar: **Total gasto do mês** e **Total projetado** (mantendo "Total mensal (ativos)" se quiser, mas usando projetado dos ativos).

### 2. `EstrategiaDespesasConfiguracoes.tsx` — `SectionExpense`

Atualizar a chamada (linha 1354):
```ts
onClick={() => exportTiposCustosPDF(titulo, items, categorias, {
  contagemGastos,
  totaisGastos,
  mesReferencia,
})}
```
Como a função vira `async`, envolver em `() => { void exportTiposCustosPDF(...); }`.

### Sem outras alterações

- Hooks, schema e componentes de UI permanecem como estão.
- A busca de gastos individuais é feita só na hora de gerar o PDF, evitando carga adicional na tela.