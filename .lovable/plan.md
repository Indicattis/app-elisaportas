## Layout em duas colunas — /direcao/estrategia/precos

Trocar as abas atuais por um layout lado-a-lado com as duas listagens.

### 1. `src/pages/TabelaPrecos.tsx`
- Adicionar prop `hideTotalColumn?: boolean`.
- Quando ativa, ocultar o `TableHead` "Total" e a `TableCell` correspondente do Badge.
- Adicionar prop `hideTabsAndLayout?: boolean` (ou similar) que, quando true:
  - Não renderiza `MinimalistLayout`, `TabsList` nem o card "Pesquisa Rápida".
  - Retorna apenas o card "Itens Cadastrados" (tabela de kits), pronto para ser embutido em outra página.

### 2. `src/components/tabela-precos/CatalogoPrecosTab.tsx`
- Adicionar prop `compact?: boolean`.
- Quando true, exibir apenas duas colunas na tabela: **Produto** (nome) e **Preço Venda**. Ocultar imagem, categoria, SKU, unidade, custo, margem e estoque. Edição inline pode permanecer só no preço.

### 3. `src/pages/direcao/estrategia/EstrategiaPrecos.tsx`
- Substituir o `<TabelaPrecos>` único por um `MinimalistLayout` próprio contendo um grid de 2 colunas (`grid-cols-1 lg:grid-cols-2 gap-6`):
  - Coluna esquerda: `<TabelaPrecos hideTabsAndLayout hideLucroColumn hideAcoesColumn hideTotalColumn />`
  - Coluna direita: `<CatalogoPrecosTab compact />`
- Manter título, subtítulo e breadcrumbs atuais.

### Resultado
- Sem abas; duas listagens visíveis simultaneamente.
- Tabela de kits sem a coluna "Total".
- Catálogo enxuto com apenas Nome + Preço.
