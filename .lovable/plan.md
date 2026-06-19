## Objetivo

Replicar 3 seções da `VendaPendenteDetalhesSheet` na `PedidoDetalhesSheet` (a "downbar" que abre ao clicar num pedido), substituindo/adicionando blocos com o mesmo visual e cálculos da venda pendente:

1. **Itens da Venda** (tabela rica) — Produto / Tabela / Desc-Acrés / Vendido, com totais (Produtos, Frete, Total Geral) e badge "Fat" nos itens faturados.
2. **Info Cards** (grid 2/3 cols) — Data Venda, Dias Pendente, Tipo Entrega, Pagamento, Parcelas, Pago na Entrega, Desc/Crédito, Lucro, Temperatura.
3. **Descontos por Faixa** — Cartão / Frio / Diretor com percentuais e valores, usando os mesmos limites de `useConfiguracoesVendas`.

## Arquivos afetados

- `src/components/pedidos/PedidoDetalhesSheet.tsx` — única alteração.

## Mudanças

### 1. Estado e busca complementar
- Adicionar `vendaCompleta` (state) e `precosTabela` (Map), análogos aos da `VendaPendenteDetalhesSheet`.
- Novo `fetchVendaCompleta`: carrega a venda com `produtos_vendas (*, catalogo_cores(*), custos_itens(descricao), faturamento:produtos_faturados(*))`, mais `forma_pagamento`, `venda_presencial`, `valor_frete`, `valor_credito`, `valor_desconto_total`, `lucro_total`, `tipo_entrega`, `metodo_pagamento`, `metodo_pagamento_entrega`, `pagamento_na_entrega`, `numero_parcelas`, `data_venda`.
- Carregar `precosTabela` via `buscarPrecosPorMedidas` com base nas dimensões dos produtos (igual à venda pendente).
- Disparar no `useEffect` existente quando `open && pedido?.id`.

### 2. Hook de descontos por faixa
- Importar `useConfiguracoesVendas` e criar `descontoTiers` via `useMemo` com a mesma lógica da `VendaPendenteDetalhesSheet` (linhas 100–153), usando `vendaCompleta`.

### 3. Substituir o Collapsible "Itens da Venda"
- Trocar o bloco atual (linhas 822–902) pela versão em tabela da `VendaPendenteDetalhesSheet` (linhas 394–594), com:
  - colunas Produto / Tabela / Desc-Acrés / Vendido,
  - footer com Produtos, Frete (se `valor_frete > 0`) e Total Geral,
  - badge "Fat" quando `produto.faturamento` existir,
  - resolução de preço de tabela via `precosTabela` quando houver dimensões,
  - fallback de loading quando `vendaCompleta` ainda não estiver carregada.

### 4. Adicionar bloco "Info Cards" logo depois de "Itens da Venda"
- Copiar o grid `grid-cols-2 sm:grid-cols-3 gap-3` (linhas 596–713) — mantendo dependências:
  - `diasPendente = differenceInDays(new Date(), new Date(venda.data_venda))`;
  - `tipoEntregaLabel` derivado de `vendaCompleta?.tipo_entrega` (mesmo mapeamento de ícone/cor da origem — extrair para helper local ou inline);
  - usar `FORMAS_PAGAMENTO_LABELS` já presente no arquivo.

### 5. Adicionar bloco "Descontos por Faixa" logo depois dos Info Cards
- Copiar o bloco (linhas 715–752) condicionado a `descontoTiers`.

### 6. Imports
- Adicionar: `useMemo`, `differenceInDays`, `ptBR`, ícones faltantes (`Calendar`, `Clock`, `Truck`, `CreditCard`, `Percent`, `Flame`, `Snowflake`, `ShoppingCart`), `buscarPrecosPorMedidas`, `useConfiguracoesVendas`, tipo `ItemTabelaPreco`.
- Trazer as funções `normalizarTexto`, `parseMedida`, `extrairDimensoesProduto`, `criarChavePrecoTabela` (copiar para o topo do arquivo — pequenas e isoladas).

## Fora de escopo

- Nenhuma alteração em business logic, schema ou nas demais seções da sheet (linhas, ordens, parcelas, comentários, histórico).
- Sem mudança nos hooks/listagens que abrem a sheet — apenas o conteúdo interno.
