# Detalhamento por item no relatório de itens avulsos

Adicionar detalhamento item a item por vendedor em `/direcao/vendas/relatorio-itens-avulsos`, mantendo o resumo já existente.

## Mudanças em `src/pages/direcao/RelatorioItensAvulsos.tsx`

### 1. Buscar o nome do item na query

Hoje a query em `produtos_vendas` traz só `tipo_produto`, `quantidade` e `valor_total`. Ampliar o `select` para incluir também:
- `nome_produto` (usar o campo que já identifica o adicional/acessório — provavelmente `nome_produto` ou similar em `produtos_vendas`; confirmar na hora e cair para `descricao`/`tamanho` como fallback se necessário).

Sem migração de banco.

### 2. Nova agregação

Além da agregação por vendedor existente, criar um segundo agrupamento aninhado por `(vendedor_id, nome_item)`:

```ts
type ItemAgg = {
  nome: string;
  tipo_produto: 'adicional' | 'acessorio';
  quantidade: number;
  valor_total: number;
};

type LinhaRelatorio = {
  vendedor_id: string;
  vendedor_nome: string;
  quantidade_itens: number;
  valor_total: number;
  itens: ItemAgg[]; // ordenado por valor_total desc
};
```

Itens sem nome (nulos) caem em "Sem descrição".

### 3. Linha do vendedor vira expansível

- Cada linha da tabela ganha um botão de chevron (ChevronRight/ChevronDown) na primeira coluna.
- Ao clicar, expande uma linha filha (`<TableRow>` com `colSpan={3}`) contendo uma sub-tabela com colunas: **Item** | **Qtde** | **Valor total**.
- Estado local `expandedIds: Set<string>` controla quais vendedores estão abertos.
- Também um botão "Expandir todos / Recolher todos" no canto da tabela.

### 4. Estilo

- Manter o padrão glass já usado (bg-white/5, border-white/10).
- Sub-tabela indentada (`pl-8`), fundo levemente mais claro (`bg-white/[0.02]`), sem cabeçalho de página nem breadcrumbs adicionais.
- Linhas de item com fonte um pouco menor (`text-xs`) para hierarquia visual.

## Fora do escopo

- Sem exportação.
- Sem filtro por item ou por vendedor específico.
- Sem alteração no botão de acesso nem na rota.
- Sem mudanças em outras telas.
