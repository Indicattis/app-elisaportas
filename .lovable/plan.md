# Adicionar seção "Despesas de Imposto"

Replicar o bloco de Despesas Fixas/Variáveis para uma nova categoria `imposto`, com lançamentos editáveis, sugestões a partir de "Configurações padrão" e totais (Previsão / Pago).

## Mudanças

### 1. Banco de dados (migration)
- Atualizar o CHECK de `public.despesas_manuais_lancamentos.categoria` para aceitar também `'imposto'`:
  ```sql
  ALTER TABLE public.despesas_manuais_lancamentos
    DROP CONSTRAINT despesas_manuais_lancamentos_categoria_check;
  ALTER TABLE public.despesas_manuais_lancamentos
    ADD CONSTRAINT despesas_manuais_lancamentos_categoria_check
    CHECK (categoria = ANY (ARRAY['fixa'::text, 'variavel'::text, 'imposto'::text]));
  ```
- `despesas_padrao.tipo` é `text` livre (sem CHECK) — basta passar `'imposto'`.

### 2. `src/hooks/useDespesasPadrao.ts`
- Estender o tipo: `export type DespesaPadraoTipo = 'folha' | 'fixa' | 'variavel' | 'imposto';`

### 3. `src/components/direcao/estrategia/DespesasResumoTopo.tsx`
- Adicionar estado `impostos` (filtrando `lancArr` por `categoria === 'imposto'`).
- Aceitar `'imposto'` no tipo de `LancRow.categoria`, em `handleInsertLanc` e em `BlocoDespesa` (prop `categoria`).
- Calcular `padroesImpostos` a partir de `padroes.filter(p => p.tipo === 'imposto')`.
- Renderizar um terceiro `<BlocoDespesa>` com `titulo="Despesas de Imposto"`, ícone (ex.: `Landmark` da `lucide-react`), `categoria="imposto"`, `padroes={padroesImpostos}`.
- Incluir `impostos` e `padroesImpostos` em `totalExibido` (mesma lógica de fixas/variáveis).

### 4. `src/pages/direcao/estrategia/EstrategiaDespesasConfiguracoes.tsx`
- Adicionar terceiro bloco `<SimpleBlock tipo="imposto" titulo="Despesas de Imposto" items={impostos} ... />` para que sirva como fonte de Previsão e sugestões automáticas, igual aos demais.

## Comportamento resultante
- Nova seção visualmente idêntica às de Fixas/Variáveis (mesmo layout glassmorphism, mesmas colunas: Tipo, Descrição, Data, Valor pago, Previsão, ações).
- Suporta: adicionar, editar inline (tipo, descrição, data, valor), excluir, aceitar/remover sugestões padrão, e exibe totais "Previsão" e "Pago".
- O total mensal do mês passa a somar também os impostos.
- A página `/direcao/estrategia/despesas/configuracoes` ganha um bloco "Despesas de Imposto" que alimenta as sugestões e a coluna Previsão.

## Fora de escopo
- Sem alteração no DRE / outras telas financeiras (somente esta página). Pode ser feito depois caso queira que impostos entrem em algum cálculo adicional.