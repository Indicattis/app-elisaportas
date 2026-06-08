## Goals

1. Adicionar nova categoria de despesa **Salários** em `/direcao/estrategia/despesas/:mes`, com o mesmo comportamento das demais (Fixas, Variáveis, Fornecedores, Financiamentos, Fretes, Autorizados…).
2. Adicionar, ao lado dos botões **Exportar PDF** / **Nova despesa** de cada bloco de categoria, um **toggle** que controla se aquela categoria **debita do lucro no DRE** (sim/não), persistido por categoria.

## Changes

### 1. Banco de dados (migração)
- Atualizar o `CHECK` de `tipos_custos.tipo` para incluir `'salario'` (mantendo `fixa`, `variavel`, `imposto`, `projetada`, `investimento`, `fornecedor`, `financiamento`, `frete`, `autorizado`).
- Criar tabela `despesas_categoria_dre_config`:
  - `categoria text PRIMARY KEY` (`'fixa' | 'variavel' | 'salario' | ...`)
  - `debita_dre boolean NOT NULL DEFAULT true`
  - timestamps + trigger updated_at
  - GRANTs (`authenticated` SELECT/INSERT/UPDATE, `service_role` ALL), RLS habilitada com policy permitindo leitura para `authenticated` e escrita para diretores/admins (mesmo padrão de `dre_mensais`).
  - Seed inicial: insere uma linha por categoria existente com `debita_dre = true` (Salários inicia em `true`).

### 2. Tipos no frontend
Adicionar `'salario'` à união de tipos em:
- `src/hooks/useTiposCustos.ts` (interface `TipoCusto.tipo`)
- `src/components/financeiro/GastoFormDialog.tsx`
- `src/components/direcao/estrategia/DespesasResumoTopo.tsx`
- `src/pages/direcao/estrategia/EstrategiaDespesasConfiguracoes.tsx` (3 ocorrências: filtro, união do TipoSelector e tipo da Categoria)
- `src/pages/direcao/DREMesDirecao.tsx`

### 3. Bloco "Salários" na configuração
Em `EstrategiaDespesasConfiguracoes.tsx`:
- `const tiposSalarios = tiposCustos.filter(t => t.tipo === 'salario')`
- Renderizar `<TiposCustoBlock titulo="Tipos de Custos — Salários" icon={<Wallet />} tipo="salario" items={tiposSalarios} … />` (posicionado logo após Folha / antes de Fixas, para agrupar com pessoal).
- Incluir `'salario'` na lista de grupos do seletor de realocação (linha ~1273) com label "Salários".

### 4. Resumo do topo e DRE
- `DespesasResumoTopo.tsx`: novo estado `gastosSalarios`, novo `agruparPor('salario')` e bloco visual idêntico aos demais (ícone `Wallet`). Somar ao total geral.
- `DREMesDirecao.tsx`: novos `despesasSalarios` / `tiposCustosSalarios` / `totalDespSalarios`, novo bloco no PDF e na seção detalhada, somar em `lucroLiquidoFinal` **apenas se** a categoria estiver com `debita_dre = true`.

### 5. Toggle "Debita do lucro no DRE" por categoria
Em `TiposCustoBlock` (mesmo componente que já tem o botão Exportar PDF, linhas ~1198-1225):
- Novo hook leve `useCategoriaDreConfig()` que carrega o mapa `{ categoria → debita_dre }` de `despesas_categoria_dre_config` e expõe `toggle(categoria)`.
- Renderizar, **à esquerda** do botão "Exportar PDF", um Switch (shadcn) com label curto "Debita do lucro" + estado verde/cinza. Tooltip explicando: "Quando desligado, esta categoria não é subtraída do lucro líquido no DRE."
- `readOnly` esconde/desabilita o toggle (mesmo padrão do botão "Gerenciar categorias").
- Persistência via `upsert` na nova tabela; otimista local.

### 6. DRE: respeitar o toggle
Em `DREMesDirecao.tsx`, ao calcular `lucroLiquidoFinal` e o card de totais, multiplicar cada total de categoria por `config[categoria].debita_dre ? 1 : 0`. As linhas do detalhamento continuam visíveis, mas marcadas como "informativo (não debita)" quando desligado.

## Out of scope
- Não alterar `aparece_no_dre` por item (continua existindo e funcionando como filtro fino).
- Não migrar gastos existentes para a nova categoria Salários (fica vazia até o usuário cadastrar tipos).
