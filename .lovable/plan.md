## Objetivo

Distinguir, no catálogo de itens (`/direcao/estrategia/itens`) e no DRE mensal, quais itens são **acessórios** e quais são **itens avulsos**. Hoje o DRE agrupa tudo em "Itens Avulsos".

## 1. Banco de dados

Migration em `custos_itens`:
- Adicionar coluna `tipo_item text NOT NULL DEFAULT 'avulso'` com CHECK em (`'avulso'`, `'acessorio'`).
- Backfill: manter todos os registros existentes como `'avulso'` (default cobre).

Nada muda em `produtos_vendas`. O link continua sendo via `produtos_vendas.custos_itens_id`.

## 2. `/direcao/estrategia/itens`

- Em `useCustosItens.ts` incluir `tipo_item` no tipo `CustoItem` e no `CustoItemInput`.
- No modal de criação/edição de item, adicionar um seletor "Tipo do item" com as opções **Item Avulso** (padrão) e **Acessório**.
- Na listagem, exibir um badge discreto "Acessório" ao lado do nome quando `tipo_item = 'acessorio'` para o usuário identificar rapidamente.
- Adicionar filtro rápido no header (chips "Todos / Avulsos / Acessórios") para facilitar a curadoria em massa.

## 3. `/direcao/estrategia/dre/:mes`

Arquivo: `src/pages/direcao/DREMesDirecao.tsx`.

- Estender `FaturamentoProduto` com um campo novo `acessorios: number` (mantendo `avulsos`).
- Alterar o carregamento dos produtos da venda para trazer também `custos_itens_id` e fazer um `select` paralelo em `custos_itens` do mês, montando um `Map<id, tipo_item>`.
- Regra de classificação por linha de produto (aplicada em faturamento, lucro, desconto excedido e top itens):
  - Se `custos_itens_id` presente no mapa → usa `tipo_item` do catálogo.
  - Caso contrário (fallback para vendas antigas sem link):
    - `tipo_produto = 'acessorio'` → coluna **Acessórios**.
    - `tipo_produto = 'adicional'` → coluna **Itens Avulsos**.
- Adicionar a coluna **Acessórios** na tabela principal do DRE (colunas passam a ser: Portas, Pintura, Instalações, Acessórios, Itens Avulsos, Fretes, Total). Somar `acessorios` no `fat.total`, `luc.total` e `exc.total`.
- Modal detalhado: reutilizar o mesmo `PortasDetalheDialog` genérico, adicionando um estado/handler para `acessoriosModalOpen` com `titulo="Acessórios"` e `categoriaLabel="acessorios"`. O helper `buildCategoriaDetalhe` recebe um predicado — hoje filtra por `tipo_produto` em `['acessorio','adicional']`; passa a receber a mesma regra de classificação acima para filtrar apenas linhas classificadas como "acessorios" (ou "avulsos" no modal existente).
- Top 5 itens: dividir em `topAcessorios` e `topAvulsos` usando o mesmo mapa.

## 4. PDF do DRE

- Em `PrintReport` incluir a nova coluna "Acessórios" no resumo e nos totais, mantendo cor Elisa e paisagem já configurada.
- Se a coluna extra deixar o layout apertado, reduzir levemente `fontSize` das colunas numéricas ou usar duas linhas de cabeçalho — decisão feita no momento da implementação após conferir visualmente.

## Detalhes técnicos

- `custos_itens.tipo_item`: `text NOT NULL DEFAULT 'avulso' CHECK (tipo_item IN ('avulso','acessorio'))`.
- Não é necessário mexer em fluxo de vendas, orçamentos, produção ou faturamento — a flag é puramente para relatório estratégico/DRE.
- Vendas antigas sem `custos_itens_id` continuam funcionando pelo fallback baseado em `tipo_produto`.
- Nenhuma alteração em RLS/GRANT necessária (coluna adicionada a tabela existente).

## Fora de escopo

- Não vamos migrar historicamente `tipo_produto='acessorio'` das vendas para o novo campo; a segregação acontece só na leitura do DRE.
- Não vamos criar tela nova — tudo é ajuste na página de itens existente e no DRE.
